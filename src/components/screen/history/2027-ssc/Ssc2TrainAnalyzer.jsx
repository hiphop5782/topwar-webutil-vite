import {
    forwardRef,
    useCallback,
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslation } from "react-i18next";
import { FaMagnifyingGlass, FaPlus, FaTriangleExclamation, FaXmark } from "react-icons/fa6";
import { TableVirtuoso } from "react-virtuoso";
import {
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

import DataLoadingPlaceholder from "@src/components/template/DataLoadingPlaceholder";
import { useListParamState } from "@src/hooks/useListParamState";
import { useParamState } from "@src/hooks/useParamState";
import {
    getPlayerNicknameSearchKeys,
    getPlayerSearchQuery,
} from "@src/utils/playerSearchIndex";

import "./Ssc2TrainAnalyzer.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const ACCESS_KEY = "ssc2-train-access-v1";
const VIEW_KEYS = new Set(["overview", "server", "compare", "search"]);
const SERVER_MODULES = import.meta.glob("/src/assets/json/ssc2/train/CQ26-S*.json");

const createImageMap = modules => Object.fromEntries(
    Object.entries(modules).flatMap(([filePath, source]) => {
        const fileName = filePath.split("/").pop();
        const id = fileName?.replace(/\.webp$/i, "");
        return id ? [[id, source]] : [];
    }),
);

const HERO_IMAGES = createImageMap(import.meta.glob(
    "/src/assets/images/heros/*.webp",
    { eager: true, import: "default" },
));

const ARMY_BRANCHES = {
    101: { emoji: "🪖", key: "army" },
    201: { emoji: "⚓", key: "navy" },
    301: { emoji: "✈️", key: "air" },
};

const COMPARE_COLORS = ["#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed"];
const RANK_GUIDES = [10, 30, 50];
const RANK_GUIDE_PLUGIN = {
    id: "ssc2-rank-guides",
    afterDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea || !scales.x) return;

        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "rgba(100, 116, 139, 0.55)";
        ctx.fillStyle = "#64748b";
        ctx.font = "700 11px Pretendard, sans-serif";
        ctx.textAlign = "center";

        RANK_GUIDES.forEach(rank => {
            if (rank > chart.data.labels.length) return;
            const x = scales.x.getPixelForValue(rank - 1);
            ctx.beginPath();
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.stroke();
            ctx.fillText(`TOP ${rank}`, x, chartArea.top + 12);
        });
        ctx.restore();
    },
};

const VirtualScroller = forwardRef(function VirtualScroller({ className = "", ...props }, ref) {
    return <div {...props} ref={ref} className={`ssc2-virtual-scroller ${className}`} />;
});

function VirtualTable({ className = "", ...props }) {
    return <table {...props} className={`table table-hover align-middle ssc2-virtual-table ${className}`} />;
}

const VIRTUAL_TABLE_COMPONENTS = {
    Scroller: VirtualScroller,
    Table: VirtualTable,
};

function VirtualizedTable({ data, headers, itemContent, computeItemKey, className = "" }) {
    return (
        <div className={`ssc2-virtual-frame ${className}`.trim()}>
            <TableVirtuoso
                style={{ height: "100%" }}
                data={data}
                components={VIRTUAL_TABLE_COMPONENTS}
                increaseViewportBy={320}
                computeItemKey={computeItemKey}
                fixedHeaderContent={() => <tr>{headers}</tr>}
                itemContent={itemContent}
            />
        </div>
    );
}

function HeroThumbnail({ heroId, t }) {
    const id = String(heroId ?? "").trim();
    const source = HERO_IMAGES[id];
    const label = id ? t("Ssc2Train.heroLabel", { id }) : t("Ssc2Train.heroUnknown");

    return (
        <span className={`ssc2-hero-thumbnail ${source ? "has-image" : ""}`} title={label}>
            {source
                ? <img src={source} alt={label} loading="lazy" decoding="async" />
                : <span aria-hidden="true">{id || "?"}</span>}
        </span>
    );
}

function ArmyBranch({ armyType, t }) {
    const branch = ARMY_BRANCHES[Number(armyType)];
    if (!branch) return <span className="ssc2-branch-badge">? {t("Ssc2Train.branches.unknown")}</span>;

    return (
        <span className={`ssc2-branch-badge is-${branch.key}`}>
            <span aria-hidden="true">{branch.emoji}</span>
            {t(`Ssc2Train.branches.${branch.key}`)}
        </span>
    );
}

