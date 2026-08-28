import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FaChevronDown, FaMagnifyingGlass, FaRotateRight, FaSliders } from "react-icons/fa6";
import { Virtuoso } from "react-virtuoso";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import DataLoadingPlaceholder from "@src/components/template/DataLoadingPlaceholder";
import TopwarOverallGroupView from "./TopwarOverallGroupView";
import {
    listOverallHistoryFiles,
    loadDataFile,
    loadOverallLatest,
} from "@src/services/topwarDataRepository";

import "./TopwarDataOverAll.css";

function normalize(value) {
    return String(value ?? "")
        .normalize("NFKD")
        .replace(/\p{M}+/gu, "")
        .toLocaleLowerCase("ko-KR")
        .replaceAll("ß", "ss")
        .replaceAll("ς", "σ")
        .trim();
}

function formatNumber(value, locale) {
    const number = Number(value);
    return Number.isFinite(number)
        ? number.toLocaleString(locale)
        : "-";
}

function formatCompactNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";

    const units = ["", "K", "M", "B", "T", "Q"];
    let compact = Math.abs(number);
    let unitIndex = 0;

    while (compact >= 1000 && unitIndex < units.length - 1) {
        compact /= 1000;
        unitIndex += 1;
    }

    const fractionDigits = compact >= 100 ? 0 : compact >= 10 ? 1 : 2;
    const sign = number < 0 ? "-" : "";
    return `${sign}${compact.toLocaleString("en-US", {
        maximumFractionDigits: fractionDigits,
    })}${units[unitIndex]}`;
}

function formatDate(value, locale) {
    const timestamp = Date.parse(value ?? "");
    if (!Number.isFinite(timestamp)) return "-";

    return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "medium",
    }).format(timestamp);
}

function formatRelativeDate(value, locale, now) {
    const timestamp = Date.parse(value ?? "");
    if (!Number.isFinite(timestamp)) return "-";

    const difference = timestamp - now;
    const absolute = Math.abs(difference);
    const units = absolute < 60 * 60_000
        ? ["minute", 60_000]
        : absolute < 24 * 60 * 60_000
            ? ["hour", 60 * 60_000]
            : ["day", 24 * 60 * 60_000];

    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
        .format(Math.round(difference / units[1]), units[0]);
}

function getActivity(lastLogin, t) {
    let timestamp = Number(lastLogin);
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return { key: "unknown", label: t("activity.unknown") };
    }
    if (timestamp < 1_000_000_000_000) timestamp *= 1000;

    const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
    if (days > 30) return { key: "stop", label: t("activity.stop", { count: days }) };
    if (days > 7) return { key: "pause", label: t("activity.pause", { count: days }) };
    return {
        key: "active",
        label: days === 0 ? t("activity.today") : t("activity.active", { count: days }),
    };
}

function getRecentInbound(player, movements) {
    const cutoff = Date.now() - 30 * 86_400_000;

    return movements
        .filter((row) => {
            const detectedAt = Date.parse(row.detectedAt ?? "");
            return Number.isFinite(detectedAt)
                && detectedAt >= cutoff
                && Number(row.toServer) === Number(player.server);
        })
        .sort((left, right) =>
            String(right.detectedAt).localeCompare(String(left.detectedAt)),
        )[0] ?? null;
}

function sourceLabel(source, t) {
    if (source === "both") return t("source.both");
    if (source === "realpower") return t("source.realpower");
    return t("source.power");
}

