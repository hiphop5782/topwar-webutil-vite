import {
    useCallback,
    useDeferredValue,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import "./LionDanceRanking.css?rev=20260717-dataset-filenames-v6";

const lionDanceModules = import.meta.glob(
    "@src/assets/json/liondance/*.json",
    {
        eager: true,
        import: "default",
    },
);

const UNIT_MAP = {
    "": 1,
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
    T: 1_000_000_000_000,
};

const POWER_KEYS = new Set([
    "power",
    "combatpower",
    "fightpower",
    "battlepower",
    "totalpower",
    "userpower",
    "playerpower",
    "cp",
]);

function parseCompactNumber(value) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    if (value == null || value === "") {
        return 0;
    }

    const normalized = String(value)
        .trim()
        .replaceAll(",", "");

    const match = normalized.match(
        /^(-?\d+(?:\.\d+)?)\s*([KMBT]?)$/i,
    );

    if (!match) {
        const numeric = Number(normalized);
        return Number.isFinite(numeric) ? numeric : 0;
    }

    return (
        Number(match[1]) *
        UNIT_MAP[match[2].toUpperCase()]
    );
}

function parsePlayerInfo(value) {
    if (!value) return {};
    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

function normalizeKey(value) {
    return String(value)
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();
}

function findPower(...sources) {
    const queue = sources
        .filter(
            (source) =>
                source &&
                typeof source === "object",
        )
        .map((source) => ({
            source,
            depth: 0,
        }));

    const visited = new Set();

    while (queue.length > 0) {
        const current = queue.shift();

        if (
            !current ||
            visited.has(current.source)
        ) {
            continue;
        }

        visited.add(current.source);

        for (
            const [key, value]
            of Object.entries(current.source)
        ) {
            if (
                POWER_KEYS.has(normalizeKey(key)) &&
                parseCompactNumber(value) > 0
            ) {
                return value;
            }

            if (
                current.depth < 2 &&
                value &&
                typeof value === "object" &&
                !Array.isArray(value)
            ) {
                queue.push({
                    source: value,
                    depth: current.depth + 1,
                });
            }
        }
    }

    return null;
}

function getAvatar(info) {
    return (
        info.headimgurl_custom ||
        info.headimgurl ||
        info.moreHeadImgs?.[0] ||
        null
    );
}

function normalizePlayer(row, unknownName) {
    const info = parsePlayerInfo(
        row.playerInfo,
    );

    const rawScore =
        row.contents?.[0] ?? 0;

    const rawPower = findPower(
        row,
        info,
    );

    return {
        type: "player",
        rank: Number(row.rank) || 0,
        name:
            info.username ||
            info.nickname ||
            unknownName,
        serverId:
            Number(row.serverId) || 0,
        avatar: getAvatar(info),
        level:
            Number(info.level) || null,
        score:
            parseCompactNumber(rawScore),
        rawScore,
        power:
            parseCompactNumber(rawPower),
        rawPower,
    };
}

function normalizeAlliance(
    row,
    unknownName,
) {
    const rawScore =
        row.contents?.[0] ?? 0;

    return {
        type: "alliance",
        rank: Number(row.rank) || 0,
        name:
            row.allianceName ||
            unknownName,
        serverId:
            Number(row.serverId) || 0,
        score:
            parseCompactNumber(rawScore),
        rawScore,
    };
}

function normalizeServerParam(value) {
    const normalized = String(
        value ?? "",
    ).trim();

    return /^\d+$/.test(normalized)
        ? String(Number(normalized))
        : "all";
}

function readFilterParams(
    searchParams,
) {
    const nickname =
        searchParams
            .get("nickname")
            ?.trim() ?? "";

    const alliance =
        searchParams
            .get("alliance")
            ?.trim() ?? "";

    if (alliance) {
        return {
            mode: "alliance",
            query: alliance,
            server:
                normalizeServerParam(
                    searchParams.get(
                        "server",
                    ),
                ),
        };
    }

    return {
        mode: "player",
        query: nickname,
        server:
            normalizeServerParam(
                searchParams.get(
                    "server",
                ),
            ),
    };
}

function normalizeSearch(value) {
    return String(value ?? "")
        .normalize("NFKC")
        .toLocaleLowerCase()
        .trim();
}

function resolveLocale(language) {
    if (language?.startsWith("en")) {
        return "en-US";
    }

    if (language?.startsWith("ja")) {
        return "ja-JP";
    }

    return "ko-KR";
}

function formatDatasetType(type, t) {
    const normalized = String(
        type ?? "",
    )
        .trim()
        .toLowerCase();

    if (!normalized) {
        return "";
    }

    if (normalized === "champion") {
        return t(
            "LionDanceRanking.datasets.champion",
        );
    }

    const seasonMatch =
        normalized.match(
            /^season[-_ ]?(\d+)$/i,
        );

    if (seasonMatch) {
        return t(
            "LionDanceRanking.datasets.season",
            {
                season: Number(
                    seasonMatch[1],
                ),
            },
        );
    }

    return type
        .replace(/[-_]+/g, " ")
        .replace(
            /\b\w/g,
            (character) =>
                character.toUpperCase(),
        );
}

function formatMonth(
    key,
    locale,
    t,
) {
    const match = key.match(
        /^(\d{4})-(\d{2})(?:-(.+))?$/i,
    );

    if (!match) {
        return key;
    }

    const date = new Date(
        Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            1,
        ),
    );

    const monthLabel =
        new Intl.DateTimeFormat(
            locale,
            {
                year: "numeric",
                month: "long",
                timeZone: "UTC",
            },
        ).format(date);

    const typeLabel =
        formatDatasetType(
            match[3],
            t,
        );

    return typeLabel
        ? `${monthLabel} · ${typeLabel}`
        : monthLabel;
}

