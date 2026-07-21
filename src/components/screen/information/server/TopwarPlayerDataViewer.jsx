import CountryFlagJson from "@src/assets/json/power/countryFlag.json";
import { useParamState } from "@src/hooks/useParamState";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import {
    FaChevronDown,
    FaChevronUp,
    FaCircleInfo,
    FaGlobe,
    FaMagnifyingGlass,
    FaRotateLeft,
    FaServer,
    FaSignal,
    FaTriangleExclamation,
    FaUser,
    FaUsers
} from "react-icons/fa6";
import PacmanLoader from "react-spinners/PacmanLoader";
import { Virtuoso } from "react-virtuoso";
import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import "flag-icons/sass/flag-icons.scss";
import "./TopwarPlayerDataViewer.css";

const ACTIVITY_STATUS = {
    ACTIVE: "active",
    PAUSE: "pause",
    STOP: "stop",
    UNKNOWN: "unknown"
};

function normalizeSearchText(value) {
    return String(value ?? "")
        .normalize("NFKC")
        .trim()
        .toLocaleLowerCase();
}

function getPlayerServerNumber(player) {
    const rawServer =
        player?.server ??
        player?.serverId ??
        player?.serverNumber ??
        player?.worldId ??
        "";

    return String(rawServer)
        .trim()
        .replace(/^s/i, "")
        .replace(/\D/g, "");
}

function getLastLoginSeconds(value) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed > 1_000_000_000_000
        ? parsed / 1000
        : parsed;
}

function getActivityInfo(player, nowSeconds) {
    const lastLoginSeconds =
        getLastLoginSeconds(player.lastLogin);

    if (lastLoginSeconds === null) {
        return {
            key: ACTIVITY_STATUS.UNKNOWN,
            days: null
        };
    }

    const days = Math.max(
        0,
        Math.floor(
            (nowSeconds - lastLoginSeconds) / 86400
        )
    );

    if (days > 30) {
        return {
            key: ACTIVITY_STATUS.STOP,
            days
        };
    }

    if (days > 7) {
        return {
            key: ACTIVITY_STATUS.PAUSE,
            days
        };
    }

    return {
        key: ACTIVITY_STATUS.ACTIVE,
        days
    };
}

function getCountryCode(countryKey) {
    const code = CountryFlagJson[countryKey];

    return typeof code === "string"
        ? code.toLowerCase()
        : null;
}

