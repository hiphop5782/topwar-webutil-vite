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
import { useSearchParams } from "react-router-dom";
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
const COMPARE_METRIC_KEYS = ["totalPower", "playerCount", "maxPower", "top5Power", "top10Power", "top30Power", "top50Power"];
const CHART_LIMITS = [1, 5, 10, 30, 50, 0];
const RANK_GUIDES = [1, 10, 30, 50];
const getCompareColor = index => COMPARE_COLORS[index]
    ?? `hsl(${Math.round(index * 137.508) % 360} 68% 45%)`;
const rankToChartPosition = rank => {
    const numericRank = Number(rank);
    if (numericRank <= 10) return numericRank * 4;
    if (numericRank <= 50) return 40 + (numericRank - 10);
    return 80 + (numericRank - 50) * 0.12;
};
const chartPositionToRank = position => {
    const numericPosition = Number(position);
    if (numericPosition <= 40) return numericPosition / 4;
    if (numericPosition <= 80) return 10 + (numericPosition - 40);
    return 50 + (numericPosition - 80) / 0.12;
};
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
        const maxRank = Math.max(
            0,
            ...chart.data.datasets.map(dataset => dataset.data.at(-1)?.rank ?? 0),
        );
        RANK_GUIDES.forEach(rank => {
            if (rank > maxRank) return;
            const x = scales.x.getPixelForValue(rankToChartPosition(rank));
            ctx.beginPath();
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.stroke();
            ctx.textAlign = rank === 1 ? "left" : "center";
            ctx.fillText(`TOP ${rank}`, rank === 1 ? x + 5 : x, chartArea.top + 12);
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

function displayNameOf(player, fallbackName) {
    const uid = String(player?.uid ?? "");
    const info = parsePlayerInfo(player?.playerInfo);
    const candidates = [player?.username, info.username, info.nickname, info.name];
    const safeName = candidates.find(candidate => {
        const value = String(candidate ?? "").trim();
        return value && (!uid || !value.includes(uid));
    });

    return safeName ? String(safeName).trim() : fallbackName;
}

function matchesPlayerName(name, rawQuery) {
    if (!rawQuery.trim()) return true;
    const query = getPlayerSearchQuery(rawQuery);
    const keys = getPlayerNicknameSearchKeys(name);
    return String(keys[query.field] ?? "").includes(query.key);
}

function ServerAutocomplete({
    id,
    servers,
    value,
    currentServer = "",
    excludedServers = [],
    restoreCurrentOnBlur = false,
    label,
    placeholder,
    onInputChange,
    onSelect,
    t,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef(null);
    const excludedSet = useMemo(
        () => new Set(excludedServers.map(server => String(server))),
        [excludedServers],
    );
    const filteredServers = useMemo(() => {
        const keyword = String(value ?? "").trim();
        const available = servers.filter(server => !excludedSet.has(String(server)));
        if (!keyword) return available.slice(0, 30);

        const startsWith = [];
        const includes = [];
        available.forEach(server => {
            const text = String(server);
            if (text.startsWith(keyword)) startsWith.push(text);
            else if (text.includes(keyword)) includes.push(text);
        });
        return [...startsWith, ...includes].slice(0, 30);
    }, [excludedSet, servers, value]);

    const selectServer = useCallback(server => {
        onSelect(String(server));
        setIsOpen(false);
        setActiveIndex(-1);
    }, [onSelect]);

    const handleKeyDown = event => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex(current => Math.min(current + 1, filteredServers.length - 1));
            return;
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(current => Math.max(current - 1, 0));
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            const activeServer = activeIndex >= 0 ? filteredServers[activeIndex] : null;
            const exactServer = servers.find(server => String(server) === String(value));
            const target = activeServer ?? exactServer;
            if (target !== null && target !== undefined && !excludedSet.has(String(target))) selectServer(target);
            return;
        }
        if (event.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(-1);
        }
    };

    return (
        <div className="ssc2-server-autocomplete">
            <label className="form-label fw-semibold" htmlFor={id}>{label}</label>
            <div className="input-group">
                <span className="input-group-text">S</span>
                <input
                    ref={inputRef}
                    id={id}
                    type="search"
                    inputMode="numeric"
                    className="form-control"
                    value={value}
                    placeholder={placeholder}
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                    aria-controls={`${id}-options`}
                    aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
                    onChange={event => {
                        onInputChange(event.target.value.replace(/\D/g, ""));
                        setIsOpen(true);
                        setActiveIndex(-1);
                    }}
                    onFocus={event => {
                        event.currentTarget.select();
                        if (restoreCurrentOnBlur && String(value) === String(currentServer)) onInputChange("");
                        setIsOpen(true);
                    }}
                    onBlur={() => {
                        setTimeout(() => {
                            setIsOpen(false);
                            setActiveIndex(-1);
                            if (
                                restoreCurrentOnBlur
                                && !servers.some(server => String(server) === String(value))
                            ) onInputChange(String(currentServer));
                        }, 120);
                    }}
                    onKeyDown={handleKeyDown}
                />
                {value && (
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        aria-label={t("Ssc2Train.autocomplete.clear")}
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => {
                            onInputChange("");
                            setIsOpen(true);
                            setActiveIndex(-1);
                            inputRef.current?.focus();
                        }}
                    >
                        <FaXmark />
                    </button>
                )}
            </div>
            {isOpen && (
                <div id={`${id}-options`} className="ssc2-server-autocomplete-menu dropdown-menu show shadow" role="listbox">
                    {filteredServers.length > 0 ? filteredServers.map((server, index) => (
                        <button
                            key={server}
                            id={`${id}-option-${index}`}
                            type="button"
                            role="option"
                            aria-selected={String(currentServer) === String(server)}
                            className={`dropdown-item d-flex align-items-center justify-content-between gap-2 ${index === activeIndex ? "active" : ""}`}
                            onMouseDown={event => event.preventDefault()}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => selectServer(server)}
                        >
                            <span>S{server}</span>
                            {String(currentServer) === String(server) && (
                                <span className="badge text-bg-primary">{t("Ssc2Train.autocomplete.selected")}</span>
                            )}
                        </button>
                    )) : (
                        <div className="dropdown-item-text text-secondary">{t("Ssc2Train.autocomplete.noResult")}</div>
                    )}
                </div>
            )}
        </div>
    );
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
                <h2 id="ssc2-access-title" className="h3 mb-2">{t("Ssc2Train.accessTitle")}</h2>
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
    const [, setRouteSearchParams] = useSearchParams();
    const [accessGranted, setAccessGranted] = useState(readAccessState);
    const [answer, setAnswer] = useState("");
    const [answerError, setAnswerError] = useState(false);
    const answerRef = useRef(null);
    const serverCacheRef = useRef(new Map());

    const [view, setView] = useParamState("view", "overview", {
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
    const [serverCandidate, setServerCandidate] = useState("");
    const [compareCandidate, setCompareCandidate] = useState("");
    const [compareSort, setCompareSort] = useState({ key: "totalPower", direction: "desc" });
    const [compareBarMetric, setCompareBarMetric] = useState("totalPower");
    const [compareChartLimit, setCompareChartLimit] = useState(0);
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
    const serverNumbers = useMemo(() => servers.map(server => String(server.server)), [servers]);
    const serverMap = useMemo(
        () => new Map(servers.map(server => [String(server.server), server])),
        [servers],
    );

    useEffect(() => {
        setServerCandidate(String(selectedServer ?? ""));
    }, [selectedServer]);

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
    const powerUnitFormatter = useMemo(
        () => new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }),
        [],
    );
    const formatNumber = useCallback(value => numberFormatter.format(Number(value ?? 0)), [numberFormatter]);
    const formatPower = useCallback(value => {
        const numericValue = Number(value ?? 0);
        if (!Number.isFinite(numericValue)) return "-";
        const absoluteValue = Math.abs(numericValue);
        if (absoluteValue >= 1_000_000_000_000) {
            return `${powerUnitFormatter.format(numericValue / 1_000_000_000_000)}T`;
        }
        if (absoluteValue >= 1_000_000_000) {
            return `${powerUnitFormatter.format(numericValue / 1_000_000_000)}B`;
        }
        if (absoluteValue >= 1_000_000) {
            return `${powerUnitFormatter.format(numericValue / 1_000_000)}M`;
        }
        return numberFormatter.format(numericValue);
    }, [numberFormatter, powerUnitFormatter]);
    const totalPower = useMemo(
        () => servers.reduce((total, server) => total + server.totalPower, 0),
        [servers],
    );

    const overviewRows = useMemo(() => {
        const query = overviewQuery.trim();
        const direction = overviewSort.direction === "asc" ? 1 : -1;
        const ranked = [...servers]
            .sort((left, right) => {
                const difference = Number(left[overviewSort.key] ?? 0) - Number(right[overviewSort.key] ?? 0);
                return difference !== 0 ? difference * direction : left.server - right.server;
            })
            .map((server, index) => ({ ...server, overviewRank: index + 1 }));

        return query
            ? ranked.filter(server => String(server.server).includes(query))
            : ranked;
    }, [overviewQuery, overviewSort, servers]);

    const selectedSummary = selectedServer ? serverMap.get(String(selectedServer)) : null;
    const serverPlayers = useMemo(() => {
        if (!serverData?.players) return [];
        return serverData.players
            .map(player => ({
                ...player,
                displayName: displayNameOf(player, t("Ssc2Train.anonymousPlayer")),
                numericPower: Number(player.power ?? 0),
            }))
            .filter(player => matchesPlayerName(player.displayName, serverPlayerQuery));
    }, [serverData, serverPlayerQuery, t]);

    const comparedSummaries = useMemo(
        () => compareServers.map(server => serverMap.get(String(server))).filter(Boolean).slice(0, 20),
        [compareServers, serverMap],
    );
    const sortedComparedSummaries = useMemo(() => {
        const direction = compareSort.direction === "asc" ? 1 : -1;
        return [...comparedSummaries].sort((left, right) => {
            const difference = Number(left[compareSort.key] ?? 0) - Number(right[compareSort.key] ?? 0);
            return difference !== 0 ? difference * direction : left.server - right.server;
        });
    }, [compareSort, comparedSummaries]);
    const maxComparedMetric = Math.max(
        1,
        ...comparedSummaries.map(server => Number(server[compareBarMetric] ?? 0)),
    );

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
        const visibleDistributions = compareDistributions.map(item => ({
            ...item,
            totalCount: item.powers.length,
            powers: compareChartLimit ? item.powers.slice(0, compareChartLimit) : item.powers,
        }));
        return {
            datasets: visibleDistributions.map((item, index) => {
                const color = getCompareColor(index);
                return {
                    label: t("Ssc2Train.compare.datasetLabel", {
                        server: item.server,
                        count: formatNumber(item.totalCount),
                    }),
                    data: item.powers.map((power, powerIndex) => ({
                        x: rankToChartPosition(powerIndex + 1),
                        y: power,
                        rank: powerIndex + 1,
                    })),
                    borderColor: color,
                    backgroundColor: color,
                    borderWidth: 2.25,
                    pointRadius: context => context.dataIndex === 0 ? 6 : (context.dataIndex < 10 ? 2 : 0),
                    pointHoverRadius: 7,
                    pointHitRadius: 12,
                    pointBackgroundColor: context => context.dataIndex === 0 ? "#fff" : color,
                    pointBorderColor: color,
                    pointBorderWidth: context => context.dataIndex === 0 ? 3 : 1,
                    tension: 0.18,
                };
            }),
        };
    }, [compareChartLimit, compareDistributions, formatNumber, t]);

    const compareChartMaxRank = useMemo(() => Math.max(
        0,
        ...compareDistributions.map(item => (
            compareChartLimit ? Math.min(compareChartLimit, item.powers.length) : item.powers.length
        )),
    ), [compareChartLimit, compareDistributions]);

    const compareChartYBounds = useMemo(() => {
        if (!compareChartLimit) return null;

        const visiblePowers = compareDistributions
            .flatMap(item => item.powers.slice(0, compareChartLimit))
            .map(Number)
            .filter(Number.isFinite);
        if (visiblePowers.length === 0) return null;

        const lowestPower = Math.min(...visiblePowers);
        const highestPower = Math.max(...visiblePowers);
        const spread = highestPower - lowestPower;
        const padding = spread > 0
            ? spread * 0.08
            : Math.max(highestPower * 0.08, 1);

        return {
            min: Math.max(0, lowestPower - padding),
            max: highestPower + padding,
        };
    }, [compareChartLimit, compareDistributions]);

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
                    title: items => items.length
                        ? t("Ssc2Train.compare.rankTooltip", { rank: items[0].raw.rank })
                        : "",
                    label: context => `${context.dataset.label}: ${formatPower(context.parsed.y)}`,
                },
            },
        },
        scales: {
            x: {
                type: "linear",
                min: 0,
                title: { display: true, text: t("Ssc2Train.compare.rankAxis") },
                afterBuildTicks: scale => {
                    const candidates = [1, 5, 10, 20, 30, 50, 100, 200, 300, 400, 500, compareChartMaxRank];
                    const ranks = [...new Set(candidates)]
                        .filter(rank => rank > 0 && rank <= compareChartMaxRank)
                        .sort((left, right) => left - right);
                    scale.ticks = ranks.map(rank => ({ value: rankToChartPosition(rank) }));
                },
                ticks: {
                    maxRotation: 0,
                    callback: value => Math.round(chartPositionToRank(value)),
                },
                grid: { display: false },
            },
            y: {
                beginAtZero: compareChartLimit === 0,
                min: compareChartYBounds?.min,
                max: compareChartYBounds?.max,
                title: { display: true, text: t("Ssc2Train.table.power") },
                ticks: { callback: value => formatPower(value) },
            },
        },
    }), [compareChartLimit, compareChartMaxRank, compareChartYBounds, formatPower, t]);

    const compareMetricLabels = useMemo(() => ({
        server: t("Ssc2Train.table.server"),
        playerCount: t("Ssc2Train.table.players"),
        totalPower: t("Ssc2Train.table.totalPower"),
        maxPower: t("Ssc2Train.table.top1"),
        top5Power: t("Ssc2Train.table.top5"),
        top10Power: t("Ssc2Train.table.top10"),
        top30Power: t("Ssc2Train.table.top30"),
        top50Power: t("Ssc2Train.table.top50"),
    }), [t]);
    const formatCompareBarValue = useCallback(
        value => compareBarMetric === "playerCount" ? formatNumber(value) : formatPower(value),
        [compareBarMetric, formatNumber, formatPower],
    );

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
            direction: current.key === key
                ? (current.direction === "asc" ? "desc" : "asc")
                : (key === "server" ? "asc" : "desc"),
        }));
    }, []);

    const changeCompareSort = useCallback(key => {
        if (key !== "server") setCompareBarMetric(key);
        setCompareSort(current => ({
            key,
            direction: current.key === key
                ? (current.direction === "asc" ? "desc" : "asc")
                : (key === "server" ? "asc" : "desc"),
        }));
    }, []);

    const openServerRoster = useCallback(server => {
        const targetServer = String(server);
        setRouteSearchParams(previous => {
            const next = new URLSearchParams(previous);
            next.set("view", "server");
            next.set("server", targetServer);
            return next;
        }, { replace: true });
    }, [setRouteSearchParams]);

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
                <SummaryCard label={t("Ssc2Train.metrics.totalPower")} value={formatPower(totalPower)} />
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
                    <div className="ssc2-ranking-toolbar border-bottom">
                        <span className="small fw-bold text-secondary text-nowrap">{t("Ssc2Train.overview.criteria")}</span>
                        <div className="ssc2-ranking-metrics" role="group" aria-label={t("Ssc2Train.overview.criteria")}>
                            {COMPARE_METRIC_KEYS.map(key => (
                                <button
                                    key={key}
                                    type="button"
                                    aria-pressed={overviewSort.key === key}
                                    className={`btn btn-sm ${overviewSort.key === key ? "btn-primary" : "btn-outline-secondary"}`}
                                    onClick={() => changeSort(key)}
                                >
                                    {compareMetricLabels[key]}
                                    {overviewSort.key === key ? (overviewSort.direction === "asc" ? " ↑" : " ↓") : ""}
                                </button>
                            ))}
                        </div>
                    </div>
                    <VirtualizedTable
                        className="ssc2-overview-virtuoso"
                        data={overviewRows}
                        computeItemKey={(_, server) => server.server}
                        headers={<>
                            <th className="ssc2-col-rank">{t("Ssc2Train.table.rank")}</th>
                            <th>{t("Ssc2Train.table.server")}</th>
                            <th className={overviewSort.key === "totalPower" ? "ssc2-total-power-column" : ""}>
                                <button type="button" className="ssc2-sort-button" onClick={() => changeSort(overviewSort.key)}>
                                    {compareMetricLabels[overviewSort.key]}
                                    {overviewSort.direction === "asc" ? " ↑" : " ↓"}
                                </button>
                            </th>
                            {overviewSort.key !== "totalPower" && (
                                <th className="ssc2-total-power-column">{t("Ssc2Train.table.totalPower")}</th>
                            )}
                            {overviewSort.key !== "playerCount" && <th>{t("Ssc2Train.table.players")}</th>}
                            <th className="ssc2-col-action">{t("Ssc2Train.table.details")}</th>
                        </>}
                        itemContent={(_, server) => {
                            const rankClass = server.overviewRank <= 3 ? `ssc2-rank-cell-${server.overviewRank}` : "";
                            const metricValue = overviewSort.key === "playerCount"
                                ? formatNumber(server.playerCount)
                                : formatPower(server[overviewSort.key]);
                            return (<>
                                <td className={`numeric-cell fw-bold ${rankClass}`}>
                                    <span className={`ssc2-rank-badge ${server.overviewRank <= 3 ? `is-top-${server.overviewRank}` : ""}`}>
                                        {server.overviewRank}
                                    </span>
                                </td>
                                <td className={rankClass}><strong>S{server.server}</strong></td>
                                <td className={`numeric-cell fs-6 fw-bold ${overviewSort.key === "totalPower" ? "ssc2-total-power-column" : ""} ${rankClass}`}>
                                    {metricValue}
                                </td>
                                {overviewSort.key !== "totalPower" && (
                                    <td className={`numeric-cell ssc2-total-power-column ${rankClass}`}>{formatPower(server.totalPower)}</td>
                                )}
                                {overviewSort.key !== "playerCount" && (
                                    <td className={`numeric-cell ${rankClass}`}>{formatNumber(server.playerCount)}</td>
                                )}
                                <td className={rankClass}>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary text-nowrap"
                                        onClick={() => openServerRoster(server.server)}
                                    >
                                        {t("Ssc2Train.openServer")}
                                    </button>
                                </td>
                            </>);
                        }}
                    />
                </section>
            )}

            {view === "server" && (
                <section>
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body row g-3 align-items-end">
                            <div className="col-md-4">
                                <ServerAutocomplete
                                    id="ssc2-server-input"
                                    servers={serverNumbers}
                                    value={serverCandidate}
                                    currentServer={selectedServer}
                                    restoreCurrentOnBlur
                                    label={t("Ssc2Train.selectServer")}
                                    placeholder={t("Ssc2Train.serverSearchPlaceholder")}
                                    onInputChange={setServerCandidate}
                                    onSelect={server => {
                                        setServerCandidate(server);
                                        setSelectedServer(server);
                                    }}
                                    t={t}
                                />
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
                            <SummaryCard label={t("Ssc2Train.metrics.totalPower")} value={formatPower(selectedSummary.totalPower)} />
                            <SummaryCard label={t("Ssc2Train.table.top5")} value={formatPower(selectedSummary.top5Power)} />
                            <SummaryCard label={t("Ssc2Train.table.top10")} value={formatPower(selectedSummary.top10Power)} />
                        </div>
                        <div className="ssc2-server-meta card border-0 shadow-sm mb-4">
                            <div className="card-body">
                                <div><span>{t("Ssc2Train.table.percent")}</span><strong>{selectedSummary.percent}%</strong></div>
                                <div><span>{t("Ssc2Train.table.lootNum")}</span><strong>{formatNumber(selectedSummary.lootNum)}</strong></div>
                                <div><span>{t("Ssc2Train.table.maxPower")}</span><strong>{formatPower(selectedSummary.maxPower)}</strong></div>
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
                                    <td className="numeric-cell fw-semibold">{formatPower(player.numericPower)}</td>
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
                                    <ServerAutocomplete
                                        id="ssc2-compare-input"
                                        servers={serverNumbers}
                                        value={compareCandidate}
                                        excludedServers={compareServers}
                                        label={t("Ssc2Train.compare.add")}
                                        placeholder={t("Ssc2Train.compare.placeholder")}
                                        onInputChange={setCompareCandidate}
                                        onSelect={addCompareServer}
                                        t={t}
                                    />
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
                                    <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-1">
                                        <h4 id="ssc2-distribution-title" className="h6 fw-bold mb-0">
                                            {t("Ssc2Train.compare.distributionTitle")}
                                        </h4>
                                        <div className="btn-group btn-group-sm" role="group" aria-label={t("Ssc2Train.compare.chartRange")}>
                                            {CHART_LIMITS.map(limit => (
                                                <button
                                                    key={limit}
                                                    type="button"
                                                    className={`btn ${compareChartLimit === limit ? "btn-primary" : "btn-outline-primary"}`}
                                                    onClick={() => setCompareChartLimit(limit)}
                                                >
                                                    {limit ? `TOP ${limit}` : t("Ssc2Train.compare.allRanks")}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="small text-secondary mb-3">
                                        {t("Ssc2Train.compare.distributionDescription")}
                                    </p>
                                    {compareDistributionLoading && <DataLoadingPlaceholder rows={5} />}
                                    {!compareDistributionLoading && compareDistributionError && (
                                        <div className="alert alert-danger mb-0">{t("Ssc2Train.compare.distributionError")}</div>
                                    )}
                                    {!compareDistributionLoading && !compareDistributionError && compareDistributions.length > 0 && (
                                        <div
                                            className="ssc2-distribution-chart"
                                            data-y-axis-mode={compareChartLimit ? "focused" : "zero"}
                                            data-y-axis-min={compareChartYBounds?.min ?? 0}
                                        >
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
                                <section className="mb-4" aria-labelledby="ssc2-bar-title">
                                    <div className="d-flex flex-column gap-2 mb-3">
                                        <h4 id="ssc2-bar-title" className="h6 fw-bold mb-0">
                                            {t("Ssc2Train.compare.barTitle", { metric: compareMetricLabels[compareBarMetric] })}
                                        </h4>
                                        <div className="ssc2-compare-metric-toolbar" role="group" aria-label={t("Ssc2Train.compare.barMetric")}>
                                            {COMPARE_METRIC_KEYS.map(key => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    className={`btn btn-sm ${compareBarMetric === key ? "btn-primary" : "btn-outline-secondary"}`}
                                                    onClick={() => changeCompareSort(key)}
                                                >
                                                    {compareMetricLabels[key]}
                                                    {compareSort.key === key ? (compareSort.direction === "asc" ? " ↑" : " ↓") : ""}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="ssc2-power-bars">
                                        {sortedComparedSummaries.map(server => (
                                            <div key={server.server} className="ssc2-power-row">
                                                <strong>S{server.server}</strong>
                                                <div className="ssc2-power-track">
                                                    <span style={{ width: `${Number(server[compareBarMetric] ?? 0) / maxComparedMetric * 100}%` }} />
                                                </div>
                                                <span className="numeric-cell">{formatCompareBarValue(server[compareBarMetric])}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                <div className="table-responsive">
                                    <table className="table table-striped align-middle mb-0 ssc2-table">
                                        <thead><tr>
                                            {["server", "playerCount", "totalPower", "maxPower", "top5Power", "top10Power", "top30Power", "top50Power"].map(key => (
                                                <th
                                                    key={key}
                                                    className={key === "totalPower" ? "ssc2-total-power-column" : ""}
                                                    aria-sort={compareSort.key === key
                                                        ? (compareSort.direction === "asc" ? "ascending" : "descending")
                                                        : "none"}
                                                >
                                                    <button type="button" className="ssc2-sort-button" onClick={() => changeCompareSort(key)}>
                                                        {compareMetricLabels[key]}
                                                        {compareSort.key === key ? (compareSort.direction === "asc" ? " ↑" : " ↓") : ""}
                                                    </button>
                                                </th>
                                            ))}
                                        </tr></thead>
                                        <tbody>{sortedComparedSummaries.map(server => (
                                            <tr key={server.server}>
                                                <td className="fw-bold">S{server.server}</td>
                                                <td className="numeric-cell">{formatNumber(server.playerCount)}</td>
                                                <td className="numeric-cell fw-semibold ssc2-total-power-column">{formatPower(server.totalPower)}</td>
                                                <td className="numeric-cell">{formatPower(server.maxPower)}</td>
                                                <td className="numeric-cell">{formatPower(server.top5Power)}</td>
                                                <td className="numeric-cell">{formatPower(server.top10Power)}</td>
                                                <td className="numeric-cell">{formatPower(server.top30Power)}</td>
                                                <td className="numeric-cell">{formatPower(server.top50Power)}</td>
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
                                    <td className="numeric-cell fw-semibold">{formatPower(player.p)}</td>
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
