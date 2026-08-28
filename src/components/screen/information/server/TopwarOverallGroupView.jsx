import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Virtuoso } from "react-virtuoso";
import { FaArrowDown, FaArrowUp, FaXmark } from "react-icons/fa6";
import { listKartzHistoryFiles, loadDataFile } from "@src/services/topwarDataRepository";

function normalize(value) {
    return String(value ?? "").normalize("NFKD").replace(/\p{M}+/gu, "").toLocaleLowerCase().trim();
}

function activityKey(lastLogin) {
    let timestamp = Number(lastLogin);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return "unknown";
    if (timestamp < 1_000_000_000_000) timestamp *= 1000;
    const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
    return days > 30 ? "inactive" : days > 7 ? "dormant" : "active";
}

function compact(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    const units = ["", "K", "M", "B", "T", "Q"];
    let amount = Math.abs(number);
    let unit = 0;
    while (amount >= 1000 && unit < units.length - 1) { amount /= 1000; unit += 1; }
    return `${number < 0 ? "-" : ""}${amount.toLocaleString("en-US", { maximumFractionDigits: amount >= 100 ? 0 : 1 })}${units[unit]}`;
}

function barWidth(value, maximum) {
    const ratio = maximum > 0 ? Number(value) / maximum : 0;
    return `${Math.max(0, Math.min(100, ratio * 100))}%`;
}