function formatCompact(
    raw,
    numeric,
    locale,
) {
    if (
        typeof raw === "string" &&
        /^-?\d+(?:\.\d+)?\s*[KMBT]$/i.test(
            raw.trim(),
        )
    ) {
        return raw
            .trim()
            .replace(/\s+/g, "")
            .toUpperCase();
    }

    return new Intl.NumberFormat(
        locale,
        {
            notation: "compact",
            maximumFractionDigits: 2,
        },
    ).format(numeric || 0);
}

function formatInteger(
    value,
    locale,
) {
    return new Intl.NumberFormat(
        locale,
    ).format(value || 0);
}

function buildMonths(locale, t) {
    return Object.entries(
        lionDanceModules,
    )
        .map(([path, data]) => {
            const key =
                path
                    .split("/")
                    .pop()
                    ?.replace(
                        /\.json$/i,
                        "",
                    ) ?? path;

            return {
                key,
                label: formatMonth(
                    key,
                    locale,
                    t,
                ),
                data,
            };
        })
        .sort((a, b) =>
            b.key.localeCompare(a.key),
        );
}

function resolveDatasetKey(
    searchParams,
    months,
) {
    const requested =
        searchParams
            .get("dataset")
            ?.trim()
            .replace(
                /\.json$/i,
                "",
            ) ?? "";

    const exists = months.some(
        (item) =>
            item.key === requested,
    );

    return exists
        ? requested
        : (months[0]?.key ?? "");
}

