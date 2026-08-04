import BuildingList from "@src/assets/json/el/buildings.json";
import ColorList from "@src/assets/json/colors.json";
import { useParamState } from "@src/hooks/useParamState";
import LZString from "lz-string";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import {
    FaBuildingFlag,
    FaCalculator,
    FaClock,
    FaEraser,
    FaFlagCheckered,
    FaLock,
    FaLockOpen,
    FaMapLocationDot,
    FaPlus,
    FaRankingStar,
    FaServer,
    FaShareNodes,
    FaTriangleExclamation,
    FaXmark
} from "react-icons/fa6";
import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import "./ELScoreCalculator.css";
import { useCanonicalUrl } from "@src/hooks/useCanonicalUrl";

const INITIAL_SERVER = {
    no: 0,
    name: "",
    currentScore: 0,
    scorePerMinute: 0,
    scoreTotal: 0
};

function getDateAfter(diff) {
    const result = new Date();
    result.setDate(result.getDate() + diff);

    const year = result.getFullYear();
    const month = String(result.getMonth() + 1).padStart(2, "0");
    const day = String(result.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDeadline(endDate, endTime) {
    if (!endDate || !endTime) {
        return null;
    }

    const deadline = new Date(
        `${endDate}T${endTime}:00`
    );

    return Number.isFinite(deadline.getTime())
        ? deadline
        : null;
}

function getAssignedServerNo(building) {
    if (Number.isInteger(building.serverNo)) {
        return building.serverNo;
    }

    if (Number.isInteger(building.server)) {
        return building.server;
    }

    if (Number.isInteger(building.server?.no)) {
        return building.server.no;
    }

    return null;
}

function normalizeBuildings(buildings) {
    return buildings.map((building, index) => ({
        ...building,
        id:
            building.id ??
            building.key ??
            building.code ??
            `${building.name}-${index}`,
        i18nKey:
            building.i18nKey ??
            building.key ??
            building.code ??
            building.id ??
            `facility-${index}`,
        serverNo: getAssignedServerNo(building),
        server: undefined
    }));
}

function parseNonNegativeInteger(value) {
    const normalized = String(value).replace(/[^0-9]/g, "");

    return normalized.length === 0
        ? 0
        : Number.parseInt(normalized, 10);
}

const BASE_BUILDINGS = normalizeBuildings(BuildingList).map(
    (building) => ({
        ...building,
        serverNo: null,
        server: undefined
    })
);

function isValidDateParam(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value
        .split("-")
        .map(Number);
    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

function isValidTimeParam(value) {
    return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

const SHARE_DATA_VERSION = 1;

function parseFixedAt(value) {
    const timestamp = Number(value);

    return Number.isSafeInteger(timestamp) && timestamp > 0
        ? timestamp
        : null;
}

function normalizeScore(value) {
    const score = Number(value);

    return Number.isFinite(score) && score >= 0
        ? Math.floor(score)
        : 0;
}

function normalizeServers(servers) {
    const usedServerNos = new Set();
    const usedNames = new Set();

    return (Array.isArray(servers) ? servers : [])
        .map((server) => {
            const no = Number(server?.no);
            const name = String(server?.name ?? "").trim();

            if (
                !Number.isInteger(no) ||
                no <= 0 ||
                name.length === 0
            ) {
                return null;
            }

            const normalizedName = name.toLocaleLowerCase();

            if (
                usedServerNos.has(no) ||
                usedNames.has(normalizedName)
            ) {
                return null;
            }

            usedServerNos.add(no);
            usedNames.add(normalizedName);

            return {
                ...INITIAL_SERVER,
                no,
                name,
                currentScore: normalizeScore(
                    server.currentScore
                )
            };
        })
        .filter(Boolean);
}

function createBuildingMapSignature(buildings) {
    const source = buildings
        .map((building, index) =>
            [
                index,
                building.id,
                Number(building.point ?? 0)
            ].join(":")
        )
        .join("|");

    // FNV-1a 32bit hash
    let hash = 0x811c9dc5;

    for (let index = 0; index < source.length; index += 1) {
        hash ^= source.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }

    return `${buildings.length}-${(hash >>> 0).toString(36)}`;
}

const BUILDING_MAP_SIGNATURE =
    createBuildingMapSignature(BASE_BUILDINGS);

function cloneBaseBuildings() {
    return BASE_BUILDINGS.map((building) => ({
        ...building,
        serverNo: null,
        server: undefined
    }));
}

function createDefaultCalculatorState(defaultEndDate) {
    return {
        endDate: defaultEndDate,
        endTime: "23:00",
        fixedAt: null,
        selectedServerNo: null,
        servers: [],
        buildings: cloneBaseBuildings()
    };
}

function normalizeCalculatorBuildings(
    buildings,
    validServerNos
) {
    const sourceById = new Map(
        (Array.isArray(buildings) ? buildings : []).map(
            (building) => [String(building.id), building]
        )
    );

    return BASE_BUILDINGS.map((baseBuilding) => {
        const source = sourceById.get(
            String(baseBuilding.id)
        );
        const assignedServerNo = source
            ? getAssignedServerNo(source)
            : null;

        return {
            ...baseBuilding,
            serverNo:
                validServerNos.has(assignedServerNo)
                    ? assignedServerNo
                    : null,
            server: undefined
        };
    });
}

function normalizeCalculatorState(value, fallbackState) {
    const source =
        value && typeof value === "object"
            ? value
            : {};
    const fallback =
        fallbackState && typeof fallbackState === "object"
            ? fallbackState
            : createDefaultCalculatorState(getDateAfter(7));
    const servers = normalizeServers(source.servers);
    const validServerNos = new Set(
        servers.map((server) => server.no)
    );
    const selectedServerNo = Number(
        source.selectedServerNo
    );

    return {
        endDate: isValidDateParam(source.endDate)
            ? source.endDate
            : fallback.endDate,
        endTime: isValidTimeParam(source.endTime)
            ? source.endTime
            : fallback.endTime,
        fixedAt: parseFixedAt(source.fixedAt),
        selectedServerNo:
            validServerNos.has(selectedServerNo)
                ? selectedServerNo
                : null,
        servers,
        buildings: normalizeCalculatorBuildings(
            source.buildings,
            validServerNos
        )
    };
}

function encodeAssignmentRuns(buildings, serverIndexByNo) {
    const buildingById = new Map(
        (Array.isArray(buildings) ? buildings : []).map(
            (building) => [String(building.id), building]
        )
    );
    const assignments = BASE_BUILDINGS.map(
        (baseBuilding) => {
            const building = buildingById.get(
                String(baseBuilding.id)
            );
            const assignedServerNo = building
                ? getAssignedServerNo(building)
                : null;

            return (
                serverIndexByNo.get(assignedServerNo) ?? 0
            );
        }
    );

    if (assignments.length === 0) {
        return [];
    }

    const runs = [];
    let currentValue = assignments[0];
    let count = 1;

    for (
        let index = 1;
        index < assignments.length;
        index += 1
    ) {
        const value = assignments[index];

        if (value === currentValue) {
            count += 1;
            continue;
        }

        runs.push(currentValue, count);
        currentValue = value;
        count = 1;
    }

    runs.push(currentValue, count);

    return runs;
}

function decodeAssignmentRuns(runs, serverCount) {
    if (!Array.isArray(runs) || runs.length % 2 !== 0) {
        return null;
    }

    const assignments = [];

    for (let index = 0; index < runs.length; index += 2) {
        const serverNo = Number(runs[index]);
        const count = Number(runs[index + 1]);

        if (
            !Number.isInteger(serverNo) ||
            serverNo < 0 ||
            serverNo > serverCount ||
            !Number.isInteger(count) ||
            count <= 0 ||
            assignments.length + count >
                BASE_BUILDINGS.length
        ) {
            return null;
        }

        for (let repeat = 0; repeat < count; repeat += 1) {
            assignments.push(serverNo);
        }
    }

    return assignments.length === BASE_BUILDINGS.length
        ? assignments
        : null;
}

function serializeCalculatorState(value) {
    const fallback = createDefaultCalculatorState(
        getDateAfter(7)
    );
    const state = normalizeCalculatorState(
        value,
        fallback
    );
    const serverIndexByNo = new Map(
        state.servers.map((server, index) => [
            server.no,
            index + 1
        ])
    );
    const compactData = {
        v: SHARE_DATA_VERSION,
        m: BUILDING_MAP_SIGNATURE,
        d: state.endDate,
        t: state.endTime,
        f: state.fixedAt ?? 0,
        x:
            serverIndexByNo.get(
                state.selectedServerNo
            ) ?? 0,
        s: state.servers.map((server) => [
            server.name,
            normalizeScore(server.currentScore)
        ]),
        b: encodeAssignmentRuns(
            state.buildings,
            serverIndexByNo
        )
    };

    return LZString.compressToEncodedURIComponent(
        JSON.stringify(compactData)
    );
}

function deserializeCalculatorState(
    compressedValue,
    fallbackState
) {
    try {
        const json =
            LZString.decompressFromEncodedURIComponent(
                compressedValue
            );

        if (!json) {
            throw new Error("압축 데이터가 비어 있습니다.");
        }

        const compactData = JSON.parse(json);

        if (compactData.v !== SHARE_DATA_VERSION) {
            throw new Error(
                `지원하지 않는 공유 데이터 버전: ${compactData.v}`
            );
        }

        if (compactData.m !== BUILDING_MAP_SIGNATURE) {
            throw new Error(
                "공유 링크와 현재 건물 데이터 버전이 다릅니다."
            );
        }

        if (!Array.isArray(compactData.s)) {
            throw new Error("서버 데이터 형식이 올바르지 않습니다.");
        }

        const usedNames = new Set();
        const servers = compactData.s.map(
            (serverData, index) => {
                if (!Array.isArray(serverData)) {
                    throw new Error(
                        "서버 데이터 형식이 올바르지 않습니다."
                    );
                }

                const name = String(
                    serverData[0] ?? ""
                ).trim();
                const normalizedName =
                    name.toLocaleLowerCase();

                if (
                    name.length === 0 ||
                    usedNames.has(normalizedName)
                ) {
                    throw new Error(
                        "서버 이름 데이터가 올바르지 않습니다."
                    );
                }

                usedNames.add(normalizedName);

                return {
                    ...INITIAL_SERVER,
                    no: index + 1,
                    name,
                    currentScore: normalizeScore(
                        serverData[1]
                    )
                };
            }
        );
        const assignments = decodeAssignmentRuns(
            compactData.b,
            servers.length
        );

        if (assignments === null) {
            throw new Error(
                "건물 배정 데이터 형식이 올바르지 않습니다."
            );
        }

        const selectedServerNo = Number(compactData.x);

        return {
            endDate: isValidDateParam(compactData.d)
                ? compactData.d
                : fallbackState.endDate,
            endTime: isValidTimeParam(compactData.t)
                ? compactData.t
                : fallbackState.endTime,
            fixedAt: parseFixedAt(compactData.f),
            selectedServerNo:
                Number.isInteger(selectedServerNo) &&
                selectedServerNo >= 1 &&
                selectedServerNo <= servers.length
                    ? selectedServerNo
                    : null,
            servers,
            buildings: BASE_BUILDINGS.map(
                (building, index) => ({
                    ...building,
                    serverNo:
                        assignments[index] === 0
                            ? null
                            : assignments[index],
                    server: undefined
                })
            )
        };
    } catch (error) {
        console.warn(
            "EL 점수 계산기 공유 데이터 복원 실패",
            error
        );

        return fallbackState;
    }
}

function isCalculatorState(value) {
    return Boolean(
        value &&
        typeof value === "object" &&
        Array.isArray(value.servers) &&
        Array.isArray(value.buildings)
    );
}

export default function ELScoreCalculator() {
    const { t, i18n } = useTranslation("viewer");

    const locale =
        i18n.resolvedLanguage ??
        i18n.language ??
        "ko";

    const languageCode = locale.split("-")[0];

    const numberFormatter = useMemo(
        () => new Intl.NumberFormat(locale),
        [locale]
    );

    const defaultEndDate = useMemo(
        () => getDateAfter(7),
        []
    );
    const defaultCalculatorState = useMemo(
        () => createDefaultCalculatorState(defaultEndDate),
        [defaultEndDate]
    );
    const parseCalculatorParam = useCallback(
        (value) =>
            deserializeCalculatorState(
                value,
                defaultCalculatorState
            ),
        [defaultCalculatorState]
    );

    const [calculatorState, setCalculatorState] =
        useParamState(
            "data",
            defaultCalculatorState,
            {
                replace: true,
                parse: parseCalculatorParam,
                serialize: serializeCalculatorState,
                validate: isCalculatorState
            }
        );

    const {
        endDate,
        endTime,
        fixedAt,
        selectedServerNo,
        servers,
        buildings
    } = calculatorState;

    const setCalculatorField = useCallback(
        (field, newValue) => {
            setCalculatorState((current) => {
                const resolvedValue =
                    typeof newValue === "function"
                        ? newValue(current[field])
                        : newValue;

                return normalizeCalculatorState(
                    {
                        ...current,
                        [field]: resolvedValue
                    },
                    current
                );
            });
        },
        [setCalculatorState]
    );

    const setEndDate = useCallback(
        (value) =>
            setCalculatorField("endDate", value),
        [setCalculatorField]
    );
    const setEndTime = useCallback(
        (value) =>
            setCalculatorField("endTime", value),
        [setCalculatorField]
    );
    const setFixedAt = useCallback(
        (value) =>
            setCalculatorField("fixedAt", value),
        [setCalculatorField]
    );
    const setSelectedServerNo = useCallback(
        (value) =>
            setCalculatorField(
                "selectedServerNo",
                value
            ),
        [setCalculatorField]
    );
    const setServers = useCallback(
        (value) =>
            setCalculatorField("servers", value),
        [setCalculatorField]
    );
    const setBuildings = useCallback(
        (value) =>
            setCalculatorField("buildings", value),
        [setCalculatorField]
    );

    const [serverInput, setServerInput] = useState("");
    const [serverInputError, setServerInputError] =
        useState("");
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (fixedAt !== null) {
            return undefined;
        }

        setNow(Date.now());

        const handle = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(handle);
        };
    }, [fixedAt]);

    const selectedServer = useMemo(
        () =>
            servers.find(
                (server) => server.no === selectedServerNo
            ) ?? null,
        [selectedServerNo, servers]
    );

    const compressedShareData = useMemo(
        () => serializeCalculatorState(calculatorState),
        [calculatorState]
    );

    const shareUrl = useMemo(() => {
        const url = new URL(window.location.href);

        // 계산기 상태는 data 하나로만 공유한다.
        url.search = "";
        url.searchParams.set(
            "data",
            compressedShareData
        );

        return url.toString();
    }, [compressedShareData]);

    const shareCalculator = useCallback(async () => {
        const title = t(
            "elScoreCalculator.meta.applicationName"
        );

        try {
            if (navigator.share) {
                await navigator.share({
                    title,
                    url: shareUrl
                });
                return;
            }

            await navigator.clipboard.writeText(shareUrl);
            window.alert(
                t("elScoreCalculator.share.copied", {
                    defaultValue:
                        "공유 링크를 복사했습니다."
                })
            );
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }

            window.prompt(
                t("elScoreCalculator.share.manual", {
                    defaultValue:
                        "아래 주소를 직접 복사하세요."
                }),
                shareUrl
            );
        }
    }, [shareUrl, t]);

    const toggleTimeLock = useCallback(() => {
        setFixedAt((current) =>
            current === null ? Date.now() : null
        );
    }, [setFixedAt]);

    const fixedAtFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "medium"
            }),
        [locale]
    );

    const fixedAtText = useMemo(
        () =>
            fixedAt !== null
                ? fixedAtFormatter.format(
                    new Date(fixedAt)
                )
                : "",
        [fixedAt, fixedAtFormatter]
    );

    const calculationTime = fixedAt ?? now;

    const deadline = useMemo(
        () => getDeadline(endDate, endTime),
        [endDate, endTime]
    );

    const remainingMilliseconds = useMemo(
        () =>
            deadline
                ? Math.max(0, deadline.getTime() - calculationTime)
                : 0,
        [calculationTime, deadline]
    );

    const countdown = useMemo(() => {
        const totalSeconds = Math.floor(
            remainingMilliseconds / 1000
        );

        return {
            days: Math.floor(totalSeconds / 86400),
            hours: Math.floor(
                (totalSeconds % 86400) / 3600
            ),
            minutes: Math.floor(
                (totalSeconds % 3600) / 60
            ),
            seconds: totalSeconds % 60
        };
    }, [remainingMilliseconds]);

    const remainingMinutes = useMemo(
        () =>
            Math.max(
                0,
                Math.ceil(remainingMilliseconds / 60000)
            ),
        [remainingMilliseconds]
    );

    const sortedServers = useMemo(() => {
        const scoreByServerNo = {};

        buildings.forEach((building) => {
            const serverNo =
                getAssignedServerNo(building);

            if (serverNo === null) {
                return;
            }

            scoreByServerNo[serverNo] =
                (scoreByServerNo[serverNo] ?? 0) +
                Number(building.point ?? 0);
        });

        return servers
            .map((server) => {
                const scorePerMinute =
                    scoreByServerNo[server.no] ?? 0;

                return {
                    ...server,
                    scorePerMinute,
                    scoreTotal:
                        Number(server.currentScore ?? 0) +
                        scorePerMinute * remainingMinutes
                };
            })
            .sort(
                (left, right) =>
                    right.scoreTotal - left.scoreTotal
            );
    }, [
        buildings,
        remainingMinutes,
        servers
    ]);

    const assignedBuildingCount = useMemo(
        () =>
            buildings.filter(
                (building) =>
                    getAssignedServerNo(building) !== null
            ).length,
        [buildings]
    );

    const getFacilityName = useCallback(
        (building) =>
            t(
                `elScoreCalculator.facilities.${building.i18nKey}`,
                {
                    defaultValue: building.name
                }
            ),
        [t]
    );

    const addServer = useCallback(() => {
        const name = serverInput.trim();

        if (name.length === 0) {
            setServerInputError(
                t(
                    "elScoreCalculator.server.errors.required"
                )
            );
            return;
        }

        if (
            servers.some(
                (server) =>
                    server.name.toLocaleLowerCase() ===
                    name.toLocaleLowerCase()
            )
        ) {
            setServerInputError(
                t(
                    "elScoreCalculator.server.errors.duplicate"
                )
            );
            return;
        }

        const nextNo =
            servers.reduce(
                (maximum, server) =>
                    Math.max(maximum, server.no),
                0
            ) + 1;

        setServers((current) => [
            ...current,
            {
                ...INITIAL_SERVER,
                no: nextNo,
                name
            }
        ]);

        setServerInput("");
        setServerInputError("");
    }, [
        serverInput,
        servers,
        setServers,
        t
    ]);

    const resetServers = useCallback(() => {
        if (
            !window.confirm(
                t(
                    "elScoreCalculator.server.confirmReset"
                )
            )
        ) {
            return;
        }

        setServers([]);
    }, [setServers, t]);

    const removeServer = useCallback(
        (target) => {
            if (
                !window.confirm(
                    t(
                        "elScoreCalculator.server.confirmRemove",
                        {
                            name: target.name
                        }
                    )
                )
            ) {
                return;
            }

            setServers((current) =>
                current.filter(
                    (server) => server.no !== target.no
                )
            );
        },
        [setServers, t]
    );

    const changeCurrentScore = useCallback(
        (event, target) => {
            const currentScore =
                parseNonNegativeInteger(
                    event.target.value
                );

            setServers((current) =>
                current.map((server) =>
                    server.no === target.no
                        ? {
                            ...server,
                            currentScore
                        }
                        : server
                )
            );
        },
        [setServers]
    );

    const toggleBuilding = useCallback(
        (target) => {
            if (selectedServer === null) {
                return;
            }

            setBuildings((current) =>
                current.map((building) => {
                    if (building.id !== target.id) {
                        return building;
                    }

                    const assignedServerNo =
                        getAssignedServerNo(building);

                    return {
                        ...building,
                        serverNo:
                            assignedServerNo ===
                            selectedServer.no
                                ? null
                                : selectedServer.no,
                        server: undefined
                    };
                })
            );
        },
        [selectedServer, setBuildings]
    );

    const getBuildingColor = useCallback(
        (building) => {
            const assignedServerNo =
                getAssignedServerNo(building);

            if (assignedServerNo === null) {
                return "transparent";
            }

            if (
                selectedServer !== null &&
                assignedServerNo !== selectedServer.no
            ) {
                return "transparent";
            }

            return ColorList[
                assignedServerNo % ColorList.length
            ];
        },
        [selectedServer]
    );

    const canonicalUrl = useCanonicalUrl();

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: t(
            "elScoreCalculator.meta.applicationName"
        ),
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        description: t(
            "elScoreCalculator.meta.description"
        ),
        inLanguage: languageCode,
        url: canonicalUrl
    };

    return (
        <>
            <Helmet>
                <title>
                    {t("elScoreCalculator.meta.title")}
                </title>
                <meta
                    name="description"
                    content={t(
                        "elScoreCalculator.meta.description"
                    )}
                />
                <link rel="canonical" href={canonicalUrl} />
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>

            <article className="el-score-page">
                <header className="el-score-hero">
                    <div className="el-score-eyebrow">
                        <FaCalculator aria-hidden="true" />
                        {t(
                            "elScoreCalculator.hero.eyebrow"
                        )}
                    </div>

                    <h1>
                        {t("elScoreCalculator.hero.title")}
                    </h1>

                    <p>
                        {t(
                            "elScoreCalculator.hero.description"
                        )}
                    </p>

                    <button
                        type="button"
                        className="btn btn-outline-primary mt-3"
                        onClick={shareCalculator}
                    >
                        <FaShareNodes className="me-2" />
                        {t("elScoreCalculator.share.button", {
                            defaultValue: "현재 설정 공유"
                        })}
                    </button>
                </header>

                <section className="el-score-workflow-overview">
                    <div className="el-score-section-heading">
                        <div>
                            <span className="el-score-kicker">
                                {t(
                                    "elScoreCalculator.overview.kicker"
                                )}
                            </span>
                            <h2>
                                {t(
                                    "elScoreCalculator.overview.title"
                                )}
                            </h2>
                            <p>
                                {t(
                                    "elScoreCalculator.overview.description"
                                )}
                            </p>
                        </div>
                    </div>

                    <ol className="el-score-step-grid">
                        <WorkflowStep
                            icon={<FaClock />}
                            number={1}
                            title={t(
                                "elScoreCalculator.overview.steps.deadline.title"
                            )}
                            description={t(
                                "elScoreCalculator.overview.steps.deadline.description"
                            )}
                        />
                        <WorkflowStep
                            icon={<FaServer />}
                            number={2}
                            title={t(
                                "elScoreCalculator.overview.steps.servers.title"
                            )}
                            description={t(
                                "elScoreCalculator.overview.steps.servers.description"
                            )}
                        />
                        <WorkflowStep
                            icon={<FaFlagCheckered />}
                            number={3}
                            title={t(
                                "elScoreCalculator.overview.steps.currentScore.title"
                            )}
                            description={t(
                                "elScoreCalculator.overview.steps.currentScore.description"
                            )}
                        />
                        <WorkflowStep
                            icon={<FaMapLocationDot />}
                            number={4}
                            title={t(
                                "elScoreCalculator.overview.steps.occupation.title"
                            )}
                            description={t(
                                "elScoreCalculator.overview.steps.occupation.description"
                            )}
                        />
                        <WorkflowStep
                            icon={<FaRankingStar />}
                            number={5}
                            title={t(
                                "elScoreCalculator.overview.steps.ranking.title"
                            )}
                            description={t(
                                "elScoreCalculator.overview.steps.ranking.description"
                            )}
                        />
                    </ol>
                </section>

                <section className="el-score-panel">
                    <SectionTitle
                        number={1}
                        icon={<FaClock />}
                        title={t(
                            "elScoreCalculator.deadline.title"
                        )}
                        description={t(
                            "elScoreCalculator.deadline.description"
                        )}
                    />

                    <div className="el-score-form-grid">
                        <label className="el-score-field">
                            <span>
                                {t(
                                    "elScoreCalculator.deadline.date"
                                )}
                            </span>
                            <input
                                type="date"
                                className="form-control"
                                value={endDate}
                                onChange={(event) =>
                                    setEndDate(
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label className="el-score-field">
                            <span>
                                {t(
                                    "elScoreCalculator.deadline.time"
                                )}
                            </span>
                            <input
                                type="time"
                                className="form-control"
                                value={endTime}
                                onChange={(event) =>
                                    setEndTime(
                                        event.target.value
                                    )
                                }
                            />
                        </label>
                    </div>

                    <div
                        className={`el-score-countdown${
                            remainingMilliseconds > 0
                                ? " is-active"
                                : ""
                        }`}
                        aria-live="polite"
                    >
                        <span>
                            {t(
                                "elScoreCalculator.deadline.remaining"
                            )}
                        </span>

                        <strong>
                            {remainingMilliseconds > 0
                                ? t(
                                    "elScoreCalculator.deadline.countdown",
                                    countdown
                                )
                                : t(
                                    "elScoreCalculator.deadline.noTime"
                                )}
                        </strong>
                    </div>
                </section>

                <section className="el-score-panel">
                    <SectionTitle
                        number={2}
                        icon={<FaServer />}
                        title={t(
                            "elScoreCalculator.server.title"
                        )}
                        description={t(
                            "elScoreCalculator.server.description"
                        )}
                        action={
                            <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={resetServers}
                                disabled={servers.length === 0}
                            >
                                <FaEraser className="me-2" />
                                {t(
                                    "elScoreCalculator.server.reset"
                                )}
                            </button>
                        }
                    />

                    <div className="el-score-server-entry">
                        <div>
                            <label
                                className="visually-hidden"
                                htmlFor="el-server-input"
                            >
                                {t(
                                    "elScoreCalculator.server.inputLabel"
                                )}
                            </label>
                            <input
                                id="el-server-input"
                                type="text"
                                className={`form-control${
                                    serverInputError
                                        ? " is-invalid"
                                        : ""
                                }`}
                                placeholder={t(
                                    "elScoreCalculator.server.placeholder"
                                )}
                                value={serverInput}
                                onChange={(event) => {
                                    setServerInput(
                                        event.target.value
                                    );
                                    setServerInputError("");
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        addServer();
                                    }
                                }}
                            />
                            {serverInputError && (
                                <div className="invalid-feedback">
                                    {serverInputError}
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            className="btn btn-success"
                            onClick={addServer}
                        >
                            <FaPlus className="me-sm-2" />
                            <span className="d-none d-sm-inline">
                                {t(
                                    "elScoreCalculator.server.add"
                                )}
                            </span>
                        </button>
                    </div>

                    {servers.length === 0 ? (
                        <EmptyState
                            icon={<FaServer />}
                            text={t(
                                "elScoreCalculator.server.empty"
                            )}
                        />
                    ) : (
                        <div className="el-score-server-list">
                            {servers.map((server) => (
                                <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={() =>
                                        removeServer(server)
                                    }
                                    key={server.no}
                                    title={t(
                                        "elScoreCalculator.server.removeAria",
                                        {
                                            name: server.name
                                        }
                                    )}
                                >
                                    <span>{server.name}</span>
                                    <FaXmark className="ms-2" />
                                </button>
                            ))}
                        </div>
                    )}

                    <p className="el-score-count-note">
                        {t(
                            "elScoreCalculator.server.registeredCount",
                            {
                                count: servers.length
                            }
                        )}
                    </p>
                </section>

                <section className="el-score-panel">
                    <SectionTitle
                        number={3}
                        icon={<FaFlagCheckered />}
                        title={t(
                            "elScoreCalculator.currentScore.title"
                        )}
                        description={t(
                            "elScoreCalculator.currentScore.description"
                        )}
                        action={
                            <button
                                type="button"
                                className={`btn btn-sm ${
                                    fixedAt !== null
                                        ? "btn-warning"
                                        : "btn-outline-primary"
                                }`}
                                onClick={toggleTimeLock}
                                disabled={servers.length === 0}
                            >
                                {fixedAt !== null ? (
                                    <FaLockOpen className="me-2" />
                                ) : (
                                    <FaLock className="me-2" />
                                )}
                                {fixedAt !== null
                                    ? t(
                                        "elScoreCalculator.timeLock.unlock",
                                        {
                                            defaultValue:
                                                "시간 고정 해제"
                                        }
                                    )
                                    : t(
                                        "elScoreCalculator.timeLock.lock",
                                        {
                                            defaultValue:
                                                "현재 시간 고정"
                                        }
                                    )}
                            </button>
                        }
                    />

                    {servers.length === 0 ? (
                        <EmptyState
                            icon={<FaFlagCheckered />}
                            text={t(
                                "elScoreCalculator.currentScore.empty"
                            )}
                        />
                    ) : (
                        <div className="el-score-current-grid">
                            {servers.map((server) => (
                                <label
                                    className="el-score-field"
                                    key={server.no}
                                >
                                    <span>{server.name}</span>
                                    <div className="input-group">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="form-control"
                                            value={
                                                server.currentScore
                                            }
                                            onChange={(event) =>
                                                changeCurrentScore(
                                                    event,
                                                    server
                                                )
                                            }
                                        />
                                        <span className="input-group-text">
                                            {t(
                                                "elScoreCalculator.units.points"
                                            )}
                                        </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}

                    {servers.length > 0 && (
                        <div
                            className={`alert ${
                                fixedAt !== null
                                    ? "alert-warning"
                                    : "alert-light"
                            } mt-3 mb-0 d-flex align-items-start gap-2`}
                            role="status"
                        >
                            {fixedAt !== null ? (
                                <FaLock
                                    className="flex-shrink-0 mt-1"
                                    aria-hidden="true"
                                />
                            ) : (
                                <FaClock
                                    className="flex-shrink-0 mt-1"
                                    aria-hidden="true"
                                />
                            )}

                            <div>
                                <strong className="d-block">
                                    {fixedAt !== null
                                        ? t(
                                            "elScoreCalculator.timeLock.lockedTitle",
                                            {
                                                defaultValue:
                                                    "계산 시간이 고정되었습니다."
                                            }
                                        )
                                        : t(
                                            "elScoreCalculator.timeLock.liveTitle",
                                            {
                                                defaultValue:
                                                    "실시간 계산 중입니다."
                                            }
                                        )}
                                </strong>

                                <span>
                                    {fixedAt !== null
                                        ? t(
                                            "elScoreCalculator.timeLock.lockedDescription",
                                            {
                                                time: fixedAtText,
                                                defaultValue:
                                                    "{{time}}을 기준으로 계산합니다. 시간이 지나도 예상 점수는 변하지 않습니다."
                                            }
                                        )
                                        : t(
                                            "elScoreCalculator.timeLock.liveDescription",
                                            {
                                                defaultValue:
                                                    "현재 시각을 기준으로 남은 시간과 예상 점수가 계속 갱신됩니다."
                                            }
                                        )}
                                </span>
                            </div>
                        </div>
                    )}
                </section>

                <section className="el-score-panel">
                    <SectionTitle
                        number={4}
                        icon={<FaMapLocationDot />}
                        title={t(
                            "elScoreCalculator.occupation.title",
                            {
                                perspective:
                                    selectedServer === null
                                        ? t(
                                            "elScoreCalculator.occupation.allMap"
                                        )
                                        : t(
                                            "elScoreCalculator.occupation.serverPerspective",
                                            {
                                                name:
                                                    selectedServer.name
                                            }
                                        )
                            }
                        )}
                        description={t(
                            "elScoreCalculator.occupation.description"
                        )}
                    />

                    <div className="el-score-map-toolbar">
                        <button
                            type="button"
                            className={`btn fw-bold ${
                                selectedServer === null
                                    ? "btn-secondary"
                                    : "btn-outline-secondary"
                            }`}
                            onClick={() =>
                                setSelectedServerNo(null)
                            }
                        >
                            {t(
                                "elScoreCalculator.occupation.showAll"
                            )}
                        </button>

                        {servers.map((server) => (
                            <button
                                type="button"
                                className={`btn fw-bold ${
                                    selectedServer?.no ===
                                    server.no
                                        ? "btn-colored"
                                        : "btn-outline-colored"
                                }`}
                                style={{
                                    "--btn-color":
                                        ColorList[
                                            server.no %
                                                ColorList.length
                                        ]
                                }}
                                onClick={() =>
                                    setSelectedServerNo(
                                        server.no
                                    )
                                }
                                key={server.no}
                            >
                                {server.name}
                            </button>
                        ))}
                    </div>

                    {servers.length === 0 && (
                        <div className="el-score-inline-notice">
                            <FaTriangleExclamation aria-hidden="true" />
                            {t(
                                "elScoreCalculator.occupation.noServers"
                            )}
                        </div>
                    )}

                    {servers.length > 0 &&
                        selectedServer === null && (
                            <div className="el-score-inline-notice">
                                <FaBuildingFlag aria-hidden="true" />
                                {t(
                                    "elScoreCalculator.occupation.selectServer"
                                )}
                            </div>
                        )}

                    <div className="el-map-scroll">
                        <div
                            className={`el-map${
                                selectedServer === null
                                    ? " is-overview"
                                    : " is-editing"
                            }`}
                        >
                            <div
                                className="el-lines"
                                aria-hidden="true"
                            >
                                <svg
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                >
                                    {/* 1구역 */}
                            <line x1={0} y1={0} x2={16} y2={16.5} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={16} y1={16.5} x2={51} y2={16.5} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={51} y1={16.5} x2={51} y2={0} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 2구역 */}
                            <line x1={100} y1={0} x2={86} y2={16.5} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={86} y1={16.5} x2={51} y2={16.5} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* <line x1={51} y1={16.5} x2={51} y2={0} stroke="#0984e3" strokeWidth={0.2}/> */}
                            {/* 3구역 */}
                            <line x1={86} y1={16.5} x2={86} y2={50} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={86} y1={50} x2={100} y2={50} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 4구역 */}
                            <line x1={86} y1={50} x2={86} y2={85} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={86} y1={85} x2={100} y2={100} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 5구역 */}
                            <line x1={86} y1={85} x2={51} y2={85} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={51} y1={85} x2={51} y2={100} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 6구역 */}
                            <line x1={0} y1={100} x2={16} y2={85} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={16} y1={85} x2={51} y2={85} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 7구역 */}
                            <line x1={16} y1={85} x2={16} y2={50} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={0} y1={50} x2={16} y2={50} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 8구역 */}
                            <line x1={16} y1={16.5} x2={16} y2={50} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 9구역 */}
                            <line x1={16} y1={16.5} x2={26} y2={26} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={26} y1={26} x2={76.5} y2={26} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={76.5} y1={26} x2={86} y2={16.5} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 10구역 */}
                            <line x1={76.5} y1={26} x2={76.5} y2={75} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={76.5} y1={75} x2={86} y2={85} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 11구역 */}
                            <line x1={76.5} y1={75} x2={26} y2={75} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={16} y1={85} x2={26} y2={75} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 12구역 */}
                            <line x1={26} y1={26} x2={26} y2={75} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 13구역 */}
                            <line x1={26} y1={26} x2={42} y2={42} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={42} y1={42} x2={58} y2={42} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={58} y1={42} x2={58} y2={58} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={58} y1={58} x2={76.5} y2={75} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 14구역 */}
                            <line x1={42} y1={42} x2={42} y2={58} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={42} y1={58} x2={58} y2={58} stroke="#0984e3" strokeWidth={0.2}/>
                                </svg>
                            </div>

                            {buildings.map((building) => {
                                const assignedServerNo =
                                    getAssignedServerNo(
                                        building
                                    );
                                const buildingName =
                                    getFacilityName(building);
                                const assignedServer =
                                    servers.find(
                                        (server) =>
                                            server.no ===
                                            assignedServerNo
                                    );
                                const visibleAssigned =
                                    assignedServerNo !== null &&
                                    (
                                        selectedServer === null ||
                                        selectedServer.no ===
                                            assignedServerNo
                                    );

                                return (
                                    <button
                                        type="button"
                                        className={`el-building${
                                            visibleAssigned
                                                ? " is-assigned"
                                                : ""
                                        }${
                                            selectedServer?.no ===
                                            assignedServerNo
                                                ? " is-current"
                                                : ""
                                        }`}
                                        style={{
                                            top: `${building.x}%`,
                                            left: `${building.y}%`,
                                            "--building-color":
                                                getBuildingColor(
                                                    building
                                                )
                                        }}
                                        key={building.id}
                                        disabled={
                                            selectedServer === null
                                        }
                                        aria-pressed={
                                            selectedServer !== null &&
                                            assignedServerNo ===
                                                selectedServer.no
                                        }
                                        aria-label={t(
                                            "elScoreCalculator.occupation.markerAria",
                                            {
                                                building:
                                                    buildingName,
                                                server:
                                                    assignedServer?.name ??
                                                    t(
                                                        "elScoreCalculator.occupation.unassigned"
                                                    ),
                                                score:
                                                    numberFormatter.format(
                                                        building.point
                                                    )
                                            }
                                        )}
                                        title={t(
                                            "elScoreCalculator.occupation.markerTitle",
                                            {
                                                building:
                                                    buildingName,
                                                server:
                                                    assignedServer?.name ??
                                                    t(
                                                        "elScoreCalculator.occupation.unassigned"
                                                    ),
                                                score:
                                                    numberFormatter.format(
                                                        building.point
                                                    )
                                            }
                                        )}
                                        onClick={() =>
                                            toggleBuilding(
                                                building
                                            )
                                        }
                                    >
                                        <span aria-hidden="true">
                                            ✓
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="el-score-map-summary">
                        <span>
                            {t(
                                "elScoreCalculator.occupation.assignedCount",
                                {
                                    count:
                                        assignedBuildingCount
                                }
                            )}
                        </span>
                        <span>
                            {selectedServer === null
                                ? t(
                                    "elScoreCalculator.occupation.overviewMode"
                                )
                                : t(
                                    "elScoreCalculator.occupation.editMode",
                                    {
                                        name:
                                            selectedServer.name
                                    }
                                )}
                        </span>
                    </div>
                </section>

                <section className="el-score-panel">
                    <SectionTitle
                        number={5}
                        icon={<FaRankingStar />}
                        title={t(
                            "elScoreCalculator.ranking.title"
                        )}
                        description={t(
                            "elScoreCalculator.ranking.description"
                        )}
                    />

                    <div className="table-responsive">
                        <table className="table align-middle text-nowrap">
                            <thead>
                                <tr className="text-center">
                                    <th scope="col">
                                        {t(
                                            "elScoreCalculator.ranking.rank"
                                        )}
                                    </th>
                                    <th scope="col">
                                        {t(
                                            "elScoreCalculator.ranking.server"
                                        )}
                                    </th>
                                    <th
                                        scope="col"
                                        className="text-end"
                                    >
                                        {t(
                                            "elScoreCalculator.ranking.currentScore"
                                        )}
                                    </th>
                                    <th
                                        scope="col"
                                        className="text-end"
                                    >
                                        {t(
                                            "elScoreCalculator.ranking.perMinute"
                                        )}
                                    </th>
                                    <th
                                        scope="col"
                                        className="text-end"
                                    >
                                        {t(
                                            "elScoreCalculator.ranking.finalScore"
                                        )}
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="text-center">
                                {sortedServers.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-4 text-muted"
                                        >
                                            {t(
                                                "elScoreCalculator.ranking.empty"
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    sortedServers.map(
                                        (server, index) => (
                                            <tr
                                                key={server.no}
                                                className={
                                                    index === 0
                                                        ? "table-primary"
                                                        : index === 1
                                                          ? "table-success"
                                                          : ""
                                                }
                                            >
                                                <td>
                                                    {index + 1}
                                                </td>
                                                <td>
                                                    {server.name}
                                                </td>
                                                <td className="text-end">
                                                    {numberFormatter.format(
                                                        server.currentScore
                                                    )}
                                                </td>
                                                <td className="text-end">
                                                    {numberFormatter.format(
                                                        server.scorePerMinute
                                                    )}
                                                </td>
                                                <td className="text-end fw-bold">
                                                    {numberFormatter.format(
                                                        server.scoreTotal
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="el-score-info-grid">
                    <div className="el-score-info-card">
                        <h2>
                            {t(
                                "elScoreCalculator.info.calculation.title"
                            )}
                        </h2>
                        <p>
                            {t(
                                "elScoreCalculator.info.calculation.description"
                            )}
                        </p>
                        <code>
                            {t(
                                "elScoreCalculator.info.calculation.formula"
                            )}
                        </code>
                    </div>

                    <div className="el-score-info-card">
                        <h2>
                            {t(
                                "elScoreCalculator.info.usage.title"
                            )}
                        </h2>
                        <p>
                            {t(
                                "elScoreCalculator.info.usage.description1"
                            )}
                        </p>
                        <p>
                            {t(
                                "elScoreCalculator.info.usage.description2"
                            )}
                        </p>
                    </div>
                </section>

                <section className="el-score-faq">
                    <h2>
                        {t("elScoreCalculator.faq.title")}
                    </h2>

                    <details>
                        <summary>
                            {t(
                                "elScoreCalculator.faq.conditional.question"
                            )}
                        </summary>
                        <p>
                            {t(
                                "elScoreCalculator.faq.conditional.answer"
                            )}
                        </p>
                    </details>

                    <details>
                        <summary>
                            {t(
                                "elScoreCalculator.faq.finalScore.question"
                            )}
                        </summary>
                        <p>
                            {t(
                                "elScoreCalculator.faq.finalScore.answer"
                            )}
                        </p>
                    </details>

                    <details>
                        <summary>
                            {t(
                                "elScoreCalculator.faq.storage.question"
                            )}
                        </summary>
                        <p>
                            {t(
                                "elScoreCalculator.faq.storage.answer"
                            )}
                        </p>
                    </details>
                </section>
            </article>
        </>
    );
}

function WorkflowStep({
    icon,
    number,
    title,
    description
}) {
    return (
        <li>
            <div className="el-score-step-icon">
                {icon}
            </div>
            <span>
                {number}
            </span>
            <strong>{title}</strong>
            <p>{description}</p>
        </li>
    );
}

function SectionTitle({
    number,
    icon,
    title,
    description,
    action
}) {
    return (
        <div className="el-score-section-heading">
            <div className="el-score-section-title">
                <span className="el-score-section-number">
                    {number}
                </span>
                <div>
                    <div className="el-score-kicker">
                        {icon}
                    </div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                </div>
            </div>

            {action}
        </div>
    );
}

function EmptyState({ icon, text }) {
    return (
        <div className="el-score-empty">
            <span>{icon}</span>
            <p>{text}</p>
        </div>
    );
}