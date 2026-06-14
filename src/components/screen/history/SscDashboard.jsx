import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Tooltip,
    Legend,
} from "chart.js";

import {
    Bar,
    Line,
} from "react-chartjs-2";

import mergedData from "@src/assets/json/ssc/2026-ssc-allround.json";
import { useListParamState } from "@src/hooks/useListParamState";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Tooltip,
    Legend
);

const SERVER_COLORS = [
    {
        line: "#0d6efd",
        soft: "rgba(13, 110, 253, 0.22)",
        bar: "rgba(13, 110, 253, 0.78)",
    },
    {
        line: "#dc3545",
        soft: "rgba(220, 53, 69, 0.22)",
        bar: "rgba(220, 53, 69, 0.78)",
    },
    {
        line: "#198754",
        soft: "rgba(25, 135, 84, 0.22)",
        bar: "rgba(25, 135, 84, 0.78)",
    },
    {
        line: "#fd7e14",
        soft: "rgba(253, 126, 20, 0.22)",
        bar: "rgba(253, 126, 20, 0.78)",
    },
    {
        line: "#6f42c1",
        soft: "rgba(111, 66, 193, 0.22)",
        bar: "rgba(111, 66, 193, 0.78)",
    },
];

const DEFAULT_BAR_COLOR = "rgba(108, 117, 125, 0.35)";
const DEFAULT_BAR_BORDER = "rgba(108, 117, 125, 0.75)";
const PLAYBACK_STEP_MS = 1800;
const RANKING_ANIMATION_MS = 1500;

const normalizeItem = (item) => ({
    ...item,
    round: Number(item.round),
    rank: Number(item.rank),
    score: Number(item.score ?? 0),
    score2: Number(item.score2 ?? 0),
    sid: Number(item.sid),
    serverFlag: Number(item.serverFlag ?? 0),
});

const buildCumulativeRanking = (data, targetRound) => {
    const serverMap = new Map();

    data
        .filter((item) => item.round <= Number(targetRound))
        .forEach((item) => {
            const current =
                serverMap.get(item.sid) ?? {
                    sid: item.sid,
                    cumulativePoint: 0,
                    cumulativeHonor: 0,
                    serverFlag: item.serverFlag,
                    roundsPlayed: 0,
                };

            current.cumulativePoint += item.score;
            current.cumulativeHonor += item.score2;
            current.serverFlag = item.serverFlag;
            current.roundsPlayed += 1;

            serverMap.set(item.sid, current);
        });

    return [...serverMap.values()]
        .sort((a, b) => {
            const pointDifference =
                b.cumulativePoint - a.cumulativePoint;

            if (pointDifference !== 0) {
                return pointDifference;
            }

            const honorDifference =
                b.cumulativeHonor - a.cumulativeHonor;

            if (honorDifference !== 0) {
                return honorDifference;
            }

            return a.sid - b.sid;
        })
        .map((item, index) => ({
            ...item,
            cumulativeRank: index + 1,
        }));
};