function readAccessState() {
    try {
        return sessionStorage.getItem(ACCESS_KEY) === "granted";
    } catch {
        return false;
    }
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

function displayNameOf(player) {
    const uid = String(player?.uid ?? "");
    const info = parsePlayerInfo(player?.playerInfo);
    const candidates = [player?.username, info.username, info.nickname, info.name];
    const safeName = candidates.find(candidate => {
        const value = String(candidate ?? "").trim();
        return value && (!uid || !value.includes(uid));
    });

    return safeName ? String(safeName).trim() : "익명 사용자";
}

function matchesPlayerName(name, rawQuery) {
    if (!rawQuery.trim()) return true;
    const query = getPlayerSearchQuery(rawQuery);
    const keys = getPlayerNicknameSearchKeys(name);
    return String(keys[query.field] ?? "").includes(query.key);
}

function SummaryCard({ label, value, detail }) {
    return (
        <div className="col-12 col-sm-6 col-xl-3">
            <section className="card border-0 shadow-sm h-100 ssc2-summary-card">
                <div className="card-body">
                    <div className="small text-secondary fw-semibold">{label}</div>
                    <div className="fs-3 fw-bold numeric-cell mt-1">{value}</div>
                    {detail && <div className="small text-secondary mt-1">{detail}</div>}
                </div>
            </section>
        </div>
    );
}

function AccessQuestion({ answer, error, inputRef, onAnswerChange, onSubmit, t }) {
    return (
        <div className="ssc2-access-layer" role="presentation">
            <section
                className="ssc2-access-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ssc2-access-title"
                aria-describedby="ssc2-access-description"
            >
                <div className="ssc2-access-mark" aria-hidden="true">?</div>
                <h2 id="ssc2-access-title" className="h3 mb-2">궁금하면..?</h2>
                <p id="ssc2-access-description" className="text-secondary mb-4">
                    {t("Ssc2Train.accessDescription")}
                </p>
                <form onSubmit={onSubmit}>
                    <label className="form-label fw-semibold" htmlFor="ssc2-access-answer">
                        {t("Ssc2Train.answerLabel")}
                    </label>
                    <input
                        ref={inputRef}
                        id="ssc2-access-answer"
                        type="text"
                        className={`form-control form-control-lg ${error ? "is-invalid" : ""}`}
                        value={answer}
                        autoComplete="off"
                        onChange={onAnswerChange}
                    />
                    {error && <div className="invalid-feedback">{t("Ssc2Train.wrongAnswer")}</div>}
                    <button type="submit" className="btn btn-primary btn-lg w-100 mt-3">
                        {t("Ssc2Train.unlock")}
                    </button>
                </form>
            </section>
        </div>
    );
}

export default function Ssc2TrainAnalyzer() {
    const { t, i18n } = useTranslation("viewer");
    const [accessGranted, setAccessGranted] = useState(readAccessState);
    const [answer, setAnswer] = useState("");
    const [answerError, setAnswerError] = useState(false);
    const answerRef = useRef(null);
    const serverCacheRef = useRef(new Map());

    const [view, setView] = useParamState("view", "server", {
        validate: value => VIEW_KEYS.has(value),
    });
    const [selectedServer, setSelectedServer] = useParamState("server", "", {
        validate: value => value === "" || /^\d+$/.test(String(value)),
    });
    const [compareServers, setCompareServers] = useListParamState("servers");
    const [searchText, setSearchText] = useParamState("query", "", {
        validate: value => String(value).length <= 80,
    });

    const [indexData, setIndexData] = useState(null);
    const [indexLoading, setIndexLoading] = useState(false);
    const [indexError, setIndexError] = useState(false);
    const [serverData, setServerData] = useState(null);
    const [serverLoading, setServerLoading] = useState(false);
    const [serverError, setServerError] = useState(false);
    const [searchIndex, setSearchIndex] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [compareDistributions, setCompareDistributions] = useState([]);
    const [compareDistributionLoading, setCompareDistributionLoading] = useState(false);
    const [compareDistributionError, setCompareDistributionError] = useState(false);
    const [overviewQuery, setOverviewQuery] = useState("");
    const [serverPlayerQuery, setServerPlayerQuery] = useState("");
    const [compareCandidate, setCompareCandidate] = useState("");
    const [overviewSort, setOverviewSort] = useState({ key: "totalPower", direction: "desc" });

    useEffect(() => {
        if (!accessGranted) answerRef.current?.focus();
    }, [accessGranted]);

    useEffect(() => {
        if (!accessGranted || indexData) return;
        let active = true;
        setIndexLoading(true);
        setIndexError(false);

        import("@src/assets/json/ssc2/train/index.json")
            .then(module => {
                if (active) setIndexData(module.default);
            })
            .catch(error => {
                console.error("SSC2 train index load failed", error);
                if (active) setIndexError(true);
            })
            .finally(() => {
                if (active) setIndexLoading(false);
            });

        return () => { active = false; };
    }, [accessGranted, indexData]);

    const servers = useMemo(() => indexData?.servers ?? [], [indexData]);
    const serverMap = useMemo(
        () => new Map(servers.map(server => [String(server.server), server])),
        [servers],
    );

    useEffect(() => {
        if (view !== "server" || selectedServer || servers.length === 0) return;
        setSelectedServer(String(servers[0].server));
    }, [selectedServer, servers, setSelectedServer, view]);

    useEffect(() => {
        if (!accessGranted || view !== "server" || !selectedServer) {
            setServerData(null);
            setServerError(false);
            return;
        }

        const summary = serverMap.get(String(selectedServer));
        if (!summary) {
            setServerData(null);
            setServerError(true);
            return;
        }

        const cached = serverCacheRef.current.get(summary.fileName);
        if (cached) {
            setServerData(cached);
            setServerError(false);
            return;
        }

        const modulePath = `/src/assets/json/ssc2/train/${summary.fileName}`;
        const loader = SERVER_MODULES[modulePath];
        if (!loader) {
            setServerData(null);
            setServerError(true);
            return;
        }

        let active = true;
        setServerLoading(true);
        setServerError(false);
        loader()
            .then(module => {
                if (!active) return;
                serverCacheRef.current.set(summary.fileName, module.default);
                setServerData(module.default);
            })
            .catch(error => {
                console.error("SSC2 server data load failed", error);
                if (active) {
                    setServerData(null);
                    setServerError(true);
                }
            })
            .finally(() => {
                if (active) setServerLoading(false);
            });

        return () => { active = false; };
    }, [accessGranted, selectedServer, serverMap, view]);

    useEffect(() => {
        if (!accessGranted || view !== "search" || searchIndex) return;
        let active = true;
        setSearchLoading(true);

        import("@src/assets/json/ssc2/train/player-search-index.json")
            .then(module => {
                if (active) setSearchIndex(module.default);
            })
            .catch(error => console.error("SSC2 player search index load failed", error))
            .finally(() => {
                if (active) setSearchLoading(false);
            });

        return () => { active = false; };
    }, [accessGranted, searchIndex, view]);

    const numberFormatter = useMemo(
        () => new Intl.NumberFormat(i18n.language),
        [i18n.language],
    );
    const compactFormatter = useMemo(
        () => new Intl.NumberFormat(i18n.language, { notation: "compact", maximumFractionDigits: 1 }),
        [i18n.language],
    );
    const formatNumber = useCallback(value => numberFormatter.format(Number(value ?? 0)), [numberFormatter]);
    const formatCompact = useCallback(value => compactFormatter.format(Number(value ?? 0)), [compactFormatter]);
    const totalPower = useMemo(
        () => servers.reduce((total, server) => total + server.totalPower, 0),
        [servers],
    );

    const overviewRows = useMemo(() => {
        const query = overviewQuery.trim();
        const filtered = query
            ? servers.filter(server => String(server.server).includes(query))
            : servers;
        const direction = overviewSort.direction === "asc" ? 1 : -1;

        return [...filtered].sort((left, right) => {
            const difference = Number(left[overviewSort.key] ?? 0) - Number(right[overviewSort.key] ?? 0);
            return difference !== 0 ? difference * direction : left.server - right.server;
        });
    }, [overviewQuery, overviewSort, servers]);

    const selectedSummary = selectedServer ? serverMap.get(String(selectedServer)) : null;
    const serverPlayers = useMemo(() => {
        if (!serverData?.players) return [];
        return serverData.players
            .map(player => ({
                ...player,
                displayName: displayNameOf(player),
                numericPower: Number(player.power ?? 0),
            }))
            .filter(player => matchesPlayerName(player.displayName, serverPlayerQuery));
    }, [serverData, serverPlayerQuery]);

    const comparedSummaries = useMemo(
        () => compareServers.map(server => serverMap.get(String(server))).filter(Boolean).slice(0, 20),
        [compareServers, serverMap],
    );
    const maxComparedPower = Math.max(1, ...comparedSummaries.map(server => server.totalPower));

    useEffect(() => {
        if (!accessGranted || view !== "compare" || comparedSummaries.length === 0) {
            setCompareDistributions([]);
            setCompareDistributionLoading(false);
            setCompareDistributionError(false);
            return;
        }

        let active = true;
        setCompareDistributionLoading(true);
        setCompareDistributionError(false);

        Promise.all(comparedSummaries.map(async summary => {
            let data = serverCacheRef.current.get(summary.fileName);
            if (!data) {
                const modulePath = `/src/assets/json/ssc2/train/${summary.fileName}`;
                const loader = SERVER_MODULES[modulePath];
                if (!loader) throw new Error(`Missing server data: ${summary.fileName}`);
                const module = await loader();
                data = module.default;
                serverCacheRef.current.set(summary.fileName, data);
            }

            return {
                server: summary.server,
                powers: (data.players ?? [])
                    .map(player => Number(player.power ?? 0))
                    .sort((left, right) => right - left),
            };
        }))
            .then(distributions => {
                if (active) setCompareDistributions(distributions);
            })
            .catch(error => {
                console.error("SSC2 comparison distribution load failed", error);
                if (active) {
                    setCompareDistributions([]);
                    setCompareDistributionError(true);
                }
            })
            .finally(() => {
                if (active) setCompareDistributionLoading(false);
            });

        return () => { active = false; };
    }, [accessGranted, comparedSummaries, view]);

    const deferredSearchText = useDeferredValue(searchText);
    const integratedResults = useMemo(() => {
        const raw = deferredSearchText.trim();
        if (!raw || !searchIndex?.players) return [];
        const query = getPlayerSearchQuery(raw);
        const numericQuery = /^\d+$/.test(raw) ? raw : "";

        return searchIndex.players
            .filter(player => {
                const nicknameMatch = String(player[query.field] ?? "").includes(query.key);
                const serverMatch = numericQuery
                    ? String(player.s).includes(numericQuery) || String(player.rs).includes(numericQuery)
                    : false;
                return nicknameMatch || serverMatch;
            })
            .sort((left, right) => right.p - left.p || left.s - right.s || left.r - right.r)
            .slice(0, 300);
    }, [deferredSearchText, searchIndex]);

    const compareChartData = useMemo(() => {
        const maxPlayers = Math.max(0, ...compareDistributions.map(item => item.powers.length));
        return {
            labels: Array.from({ length: maxPlayers }, (_, index) => index + 1),
            datasets: compareDistributions.map((item, index) => ({
                label: `S${item.server}`,
                data: item.powers,
                borderColor: COMPARE_COLORS[index % COMPARE_COLORS.length],
                backgroundColor: COMPARE_COLORS[index % COMPARE_COLORS.length],
                borderWidth: 2.25,
                pointRadius: 0,
                pointHoverRadius: 4,
                tension: 0.18,
            })),
        };
    }, [compareDistributions]);

    const compareChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        animation: { duration: 350 },
        plugins: {
            legend: {
                position: "top",
                labels: { usePointStyle: true, boxWidth: 10, font: { weight: 700 } },
            },
            tooltip: {
                callbacks: {
                    title: items => items.length ? t("Ssc2Train.compare.rankTooltip", { rank: items[0].label }) : "",
                    label: context => `${context.dataset.label}: ${formatCompact(context.parsed.y)}`,
                },
            },
        },
        scales: {
            x: {
                title: { display: true, text: t("Ssc2Train.compare.rankAxis") },
                ticks: { maxTicksLimit: 12, maxRotation: 0 },
                grid: { display: false },
            },
            y: {
                beginAtZero: true,
                title: { display: true, text: t("Ssc2Train.table.power") },
                ticks: { callback: value => formatCompact(value) },
            },
        },
    }), [formatCompact, t]);

    const submitAnswer = useCallback(event => {
        event.preventDefault();
        const normalizedAnswer = answer.normalize("NFKC").replace(/\s+/g, "");

        if (normalizedAnswer !== "500원") {
            setAnswerError(true);
            answerRef.current?.focus();
            return;
        }

        try {
            sessionStorage.setItem(ACCESS_KEY, "granted");
        } catch {
            // Storage may be unavailable in privacy-restricted browsers.
        }
        setAnswerError(false);
        setAccessGranted(true);
    }, [answer]);

    const changeSort = useCallback(key => {
        setOverviewSort(current => ({
            key,
            direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
        }));
    }, []);

    const addCompareServer = useCallback((candidate = compareCandidate) => {
        const candidateServer = String(candidate);
        if (
            !serverMap.has(candidateServer)
            || compareServers.includes(candidateServer)
            || compareServers.length >= 20
        ) return;
        setCompareServers([...compareServers, candidateServer]);
        setCompareCandidate("");
    }, [compareCandidate, compareServers, serverMap, setCompareServers]);

    if (!accessGranted) {
        return (
            <AccessQuestion
                answer={answer}
                error={answerError}
                inputRef={answerRef}
                onAnswerChange={event => {
                    setAnswer(event.target.value);
                    setAnswerError(false);
                }}
                onSubmit={submitAnswer}
                t={t}
            />
        );
    }

    if (indexLoading || !indexData) {
        if (indexError) {
            return <div className="alert alert-danger">{t("Ssc2Train.loadError")}</div>;
        }
        return <DataLoadingPlaceholder cards={4} rows={8} />;
    }

    return (
        <div className="ssc2-train-analyzer">
            <header className="ssc2-hero rounded-4 p-4 p-lg-5 mb-4">
                <div>
                    <span className="badge text-bg-light mb-2">{t("Ssc2Train.badge")}</span>
                    <h2 className="h3 mb-2">{t("Ssc2Train.title")}</h2>
                    <p className="mb-0 opacity-75">{t("Ssc2Train.description")}</p>
                </div>
            </header>

            <div className="row g-3 mb-4">
                <SummaryCard label={t("Ssc2Train.metrics.servers")} value={formatNumber(indexData.serverCount)} />
                <SummaryCard label={t("Ssc2Train.metrics.players")} value={formatNumber(indexData.totalPlayers)} />
                <SummaryCard label={t("Ssc2Train.metrics.totalPower")} value={formatCompact(totalPower)} />
                <SummaryCard
                    label={t("Ssc2Train.metrics.averagePlayers")}
                    value={formatNumber(Math.round(indexData.totalPlayers / Math.max(1, indexData.serverCount)))}
                />
            </div>

            <nav className="ssc2-view-tabs mb-4" aria-label={t("Ssc2Train.tabsLabel")}>
                {[
                    ["overview", t("Ssc2Train.tabs.overview")],
                    ["server", t("Ssc2Train.tabs.server")],
                    ["compare", t("Ssc2Train.tabs.compare")],
                    ["search", t("Ssc2Train.tabs.search")],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        className={`btn ${view === key ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => setView(key)}
                    >
                        {label}
                    </button>
                ))}
            </nav>

            {view === "overview" && (
                <section className="card border-0 shadow-sm">
                    <div className="card-header bg-transparent d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 py-3">
                        <div>
                            <h3 className="h5 mb-1">{t("Ssc2Train.overview.title")}</h3>
                            <p className="small text-secondary mb-0">{t("Ssc2Train.overview.description")}</p>
                        </div>
                        <div className="input-group ssc2-search-control">
                            <span className="input-group-text"><FaMagnifyingGlass /></span>
                            <input
                                type="search"
                                inputMode="numeric"
                                className="form-control"
                                placeholder={t("Ssc2Train.serverSearchPlaceholder")}
                                value={overviewQuery}
                                onChange={event => setOverviewQuery(event.target.value.replace(/\D/g, ""))}
                            />
                        </div>
                    </div>
                    <VirtualizedTable
                        data={overviewRows}
                        computeItemKey={(_, server) => server.server}
                        headers={<>
                            <th className="ssc2-col-rank">{t("Ssc2Train.table.rank")}</th>
                            {[
                                ["server", t("Ssc2Train.table.server")],
                                ["playerCount", t("Ssc2Train.table.players")],
                                ["totalPower", t("Ssc2Train.table.totalPower")],
                                ["top5Power", t("Ssc2Train.table.top5")],
                                ["top10Power", t("Ssc2Train.table.top10")],
                                ["top30Power", t("Ssc2Train.table.top30")],
                            ].map(([key, label]) => (
                                <th key={key} scope="col">
                                    <button type="button" className="ssc2-sort-button" onClick={() => changeSort(key)}>
                                        {label}{overviewSort.key === key ? (overviewSort.direction === "asc" ? " ↑" : " ↓") : ""}
                                    </button>
                                </th>
                            ))}
                            <th className="ssc2-col-action">{t("Ssc2Train.table.details")}</th>
                        </>}
                        itemContent={(index, server) => (<>
                            <td className="numeric-cell fw-bold">{index + 1}</td>
                            <td><strong>S{server.server}</strong></td>
                            <td className="numeric-cell">{formatNumber(server.playerCount)}</td>
                            <td className="numeric-cell fw-semibold">{formatCompact(server.totalPower)}</td>
                            <td className="numeric-cell">{formatCompact(server.top5Power)}</td>
                            <td className="numeric-cell">{formatCompact(server.top10Power)}</td>
                            <td className="numeric-cell">{formatCompact(server.top30Power)}</td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary text-nowrap"
                                    onClick={() => {
                                        setSelectedServer(String(server.server));
                                        setView("server");
                                    }}
                                >
                                    {t("Ssc2Train.openServer")}
                                </button>
                            </td>
                        </>)}
                    />
                </section>
            )}

            {view === "server" && (
                <section>
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body row g-3 align-items-end">
                            <div className="col-md-4">
                                <label className="form-label fw-semibold" htmlFor="ssc2-server-select">{t("Ssc2Train.selectServer")}</label>
                                <select
                                    id="ssc2-server-select"
                                    className="form-select"
                                    value={selectedServer}
                                    onChange={event => setSelectedServer(event.target.value)}
                                >
                                    {servers.map(server => <option key={server.server} value={server.server}>S{server.server}</option>)}
                                </select>
                            </div>
                            <div className="col-md-8">
                                <label className="form-label fw-semibold" htmlFor="ssc2-server-player-query">{t("Ssc2Train.searchPlayer")}</label>
                                <input
                                    id="ssc2-server-player-query"
                                    type="search"
                                    className="form-control"
                                    placeholder={t("Ssc2Train.playerSearchPlaceholder")}
                                    value={serverPlayerQuery}
                                    onChange={event => setServerPlayerQuery(event.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {serverLoading && <DataLoadingPlaceholder cards={4} rows={8} />}
                    {!serverLoading && serverError && (
                        <div className="alert alert-danger">{t("Ssc2Train.serverLoadError")}</div>
                    )}
                    {!serverLoading && selectedSummary && serverData && (<>
                        <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                            <h3 className="h5 mb-0">S{selectedSummary.server} · {t("Ssc2Train.serverSummary")}</h3>
                        </div>
                        <div className="row g-3 mb-4">
                            <SummaryCard label={t("Ssc2Train.metrics.players")} value={formatNumber(selectedSummary.playerCount)} />
                            <SummaryCard label={t("Ssc2Train.metrics.totalPower")} value={formatCompact(selectedSummary.totalPower)} />
                            <SummaryCard label={t("Ssc2Train.table.top5")} value={formatCompact(selectedSummary.top5Power)} />
                            <SummaryCard label={t("Ssc2Train.table.top10")} value={formatCompact(selectedSummary.top10Power)} />
                        </div>
                        <div className="ssc2-server-meta card border-0 shadow-sm mb-4">
                            <div className="card-body">
                                <div><span>{t("Ssc2Train.table.percent")}</span><strong>{selectedSummary.percent}%</strong></div>
                                <div><span>{t("Ssc2Train.table.lootNum")}</span><strong>{formatNumber(selectedSummary.lootNum)}</strong></div>
                                <div><span>{t("Ssc2Train.table.maxPower")}</span><strong>{formatNumber(selectedSummary.maxPower)}</strong></div>
                            </div>
                        </div>
                        {selectedSummary.mismatchCount > 0 && (
                            <div className="alert alert-warning d-flex gap-2 align-items-start">
                                <FaTriangleExclamation className="mt-1 flex-shrink-0" />
                                <span>{t("Ssc2Train.serverMismatch", { count: selectedSummary.mismatchCount })}</span>
                            </div>
                        )}
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-transparent d-flex justify-content-between align-items-center py-3">
                                <h3 className="h5 mb-0">S{selectedSummary.server} · {t("Ssc2Train.serverRoster")}</h3>
                                <span className="badge text-bg-primary">{formatNumber(serverPlayers.length)}</span>
                            </div>
                            <VirtualizedTable
                                className="ssc2-player-virtuoso"
                                data={serverPlayers}
                                computeItemKey={(_, player) => String(player.uid)}
                                headers={<>
                                    <th className="ssc2-col-rank">{t("Ssc2Train.table.rank")}</th>
                                    <th className="ssc2-col-hero">{t("Ssc2Train.table.hero")}</th>
                                    <th>{t("Ssc2Train.table.nickname")}</th>
                                    <th className="ssc2-col-branch">{t("Ssc2Train.table.branch")}</th>
                                    <th>{t("Ssc2Train.table.reportedServer")}</th>
                                    <th>{t("Ssc2Train.table.power")}</th>
                                    <th>{t("Ssc2Train.table.marchNum")}</th>
                                </>}
                                itemContent={(_, player) => (<>
                                    <td className="numeric-cell fw-bold">{player.rank}</td>
                                    <td><HeroThumbnail heroId={player.firstHeroId} t={t} /></td>
                                    <td className="ssc2-name-cell" title={player.displayName}>{player.displayName}</td>
                                    <td><ArmyBranch armyType={player.armyType} t={t} /></td>
                                    <td className="numeric-cell">
                                        S{player.serverId}
                                        {Number(player.serverId) !== Number(selectedSummary.server) && <span className="badge text-bg-warning ms-2">!</span>}
                                    </td>
                                    <td className="numeric-cell fw-semibold">{formatNumber(player.numericPower)}</td>
                                    <td className="numeric-cell">{player.marchNum ?? "-"}</td>
                                </>)}
                            />
                        </div>
                    </>)}
                </section>
            )}

            {view === "compare" && (
                <section>
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body">
                            <div className="row g-3 align-items-end">
                                <div className="col-md-8">
                                    <label className="form-label fw-semibold" htmlFor="ssc2-compare-input">{t("Ssc2Train.compare.add")}</label>
                                    <input
                                        id="ssc2-compare-input"
                                        type="search"
                                        inputMode="numeric"
                                        className="form-control"
                                        value={compareCandidate}
                                        list="ssc2-compare-options"
                                        placeholder={t("Ssc2Train.compare.placeholder")}
                                        autoComplete="off"
                                        role="combobox"
                                        aria-autocomplete="list"
                                        aria-controls="ssc2-compare-options"
                                        onChange={event => setCompareCandidate(event.target.value.replace(/\D/g, ""))}
                                        onKeyDown={event => {
                                            if (event.key !== "Enter") return;
                                            event.preventDefault();
                                            addCompareServer(event.currentTarget.value);
                                        }}
                                    />
                                    <datalist id="ssc2-compare-options">
                                        {servers.filter(server => !compareServers.includes(String(server.server))).map(server => (
                                            <option key={server.server} value={server.server}>S{server.server}</option>
                                        ))}
                                    </datalist>
                                </div>
                                <div className="col-md-4">
                                    <button
                                        type="button"
                                        className="btn btn-primary w-100"
                                        disabled={!serverMap.has(String(compareCandidate)) || compareServers.length >= 20}
                                        onClick={() => addCompareServer()}
                                    >
                                        <FaPlus className="me-2" />{t("Ssc2Train.compare.addButton")}
                                    </button>
                                </div>
                            </div>
                            <div className="d-flex flex-wrap gap-2 mt-3">
                                {comparedSummaries.map(server => (
                                    <span key={server.server} className="badge rounded-pill text-bg-light border px-3 py-2">
                                        S{server.server}
                                        <button
                                            type="button"
                                            className="btn p-0 ms-2 border-0"
                                            aria-label={t("Ssc2Train.compare.remove", { server: server.server })}
                                            onClick={() => setCompareServers(compareServers.filter(value => value !== String(server.server)))}
                                        ><FaXmark /></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {comparedSummaries.length === 0 ? (
                        <div className="ssc2-empty-state">{t("Ssc2Train.compare.empty")}</div>
                    ) : (
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-transparent py-3">
                                <h3 className="h5 mb-1">{t("Ssc2Train.compare.title")}</h3>
                                <p className="small text-secondary mb-0">{t("Ssc2Train.compare.description")}</p>
                            </div>
                            <div className="card-body">
                                <section className="mb-4" aria-labelledby="ssc2-distribution-title">
                                    <h4 id="ssc2-distribution-title" className="h6 fw-bold mb-1">
                                        {t("Ssc2Train.compare.distributionTitle")}
                                    </h4>
                                    <p className="small text-secondary mb-3">
                                        {t("Ssc2Train.compare.distributionDescription")}
                                    </p>
                                    {compareDistributionLoading && <DataLoadingPlaceholder rows={5} />}
                                    {!compareDistributionLoading && compareDistributionError && (
                                        <div className="alert alert-danger mb-0">{t("Ssc2Train.compare.distributionError")}</div>
                                    )}
                                    {!compareDistributionLoading && !compareDistributionError && compareDistributions.length > 0 && (
                                        <div className="ssc2-distribution-chart">
                                            <Line
                                                data={compareChartData}
                                                options={compareChartOptions}
                                                plugins={[RANK_GUIDE_PLUGIN]}
                                                role="img"
                                                aria-label={t("Ssc2Train.compare.distributionAria")}
                                            />
                                        </div>
                                    )}
                                </section>
                                <div className="ssc2-power-bars mb-4">
                                    {comparedSummaries.map(server => (
                                        <div key={server.server} className="ssc2-power-row">
                                            <strong>S{server.server}</strong>
                                            <div className="ssc2-power-track"><span style={{ width: `${server.totalPower / maxComparedPower * 100}%` }} /></div>
                                            <span className="numeric-cell">{formatCompact(server.totalPower)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-striped align-middle mb-0 ssc2-table">
                                        <thead><tr>
                                            <th>{t("Ssc2Train.table.server")}</th>
                                            <th>{t("Ssc2Train.table.players")}</th>
                                            <th>{t("Ssc2Train.table.totalPower")}</th>
                                            <th>{t("Ssc2Train.table.top5")}</th>
                                            <th>{t("Ssc2Train.table.top10")}</th>
                                            <th>{t("Ssc2Train.table.top30")}</th>
                                            <th>{t("Ssc2Train.table.top50")}</th>
                                        </tr></thead>
                                        <tbody>{comparedSummaries.map(server => (
                                            <tr key={server.server}>
                                                <td className="fw-bold">S{server.server}</td>
                                                <td className="numeric-cell">{formatNumber(server.playerCount)}</td>
                                                <td className="numeric-cell fw-semibold">{formatCompact(server.totalPower)}</td>
                                                <td className="numeric-cell">{formatCompact(server.top5Power)}</td>
                                                <td className="numeric-cell">{formatCompact(server.top10Power)}</td>
                                                <td className="numeric-cell">{formatCompact(server.top30Power)}</td>
                                                <td className="numeric-cell">{formatCompact(server.top50Power)}</td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {view === "search" && (
                <section>
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body">
                            <label className="form-label fw-semibold" htmlFor="ssc2-integrated-search">{t("Ssc2Train.search.title")}</label>
                            <div className="input-group input-group-lg">
                                <span className="input-group-text"><FaMagnifyingGlass /></span>
                                <input
                                    id="ssc2-integrated-search"
                                    type="search"
                                    className="form-control"
                                    placeholder={t("Ssc2Train.search.placeholder")}
                                    value={searchText}
                                    onChange={event => setSearchText(event.target.value)}
                                />
                            </div>
                            <p className="small text-secondary mt-2 mb-0">{t("Ssc2Train.search.help")}</p>
                        </div>
                    </div>
                    {searchLoading && <DataLoadingPlaceholder rows={8} />}
                    {!searchLoading && searchIndex && !deferredSearchText.trim() && (
                        <div className="ssc2-empty-state">{t("Ssc2Train.search.empty")}</div>
                    )}
                    {!searchLoading && deferredSearchText.trim() && (
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-transparent d-flex align-items-center justify-content-between py-3">
                                <h3 className="h5 mb-0">{t("Ssc2Train.search.results")}</h3>
                                <span className="badge text-bg-primary">{formatNumber(integratedResults.length)}</span>
                            </div>
                            <VirtualizedTable
                                className="ssc2-search-virtuoso"
                                data={integratedResults}
                                computeItemKey={(_, player) => `${player.u}-${player.s}`}
                                headers={<>
                                    <th className="ssc2-col-hero">{t("Ssc2Train.table.hero")}</th>
                                    <th>{t("Ssc2Train.table.nickname")}</th>
                                    <th className="ssc2-col-branch">{t("Ssc2Train.table.branch")}</th>
                                    <th>{t("Ssc2Train.table.server")}</th>
                                    <th>{t("Ssc2Train.table.reportedServer")}</th>
                                    <th>{t("Ssc2Train.table.rank")}</th>
                                    <th>{t("Ssc2Train.table.power")}</th>
                                </>}
                                itemContent={(_, player) => (<>
                                    <td><HeroThumbnail heroId={player.h} t={t} /></td>
                                    <td className="ssc2-name-cell">{player.n}</td>
                                    <td><ArmyBranch armyType={player.a} t={t} /></td>
                                    <td className="fw-bold">S{player.s}</td>
                                    <td>S{player.rs}</td>
                                    <td className="numeric-cell">{player.r}</td>
                                    <td className="numeric-cell fw-semibold">{formatNumber(player.p)}</td>
                                </>)}
                            />
                            {integratedResults.length >= 300 && <div className="card-footer small text-secondary">{t("Ssc2Train.search.limit")}</div>}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