export default function TopwarDataOverAll() {
    const { t, i18n } = useTranslation("viewer", { keyPrefix: "TopwarDataOverAll" });
    const locale = i18n.resolvedLanguage?.startsWith("ja")
        ? "ja-JP"
        : i18n.resolvedLanguage?.startsWith("en") ? "en-US" : "ko-KR";
    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState("");
    const [allianceQuery, setAllianceQuery] = useState("");
    const [server, setServer] = useState("");
    const [source, setSource] = useState("all");
    const [serverOut, setServerOut] = useState("");
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [expandedPlayers, setExpandedPlayers] = useState(() => new Set());
    const [nicknameHistory, setNicknameHistory] = useState(() => new Map());
    const [historyLoading, setHistoryLoading] = useState(true);
    const [movementHistory, setMovementHistory] = useState(null);
    const [movementLoading, setMovementLoading] = useState(true);
    const [relativeTimeNow, setRelativeTimeNow] = useState(Date.now);
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const timer = window.setInterval(() => setRelativeTimeNow(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);
    const requestedView = searchParams.get("view");
    const view = ["players", "servers", "alliances"].includes(requestedView)
        ? requestedView
        : "players";
    const deferredQuery = useDeferredValue(query);
    const deferredAllianceQuery = useDeferredValue(allianceQuery);

    useEffect(() => {
        let cancelled = false;

        loadOverallLatest()
            .then((data) => {
                if (!cancelled) {
                    setDocument(data);
                    setError(null);
                }
            })
            .catch((loadError) => {
                console.error("통합 플레이어 스냅샷 로드 실패", loadError);
                if (!cancelled) setError(loadError);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        async function loadMovementHistory() {
            try {
                const files = await listOverallHistoryFiles("movement");
                const documents = await Promise.all(
                    files.map((file) => loadDataFile(file.path)),
                );
                const grouped = new Map();

                for (const data of documents) {
                    for (const row of data?.rows ?? []) {
                        const uid = String(row.uid ?? "");
                        if (!uid) continue;
                        const history = grouped.get(uid) ?? [];
                        history.push(row);
                        grouped.set(uid, history);
                    }
                }

                setMovementHistory(grouped);
            } catch (movementError) {
                console.error("서버 이동 이력 로드 실패", movementError);
                setMovementHistory(new Map());
            } finally {
                setMovementLoading(false);
            }
        }

        loadMovementHistory();
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadNicknameHistory() {
            try {
                const files = await listOverallHistoryFiles("nickname");
                const documents = await Promise.all(
                    files.map(async (file) => ({
                        date: file.date,
                        data: await loadDataFile(file.path),
                    })),
                );
                const grouped = new Map();

                for (const { date, data } of documents) {
                    for (const row of data?.rows ?? []) {
                        const uid = String(row.uid ?? "");
                        if (!uid) continue;
                        const history = grouped.get(uid) ?? [];
                        history.push({ ...row, date });
                        grouped.set(uid, history);
                    }
                }

                for (const history of grouped.values()) {
                    history.sort((left, right) =>
                        String(right.detectedAt ?? right.date)
                            .localeCompare(String(left.detectedAt ?? left.date)),
                    );
                }

                if (!cancelled) setNicknameHistory(grouped);
            } catch (historyError) {
                console.error("닉네임 변경 이력 로드 실패", historyError);
            } finally {
                if (!cancelled) setHistoryLoading(false);
            }
        }

        loadNicknameHistory();
        return () => { cancelled = true; };
    }, []);

    const players = useMemo(
        () => Array.isArray(document?.players) ? document.players : [],
        [document],
    );

    const searchablePlayers = useMemo(() => players
        .map((player) => ({
            ...player,
            nicknameSearchText: [
                player.nickname,
                ...(nicknameHistory.get(String(player.uid)) ?? [])
                    .flatMap((row) => [row.fromNickname, row.toNickname]),
            ]
                .map(normalize)
                .join("\u0000"),
            allianceSearchText: [player.allianceTag, player.allianceName]
                .map(normalize)
                .join("\u0000"),
        }))
        .sort((left, right) =>
            Number(right.power ?? 0) - Number(left.power ?? 0)
            || String(left.uid).localeCompare(String(right.uid)),
        ), [players, nicknameHistory]);

    const filteredPlayers = useMemo(() => {
        const keyword = normalize(deferredQuery);
        const allianceKeyword = normalize(deferredAllianceQuery);
        const serverNumber = server === "" ? null : Number(server);
        const serverOutNumber = serverOut === "" ? null : Number(serverOut);

        return searchablePlayers.filter((player) => {
                if (source !== "all" && player.source !== source) return false;
                if (serverNumber != null && Number(player.server) !== serverNumber) return false;
                if (keyword && !player.nicknameSearchText.includes(keyword)) return false;
                if (allianceKeyword && !player.allianceSearchText.includes(allianceKeyword)) return false;
                if (serverOutNumber != null) {
                    const movements = movementHistory?.get(String(player.uid)) ?? [];
                    if (!movements.some((row) => Number(row.fromServer) === serverOutNumber)) return false;
                }

                return true;
            });
    }, [searchablePlayers, deferredQuery, deferredAllianceQuery, server, source, serverOut, movementHistory]);

    const statistics = useMemo(() => {
        const counts = { total: filteredPlayers.length, both: 0, power: 0, realpower: 0 };
        for (const player of filteredPlayers) {
            const key = ["both", "power", "realpower"].includes(player.source)
                ? player.source
                : "power";
            counts[key] += 1;
        }
        return counts;
    }, [filteredPlayers]);

    const resetFilters = () => {
        setQuery("");
        setAllianceQuery("");
        setServer("");
        setSource("all");
        setServerOut("");
    };

    const togglePlayer = (uid) => {
        setExpandedPlayers((current) => {
            const next = new Set(current);
            if (next.has(uid)) next.delete(uid);
            else next.add(uid);
            return next;
        });
    };

    const changeView = (nextView) => {
        const next = new URLSearchParams(searchParams);
        if (nextView === "players") next.delete("view");
        else next.set("view", nextView);
        setSearchParams(next, { replace: true });
    };

    if (loading) {
        return (
            <section className="overall-viewer">
                <h1>{t("title")}</h1>
                <p className="text-muted">{t("loading")}</p>
                <DataLoadingPlaceholder />
            </section>
        );
    }

    if (error || !document) {
        return (
            <section className="overall-viewer">
                <h1>{t("title")}</h1>
                <div className="alert alert-danger">
                    {t("loadError")}<br />
                    <small>{error?.message ?? t("checkLatest")}</small>
                </div>
            </section>
        );
    }

    return (
        <section className="overall-viewer">
            <header className="overall-viewer__header">
                <div>
                    <p className="overall-viewer__eyebrow">{t("eyebrow")}</p>
                    <h1>{t("title")}</h1>
                    <p className="text-muted mb-0">
                        {t("description")}
                    </p>
                </div>
                <div className="overall-viewer__updated">
                    <span>{t("sourceUpdatedAt")}</span>
                    <strong>{formatDate(document.sourceUpdatedAt, locale)}</strong>
                    <small>{formatRelativeDate(document.sourceUpdatedAt, locale, relativeTimeNow)}</small>
                </div>
            </header>

            <nav className="overall-viewer__tabs" aria-label={t("views.label")}>
                {["players", "servers", "alliances"].map((item) => (
                    <button
                        key={item}
                        type="button"
                        className={view === item ? "is-active" : ""}
                        aria-current={view === item ? "page" : undefined}
                        onClick={() => changeView(item)}
                    >
                        {t(`views.${item}`)}
                    </button>
                ))}
            </nav>

            {view === "players" && (<>
            <div className="overall-viewer__stats">
                <article className="overall-viewer__total-stat">
                    <span>{t("stats.total")}</span>
                    <strong>{formatNumber(statistics.total, locale)}</strong>
                </article>
                <div
                    className="overall-viewer__venn"
                    role="img"
                    aria-label={t("stats.vennLabel", {
                        power: formatNumber(statistics.power + statistics.both, locale),
                        both: formatNumber(statistics.both, locale),
                        realpower: formatNumber(statistics.realpower + statistics.both, locale),
                    })}
                >
                    <div className="overall-viewer__venn-set is-power">
                        <span>{t("stats.powerPopulation")}</span>
                        <strong>{formatNumber(statistics.power + statistics.both, locale)}</strong>
                    </div>
                    <div className="overall-viewer__venn-overlap">
                        <span>{t("stats.both")}</span>
                        <strong>{formatNumber(statistics.both, locale)}</strong>
                    </div>
                    <div className="overall-viewer__venn-set is-realpower">
                        <span>{t("stats.realpowerPopulation")}</span>
                        <strong>{formatNumber(statistics.realpower + statistics.both, locale)}</strong>
                    </div>
                </div>
            </div>

            <div className="overall-viewer__filters">
                <label className="overall-viewer__search">
                    <FaMagnifyingGlass aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t("filters.nickname")}
                        aria-label={t("filters.nicknameLabel")}
                    />
                </label>
                <input
                    className="form-control"
                    type="number"
                    min="1"
                    value={server}
                    onChange={(event) => setServer(event.target.value)}
                    placeholder={t("filters.server")}
                    aria-label={t("filters.server")}
                />
                <input
                    className="form-control"
                    type="search"
                    value={allianceQuery}
                    onChange={(event) => setAllianceQuery(event.target.value)}
                    placeholder={t("filters.alliance")}
                    aria-label={t("filters.allianceLabel")}
                />
                <button
                    type="button"
                    className={`btn ${advancedOpen ? "btn-secondary" : "btn-outline-secondary"}`}
                    aria-expanded={advancedOpen}
                    onClick={() => setAdvancedOpen((current) => !current)}
                >
                    <FaSliders aria-hidden="true" /> {t("filters.advanced")}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={resetFilters}>
                    <FaRotateRight aria-hidden="true" /> {t("filters.reset")}
                </button>
                {advancedOpen && (
                    <div className="overall-viewer__advanced-filters">
                        <select
                            className="form-select"
                            value={source}
                            onChange={(event) => setSource(event.target.value)}
                            aria-label={t("filters.source")}
                        >
                            <option value="all">{t("source.all")}</option>
                            <option value="both">{t("source.both")}</option>
                            <option value="power">{t("source.powerOnly")}</option>
                            <option value="realpower">{t("source.realpowerOnly")}</option>
                        </select>
                        <input
                            className="form-control"
                            type="number"
                            min="1"
                            value={serverOut}
                            disabled={movementLoading}
                            onChange={(event) => setServerOut(event.target.value)}
                            placeholder={movementLoading ? t("filters.movementLoading") : t("filters.serverOut")}
                            aria-label={t("filters.serverOutLabel")}
                        />
                    </div>
                )}
            </div>

            <div className="overall-viewer__result-meta">
                <span>{t("resultCount", { count: formatNumber(filteredPlayers.length, locale) })}</span>
            </div>

            <div className="overall-viewer__table-wrap">
                {filteredPlayers.length > 0 ? (
                    <>
                        <div className="overall-viewer__compact-header" aria-hidden="true">
                            <span>{t("columns.server")}</span>
                            <span>{t("columns.player")}</span>
                            <span>{t("columns.alliance")}</span>
                            <span className="text-end">{t("columns.power")}</span>
                            <span />
                        </div>
                    <Virtuoso
                        className="overall-viewer__virtual-table"
                        style={{ height: "clamp(540px, 72vh, 900px)" }}
                        data={filteredPlayers}
                        increaseViewportBy={400}
                        computeItemKey={(_index, player) => player.uid}
                        itemContent={(_index, player) => {
                            const expanded = expandedPlayers.has(player.uid);
                            const playerNicknameHistory = nicknameHistory.get(String(player.uid)) ?? [];
                            const activity = getActivity(player.lastLogin, t);
                            const recentInbound = getRecentInbound(
                                player,
                                movementHistory?.get(String(player.uid)) ?? [],
                            );
                            return (
                                <article
                                    className={`overall-viewer__compact-item is-${activity.key}${expanded ? " is-expanded" : ""}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={expanded}
                                    onClick={() => togglePlayer(player.uid)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            togglePlayer(player.uid);
                                        }
                                    }}
                                >
                                    <div className="overall-viewer__compact-row">
                                        <span className="overall-viewer__server">
                                            <small>s</small>{player.server ?? "-"}
                                            {recentInbound && (
                                                <em
                                                    className="overall-viewer__move-in"
                                                    title={t("recentMoveTitle", {
                                                        from: recentInbound.fromServer,
                                                        to: recentInbound.toServer,
                                                    })}
                                                >IN</em>
                                            )}
                                        </span>
                                        <strong className="overall-viewer__nickname text-truncate">
                                            {player.nickname || t("unnamed")}
                                        </strong>
                                        <span className="text-truncate">
                                            {player.allianceTag ? `[${player.allianceTag}]` : "-"}
                                            {player.allianceName ? ` ${player.allianceName}` : ""}
                                        </span>
                                        <strong className="text-end" title={formatNumber(player.power, locale)}>
                                            {formatCompactNumber(player.power)}
                                        </strong>
                                        <span
                                            className="overall-viewer__expand-button"
                                            aria-hidden="true"
                                        >
                                            <FaChevronDown aria-hidden="true" />
                                        </span>
                                    </div>
                                    {expanded && (
                                        <div className="overall-viewer__details">
                                            <span className="overall-viewer__details-alliance">
                                                <b>{t("columns.alliance")}</b>
                                                {player.allianceTag ? `[${player.allianceTag}]` : ""}
                                                {player.allianceTag && player.allianceName ? " " : ""}
                                                {player.allianceName || (!player.allianceTag ? t("unknown") : "")}
                                            </span>
                                            {player.previousObservation && (
                                                <span>
                                                    <b>{t("details.previous")}</b> <span className="overall-viewer__server"><small>s</small>{player.previousObservation.server ?? "-"}</span>
                                                    {player.previousObservation.nickname ? ` · ${player.previousObservation.nickname}` : ""}
                                                    {player.previousObservation.power != null ? ` · ${formatCompactNumber(player.previousObservation.power)}` : ""}
                                                </span>
                                            )}
                                            <span><b>{t("details.source")}</b> {sourceLabel(player.source, t)}</span>
                                            <span><b>{t("details.observed")}</b> {formatDate(player.observedAt, locale)}</span>
                                            <span><b>{t("details.activity")}</b> {activity.label}</span>
                                            {player.x != null && player.y != null ? (
                                                <span>
                                                    <b>{t("details.baseLocation")}</b> x {player.x}, y {player.y}
                                                    {player.locationObservedAt ? ` · ${formatDate(player.locationObservedAt, locale)}` : ""}
                                                </span>
                                            ) : (
                                                <span><b>{t("details.baseLocation")}</b> {t("unknown")}</span>
                                            )}
                                            {recentInbound && (
                                                <span>
                                                    <b>{t("details.recentMove")}</b>
                                                    s{recentInbound.fromServer ?? "-"} → s{recentInbound.toServer ?? "-"}
                                                    {recentInbound.detectedAt ? ` · ${formatDate(recentInbound.detectedAt, locale)}` : ""}
                                                </span>
                                            )}
                                            <div className="overall-viewer__nickname-history">
                                                <b>{t("details.nicknameHistory")}</b>
                                                {historyLoading ? (
                                                    <span>{t("history.loading")}</span>
                                                ) : playerNicknameHistory.length > 0 ? (
                                                    playerNicknameHistory.slice(0, 3).map((history, index) => (
                                                        <span key={`${history.detectedAt ?? history.date}-${index}`}>
                                                            <time>{history.date}</time>
                                                            {history.fromNickname || "-"} → {history.toNickname || "-"}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span>{t("history.empty")}</span>
                                                )}
                                                {playerNicknameHistory.length > 3 && (
                                                    <small>{t("history.more", { count: playerNicknameHistory.length - 3 })}</small>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        }}
                    />
                    </>
                ) : (
                    <div className="text-center text-muted py-5">{t("noResults")}</div>
                )}
            </div>
            </>)}

            {view === "servers" && (
                <TopwarOverallGroupView
                    type="servers"
                    players={players}
                    movementHistory={movementHistory}
                    movementLoading={movementLoading}
                />
            )}
            {view === "alliances" && (
                <TopwarOverallGroupView type="alliances" players={players} />
            )}
        </section>
    );
}