export default function TopwarPlayerDataViewer() {
    const { t, i18n } = useTranslation("viewer");

    const [playerList, setPlayerList] = useState([]);
    const [loadState, setLoadState] = useState("loading");
    const [reloadKey, setReloadKey] = useState(0);
    const [expandNations, setExpandNations] =
        useState(false);

    const [searchServer, setSearchServer] =
        useParamState("server", "", {
            validate: (value) => /^[0-9]*$/.test(value)
        });

    const [searchNickname, setSearchNickname] =
        useParamState("user", "");

    const locale =
        i18n.resolvedLanguage ??
        i18n.language ??
        "ko";

    const languageCode = locale.split("-")[0];

    const numberFormatter = useMemo(
        () => new Intl.NumberFormat(locale),
        [locale]
    );

    const powerFormatter = useMemo(
        () =>
            new Intl.NumberFormat(locale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }),
        [locale]
    );

    useEffect(() => {
        let mounted = true;

        setLoadState("loading");

        import("@src/assets/json/power/playerData.json")
            .then((module) => {
                if (!mounted) {
                    return;
                }

                setPlayerList(
                    Array.isArray(module.default)
                        ? module.default
                        : []
                );
                setLoadState("success");
            })
            .catch((error) => {
                console.error(
                    "Failed to load player data",
                    error
                );

                if (mounted) {
                    setPlayerList([]);
                    setLoadState("error");
                }
            });

        return () => {
            mounted = false;
        };
    }, [reloadKey]);

    const nowSeconds = Math.floor(Date.now() / 1000);

    const sortedPlayers = useMemo(
        () =>
            [...playerList]
                .sort(
                    (playerA, playerB) =>
                        Number(playerB.cp ?? 0) -
                        Number(playerA.cp ?? 0)
                )
                .map((player, index) => ({
                    ...player,
                    rank: index + 1
                })),
        [playerList]
    );

    const normalizedServer = String(searchServer ?? "")
        .trim()
        .replace(/^s/i, "")
        .replace(/\D/g, "");

    const normalizedNickname =
        normalizeSearchText(searchNickname);

    const hasActiveFilter =
        normalizedServer.length > 0 ||
        normalizedNickname.length > 0;

    const filteredPlayers = useMemo(
        () =>
            sortedPlayers.filter((player) => {
                const serverMatched =
                    normalizedServer.length === 0 ||
                    getPlayerServerNumber(player) ===
                        normalizedServer;

                const nicknameMatched =
                    normalizedNickname.length === 0 ||
                    normalizeSearchText(
                        player.nickname
                    ).includes(normalizedNickname);

                return serverMatched && nicknameMatched;
            }),
        [
            normalizedNickname,
            normalizedServer,
            sortedPlayers
        ]
    );

    useEffect(() => {
        if (
            loadState !== "success" ||
            playerList.length === 0
        ) {
            return;
        }

        if (playerList.length !== 100) {
            console.warn(
                "[TopwarPlayerDataViewer] loaded player count is not 100",
                {
                    loadedCount: playerList.length,
                    activeServerFilter:
                        normalizedServer || null,
                    activeNicknameFilter:
                        normalizedNickname || null
                }
            );
        }
    }, [
        loadState,
        normalizedNickname,
        normalizedServer,
        playerList.length
    ]);

    const activityCounts = useMemo(
        () =>
            filteredPlayers.reduce(
                (counts, player) => {
                    const activity = getActivityInfo(
                        player,
                        nowSeconds
                    );

                    counts.total += 1;
                    counts[activity.key] += 1;

                    return counts;
                },
                {
                    total: 0,
                    active: 0,
                    pause: 0,
                    stop: 0,
                    unknown: 0
                }
            ),
        [filteredPlayers, nowSeconds]
    );

    const nationList = useMemo(() => {
        const counts = filteredPlayers.reduce(
            (result, player) => {
                const country =
                    player.countryFlag || "unknown";

                result[country] =
                    (result[country] ?? 0) + 1;

                return result;
            },
            {}
        );

        return Object.entries(counts)
            .map(([country, count]) => ({
                country,
                count,
                code: getCountryCode(country)
            }))
            .sort(
                (countryA, countryB) =>
                    countryB.count - countryA.count
            );
    }, [filteredPlayers]);

    const visibleNationList = useMemo(
        () =>
            expandNations
                ? nationList
                : nationList.slice(0, 12),
        [expandNations, nationList]
    );

    const hasFilters =
        normalizedServer.length > 0 ||
        normalizedNickname.length > 0;

    const clearFilters = useCallback(() => {
        setSearchServer("");
        setSearchNickname("");
        setExpandNations(false);
    }, [
        setSearchNickname,
        setSearchServer
    ]);

    const retryLoading = useCallback(() => {
        setReloadKey((current) => current + 1);
    }, []);

    const formatPower = useCallback(
        (power) =>
            `${powerFormatter.format(
                Number(power ?? 0) / 1_000_000
            )}M`,
        [powerFormatter]
    );

    const getLastLoginLabel = useCallback(
        (activity) => {
            if (activity.days === null) {
                return t(
                    "TopwarPlayerDataViewer.lastLogin.unknown"
                );
            }

            if (activity.days === 0) {
                return t(
                    "TopwarPlayerDataViewer.lastLogin.today"
                );
            }

            return t(
                "TopwarPlayerDataViewer.lastLogin.daysAgo",
                {
                    count: activity.days,
                    value: numberFormatter.format(
                        activity.days
                    )
                }
            );
        },
        [numberFormatter, t]
    );

    const canonicalUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}${window.location.pathname}`
            : `https://www.progamer.info/${languageCode}/information/player-data`;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: t(
            "TopwarPlayerDataViewer.meta.datasetName"
        ),
        description: t(
            "TopwarPlayerDataViewer.meta.description"
        ),
        inLanguage: languageCode,
        url: canonicalUrl
    };

    return (
        <>
            <Helmet>
                <title>
                    {t(
                        "TopwarPlayerDataViewer.meta.title"
                    )}
                </title>
                <meta
                    name="description"
                    content={t(
                        "TopwarPlayerDataViewer.meta.description"
                    )}
                />
                <link
                    rel="canonical"
                    href={canonicalUrl}
                />
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>

            <article className="topwar-player-viewer">
                <header className="topwar-player-hero">
                    <div className="topwar-player-eyebrow">
                        <FaUsers aria-hidden="true" />
                        {t(
                            "TopwarPlayerDataViewer.hero.eyebrow"
                        )}
                    </div>

                    <h1>
                        {t(
                            "TopwarPlayerDataViewer.hero.title"
                        )}
                    </h1>

                    <p>
                        {t(
                            "TopwarPlayerDataViewer.hero.description"
                        )}
                    </p>
                </header>

                <section
                    className="topwar-search-panel"
                    aria-labelledby="topwar-search-title"
                >
                    <div className="topwar-section-heading">
                        <div>
                            <span className="topwar-section-kicker">
                                {t(
                                    "TopwarPlayerDataViewer.search.kicker"
                                )}
                            </span>
                            <h2 id="topwar-search-title">
                                {t(
                                    "TopwarPlayerDataViewer.search.title"
                                )}
                            </h2>
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={clearFilters}
                            disabled={!hasFilters}
                        >
                            <FaRotateLeft className="me-2" />
                            {t(
                                "TopwarPlayerDataViewer.search.clear"
                            )}
                        </button>
                    </div>

                    <div className="topwar-search-grid">
                        <label className="topwar-search-field">
                            <span>
                                <FaServer aria-hidden="true" />
                                {t(
                                    "TopwarPlayerDataViewer.search.serverLabel"
                                )}
                            </span>
                            <small>
                                {t(
                                    "TopwarPlayerDataViewer.search.serverHelp"
                                )}
                            </small>
                            <input
                                type="text"
                                inputMode="numeric"
                                className="form-control"
                                placeholder={t(
                                    "TopwarPlayerDataViewer.search.serverPlaceholder"
                                )}
                                value={searchServer}
                                onChange={(event) =>
                                    setSearchServer(
                                        event.target.value.replace(
                                            /\D/g,
                                            ""
                                        )
                                    )
                                }
                            />
                        </label>

                        <label className="topwar-search-field">
                            <span>
                                <FaUser aria-hidden="true" />
                                {t(
                                    "TopwarPlayerDataViewer.search.nicknameLabel"
                                )}
                            </span>
                            <small>
                                {t(
                                    "TopwarPlayerDataViewer.search.nicknameHelp"
                                )}
                            </small>
                            <input
                                type="search"
                                className="form-control"
                                placeholder={t(
                                    "TopwarPlayerDataViewer.search.nicknamePlaceholder"
                                )}
                                value={searchNickname}
                                onChange={(event) =>
                                    setSearchNickname(
                                        event.target.value
                                    )
                                }
                            />
                        </label>
                    </div>

                    <div
                        className="topwar-search-result"
                        aria-live="polite"
                    >
                        <FaMagnifyingGlass aria-hidden="true" />
                        <span>
                            {loadState === "success"
                                ? hasActiveFilter
                                    ? t(
                                        "TopwarPlayerDataViewer.search.filteredResultCount",
                                        {
                                            count:
                                                filteredPlayers.length,
                                            matched:
                                                numberFormatter.format(
                                                    filteredPlayers.length
                                                ),
                                            total:
                                                numberFormatter.format(
                                                    playerList.length
                                                )
                                        }
                                    )
                                    : t(
                                        "TopwarPlayerDataViewer.search.loadedResultCount",
                                        {
                                            count:
                                                playerList.length,
                                            value:
                                                numberFormatter.format(
                                                    playerList.length
                                                )
                                        }
                                    )
                                : t(
                                    "TopwarPlayerDataViewer.search.preparing"
                                )}
                        </span>
                    </div>
                </section>

                <section
                    className="topwar-stat-section"
                    aria-labelledby="topwar-stat-title"
                >
                    <div className="topwar-section-heading">
                        <div>
                            <span className="topwar-section-kicker">
                                {t(
                                    "TopwarPlayerDataViewer.stats.kicker"
                                )}
                            </span>
                            <h2 id="topwar-stat-title">
                                {t(
                                    "TopwarPlayerDataViewer.stats.title"
                                )}
                            </h2>
                        </div>
                    </div>

                    <div className="topwar-stat-grid">
                        <StatCard
                            icon={<FaUsers />}
                            label={t(
                                "TopwarPlayerDataViewer.stats.total"
                            )}
                            value={activityCounts.total}
                            formatter={numberFormatter}
                            status="total"
                        />
                        <StatCard
                            icon={<FaSignal />}
                            label={t(
                                "TopwarPlayerDataViewer.stats.active"
                            )}
                            value={activityCounts.active}
                            formatter={numberFormatter}
                            status="active"
                        />
                        <StatCard
                            icon={<FaCircleInfo />}
                            label={t(
                                "TopwarPlayerDataViewer.stats.pause"
                            )}
                            value={activityCounts.pause}
                            formatter={numberFormatter}
                            status="pause"
                        />
                        <StatCard
                            icon={
                                <FaTriangleExclamation />
                            }
                            label={t(
                                "TopwarPlayerDataViewer.stats.stop"
                            )}
                            value={activityCounts.stop}
                            formatter={numberFormatter}
                            status="stop"
                        />
                    </div>

                    <p className="topwar-stat-note">
                        {t(
                            "TopwarPlayerDataViewer.stats.criteria"
                        )}
                    </p>
                </section>

                <section
                    className="topwar-nation-section"
                    aria-labelledby="topwar-nation-title"
                >
                    <div className="topwar-section-heading">
                        <div>
                            <span className="topwar-section-kicker">
                                {t(
                                    "TopwarPlayerDataViewer.nations.kicker"
                                )}
                            </span>
                            <h2 id="topwar-nation-title">
                                {t(
                                    "TopwarPlayerDataViewer.nations.title"
                                )}
                            </h2>
                        </div>
                    </div>

                    {nationList.length === 0 ? (
                        <EmptyState
                            icon={<FaGlobe />}
                            text={t(
                                "TopwarPlayerDataViewer.nations.empty"
                            )}
                        />
                    ) : (
                        <>
                            <div className="topwar-nation-grid">
                                {visibleNationList.map(
                                    ({
                                        country,
                                        count,
                                        code
                                    }) => (
                                        <div
                                            key={country}
                                            className="topwar-nation-card"
                                            aria-label={t(
                                                "TopwarPlayerDataViewer.nations.countryCount",
                                                {
                                                    count,
                                                    value:
                                                        numberFormatter.format(
                                                            count
                                                        )
                                                }
                                            )}
                                        >
                                            <div className="topwar-nation-flag">
                                                {code ? (
                                                    <span
                                                        className={`fi fi-sq fi-${code}`}
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <FaGlobe
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </div>

                                            <strong>
                                                {numberFormatter.format(
                                                    count
                                                )}
                                            </strong>
                                        </div>
                                    )
                                )}
                            </div>

                            {nationList.length > 12 && (
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary w-100 mt-3"
                                    onClick={() =>
                                        setExpandNations(
                                            (current) =>
                                                !current
                                        )
                                    }
                                    aria-expanded={
                                        expandNations
                                    }
                                >
                                    {expandNations ? (
                                        <FaChevronUp className="me-2" />
                                    ) : (
                                        <FaChevronDown className="me-2" />
                                    )}

                                    {expandNations
                                        ? t(
                                            "TopwarPlayerDataViewer.nations.showLess"
                                        )
                                        : t(
                                            "TopwarPlayerDataViewer.nations.showMore",
                                            {
                                                count:
                                                    nationList.length -
                                                    12,
                                                value:
                                                    numberFormatter.format(
                                                        nationList.length -
                                                            12
                                                    )
                                            }
                                        )}
                                </button>
                            )}
                        </>
                    )}
                </section>

                <section
                    className="topwar-list-section"
                    aria-labelledby="topwar-list-title"
                >
                    <div className="topwar-section-heading">
                        <div>
                            <span className="topwar-section-kicker">
                                {t(
                                    "TopwarPlayerDataViewer.list.kicker"
                                )}
                            </span>
                            <h2 id="topwar-list-title">
                                {t(
                                    "TopwarPlayerDataViewer.list.title"
                                )}
                            </h2>
                        </div>
                    </div>

                    <div className="topwar-player-table-header">
                        <span>
                            {t(
                                "TopwarPlayerDataViewer.list.rank"
                            )}
                        </span>
                        <span>
                            {t(
                                "TopwarPlayerDataViewer.list.player"
                            )}
                        </span>
                        <span>
                            {t(
                                "TopwarPlayerDataViewer.list.power"
                            )}
                        </span>
                        <span className="text-end">
                            {t(
                                "TopwarPlayerDataViewer.list.server"
                            )}
                        </span>
                    </div>

                    {loadState === "loading" && (
                        <div className="topwar-loading">
                            <PacmanLoader color="#0984e3" />
                            <p>
                                {t(
                                    "TopwarPlayerDataViewer.loading"
                                )}
                            </p>
                        </div>
                    )}

                    {loadState === "error" && (
                        <div className="topwar-error-state">
                            <FaTriangleExclamation
                                aria-hidden="true"
                            />
                            <h3>
                                {t(
                                    "TopwarPlayerDataViewer.error.title"
                                )}
                            </h3>
                            <p>
                                {t(
                                    "TopwarPlayerDataViewer.error.description"
                                )}
                            </p>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={retryLoading}
                            >
                                {t(
                                    "TopwarPlayerDataViewer.error.retry"
                                )}
                            </button>
                        </div>
                    )}

                    {loadState === "success" &&
                        filteredPlayers.length === 0 && (
                            <EmptyState
                                icon={
                                    <FaMagnifyingGlass />
                                }
                                text={t(
                                    "TopwarPlayerDataViewer.noResult"
                                )}
                            />
                        )}

                    {loadState === "success" &&
                        filteredPlayers.length > 0 && (
                            <Virtuoso
                                className="topwar-player-virtuoso"
                                style={{
                                    height:
                                        "clamp(540px, 76vh, 900px)"
                                }}
                                data={filteredPlayers}
                                increaseViewportBy={300}
                                itemContent={(
                                    index,
                                    player
                                ) => {
                                    const activity =
                                        getActivityInfo(
                                            player,
                                            nowSeconds
                                        );

                                    const countryCode =
                                        getCountryCode(
                                            player.countryFlag
                                        );

                                    return (
                                        <div
                                            className={`topwar-player-row is-${activity.key}`}
                                        >
                                            <div className="topwar-player-rank">
                                                <span>
                                                    {player.rank}
                                                </span>
                                            </div>

                                            <div className="topwar-player-identity">
                                                <div className="topwar-player-name-line">
                                                    {countryCode ? (
                                                        <span
                                                            className={`fi fi-sq fi-${countryCode}`}
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <FaGlobe
                                                            aria-hidden="true"
                                                        />
                                                    )}

                                                    <strong>
                                                        {player.nickname}
                                                    </strong>
                                                </div>

                                                <div className="topwar-player-meta">
                                                    <span
                                                        className={`topwar-activity-badge is-${activity.key}`}
                                                    >
                                                        {t(
                                                            `TopwarPlayerDataViewer.activity.${activity.key}`
                                                        )}
                                                    </span>

                                                    <span>
                                                        {getLastLoginLabel(
                                                            activity
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="topwar-player-power">
                                                <small>
                                                    {t(
                                                        "TopwarPlayerDataViewer.list.power"
                                                    )}
                                                </small>
                                                <strong>
                                                    {formatPower(
                                                        player.cp
                                                    )}
                                                </strong>
                                            </div>

                                            <div className="topwar-player-server">
                                                <small>
                                                    {t(
                                                        "TopwarPlayerDataViewer.list.server"
                                                    )}
                                                </small>

                                                {player.allianceTag && (
                                                    <span className="topwar-player-alliance">
                                                        [
                                                        {
                                                            player.allianceTag
                                                        }
                                                        ]
                                                    </span>
                                                )}

                                                <strong className="topwar-player-server-number">
                                                    S
                                                    {getPlayerServerNumber(
                                                        player
                                                    ) || "-"}
                                                </strong>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                        )}
                </section>

                <section className="topwar-info-grid">
                    <div className="topwar-info-card">
                        <h2>
                            {t(
                                "TopwarPlayerDataViewer.info.search.title"
                            )}
                        </h2>
                        <p>
                            {t(
                                "TopwarPlayerDataViewer.info.search.description"
                            )}
                        </p>
                    </div>

                    <div className="topwar-info-card">
                        <h2>
                            {t(
                                "TopwarPlayerDataViewer.info.activity.title"
                            )}
                        </h2>
                        <p>
                            {t(
                                "TopwarPlayerDataViewer.info.activity.description"
                            )}
                        </p>
                    </div>

                    <div className="topwar-info-card">
                        <h2>
                            {t(
                                "TopwarPlayerDataViewer.info.notice.title"
                            )}
                        </h2>
                        <p>
                            {t(
                                "TopwarPlayerDataViewer.info.notice.description"
                            )}
                        </p>
                    </div>
                </section>

                <section className="topwar-player-faq">
                    <h2>
                        {t(
                            "TopwarPlayerDataViewer.faq.title"
                        )}
                    </h2>

                    <details>
                        <summary>
                            {t(
                                "TopwarPlayerDataViewer.faq.items.realtime.question"
                            )}
                        </summary>
                        <p>
                            {t(
                                "TopwarPlayerDataViewer.faq.items.realtime.answer"
                            )}
                        </p>
                    </details>

                    <details>
                        <summary>
                            {t(
                                "TopwarPlayerDataViewer.faq.items.search.question"
                            )}
                        </summary>
                        <p>
                            {t(
                                "TopwarPlayerDataViewer.faq.items.search.answer"
                            )}
                        </p>
                    </details>

                    <details>
                        <summary>
                            {t(
                                "TopwarPlayerDataViewer.faq.items.rank.question"
                            )}
                        </summary>
                        <p>
                            {t(
                                "TopwarPlayerDataViewer.faq.items.rank.answer"
                            )}
                        </p>
                    </details>
                </section>
            </article>
        </>
    );
}

function StatCard({
    icon,
    label,
    value,
    formatter,
    status
}) {
    return (
        <div className={`topwar-stat-card is-${status}`}>
            <div className="topwar-stat-icon">
                {icon}
            </div>
            <span>{label}</span>
            <strong>{formatter.format(value)}</strong>
        </div>
    );
}

function EmptyState({ icon, text }) {
    return (
        <div className="topwar-empty-state">
            {icon && (
                <div className="topwar-empty-icon">
                    {icon}
                </div>
            )}
            <p>{text}</p>
        </div>
    );
}