export default function TopwarOverallGroupView({ type, players, movementHistory }) {
    const { t, i18n } = useTranslation("viewer", { keyPrefix: "TopwarDataOverAll" });
    const locale = i18n.resolvedLanguage?.startsWith("ja") ? "ja-JP" : i18n.resolvedLanguage?.startsWith("en") ? "en-US" : "ko-KR";
    const [query, setQuery] = useState("");
    const [serverQuery, setServerQuery] = useState("");
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [kartz, setKartz] = useState(null);
    const [kartzLoading, setKartzLoading] = useState(true);
    const toolbarRef = useRef(null);
    const comparisonRef = useRef(null);
    const deferredQuery = useDeferredValue(query);
    const deferredServerQuery = useDeferredValue(serverQuery);

    useEffect(() => {
        let cancelled = false;
        async function loadLatestKartz() {
            try {
                const [latest] = await listKartzHistoryFiles();
                if (!latest) return;
                const data = await loadDataFile(latest.path);
                if (!cancelled) setKartz({ ...data, fileName: latest.fileName });
            } catch (error) {
                console.error("Kartz ranking load failed", error);
            } finally {
                if (!cancelled) setKartzLoading(false);
            }
        }
        loadLatestKartz();
        return () => { cancelled = true; };
    }, []);

    const rows = useMemo(() => {
        const groups = new Map();
        for (const player of players) {
            const isServer = type === "servers";
            if (!isServer && !player.allianceTag && !player.allianceName) continue;
            const key = isServer
                ? String(player.server ?? "-")
                : `${player.server ?? "-"}|${player.allianceId ?? player.allianceTag ?? player.allianceName}`;
            const current = groups.get(key) ?? {
                key,
                server: player.server,
                name: isServer ? `s${player.server ?? "-"}` : (player.allianceName || player.allianceTag || "-"),
                tag: isServer ? null : player.allianceTag,
                players: 0, totalPower: 0, active: 0, dormant: 0, inactive: 0, unknown: 0,
                power: 0, realpower: 0, both: 0, alliances: new Set(), inbound: 0, outbound: 0,
            };
            current.players += 1;
            current.totalPower += Number(player.power) || 0;
            current[activityKey(player.lastLogin)] += 1;
            current[["power", "realpower", "both"].includes(player.source) ? player.source : "power"] += 1;
            if (isServer && (player.allianceId || player.allianceTag || player.allianceName)) {
                current.alliances.add(String(player.allianceId ?? player.allianceTag ?? player.allianceName));
            }
            groups.set(key, current);
        }

        if (type === "servers" && movementHistory) {
            const cutoff = Date.now() - 30 * 86_400_000;
            for (const history of movementHistory.values()) {
                for (const movement of history) {
                    const detectedAt = Date.parse(movement.detectedAt ?? "");
                    if (!Number.isFinite(detectedAt) || detectedAt < cutoff) continue;
                    const from = groups.get(String(movement.fromServer));
                    const to = groups.get(String(movement.toServer));
                    if (from) from.outbound += 1;
                    if (to) to.inbound += 1;
                }
            }
        }

        const kartzPlayers = Array.isArray(kartz?.playerRankList) ? kartz.playerRankList : [];
        const kartzAlliances = Array.isArray(kartz?.allianceRankList) ? kartz.allianceRankList : [];
        const kartzPlayersByServer = new Map();
        const kartzAllianceByTag = new Map();
        const kartzAllianceByName = new Map();
        for (const ranker of kartzPlayers) {
            const key = String(ranker.server);
            const list = kartzPlayersByServer.get(key) ?? [];
            list.push(ranker);
            kartzPlayersByServer.set(key, list);
        }
        for (const ranking of kartzAlliances) {
            const serverKey = String(ranking.server);
            if (ranking.tag) kartzAllianceByTag.set(`${serverKey}|${normalize(ranking.tag)}`, ranking);
            if (ranking.name) kartzAllianceByName.set(`${serverKey}|${normalize(ranking.name)}`, ranking);
        }

        return [...groups.values()]
            .map((row) => {
                const serverRankers = type === "servers"
                    ? kartzPlayersByServer.get(String(row.server)) ?? []
                    : [];
                const allianceRanking = type === "alliances"
                    ? (row.tag ? kartzAllianceByTag.get(`${row.server}|${normalize(row.tag)}`) : null)
                        ?? kartzAllianceByName.get(`${row.server}|${normalize(row.name)}`)
                    : null;
                return {
                    ...row,
                    alliances: row.alliances.size,
                    averagePower: row.players ? row.totalPower / row.players : 0,
                    kartz: type === "servers" ? {
                        bestRank: serverRankers.length ? Math.min(...serverRankers.map((ranker) => Number(ranker.rank))) : null,
                        rankers: serverRankers.length,
                        bestRound: serverRankers.length ? Math.max(...serverRankers.map((ranker) => Number(ranker.round) || 0)) : null,
                    } : {
                        rank: allianceRanking?.rank ?? null,
                        score: allianceRanking?.score ?? null,
                    },
                };
            })
            .sort((left, right) => right.totalPower - left.totalPower || Number(left.server) - Number(right.server));
    }, [players, type, movementHistory, kartz]);

    const filtered = useMemo(() => {
        const keyword = normalize(deferredQuery);
        const serverKeyword = normalize(deferredServerQuery).replace(/^s/, "");
        return rows.filter((row) => {
            const matchesName = !keyword || normalize(type === "servers"
                ? row.server
                : `${row.tag ?? ""} ${row.name}`).includes(keyword);
            const matchesServer = type !== "alliances" || !serverKeyword
                || normalize(row.server).includes(serverKeyword);
            return matchesName && matchesServer;
        });
    }, [rows, type, deferredQuery, deferredServerQuery]);

    const selectedRows = useMemo(() => selectedKeys
        .map((key) => rows.find((row) => row.key === key))
        .filter(Boolean), [selectedKeys, rows]);

    const comparisonMax = useMemo(() => ({
        players: Math.max(0, ...selectedRows.map((row) => row.players)),
        averagePower: Math.max(0, ...selectedRows.map((row) => row.averagePower)),
    }), [selectedRows]);

    const toggleSelection = (key) => {
        setSelectedKeys((current) => {
            if (current.includes(key)) return current.filter((item) => item !== key);
            return [...current, key];
        });
    };

    const serverView = type === "servers";
    return (
        <section className="overall-group-view">
            <div className="overall-group-view__toolbar" ref={toolbarRef}>
                <div className="overall-group-view__searches">
                    <input
                        className="form-control"
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t(serverView ? "groups.serverSearch" : "groups.allianceSearch")}
                    />
                    {!serverView && (
                        <input
                            className="form-control"
                            type="search"
                            inputMode="numeric"
                            value={serverQuery}
                            onChange={(event) => setServerQuery(event.target.value)}
                            placeholder={t("groups.allianceServerSearch")}
                        />
                    )}
                </div>
                <div className="overall-group-view__toolbar-meta">
                    <span>{t("groups.count", { count: filtered.length.toLocaleString(locale) })}</span>
                    <span>{t("comparison.selected", { count: selectedRows.length })}</span>
                    {selectedRows.length > 0 && (
                        <>
                            <button
                                type="button"
                                className="is-jump"
                                onClick={() => comparisonRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                            ><FaArrowDown aria-hidden="true" /> {t("comparison.goToResults")}</button>
                            <button type="button" onClick={() => setSelectedKeys([])}>{t("comparison.clear")}</button>
                        </>
                    )}
                </div>
            </div>
            <div className={`overall-group-view__header is-${type}`}>
                <span>{t(serverView ? "columns.server" : "columns.alliance")}</span>
                <span>{t("groups.players")}</span>
                <span>{t("groups.averagePower")}</span>
                <span>{t("groups.active")}</span>
                <span>{t(serverView ? "groups.alliances" : "columns.server")}</span>
            </div>
            <Virtuoso
                className="overall-group-view__list"
                style={{ height: "clamp(540px, 72vh, 900px)" }}
                data={filtered}
                increaseViewportBy={300}
                computeItemKey={(_index, row) => row.key}
                itemContent={(_index, row) => (
                    <div className={`overall-group-view__row is-${type}${selectedKeys.includes(row.key) ? " is-selected" : ""}`}>
                        <label className="overall-group-view__identity text-truncate">
                            <input
                                type="checkbox"
                                checked={selectedKeys.includes(row.key)}
                                onChange={() => toggleSelection(row.key)}
                            />
                            <strong className="text-truncate">{serverView ? row.name : `${row.tag ? `[${row.tag}] ` : ""}${row.name}`}</strong>
                        </label>
                        <span>{row.players.toLocaleString(locale)}</span>
                        <span>{compact(row.averagePower)}</span>
                        <span className="is-active">{row.active.toLocaleString(locale)}</span>
                        <span>{serverView ? row.alliances.toLocaleString(locale) : `s${row.server ?? "-"}`}</span>
                    </div>
                )}
            />
            {selectedRows.length > 0 && (
                <div className="overall-group-view__comparison" ref={comparisonRef}>
                    <div className="overall-group-view__comparison-meta">
                        <strong>{t("comparison.selected", { count: selectedRows.length })}</strong>
                        <div>
                            <button
                                type="button"
                                className="is-jump"
                                onClick={() => toolbarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                            ><FaArrowUp aria-hidden="true" /> {t("comparison.goToSearch")}</button>
                            <button type="button" onClick={() => setSelectedKeys([])}>{t("comparison.clear")}</button>
                        </div>
                    </div>
                    <div className="overall-group-view__comparison-track">
                        {selectedRows.map((row) => (
                            <article key={row.key}>
                                <button
                                    type="button"
                                    aria-label={t("comparison.remove", { name: row.name })}
                                    onClick={() => toggleSelection(row.key)}
                                ><FaXmark aria-hidden="true" /></button>
                                <div className="overall-group-view__card-info">
                                    <strong>{serverView ? row.name : `${row.tag ? `[${row.tag}] ` : ""}${row.name}`}</strong>
                                    <span>{t("groups.players")} <b>{row.players.toLocaleString(locale)}</b></span>
                                    <span>{t("groups.averagePower")} <b>{compact(row.averagePower)}</b></span>
                                    <span>{t("groups.active")} <b>{row.active.toLocaleString(locale)}</b></span>
                                    <span>{t("groups.inactive")} <b>{row.inactive.toLocaleString(locale)}</b></span>
                                    {serverView && <span>IN / OUT <b>{row.inbound.toLocaleString(locale)} / {row.outbound.toLocaleString(locale)}</b></span>}
                                    <div className="overall-group-view__kartz">
                                        <b>{t("kartz.title")}</b>
                                        {kartzLoading ? (
                                            <span>{t("history.loading")}</span>
                                        ) : serverView ? (
                                            row.kartz.bestRank != null ? (
                                                <span>{t("kartz.serverResult", { rank: row.kartz.bestRank, count: row.kartz.rankers, round: row.kartz.bestRound, month: kartz?.fileName ?? "-" })}</span>
                                            ) : <span>{t("kartz.unranked")}</span>
                                        ) : row.kartz.rank != null ? (
                                            <span>{t("kartz.allianceResult", { rank: row.kartz.rank, score: Number(row.kartz.score).toLocaleString(locale), month: kartz?.fileName ?? "-" })}</span>
                                        ) : <span>{t("kartz.unranked")}</span>}
                                    </div>
                                </div>
                                <div className="overall-group-view__chart">
                                    {[
                                        { key: "players", label: t("groups.players"), value: row.players, text: row.players.toLocaleString(locale), maximum: comparisonMax.players },
                                        { key: "power", label: t("groups.averagePower"), value: row.averagePower, text: compact(row.averagePower), maximum: comparisonMax.averagePower },
                                        { key: "active", label: t("groups.activeRate"), value: row.players ? row.active / row.players : 0, text: `${row.players ? Math.round(row.active / row.players * 100) : 0}%`, maximum: 1 },
                                        { key: "inactive", label: t("groups.inactiveRate"), value: row.players ? row.inactive / row.players : 0, text: `${row.players ? Math.round(row.inactive / row.players * 100) : 0}%`, maximum: 1 },
                                    ].map((metric) => (
                                        <div className={`overall-group-view__chart-row is-${metric.key}`} key={metric.key}>
                                            <span>{metric.label}</span>
                                            <div><i style={{ width: barWidth(metric.value, metric.maximum) }} /></div>
                                            <b>{metric.text}</b>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