function ServerAutocomplete({
    servers,
    value,
    onChange,
    label,
    placeholder,
    serverPrefix,
    selectedLabel,
    noResultLabel,
    clearAriaLabel,
}) {
    const [inputValue, setInputValue] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const filteredServers = useMemo(() => {
        const keyword = inputValue.trim();

        if (!keyword) {
            return [];
        }

        const startsWith = [];
        const includes = [];

        servers.forEach((server) => {
            const text = String(server);

            if (text.startsWith(keyword)) {
                startsWith.push(server);
            } else if (text.includes(keyword)) {
                includes.push(server);
            }
        });

        return [...startsWith, ...includes].slice(0, 30);
    }, [servers, inputValue]);

    const selectServer = (server) => {
        onChange(Number(server));

        // 선택이 끝나면 검색 입력값을 비운다.
        setInputValue("");
        setIsOpen(false);
        setActiveIndex(-1);
    };

    const handleInputChange = (event) => {
        const nextValue =
            event.target.value.replace(/\D/g, "");

        setInputValue(nextValue);
        setIsOpen(true);
        setActiveIndex(-1);
    };

    const handleKeyDown = (event) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);

            setActiveIndex((current) =>
                Math.min(
                    current + 1,
                    filteredServers.length - 1
                )
            );

            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();

            setActiveIndex((current) =>
                Math.max(current - 1, 0)
            );

            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();

            if (
                activeIndex >= 0 &&
                filteredServers[activeIndex] !== undefined
            ) {
                selectServer(filteredServers[activeIndex]);
                return;
            }

            const exactServer = servers.find(
                (server) =>
                    String(server) === inputValue
            );

            if (exactServer !== undefined) {
                selectServer(exactServer);
            }

            return;
        }

        if (event.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(-1);
        }
    };

    return (
        <div className="position-relative">
            <label className="form-label small fw-semibold mb-1">
                {label}
            </label>

            <div className="input-group">
                <span className="input-group-text">
                    S
                </span>

                <input
                    type="text"
                    inputMode="numeric"
                    className="form-control"
                    value={inputValue}
                    placeholder={placeholder}
                    autoComplete="off"
                    onChange={handleInputChange}
                    onFocus={() =>
                        setIsOpen(
                            Boolean(
                                inputValue.trim()
                            )
                        )
                    }
                    onBlur={() => {
                        setTimeout(() => {
                            setIsOpen(false);
                            setActiveIndex(-1);

                            if (
                                inputValue &&
                                !servers.includes(Number(inputValue))
                            ) {
                                setInputValue("");
                            }
                        }, 150);
                    }}
                    onKeyDown={handleKeyDown}
                />

                {inputValue && (
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        aria-label={clearAriaLabel}
                        onMouseDown={(event) =>
                            event.preventDefault()
                        }
                        onClick={() => {
                            setInputValue("");
                            setIsOpen(false);
                            setActiveIndex(-1);
                        }}
                    >
                        ×
                    </button>
                )}
            </div>

            {isOpen &&
                inputValue.trim() !== "" && (
                <div
                    className="dropdown-menu show w-100 shadow"
                    style={{
                        maxHeight: "280px",
                        overflowY: "auto",
                        zIndex: 1050,
                    }}
                >
                    {filteredServers.length > 0 ? (
                        filteredServers.map(
                            (server, index) => (
                                <button
                                    key={server}
                                    type="button"
                                    className={[
                                        "dropdown-item",
                                        index === activeIndex
                                            ? "active"
                                            : "",
                                        Number(value) === Number(server)
                                            ? "fw-bold"
                                            : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    onMouseDown={(event) =>
                                        event.preventDefault()
                                    }
                                    onMouseEnter={() =>
                                        setActiveIndex(index)
                                    }
                                    onClick={() =>
                                        selectServer(server)
                                    }
                                >
                                    {serverPrefix} {server}

                                    {Number(value) ===
                                        Number(server) && (
                                        <span className="ms-2 badge text-bg-primary">
                                            {selectedLabel}
                                        </span>
                                    )}
                                </button>
                            )
                        )
                    ) : (
                        <div className="dropdown-item-text text-secondary">
                            {noResultLabel}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function SummaryCard({
    title,
    value,
    description,
    valueClassName = "",
}) {
    return (
        <div className="col-12 col-sm-6 col-xl-3">
            <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                    <div className="small fw-semibold text-secondary mb-2">
                        {title}
                    </div>

                    <div
                        className={`fs-3 fw-bold mb-1 ${valueClassName}`}
                    >
                        {value}
                    </div>

                    <div className="small text-secondary">
                        {description}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ServerColorBadge({
    server,
    color,
    onRemove,
    removable,
    t,
}) {
    return (
        <span
            className="badge rounded-pill d-inline-flex align-items-center gap-2 px-3 py-2"
            style={{
                backgroundColor: color.soft,
                color: color.line,
                border: `1px solid ${color.line}`,
            }}
        >
            <span
                className="rounded-circle d-inline-block"
                style={{
                    width: "9px",
                    height: "9px",
                    backgroundColor: color.line,
                }}
            />

            {t("SscDashboard.server-prefix")} {server}

            {removable && (
                <button
                    type="button"
                    className="btn-close"
                    aria-label={t(
                        "SscDashboard.remove-compare-server",
                        { server }
                    )}
                    style={{
                        fontSize: "0.55rem",
                    }}
                    onClick={() => onRemove(server)}
                />
            )}
        </span>
    );
}


const easeInOutCubic = progress => {
    return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
};

function RankingRaceChart({
    ranking,
    comparisonServers,
    formatNumber,
    fixedMaxPoint,
    fixedVisibleCount,
    t,
}) {
    const rowHeight = 42;
    const frameRef = useRef(null);
    const previousTargetRef = useRef([]);
    const currentFrameRef = useRef([]);
    const [animatedRows, setAnimatedRows] = useState(() => {
        return ranking.map(item => ({
            ...item,
            visualRank: item.cumulativeRank,
            visualPoint: item.cumulativePoint,
            opacity: 1,
        }));
    });

    const comparedMap = useMemo(() => {
        return new Map(
            comparisonServers.map((server, index) => [
                Number(server),
                SERVER_COLORS[index % SERVER_COLORS.length],
            ])
        );
    }, [comparisonServers]);

    useEffect(() => {
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
        }

        const previousRows = currentFrameRef.current.length > 0
            ? currentFrameRef.current
            : previousTargetRef.current;

        const previousMap = new Map(
            previousRows.map(item => [Number(item.sid), item])
        );

        const targetMap = new Map(
            ranking.map(item => [Number(item.sid), item])
        );

        const serverIds = [...new Set([
            ...previousMap.keys(),
            ...targetMap.keys(),
        ])];

        const startRows = serverIds.map(serverId => {
            const previous = previousMap.get(serverId);
            const target = targetMap.get(serverId);

            return {
                sid: serverId,
                serverFlag: target?.serverFlag ?? previous?.serverFlag ?? 0,
                cumulativeRank: target?.cumulativeRank ?? previous?.cumulativeRank ?? fixedVisibleCount + 1,
                cumulativePoint: target?.cumulativePoint ?? previous?.cumulativePoint ?? 0,
                cumulativeHonor: target?.cumulativeHonor ?? previous?.cumulativeHonor ?? 0,
                startRank: previous?.visualRank ?? previous?.cumulativeRank ?? fixedVisibleCount + 1,
                targetRank: target?.cumulativeRank ?? fixedVisibleCount + 1,
                startPoint: previous?.visualPoint ?? previous?.cumulativePoint ?? 0,
                targetPoint: target?.cumulativePoint ?? previous?.cumulativePoint ?? 0,
                startOpacity: previous?.opacity ?? (target ? 0 : 1),
                targetOpacity: target ? 1 : 0,
            };
        });

        const startTime = performance.now();

        const animate = currentTime => {
            const rawProgress = Math.min(
                (currentTime - startTime) / RANKING_ANIMATION_MS,
                1
            );
            const progress = easeInOutCubic(rawProgress);

            const frameRows = startRows.map(item => ({
                sid: item.sid,
                serverFlag: item.serverFlag,
                cumulativeRank: item.cumulativeRank,
                cumulativePoint: item.cumulativePoint,
                cumulativeHonor: item.cumulativeHonor,
                visualRank:
                    item.startRank +
                    (item.targetRank - item.startRank) * progress,
                visualPoint:
                    item.startPoint +
                    (item.targetPoint - item.startPoint) * progress,
                opacity:
                    item.startOpacity +
                    (item.targetOpacity - item.startOpacity) * progress,
            }));

            currentFrameRef.current = frameRows;
            setAnimatedRows(frameRows);

            if (rawProgress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            } else {
                const completedRows = ranking.map(item => ({
                    ...item,
                    visualRank: item.cumulativeRank,
                    visualPoint: item.cumulativePoint,
                    opacity: 1,
                }));

                previousTargetRef.current = completedRows;
                currentFrameRef.current = completedRows;
                setAnimatedRows(completedRows);
            }
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [ranking, fixedVisibleCount]);

    return (
        <div
            className="position-relative overflow-hidden bg-body"
            style={{
                height: `${Math.max(440, fixedVisibleCount * rowHeight)}px`,
            }}
        >
            {animatedRows.map(item => {
                const color = comparedMap.get(Number(item.sid));
                const barColor = color?.bar ?? DEFAULT_BAR_COLOR;
                const borderColor = color?.line ?? DEFAULT_BAR_BORDER;
                const width = Math.max(
                    0,
                    Math.min(
                        100,
                        (Number(item.visualPoint) / Math.max(1, fixedMaxPoint)) * 100
                    )
                );

                return (
                    <div
                        key={item.sid}
                        className="position-absolute start-0 w-100"
                        style={{
                            height: `${rowHeight - 4}px`,
                            transform: `translateY(${(item.visualRank - 1) * rowHeight}px)`,
                            opacity: item.opacity,
                            willChange: "transform, opacity",
                        }}
                    >
                        <div className="d-flex align-items-center h-100 gap-2">
                            <div
                                className="text-end fw-bold flex-shrink-0"
                                style={{ width: "52px" }}
                            >
                                {Math.round(item.visualRank)}
                                {t("SscDashboard.rank-suffix")}
                            </div>

                            <div
                                className="fw-semibold text-truncate flex-shrink-0"
                                style={{ width: "78px" }}
                                title={`S${item.sid}`}
                            >
                                S{item.sid}
                            </div>

                            <div className="position-relative flex-grow-1 h-100">
                                <div
                                    className="position-absolute top-50 start-0 translate-middle-y rounded"
                                    style={{
                                        width: `${width}%`,
                                        minWidth: width > 0 ? "4px" : "0",
                                        height: "28px",
                                        backgroundColor: barColor,
                                        border: `1px solid ${borderColor}`,
                                        willChange: "width",
                                    }}
                                />

                                <div
                                    className="position-absolute top-50 translate-middle-y fw-semibold small text-nowrap"
                                    style={{
                                        left: `min(calc(${width}% + 8px), calc(100% - 90px))`,
                                        willChange: "left",
                                    }}
                                >
                                    {formatNumber(Math.round(item.visualPoint))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function SscDashboardContent({ serverParams, setServerParams }) {
    const { t, i18n } = useTranslation("viewer");

    const locale =
        i18n.resolvedLanguage === "ja"
            ? "ja-JP"
            : i18n.resolvedLanguage === "en"
            ? "en-US"
            : "ko-KR";

    const formatNumber = (value) => {
        if (
            value === null ||
            value === undefined ||
            Number.isNaN(Number(value))
        ) {
            return "-";
        }

        return new Intl.NumberFormat(locale).format(
            Number(value)
        );
    };

    const normalizedData = useMemo(() => {
        return mergedData
            .map(normalizeItem)
            .filter(
                (item) =>
                    Number.isFinite(item.round) &&
                    Number.isFinite(item.sid) &&
                    Number.isFinite(item.rank)
            );
    }, []);

    const rounds = useMemo(() => {
        return [
            ...new Set(
                normalizedData.map((item) => item.round)
            ),
        ].sort((a, b) => a - b);
    }, [normalizedData]);

    const latestRound =
        rounds.at(-1) ?? null;

    const servers = useMemo(() => {
        return [
            ...new Set(
                normalizedData.map((item) => item.sid)
            ),
        ].sort((a, b) => a - b);
    }, [normalizedData]);

    const comparisonServers = useMemo(() => {
        const validServers = new Set(servers);

        return [...new Set(
            serverParams
                .map(Number)
                .filter(server => Number.isFinite(server) && validServers.has(server))
        )];
    }, [serverParams, servers]);

    const selectedServer = comparisonServers[0];

    const [selectedRound, setSelectedRound] = useState(null);
    const [topCount, setTopCount] = useState(15);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackEndRound, setPlaybackEndRound] = useState(null);

    const effectiveSelectedRound = selectedRound ?? latestRound;

    useEffect(() => {
        if (!isPlaying || rounds.length === 0 || playbackEndRound === null) return;

        const timer = window.setInterval(() => {
            setSelectedRound(current => {
                const currentRound = current ?? rounds[0];
                const currentIndex = rounds.indexOf(currentRound);
                const nextRound = rounds[currentIndex + 1];

                if (nextRound === undefined || nextRound > playbackEndRound) {
                    setIsPlaying(false);
                    return currentRound;
                }

                return nextRound;
            });
        }, PLAYBACK_STEP_MS);

        return () => window.clearInterval(timer);
    }, [isPlaying, playbackEndRound, rounds]);

    const startPlayback = () => {
        if (rounds.length === 0) return;

        const endRound = effectiveSelectedRound ?? latestRound;
        if (endRound === null) return;

        setPlaybackEndRound(endRound);
        setSelectedRound(rounds[0]);
        setIsPlaying(true);
    };

    const stopPlayback = () => setIsPlaying(false);

    const cumulativeRankingByRound =
        useMemo(() => {
            const map = new Map();

            rounds.forEach((round) => {
                map.set(
                    round,
                    buildCumulativeRanking(
                        normalizedData,
                        round
                    )
                );
            });

            return map;
        }, [normalizedData, rounds]);

    const cumulativeRanking = useMemo(() => {
        if (effectiveSelectedRound === null) {
            return [];
        }

        return (
            cumulativeRankingByRound.get(
                effectiveSelectedRound
            ) ?? []
        );
    }, [
        cumulativeRankingByRound,
        effectiveSelectedRound,
    ]);

    const selectedServerCumulative =
        useMemo(() => {
            return (
                cumulativeRanking.find(
                    (item) =>
                        item.sid ===
                        Number(selectedServer)
                ) ?? null
            );
        }, [
            cumulativeRanking,
            selectedServer,
        ]);

    const selectedRoundData = useMemo(() => {
        return (
            normalizedData.find(
                (item) =>
                    item.sid ===
                        Number(selectedServer) &&
                    item.round ===
                        Number(effectiveSelectedRound)
            ) ?? null
        );
    }, [
        normalizedData,
        selectedServer,
        effectiveSelectedRound,
    ]);

    const previousRound = useMemo(() => {
        if (effectiveSelectedRound === null) {
            return null;
        }

        return (
            rounds
                .filter(
                    (round) =>
                        round < effectiveSelectedRound
                )
                .at(-1) ?? null
        );
    }, [rounds, effectiveSelectedRound]);

    const previousServerCumulative =
        useMemo(() => {
            if (previousRound === null) {
                return null;
            }

            return (
                cumulativeRankingByRound
                    .get(previousRound)
                    ?.find(
                        (item) =>
                            item.sid ===
                            Number(selectedServer)
                    ) ?? null
            );
        }, [
            cumulativeRankingByRound,
            previousRound,
            selectedServer,
        ]);

    const cumulativeRankChangeText =
        useMemo(() => {
            if (!selectedServerCumulative) {
                return t(
                    "SscDashboard.no-cumulative-data"
                );
            }

            if (!previousServerCumulative) {
                return t(
                    "SscDashboard.first-cumulative-rank"
                );
            }

            const difference =
                selectedServerCumulative.cumulativeRank -
                previousServerCumulative.cumulativeRank;

            if (difference === 0) {
                return t(
                    "SscDashboard.rank-no-change"
                );
            }

            if (difference < 0) {
                return t(
                    "SscDashboard.rank-up",
                    {
                        count: Math.abs(difference),
                    }
                );
            }

            return t(
                "SscDashboard.rank-down",
                {
                    count: difference,
                }
            );
        }, [
            selectedServerCumulative,
            previousServerCumulative,
            t,
        ]);

    const comparisonRows = useMemo(() => {
        return comparisonServers
            .map((server, index) => {
                const cumulative =
                    cumulativeRanking.find(
                        (item) =>
                            item.sid === server
                    );

                const roundData =
                    normalizedData.find(
                        (item) =>
                            item.sid === server &&
                            item.round ===
                                Number(
                                    effectiveSelectedRound
                                )
                    );

                return {
                    server,
                    color:
                        SERVER_COLORS[
                            index %
                                SERVER_COLORS.length
                        ],
                    cumulativeRank:
                        cumulative?.cumulativeRank ??
                        null,
                    cumulativePoint:
                        cumulative?.cumulativePoint ??
                        0,
                    cumulativeHonor:
                        cumulative?.cumulativeHonor ??
                        0,
                    roundRank:
                        roundData?.rank ?? null,
                    roundPoint:
                        roundData?.score ?? 0,
                    roundHonor:
                        roundData?.score2 ?? 0,
                };
            })
            .sort(
                (a, b) =>
                    (a.cumulativeRank ?? Infinity) -
                    (b.cumulativeRank ?? Infinity)
            );
    }, [
        comparisonServers,
        cumulativeRanking,
        normalizedData,
        effectiveSelectedRound,
    ]);

    const comparisonTrend = useMemo(() => {
        return rounds
            .filter(
                (round) =>
                    effectiveSelectedRound === null ||
                    round <= effectiveSelectedRound
            )
            .map((round) => {
                const ranking =
                    cumulativeRankingByRound.get(
                        round
                    ) ?? [];

                const row = { round };

                comparisonServers.forEach(
                    (server) => {
                        const cumulative =
                            ranking.find(
                                (item) =>
                                    item.sid === server
                            );

                        row[`rank_${server}`] =
                            cumulative?.cumulativeRank ??
                            null;

                        row[`point_${server}`] =
                            cumulative?.cumulativePoint ??
                            0;

                        row[`honor_${server}`] =
                            cumulative?.cumulativeHonor ??
                            0;
                    }
                );

                return row;
            });
    }, [
        rounds,
        effectiveSelectedRound,
        cumulativeRankingByRound,
        comparisonServers,
    ]);

    const roundPointComparisonTrend =
        useMemo(() => {
            return rounds
                .filter(
                    (round) =>
                        effectiveSelectedRound === null ||
                        round <= effectiveSelectedRound
                )
                .map((round) => {
                    const row = { round };

                    comparisonServers.forEach(
                        (server) => {
                            const item =
                                normalizedData.find(
                                    (data) =>
                                        data.sid === server &&
                                        data.round === round
                                );

                            row[`point_${server}`] =
                                item?.score ?? 0;
                        }
                    );

                    return row;
                });
        }, [
            rounds,
            effectiveSelectedRound,
            normalizedData,
            comparisonServers,
        ]);

    const roundPointTotals = useMemo(() => {
        const totals = {};

        comparisonServers.forEach((server) => {
            totals[server] =
                roundPointComparisonTrend.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item[`point_${server}`] ??
                                0
                        ),
                    0
                );
        });

        return totals;
    }, [
        roundPointComparisonTrend,
        comparisonServers,
    ]);

    const selectedServerRoundTrend =
        useMemo(() => {
            return rounds
                .filter(
                    (round) =>
                        effectiveSelectedRound === null ||
                        round <= effectiveSelectedRound
                )
                .map((round) => {
                    const item =
                        normalizedData.find(
                            (row) =>
                                row.sid ===
                                    Number(
                                        selectedServer
                                    ) &&
                                row.round === round
                        );

                    return {
                        round,
                        point:
                            item?.score ?? 0,
                        honor:
                            item?.score2 ?? 0,
                    };
                });
        }, [
            rounds,
            effectiveSelectedRound,
            normalizedData,
            selectedServer,
        ]);

    const rankingRangeEndRound = isPlaying && playbackEndRound !== null
        ? playbackEndRound
        : effectiveSelectedRound;

    const fixedLowestComparisonRank = useMemo(() => {
        if (rankingRangeEndRound === null) return topCount;

        let lowestRank = topCount;

        rounds
            .filter(round => round <= rankingRangeEndRound)
            .forEach(round => {
                const ranking = cumulativeRankingByRound.get(round) ?? [];

                comparisonServers.forEach(server => {
                    const rank = ranking.find(item => item.sid === server)?.cumulativeRank;

                    if (Number.isFinite(rank)) {
                        lowestRank = Math.max(lowestRank, rank);
                    }
                });
            });

        return lowestRank;
    }, [
        rounds,
        rankingRangeEndRound,
        cumulativeRankingByRound,
        comparisonServers,
        topCount,
    ]);

    const topServerRanking = useMemo(() => {
        if (cumulativeRanking.length === 0) return [];

        const visibleCount = Math.min(
            cumulativeRanking.length,
            fixedLowestComparisonRank
        );

        return cumulativeRanking.slice(0, visibleCount);
    }, [cumulativeRanking, fixedLowestComparisonRank]);

    const fixedRankingMaxPoint = useMemo(() => {
        if (rankingRangeEndRound === null) return 1;

        const endRanking =
            cumulativeRankingByRound.get(rankingRangeEndRound) ?? [];

        return Math.max(
            1,
            ...endRanking
                .slice(0, fixedLowestComparisonRank)
                .map(item => Number(item.cumulativePoint) || 0)
        );
    }, [
        rankingRangeEndRound,
        cumulativeRankingByRound,
        fixedLowestComparisonRank,
    ]);

    const removeCompareServer = (server) => {
        if (
            Number(server) ===
            Number(selectedServer)
        ) {
            return;
        }

        setServerParams((current) =>
            current.filter(
                (item) =>
                    Number(item) !== Number(server)
            )
        );
    };

    const handlePrimaryServerChange = (value) => {
        const server = Number(value);

        setServerParams((current) => [
            String(server),
            ...current.filter(
                (item) =>
                    Number(item) !== server
            ),
        ]);
    };

    const addCompareServer = (value) => {
        const server = Number(value);

        setServerParams((current) => {
            if (
                current.some(
                    (item) =>
                        Number(item) === server
                )
            ) {
                return current;
            }

            return [
                ...current,
                String(server),
            ];
        });
    };

    const cumulativeRankChartData =
        useMemo(() => ({
            labels: comparisonTrend.map(
                (item) => `${item.round}R`
            ),
            datasets:
                comparisonServers.map(
                    (server, index) => {
                        const color =
                            SERVER_COLORS[
                                index %
                                    SERVER_COLORS.length
                            ];

                        const isPrimary =
                            Number(selectedServer) ===
                            server;

                        return {
                            label: `${t(
                                "SscDashboard.server-prefix"
                            )} ${server}`,
                            data: comparisonTrend.map(
                                (item) =>
                                    item[
                                        `rank_${server}`
                                    ]
                            ),
                            borderColor:
                                color.line,
                            backgroundColor:
                                color.soft,
                            pointBackgroundColor:
                                color.line,
                            pointBorderColor:
                                "#ffffff",
                            pointBorderWidth: 2,
                            pointRadius:
                                isPrimary ? 5 : 4,
                            pointHoverRadius: 7,
                            borderWidth:
                                isPrimary ? 4 : 2.5,
                            tension: 0.25,
                        };
                    }
                ),
        }), [
            comparisonTrend,
            comparisonServers,
            selectedServer,
            i18n.resolvedLanguage,
        ]);

    const cumulativeRankChartOptions =
        useMemo(() => ({
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false,
            },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                    },
                },
                tooltip: {
                    callbacks: {
                        title(items) {
                            const item =
                                comparisonTrend[
                                    items[0]?.dataIndex
                                ];

                            return item
                                ? t(
                                      "SscDashboard.until-round",
                                      {
                                          round:
                                              item.round,
                                      }
                                  )
                                : "";
                        },
                        label(context) {
                            return `${context.dataset.label}: ${formatNumber(
                                context.raw
                            )}${t(
                                "SscDashboard.rank-suffix"
                            )}`;
                        },
                    },
                },
            },
            scales: {
                y: {
                    reverse: true,
                    beginAtZero: false,
                    ticks: {
                        precision: 0,
                        callback(value) {
                            return `${value}${t(
                                "SscDashboard.rank-suffix"
                            )}`;
                        },
                    },
                    grid: {
                        color:
                            "rgba(108, 117, 125, 0.16)",
                    },
                    title: {
                        display: true,
                        text: t(
                            "SscDashboard.cumulative-rank"
                        ),
                    },
                },
                x: {
                    grid: {
                        color:
                            "rgba(108, 117, 125, 0.08)",
                    },
                    title: {
                        display: true,
                        text: t(
                            "SscDashboard.round"
                        ),
                    },
                },
            },
        }), [
            comparisonTrend,
            i18n.resolvedLanguage,
        ]);

    const createComparisonLineData = (
        fieldPrefix
    ) => ({
        labels: comparisonTrend.map(
            (item) => `${item.round}R`
        ),
        datasets:
            comparisonServers.map(
                (server, index) => {
                    const color =
                        SERVER_COLORS[
                            index %
                                SERVER_COLORS.length
                        ];

                    const isPrimary =
                        Number(selectedServer) ===
                        server;

                    return {
                        label: `${t(
                            "SscDashboard.server-prefix"
                        )} ${server}`,
                        data: comparisonTrend.map(
                            (item) =>
                                item[
                                    `${fieldPrefix}_${server}`
                                ]
                        ),
                        borderColor: color.line,
                        backgroundColor: color.soft,
                        pointBackgroundColor:
                            color.line,
                        pointBorderColor:
                            "#ffffff",
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 7,
                        borderWidth:
                            isPrimary ? 4 : 2.5,
                        tension: 0.25,
                        fill: false,
                    };
                }
            ),
    });

    const cumulativePointChartData =
        useMemo(
            () =>
                createComparisonLineData(
                    "point"
                ),
            [
                comparisonTrend,
                comparisonServers,
                selectedServer,
                i18n.resolvedLanguage,
            ]
        );

    const cumulativeHonorChartData =
        useMemo(
            () =>
                createComparisonLineData(
                    "honor"
                ),
            [
                comparisonTrend,
                comparisonServers,
                selectedServer,
                i18n.resolvedLanguage,
            ]
        );

    const createCumulativeValueOptions = (
        title
    ) => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false,
        },
        plugins: {
            legend: {
                position: "top",
                labels: {
                    usePointStyle: true,
                    boxWidth: 10,
                },
            },
            tooltip: {
                callbacks: {
                    title(items) {
                        const item =
                            comparisonTrend[
                                items[0]?.dataIndex
                            ];

                        return item
                            ? t(
                                  "SscDashboard.until-round",
                                  {
                                      round:
                                          item.round,
                                  }
                              )
                            : "";
                    },
                    label(context) {
                        return `${context.dataset.label}: ${formatNumber(
                            context.raw
                        )}`;
                    },
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0,
                    callback(value) {
                        return formatNumber(value);
                    },
                },
                grid: {
                    color:
                        "rgba(108, 117, 125, 0.16)",
                },
                title: {
                    display: true,
                    text: title,
                },
            },
            x: {
                grid: {
                    color:
                        "rgba(108, 117, 125, 0.08)",
                },
                title: {
                    display: true,
                    text: t(
                        "SscDashboard.round"
                    ),
                },
            },
        },
    });

    const roundScoreChartData =
        useMemo(() => ({
            labels:
                selectedServerRoundTrend.map(
                    (item) =>
                        `${item.round}R`
                ),
            datasets: [
                {
                    label: t(
                        "SscDashboard.round-point"
                    ),
                    data:
                        selectedServerRoundTrend.map(
                            (item) =>
                                item.point
                        ),
                    backgroundColor:
                        "rgba(13, 110, 253, 0.78)",
                    borderColor:
                        "#0d6efd",
                    borderWidth: 1.5,
                    borderRadius: 7,
                    yAxisID: "pointAxis",
                },
                {
                    label: t(
                        "SscDashboard.round-honor"
                    ),
                    data:
                        selectedServerRoundTrend.map(
                            (item) =>
                                item.honor
                        ),
                    backgroundColor:
                        "rgba(255, 193, 7, 0.78)",
                    borderColor:
                        "#ffc107",
                    borderWidth: 1.5,
                    borderRadius: 7,
                    yAxisID: "honorAxis",
                },
            ],
        }), [
            selectedServerRoundTrend,
            i18n.resolvedLanguage,
        ]);

    const roundScoreChartOptions =
        useMemo(() => ({
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false,
            },
            plugins: {
                legend: {
                    position: "top",
                },
                tooltip: {
                    callbacks: {
                        title(items) {
                            const item =
                                selectedServerRoundTrend[
                                    items[0]?.dataIndex
                                ];

                            return item
                                ? t(
                                      "SscDashboard.round-earned-tooltip",
                                      {
                                          round:
                                              item.round,
                                      }
                                  )
                                : "";
                        },
                        label(context) {
                            return `${context.dataset.label}: ${formatNumber(
                                context.raw
                            )}`;
                        },
                    },
                },
            },
            scales: {
                pointAxis: {
                    type: "linear",
                    position: "left",
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                    },
                    grid: {
                        color:
                            "rgba(13, 110, 253, 0.10)",
                    },
                    title: {
                        display: true,
                        text: t(
                            "SscDashboard.point"
                        ),
                    },
                },
                honorAxis: {
                    type: "linear",
                    position: "right",
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        precision: 0,
                        callback(value) {
                            return formatNumber(value);
                        },
                    },
                    title: {
                        display: true,
                        text: t(
                            "SscDashboard.honor"
                        ),
                    },
                },
                x: {
                    grid: {
                        display: false,
                    },
                },
            },
        }), [
            selectedServerRoundTrend,
            i18n.resolvedLanguage,
        ]);

    const rankingChartData =
        useMemo(() => {
            const comparedMap = new Map(
                comparisonServers.map(
                    (server, index) => [
                        server,
                        SERVER_COLORS[
                            index %
                                SERVER_COLORS.length
                        ],
                    ]
                )
            );

            return {
                labels: topServerRanking.map(
                    (item) =>
                        `${item.cumulativeRank}${t(
                            "SscDashboard.rank-suffix"
                        )} · S${item.sid}`
                ),
                datasets: [
                    {
                        label: t(
                            "SscDashboard.cumulative-point"
                        ),
                        data: topServerRanking.map(
                            (item) =>
                                item.cumulativePoint
                        ),
                        backgroundColor:
                            topServerRanking.map(
                                (item) =>
                                    comparedMap.get(
                                        item.sid
                                    )?.bar ??
                                    DEFAULT_BAR_COLOR
                            ),
                        borderColor:
                            topServerRanking.map(
                                (item) =>
                                    comparedMap.get(
                                        item.sid
                                    )?.line ??
                                    DEFAULT_BAR_BORDER
                            ),
                        borderWidth:
                            topServerRanking.map(
                                (item) =>
                                    comparedMap.has(
                                        item.sid
                                    )
                                        ? 2.5
                                        : 1
                            ),
                        borderRadius: 7,
                    },
                ],
            };
        }, [
            topServerRanking,
            comparisonServers,
            i18n.resolvedLanguage,
        ]);

    const rankingChartOptions =
        useMemo(() => ({
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        title(items) {
                            const item =
                                topServerRanking[
                                    items[0]?.dataIndex
                                ];

                            return item
                                ? t(
                                      "SscDashboard.ranking-tooltip-title",
                                      {
                                          rank:
                                              item.cumulativeRank,
                                          server:
                                              item.sid,
                                      }
                                  )
                                : "";
                        },
                        label(context) {
                            const item =
                                topServerRanking[
                                    context.dataIndex
                                ];

                            if (!item) {
                                return "";
                            }

                            return [
                                t(
                                    "SscDashboard.tooltip-cumulative-point",
                                    {
                                        value:
                                            formatNumber(
                                                item.cumulativePoint
                                            ),
                                    }
                                ),
                                t(
                                    "SscDashboard.tooltip-cumulative-honor",
                                    {
                                        value:
                                            formatNumber(
                                                item.cumulativeHonor
                                            ),
                                    }
                                ),
                            ];
                        },
                    },
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        callback(value) {
                            return formatNumber(value);
                        },
                    },
                    grid: {
                        color:
                            "rgba(108, 117, 125, 0.14)",
                    },
                    title: {
                        display: true,
                        text: t(
                            "SscDashboard.cumulative-point"
                        ),
                    },
                },
                y: {
                    ticks: {
                        autoSkip: false,
                    },
                    grid: {
                        display: false,
                    },
                },
            },
        }), [
            topServerRanking,
            i18n.resolvedLanguage,
        ]);

    return (
        <div className="container-fluid py-4">
            <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-end gap-3 mb-4">
                <div>
                    <div className="small fw-bold text-primary mb-1">
                        2026 SSC
                    </div>

                    <h1 className="h3 fw-bold mb-2">
                        {t("SscDashboard.title")}
                    </h1>

                    <p className="text-secondary mb-0">
                        {t(
                            "SscDashboard.description"
                        )}
                    </p>
                </div>

                <div className="d-flex flex-column flex-md-row gap-3">
                    <div
                        className="flex-grow-1"
                        style={{
                            minWidth: "280px",
                        }}
                    >
                        <ServerAutocomplete
                            servers={servers}
                            value={selectedServer}
                            label={t(
                                "SscDashboard.primary-server-label"
                            )}
                            placeholder={t(
                                "SscDashboard.server-placeholder"
                            )}
                            serverPrefix={t(
                                "SscDashboard.server-prefix"
                            )}
                            selectedLabel={t(
                                "SscDashboard.selected-label"
                            )}
                            noResultLabel={t(
                                "SscDashboard.server-no-result"
                            )}
                            clearAriaLabel={t(
                                "SscDashboard.clear-input"
                            )}
                            onChange={
                                handlePrimaryServerChange
                            }
                        />

                        <button
                            type="button"
                            className="btn btn-outline-danger btn-sm mt-2"
                            onClick={() =>
                                setServerParams([])
                            }
                        >
                            {t(
                                "SscDashboard.reset-server-button"
                            )}
                        </button>
                    </div>

                    <div
                        className="flex-grow-1"
                        style={{
                            minWidth: "240px",
                        }}
                    >
                        <label
                            htmlFor="ssc-round"
                            className="form-label small fw-semibold mb-1"
                        >
                            {t(
                                "SscDashboard.cumulative-round-label"
                            )}
                        </label>

                        <div>
                            <select
                                id="ssc-round"
                                className="form-select w-100"
                                value={effectiveSelectedRound ?? ""}
                                disabled={isPlaying}
                                onChange={event => {
                                    setIsPlaying(false);
                                    setSelectedRound(Number(event.target.value));
                                }}
                            >
                                {rounds.map(round => (
                                    <option key={round} value={round}>
                                        {t("SscDashboard.round-range", { round })}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                    <div className="d-flex flex-column flex-xl-row gap-3 justify-content-between align-items-xl-end">
                        <div>
                            <div className="fw-bold mb-1">
                                {t(
                                    "SscDashboard.compare-server-title"
                                )}
                            </div>

                            <div className="small text-secondary">
                                {t(
                                    "SscDashboard.compare-server-description"
                                )}
                            </div>
                        </div>

                        <div
                            style={{
                                minWidth: "320px",
                            }}
                        >
                            <ServerAutocomplete
                                servers={servers.filter(
                                    (server) =>
                                        !comparisonServers.includes(
                                            server
                                        )
                                )}
                                value=""
                                label={t(
                                    "SscDashboard.compare-server-add-label"
                                )}
                                placeholder={t(
                                    "SscDashboard.compare-server-placeholder"
                                )}
                                serverPrefix={t(
                                    "SscDashboard.server-prefix"
                                )}
                                selectedLabel={t(
                                    "SscDashboard.selected-label"
                                )}
                                noResultLabel={t(
                                    "SscDashboard.server-no-result"
                                )}
                                clearAriaLabel={t(
                                    "SscDashboard.clear-input"
                                )}
                                onChange={
                                    addCompareServer
                                }
                            />
                        </div>
                    </div>

                    <div className="d-flex flex-wrap gap-2 mt-3">
                        {comparisonServers.map(
                            (server, index) => (
                                <ServerColorBadge
                                    key={server}
                                    server={server}
                                    color={
                                        SERVER_COLORS[
                                            index %
                                                SERVER_COLORS.length
                                        ]
                                    }
                                    removable={
                                        Number(server) !==
                                        Number(
                                            selectedServer
                                        )
                                    }
                                    onRemove={
                                        removeCompareServer
                                    }
                                    t={t}
                                />
                            )
                        )}
                    </div>
                </div>
            </div>

            <div className="card border-primary shadow-sm mb-3">
                <div className="card-body py-4">
                    <div className="row align-items-center g-4">
                        <div className="col-12 col-lg-5">
                            <div className="small fw-bold text-primary mb-2">
                                {t(
                                    "SscDashboard.cumulative-rank-title",
                                    {
                                        round:
                                            effectiveSelectedRound,
                                    }
                                )}
                            </div>

                            <div className="d-flex align-items-baseline gap-2">
                                <strong className="display-2 fw-bold text-primary">
                                    {selectedServerCumulative
                                        ? formatNumber(
                                              selectedServerCumulative.cumulativeRank
                                          )
                                        : "-"}
                                </strong>

                                <span className="fs-3 fw-semibold">
                                    {t(
                                        "SscDashboard.rank-suffix"
                                    )}
                                </span>
                            </div>

                            <div className="text-secondary mt-2">
                                {cumulativeRankChangeText}
                            </div>
                        </div>

                        <div className="col-12 col-lg-7">
                            <div className="row g-3">
                                <div className="col-12 col-sm-6">
                                    <div
                                        className="rounded p-3 h-100"
                                        style={{
                                            background:
                                                "linear-gradient(135deg, rgba(13,110,253,.14), rgba(13,110,253,.03))",
                                            border:
                                                "1px solid rgba(13,110,253,.28)",
                                        }}
                                    >
                                        <div className="small text-secondary mb-1">
                                            {t(
                                                "SscDashboard.cumulative-point"
                                            )}
                                        </div>

                                        <div className="fs-2 fw-bold text-primary">
                                            {formatNumber(
                                                selectedServerCumulative?.cumulativePoint
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 col-sm-6">
                                    <div
                                        className="rounded p-3 h-100"
                                        style={{
                                            background:
                                                "linear-gradient(135deg, rgba(255,193,7,.18), rgba(255,193,7,.03))",
                                            border:
                                                "1px solid rgba(255,193,7,.35)",
                                        }}
                                    >
                                        <div className="small text-secondary mb-1">
                                            {t(
                                                "SscDashboard.cumulative-honor"
                                            )}
                                        </div>

                                        <div className="fs-2 fw-bold text-warning-emphasis">
                                            {formatNumber(
                                                selectedServerCumulative?.cumulativeHonor
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="small text-secondary mt-3">
                                {t(
                                    "SscDashboard.ranking-rule"
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3 mb-3">
                <SummaryCard
                    title={t(
                        "SscDashboard.selected-round-rank-title",
                        {
                            round:
                                effectiveSelectedRound,
                        }
                    )}
                    value={
                        selectedRoundData
                            ? `${formatNumber(
                                  selectedRoundData.rank
                              )}${t(
                                  "SscDashboard.rank-suffix"
                              )}`
                            : "-"
                    }
                    description={t(
                        "SscDashboard.round-rank-description"
                    )}
                />

                <SummaryCard
                    title={t(
                        "SscDashboard.selected-round-point-title",
                        {
                            round:
                                effectiveSelectedRound,
                        }
                    )}
                    value={formatNumber(
                        selectedRoundData?.score
                    )}
                    description={t(
                        "SscDashboard.round-point-description"
                    )}
                    valueClassName="text-primary"
                />

                <SummaryCard
                    title={t(
                        "SscDashboard.selected-round-honor-title",
                        {
                            round:
                                effectiveSelectedRound,
                        }
                    )}
                    value={formatNumber(
                        selectedRoundData?.score2
                    )}
                    description={t(
                        "SscDashboard.round-honor-description"
                    )}
                    valueClassName="text-warning-emphasis"
                />

                <SummaryCard
                    title={t(
                        "SscDashboard.rounds-played"
                    )}
                    value={formatNumber(
                        selectedServerCumulative?.roundsPlayed
                    )}
                    description={t(
                        "SscDashboard.round-basis",
                        {
                            round:
                                effectiveSelectedRound,
                        }
                    )}
                />
            </div>

            <div className="card border-0 shadow-sm mb-3">
                <div className="card-header bg-body border-0 pt-3 px-3">
                    <h2 className="h6 fw-bold mb-1">
                        {t(
                            "SscDashboard.compare-summary-title"
                        )}
                    </h2>

                    <p className="small text-secondary mb-0">
                        {t(
                            "SscDashboard.compare-summary-description"
                        )}
                    </p>
                </div>

                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>
                                        {t(
                                            "SscDashboard.server"
                                        )}
                                    </th>
                                    <th className="text-end">
                                        {t(
                                            "SscDashboard.cumulative-rank"
                                        )}
                                    </th>
                                    <th className="text-end">
                                        {t(
                                            "SscDashboard.cumulative-point"
                                        )}
                                    </th>
                                    <th className="text-end">
                                        {t(
                                            "SscDashboard.cumulative-honor"
                                        )}
                                    </th>
                                    <th className="text-end">
                                        {t(
                                            "SscDashboard.round-rank-short"
                                        )}
                                    </th>
                                    <th className="text-end">
                                        {t(
                                            "SscDashboard.round-point"
                                        )}
                                    </th>
                                    <th className="text-end">
                                        {t(
                                            "SscDashboard.round-honor"
                                        )}
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {comparisonRows.map(
                                    (row) => (
                                        <tr
                                            key={
                                                row.server
                                            }
                                            className={
                                                Number(
                                                    row.server
                                                ) ===
                                                Number(
                                                    selectedServer
                                                )
                                                    ? "table-primary"
                                                    : ""
                                            }
                                        >
                                            <td>
                                                <span className="d-inline-flex align-items-center gap-2 fw-semibold">
                                                    <span
                                                        className="rounded-circle d-inline-block"
                                                        style={{
                                                            width:
                                                                "10px",
                                                            height:
                                                                "10px",
                                                            backgroundColor:
                                                                row
                                                                    .color
                                                                    .line,
                                                        }}
                                                    />

                                                    {t(
                                                        "SscDashboard.server-prefix"
                                                    )}{" "}
                                                    {
                                                        row.server
                                                    }
                                                </span>
                                            </td>

                                            <td className="text-end fw-bold">
                                                {formatNumber(
                                                    row.cumulativeRank
                                                )}
                                                {t(
                                                    "SscDashboard.rank-suffix"
                                                )}
                                            </td>

                                            <td className="text-end">
                                                {formatNumber(
                                                    row.cumulativePoint
                                                )}
                                            </td>

                                            <td className="text-end">
                                                {formatNumber(
                                                    row.cumulativeHonor
                                                )}
                                            </td>

                                            <td className="text-end">
                                                {formatNumber(
                                                    row.roundRank
                                                )}
                                                {t(
                                                    "SscDashboard.rank-suffix"
                                                )}
                                            </td>

                                            <td className="text-end">
                                                {formatNumber(
                                                    row.roundPoint
                                                )}
                                            </td>

                                            <td className="text-end">
                                                {formatNumber(
                                                    row.roundHonor
                                                )}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm mb-3">
                <div className="card-header bg-body border-0 pt-3 px-3">
                    <h2 className="h6 fw-bold mb-1">
                        {t(
                            "SscDashboard.round-point-compare-title"
                        )}
                    </h2>

                    <p className="small text-secondary mb-0">
                        {t(
                            "SscDashboard.round-point-compare-description"
                        )}
                    </p>
                </div>

                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover table-bordered align-middle text-nowrap mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th
                                        className="text-center position-sticky start-0 bg-body-tertiary"
                                        style={{
                                            minWidth: "90px",
                                            zIndex: 2,
                                        }}
                                    >
                                        {t(
                                            "SscDashboard.round"
                                        )}
                                    </th>

                                    {comparisonServers.map(
                                        (server, index) => {
                                            const color =
                                                SERVER_COLORS[
                                                    index %
                                                        SERVER_COLORS.length
                                                ];

                                            const isPrimary =
                                                Number(
                                                    server
                                                ) ===
                                                Number(
                                                    selectedServer
                                                );

                                            return (
                                                <th
                                                    key={
                                                        server
                                                    }
                                                    className={[
                                                        "text-end",
                                                        isPrimary
                                                            ? "table-primary"
                                                            : "",
                                                    ]
                                                        .filter(
                                                            Boolean
                                                        )
                                                        .join(
                                                            " "
                                                        )}
                                                    style={{
                                                        minWidth:
                                                            "135px",
                                                        borderTop: `3px solid ${color.line}`,
                                                    }}
                                                >
                                                    <span className="d-inline-flex align-items-center gap-2">
                                                        <span
                                                            className="rounded-circle d-inline-block"
                                                            style={{
                                                                width:
                                                                    "9px",
                                                                height:
                                                                    "9px",
                                                                backgroundColor:
                                                                    color.line,
                                                            }}
                                                        />

                                                        {t(
                                                            "SscDashboard.server-prefix"
                                                        )}{" "}
                                                        {
                                                            server
                                                        }
                                                    </span>
                                                </th>
                                            );
                                        }
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {roundPointComparisonTrend.map(
                                    (item) => (
                                        <tr
                                            key={
                                                item.round
                                            }
                                        >
                                            <th
                                                scope="row"
                                                className="text-center position-sticky start-0 bg-body"
                                                style={{
                                                    zIndex: 1,
                                                }}
                                            >
                                                {t(
                                                    "SscDashboard.round-number",
                                                    {
                                                        round:
                                                            item.round,
                                                    }
                                                )}
                                            </th>

                                            {comparisonServers.map(
                                                (
                                                    server
                                                ) => {
                                                    const isPrimary =
                                                        Number(
                                                            server
                                                        ) ===
                                                        Number(
                                                            selectedServer
                                                        );

                                                    return (
                                                        <td
                                                            key={
                                                                server
                                                            }
                                                            className={[
                                                                "text-end",
                                                                "fw-semibold",
                                                                isPrimary
                                                                    ? "table-primary"
                                                                    : "",
                                                            ]
                                                                .filter(
                                                                    Boolean
                                                                )
                                                                .join(
                                                                    " "
                                                                )}
                                                        >
                                                            {formatNumber(
                                                                item[
                                                                    `point_${server}`
                                                                ]
                                                            )}
                                                        </td>
                                                    );
                                                }
                                            )}
                                        </tr>
                                    )
                                )}
                            </tbody>

                            <tfoot className="table-light">
                                <tr>
                                    <th className="text-center position-sticky start-0 bg-body-tertiary">
                                        {t(
                                            "SscDashboard.total"
                                        )}
                                    </th>

                                    {comparisonServers.map(
                                        (server) => {
                                            const isPrimary =
                                                Number(
                                                    server
                                                ) ===
                                                Number(
                                                    selectedServer
                                                );

                                            return (
                                                <th
                                                    key={
                                                        server
                                                    }
                                                    className={[
                                                        "text-end",
                                                        isPrimary
                                                            ? "table-primary"
                                                            : "",
                                                    ]
                                                        .filter(
                                                            Boolean
                                                        )
                                                        .join(
                                                            " "
                                                        )}
                                                >
                                                    {formatNumber(
                                                        roundPointTotals[
                                                            server
                                                        ]
                                                    )}
                                                </th>
                                            );
                                        }
                                    )}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            <div className="row g-3 mb-3">
                <div className="col-12 col-xl-6">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-body border-0 pt-3 px-3">
                            <h2 className="h6 fw-bold mb-1">
                                {t(
                                    "SscDashboard.cumulative-rank-compare-title"
                                )}
                            </h2>

                            <p className="small text-secondary mb-0">
                                {t(
                                    "SscDashboard.cumulative-rank-compare-description"
                                )}
                            </p>
                        </div>

                        <div className="card-body">
                            <div style={{ height: "390px" }}>
                                <Line
                                    data={
                                        cumulativeRankChartData
                                    }
                                    options={
                                        cumulativeRankChartOptions
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-xl-6">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-body border-0 pt-3 px-3">
                            <h2 className="h6 fw-bold mb-1">
                                {t(
                                    "SscDashboard.cumulative-point-compare-title"
                                )}
                            </h2>

                            <p className="small text-secondary mb-0">
                                {t(
                                    "SscDashboard.cumulative-point-compare-description"
                                )}
                            </p>
                        </div>

                        <div className="card-body">
                            <div style={{ height: "390px" }}>
                                <Line
                                    data={
                                        cumulativePointChartData
                                    }
                                    options={createCumulativeValueOptions(
                                        t(
                                            "SscDashboard.cumulative-point"
                                        )
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3 mb-3">
                <div className="col-12 col-xl-6">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-body border-0 pt-3 px-3">
                            <h2 className="h6 fw-bold mb-1">
                                {t(
                                    "SscDashboard.cumulative-honor-compare-title"
                                )}
                            </h2>

                            <p className="small text-secondary mb-0">
                                {t(
                                    "SscDashboard.cumulative-honor-compare-description"
                                )}
                            </p>
                        </div>

                        <div className="card-body">
                            <div style={{ height: "390px" }}>
                                <Line
                                    data={
                                        cumulativeHonorChartData
                                    }
                                    options={createCumulativeValueOptions(
                                        t(
                                            "SscDashboard.cumulative-honor"
                                        )
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-xl-6">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-body border-0 pt-3 px-3">
                            <h2 className="h6 fw-bold mb-1">
                                {t(
                                    "SscDashboard.round-earned-title",
                                    {
                                        server:
                                            selectedServer,
                                    }
                                )}
                            </h2>

                            <p className="small text-secondary mb-0">
                                {t(
                                    "SscDashboard.round-earned-description"
                                )}
                            </p>
                        </div>

                        <div className="card-body">
                            <div style={{ height: "390px" }}>
                                <Bar
                                    data={
                                        roundScoreChartData
                                    }
                                    options={
                                        roundScoreChartOptions
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-header bg-body border-0 pt-3 px-3">
                    <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
                        <div>
                            <h2 className="h6 fw-bold mb-1">
                                {t(
                                    "SscDashboard.cumulative-top-server-title",
                                    {
                                        round:
                                            effectiveSelectedRound,
                                    }
                                )}
                            </h2>

                            <p className="small text-secondary mb-0">
                                {t("SscDashboard.highlight-description")}
                            </p>

                            {topServerRanking.length > 0 && (
                                <div className="small text-primary mt-1"></div>
                            )}
                        </div>

                        <div className="d-flex flex-column flex-sm-row gap-2 align-items-sm-end">
                            <div style={{ minWidth: "170px" }}>
                                <label
                                    htmlFor="ssc-top-count"
                                    className="form-label small fw-semibold mb-1"
                                >
                                    {t("SscDashboard.display-count-label")}
                                </label>

                                <select
                                    id="ssc-top-count"
                                    className="form-select form-select-sm"
                                    value={topCount}
                                    disabled={isPlaying}
                                    onChange={event => setTopCount(Number(event.target.value))}
                                >
                                    {[10, 15, 20, 30, 50].map(count => (
                                        <option key={count} value={count}>
                                            {t("SscDashboard.top-count", { count })}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {isPlaying ? (
                                <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm text-nowrap"
                                    onClick={stopPlayback}
                                    
                                >
                                    {t("SscDashboard.pause-playback")}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm text-nowrap"
                                    onClick={startPlayback}
                                    disabled={rounds.length === 0}
                                >
                                    {t("SscDashboard.start-playback")}
                                </button>
                            )}


                        </div>
                    </div>
                </div>

                <div className="card-body">
                    <RankingRaceChart
                        ranking={topServerRanking}
                        comparisonServers={comparisonServers}
                        formatNumber={formatNumber}
                        fixedMaxPoint={fixedRankingMaxPoint}
                        fixedVisibleCount={fixedLowestComparisonRank}
                        t={t}
                    />
                </div>
            </div>
        </div>
    );
}

function SscDashboard() {
    const { t } = useTranslation("viewer");
    const [serverParams, setServerParams] = useListParamState("server");

    const servers = useMemo(() => {
        return [...new Set(
            mergedData
                .map(item => Number(item.sid))
                .filter(Number.isFinite)
        )].sort((a, b) => a - b);
    }, []);

    const validServerParams = useMemo(() => {
        const validServers = new Set(servers);

        return [...new Set(
            serverParams
                .map(Number)
                .filter(server => Number.isFinite(server) && validServers.has(server))
        )].map(String);
    }, [serverParams, servers]);

    const hasServer = validServerParams.length > 0;

    return (
        <>
            {!hasServer ? (
                <div className="container-fluid py-4">
                    <div className="row justify-content-end">
                        <div className="col-12 col-md-6 col-lg-4" style={{ minWidth: "280px" }}>
                            <ServerAutocomplete
                                servers={servers}
                                value={null}
                                label={t("SscDashboard.primary-server-label")}
                                placeholder={t("SscDashboard.server-placeholder")}
                                serverPrefix={t("SscDashboard.server-prefix")}
                                selectedLabel={t("SscDashboard.selected-label")}
                                noResultLabel={t("SscDashboard.server-no-result")}
                                clearAriaLabel={t("SscDashboard.clear-input")}
                                onChange={server => setServerParams([String(server)])}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <SscDashboardContent
                    serverParams={validServerParams}
                    setServerParams={setServerParams}
                />
            )}
        </>
    );
}

export default SscDashboard;