function initials(name) {
    return Array.from(
        String(name || "?").trim(),
    )
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

function Avatar({
    src,
    name,
    alt,
}) {
    const [failed, setFailed] =
        useState(false);

    if (!src || failed) {
        return (
            <span className="ldv-avatar ldv-avatar--fallback">
                {initials(name)}
            </span>
        );
    }

    return (
        <img
            className="ldv-avatar"
            src={src}
            alt={alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() =>
                setFailed(true)
            }
        />
    );
}

function Rank({ value }) {
    return (
        <span
            className={
                `ldv-rank ` +
                `ldv-rank--${Math.min(
                    value,
                    4,
                )}`
            }
        >
            {value}
        </span>
    );
}

function RankingRows({
    rows,
    mode,
    showPower,
    locale,
    t,
    maxScore,
}) {
    return rows.map((row) => {
        const scoreText =
            formatCompact(
                row.rawScore,
                row.score,
                locale,
            );

        const powerText =
            formatCompact(
                row.rawPower,
                row.power,
                locale,
            );

        const scoreWidth =
            maxScore > 0
                ? `${Math.max(
                    2,
                    (
                        row.score /
                        maxScore
                    ) * 100,
                )}%`
                : "0%";

        return (
            <tr
                key={
                    `${mode}-` +
                    `${row.rank}-` +
                    `${row.serverId}-` +
                    `${row.name}`
                }
            >
                <td className="ldv-rank-cell">
                    <Rank
                        value={
                            row.rank
                        }
                    />
                </td>

                <td className="ldv-name-cell">
                    <div
                        className={
                            `ldv-identity ${
                                mode ===
                                "alliance"
                                    ? "ldv-identity--alliance"
                                    : ""
                            }`
                        }
                    >
                        {mode ===
                            "player" && (
                            <Avatar
                                src={
                                    row.avatar
                                }
                                name={
                                    row.name
                                }
                                alt={t(
                                    "LionDanceRanking.common.profileAlt",
                                    {
                                        name:
                                            row.name,
                                    },
                                )}
                            />
                        )}

                        <div className="ldv-identity__content">
                            <strong
                                className="ldv-desktop-name"
                                title={
                                    row.name
                                }
                            >
                                {
                                    row.name
                                }
                            </strong>

                            {mode ===
                                "player" &&
                                row.level && (
                                <small className="ldv-desktop-level">
                                    {t(
                                        "LionDanceRanking.table.level",
                                        {
                                            level:
                                                row.level,
                                        },
                                    )}
                                </small>
                            )}

                            <div className="ldv-mobile-compact">
                                <div className="ldv-mobile-line">
                                    <strong
                                        className="ldv-mobile-name"
                                        title={
                                            row.name
                                        }
                                    >
                                        {
                                            row.name
                                        }
                                    </strong>

                                    <span className="ldv-mobile-server-badge">
                                        {t(
                                            "LionDanceRanking.common.serverShort",
                                            {
                                                serverId:
                                                    row.serverId,
                                            },
                                        )}
                                    </span>

                                    {mode ===
                                        "player" &&
                                        showPower &&
                                        row.power >
                                            0 && (
                                        <span className="ldv-mobile-power-badge">
                                            {
                                                powerText
                                            }
                                        </span>
                                    )}

                                    <strong className="ldv-mobile-score-value">
                                        {
                                            scoreText
                                        }
                                    </strong>
                                </div>

                                <span
                                    className="ldv-mobile-score-track"
                                    aria-hidden="true"
                                >
                                    <span
                                        style={{
                                            width:
                                                scoreWidth,
                                        }}
                                    />
                                </span>
                            </div>
                        </div>
                    </div>
                </td>

                <td className="ldv-server-cell">
                    {t(
                        "LionDanceRanking.common.serverShort",
                        {
                            serverId:
                                row.serverId,
                        },
                    )}
                </td>

                {mode === "player" &&
                    showPower && (
                    <td className="ldv-power-cell">
                        {row.power > 0
                            ? powerText
                            : t(
                                "LionDanceRanking.common.notAvailable",
                            )}
                    </td>
                )}

                <td className="ldv-score-cell">
                    <div className="ldv-score-desktop">
                        <strong>
                            {scoreText}
                        </strong>

                        <span
                            className="ldv-score-track"
                            aria-hidden="true"
                        >
                            <span
                                style={{
                                    width:
                                        scoreWidth,
                                }}
                            />
                        </span>
                    </div>
                </td>
            </tr>
        );
    });
}

export default function LionDanceRanking() {
    const { t, i18n } =
        useTranslation("viewer");

    const [
        searchParams,
        setSearchParams,
    ] = useSearchParams();

    const locale = resolveLocale(
        i18n.resolvedLanguage ||
        i18n.language,
    );

    const months = useMemo(
        () =>
            buildMonths(
                locale,
                t,
            ),
        [locale, t],
    );

    const initialFilters =
        readFilterParams(
            searchParams,
        );

    const [
        selectedMonth,
        setSelectedMonth,
    ] = useState(() =>
        resolveDatasetKey(
            searchParams,
            months,
        ),
    );

    const [mode, setMode] =
        useState(
            () =>
                initialFilters.mode,
        );

    const [query, setQuery] =
        useState(
            () =>
                initialFilters.query,
        );

    const [server, setServer] =
        useState(
            () =>
                initialFilters.server,
        );

    const deferredQuery =
        useDeferredValue(query);

    const updateFilterParams =
        useCallback(
            ({
                nextMode,
                nextQuery,
                nextServer,
            }) => {
                const nextParams =
                    new URLSearchParams(
                        searchParams,
                    );

                const normalizedQuery =
                    nextQuery.trim();

                if (
                    nextServer ===
                    "all"
                ) {
                    nextParams.delete(
                        "server",
                    );
                } else {
                    nextParams.set(
                        "server",
                        nextServer,
                    );
                }

                if (
                    nextMode ===
                    "player"
                ) {
                    nextParams.delete(
                        "alliance",
                    );

                    if (
                        normalizedQuery
                    ) {
                        nextParams.set(
                            "nickname",
                            normalizedQuery,
                        );
                    } else {
                        nextParams.delete(
                            "nickname",
                        );
                    }
                } else {
                    nextParams.delete(
                        "nickname",
                    );

                    if (
                        normalizedQuery
                    ) {
                        nextParams.set(
                            "alliance",
                            normalizedQuery,
                        );
                    } else {
                        nextParams.delete(
                            "alliance",
                        );
                    }
                }

                if (
                    nextParams.toString() !==
                    searchParams.toString()
                ) {
                    setSearchParams(
                        nextParams,
                        {
                            replace: true,
                        },
                    );
                }
            },
            [
                searchParams,
                setSearchParams,
            ],
        );

    const updateDatasetParam =
        useCallback(
            (nextDataset) => {
                const nextParams =
                    new URLSearchParams(
                        searchParams,
                    );

                nextParams.set(
                    "dataset",
                    nextDataset,
                );

                if (
                    nextParams.toString() !==
                    searchParams.toString()
                ) {
                    setSearchParams(
                        nextParams,
                        {
                            replace: true,
                        },
                    );
                }
            },
            [
                searchParams,
                setSearchParams,
            ],
        );

    useEffect(() => {
        const nextFilters =
            readFilterParams(
                searchParams,
            );

        const nextDataset =
            resolveDatasetKey(
                searchParams,
                months,
            );

        setMode((current) =>
            current ===
            nextFilters.mode
                ? current
                : nextFilters.mode,
        );

        setQuery((current) =>
            current ===
            nextFilters.query
                ? current
                : nextFilters.query,
        );

        setServer((current) =>
            current ===
            nextFilters.server
                ? current
                : nextFilters.server,
        );

        setSelectedMonth(
            (current) =>
                current ===
                nextDataset
                    ? current
                    : nextDataset,
        );

        const requestedDataset =
            searchParams
                .get("dataset")
                ?.trim()
                .replace(
                    /\.json$/i,
                    "",
                ) ?? "";

        if (
            nextDataset &&
            requestedDataset !==
                nextDataset
        ) {
            const nextParams =
                new URLSearchParams(
                    searchParams,
                );

            nextParams.set(
                "dataset",
                nextDataset,
            );

            setSearchParams(
                nextParams,
                {
                    replace: true,
                },
            );
        }
    }, [
        months,
        searchParams,
        setSearchParams,
    ]);

    const month =
        months.find(
            (item) =>
                item.key ===
                selectedMonth,
        ) ?? months[0];

    const players = useMemo(
        () =>
            (
                month?.data
                    ?.playerRank ?? []
            ).map((row) =>
                normalizePlayer(
                    row,
                    t(
                        "LionDanceRanking.common.unknownPlayer",
                    ),
                ),
            ),
        [month, t],
    );

    const alliances = useMemo(
        () =>
            (
                month?.data
                    ?.allianceRank ?? []
            ).map((row) =>
                normalizeAlliance(
                    row,
                    t(
                        "LionDanceRanking.common.unknownAlliance",
                    ),
                ),
            ),
        [month, t],
    );

    const showPower =
        players.some(
            (row) =>
                row.power > 0,
        );

    const sourceRows =
        mode === "player"
            ? players
            : alliances;

    const servers = useMemo(
        () =>
            [
                ...new Set(
                    sourceRows.map(
                        (row) =>
                            row.serverId,
                    ),
                ),
            ].sort(
                (a, b) =>
                    a - b,
            ),
        [sourceRows],
    );

    const serverOptions =
        useMemo(() => {
            if (
                server === "all"
            ) {
                return servers;
            }

            const selectedServer =
                Number(server);

            if (
                !Number.isFinite(
                    selectedServer,
                ) ||
                servers.includes(
                    selectedServer,
                )
            ) {
                return servers;
            }

            return [
                ...servers,
                selectedServer,
            ].sort(
                (a, b) =>
                    a - b,
            );
        }, [
            server,
            servers,
        ]);

    const rows = useMemo(() => {
        const normalizedQuery =
            normalizeSearch(
                deferredQuery,
            );

        const filtered =
            sourceRows.filter(
                (row) => {
                    if (
                        server !==
                            "all" &&
                        String(
                            row.serverId,
                        ) !== server
                    ) {
                        return false;
                    }

                    if (
                        !normalizedQuery
                    ) {
                        return true;
                    }

                    return [
                        row.name,
                        row.serverId,
                    ].some(
                        (value) =>
                            normalizeSearch(
                                value,
                            ).includes(
                                normalizedQuery,
                            ),
                    );
                },
            );

        return [...filtered].sort(
            (a, b) =>
                b.score -
                    a.score ||
                a.rank -
                    b.rank,
        );
    }, [
        deferredQuery,
        server,
        sourceRows,
    ]);

    const maxScore = Math.max(
        ...rows.map(
            (row) =>
                row.score,
        ),
        0,
    );

    const allServerCount =
        new Set([
            ...players.map(
                (row) =>
                    row.serverId,
            ),
            ...alliances.map(
                (row) =>
                    row.serverId,
            ),
        ]).size;

    const totalScore =
        sourceRows.reduce(
            (sum, row) =>
                sum + row.score,
            0,
        );

    if (months.length === 0) {
        return (
            <main className="ldv-page">
                <div className="ldv-container">
                    <section className="ldv-empty">
                        <h1>
                            {t(
                                "LionDanceRanking.empty.noFiles",
                            )}
                        </h1>

                        <p>
                            {t(
                                "LionDanceRanking.empty.addFiles",
                                {
                                    path:
                                        "@src/assets/json/liondance/2026-07-champion.json / 2026-07-season5.json",
                                },
                            )}
                        </p>
                    </section>
                </div>
            </main>
        );
    }

    return (
        <main className="ldv-page">
            <div className="ldv-container">
                <header className="ldv-hero">
                    <div>
                        <h1>
                            {t(
                                "LionDanceRanking.hero.title",
                            )}
                        </h1>

                        <p>
                            {t(
                                "LionDanceRanking.hero.description",
                            )}
                        </p>
                    </div>
                </header>

                <section
                    className="ldv-toolbar"
                    aria-label={t(
                        "LionDanceRanking.filters.ariaLabel",
                    )}
                >
                    <label className="ldv-field">
                        <span>
                            {t(
                                "LionDanceRanking.filters.month",
                            )}
                        </span>

                        <select
                            value={
                                month?.key ??
                                ""
                            }
                            onChange={(
                                event,
                            ) => {
                                const nextDataset =
                                    event
                                        .target
                                        .value;

                                setSelectedMonth(
                                    nextDataset,
                                );

                                updateDatasetParam(
                                    nextDataset,
                                );
                            }}
                        >
                            {months.map(
                                (item) => (
                                    <option
                                        key={
                                            item.key
                                        }
                                        value={
                                            item.key
                                        }
                                    >
                                        {
                                            item.label
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </label>

                    <label className="ldv-field ldv-field--search">
                        <span>
                            {t(
                                "LionDanceRanking.filters.search",
                            )}
                        </span>

                        <input
                            type="search"
                            value={query}
                            onChange={(
                                event,
                            ) => {
                                const nextQuery =
                                    event
                                        .target
                                        .value;

                                setQuery(
                                    nextQuery,
                                );

                                updateFilterParams(
                                    {
                                        nextMode:
                                            mode,
                                        nextQuery,
                                        nextServer:
                                            server,
                                    },
                                );
                            }}
                            placeholder={
                                mode ===
                                "player"
                                    ? t(
                                        "LionDanceRanking.filters.playerPlaceholder",
                                    )
                                    : t(
                                        "LionDanceRanking.filters.alliancePlaceholder",
                                    )
                            }
                        />
                    </label>

                    <label className="ldv-field">
                        <span>
                            {t(
                                "LionDanceRanking.filters.server",
                            )}
                        </span>

                        <select
                            value={server}
                            onChange={(
                                event,
                            ) => {
                                const nextServer =
                                    event
                                        .target
                                        .value;

                                setServer(
                                    nextServer,
                                );

                                updateFilterParams(
                                    {
                                        nextMode:
                                            mode,
                                        nextQuery:
                                            query,
                                        nextServer,
                                    },
                                );
                            }}
                        >
                            <option value="all">
                                {t(
                                    "LionDanceRanking.filters.allServers",
                                )}
                            </option>

                            {serverOptions.map(
                                (
                                    serverId,
                                ) => (
                                    <option
                                        key={
                                            serverId
                                        }
                                        value={
                                            serverId
                                        }
                                    >
                                        {t(
                                            "LionDanceRanking.common.serverShort",
                                            {
                                                serverId,
                                            },
                                        )}
                                    </option>
                                ),
                            )}
                        </select>
                    </label>
                </section>

                <nav
                    className="ldv-tabs"
                    aria-label={t(
                        "LionDanceRanking.tabs.ariaLabel",
                    )}
                >
                    <button
                        type="button"
                        className={
                            mode ===
                            "player"
                                ? "is-active"
                                : ""
                        }
                        onClick={() => {
                            const nextQuery =
                                mode ===
                                "player"
                                    ? query
                                    : "";

                            setQuery(
                                nextQuery,
                            );

                            setMode(
                                "player",
                            );

                            updateFilterParams(
                                {
                                    nextMode:
                                        "player",
                                    nextQuery,
                                    nextServer:
                                        server,
                                },
                            );
                        }}
                    >
                        {t(
                            "LionDanceRanking.tabs.player",
                        )}

                        <span>
                            {
                                players.length
                            }
                        </span>
                    </button>

                    <button
                        type="button"
                        className={
                            mode ===
                            "alliance"
                                ? "is-active"
                                : ""
                        }
                        onClick={() => {
                            const nextQuery =
                                mode ===
                                "alliance"
                                    ? query
                                    : "";

                            setQuery(
                                nextQuery,
                            );

                            setMode(
                                "alliance",
                            );

                            updateFilterParams(
                                {
                                    nextMode:
                                        "alliance",
                                    nextQuery,
                                    nextServer:
                                        server,
                                },
                            );
                        }}
                    >
                        {t(
                            "LionDanceRanking.tabs.alliance",
                        )}

                        <span>
                            {
                                alliances.length
                            }
                        </span>
                    </button>
                </nav>

                <section
                    className="ldv-metrics"
                    aria-label={t(
                        "LionDanceRanking.metrics.ariaLabel",
                    )}
                >
                    <article>
                        <span>
                            {t(
                                "LionDanceRanking.metrics.players",
                            )}
                        </span>

                        <strong>
                            {formatInteger(
                                players.length,
                                locale,
                            )}
                        </strong>
                    </article>

                    <article>
                        <span>
                            {t(
                                "LionDanceRanking.metrics.alliances",
                            )}
                        </span>

                        <strong>
                            {formatInteger(
                                alliances.length,
                                locale,
                            )}
                        </strong>
                    </article>

                    <article>
                        <span>
                            {t(
                                "LionDanceRanking.metrics.servers",
                            )}
                        </span>

                        <strong>
                            {formatInteger(
                                allServerCount,
                                locale,
                            )}
                        </strong>
                    </article>

                    <article>
                        <span>
                            {mode ===
                            "player"
                                ? t(
                                    "LionDanceRanking.metrics.playerTotalScore",
                                )
                                : t(
                                    "LionDanceRanking.metrics.allianceTotalScore",
                                )}
                        </span>

                        <strong>
                            {formatCompact(
                                totalScore,
                                totalScore,
                                locale,
                            )}
                        </strong>
                    </article>
                </section>

                <section className="ldv-ranking">
                    <div className="ldv-ranking-heading">
                        <div>
                            <h2>
                                {mode ===
                                "player"
                                    ? t(
                                        "LionDanceRanking.ranking.playerTitle",
                                    )
                                    : t(
                                        "LionDanceRanking.ranking.allianceTitle",
                                    )}
                            </h2>
                        </div>

                        <span>
                            {t(
                                "LionDanceRanking.ranking.resultCount",
                                {
                                    count:
                                        rows.length,
                                },
                            )}
                        </span>
                    </div>

                    {rows.length ===
                    0 ? (
                        <div className="ldv-empty ldv-empty--inline">
                            <strong>
                                {t(
                                    "LionDanceRanking.empty.noResults",
                                )}
                            </strong>

                            <span>
                                {t(
                                    "LionDanceRanking.empty.adjustFilters",
                                )}
                            </span>
                        </div>
                    ) : (
                        <div className="ldv-table-wrap">
                            <table className="ldv-table">
                                <colgroup>
                                    <col className="ldv-col-rank" />
                                    <col />
                                    <col className="ldv-col-server" />

                                    {mode ===
                                        "player" &&
                                        showPower && (
                                        <col className="ldv-col-power" />
                                    )}

                                    <col className="ldv-col-score" />
                                </colgroup>

                                <thead>
                                    <tr>
                                        <th>
                                            {t(
                                                "LionDanceRanking.table.rank",
                                            )}
                                        </th>

                                        <th>
                                            {mode ===
                                            "player"
                                                ? t(
                                                    "LionDanceRanking.table.player",
                                                )
                                                : t(
                                                    "LionDanceRanking.table.alliance",
                                                )}
                                        </th>

                                        <th>
                                            {t(
                                                "LionDanceRanking.table.server",
                                            )}
                                        </th>

                                        {mode ===
                                            "player" &&
                                            showPower && (
                                            <th>
                                                {t(
                                                    "LionDanceRanking.table.power",
                                                )}
                                            </th>
                                        )}

                                        <th>
                                            {t(
                                                "LionDanceRanking.table.score",
                                            )}
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    <RankingRows
                                        rows={
                                            rows
                                        }
                                        mode={
                                            mode
                                        }
                                        showPower={
                                            showPower
                                        }
                                        locale={
                                            locale
                                        }
                                        t={t}
                                        maxScore={
                                            maxScore
                                        }
                                    />
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}