import BuildingList from "@src/assets/json/el/buildings.json";
import ColorList from "@src/assets/json/colors.json";
import { useListParamState } from "@src/hooks/useListParamState";
import { useParamState } from "@src/hooks/useParamState";
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
import { useSearchParams } from "react-router-dom";

import "./ELScoreCalculator.css";
import "./ELScoreCalculator.strategy.css";
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

function getDateTimeParts(value = new Date()) {
    const date = value instanceof Date
        ? value
        : new Date(value);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    return {
        date: `${year}-${month}-${day}`,
        time: `${hour}:${minute}`
    };
}

function getTimestamp(date, time) {
    return getDeadline(date, time)?.getTime() ?? null;
}

function clampTimestamp(value, minimum, maximum) {
    return Math.min(
        maximum,
        Math.max(minimum, value)
    );
}

function toDateTimeLocalValue(timestamp) {
    if (!Number.isFinite(timestamp)) {
        return "";
    }

    const { date, time } = getDateTimeParts(timestamp);
    return `${date}T${time}`;
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

function parseSelectedServerNo(value) {
    const serverNo = Number(value);

    return Number.isInteger(serverNo) && serverNo > 0
        ? serverNo
        : null;
}

function validateSelectedServerNo(value) {
    return (
        value === null ||
        (Number.isInteger(value) && value > 0)
    );
}

function parseFixedAt(value) {
    const timestamp = Number(value);

    return Number.isSafeInteger(timestamp) && timestamp > 0
        ? timestamp
        : null;
}

function validateFixedAt(value) {
    return (
        value === null ||
        (Number.isSafeInteger(value) && value > 0)
    );
}

function normalizeScore(value) {
    const score = Number(value);

    return Number.isFinite(score) && score >= 0
        ? Math.floor(score)
        : 0;
}

function encodeBase64Url(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";

    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return window
        .btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function decodeBase64Url(value) {
    const base64 = value
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = window.atob(base64);
    const bytes = Uint8Array.from(
        binary,
        (character) => character.charCodeAt(0)
    );

    return new TextDecoder().decode(bytes);
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

function serializeServer(server) {
    return encodeBase64Url(
        JSON.stringify([
            server.no,
            server.name,
            normalizeScore(server.currentScore)
        ])
    );
}

function parseServer(value) {
    try {
        const [no, name, currentScore] = JSON.parse(
            decodeBase64Url(value)
        );

        return { no, name, currentScore };
    } catch {
        return null;
    }
}

function parseServers(values) {
    return normalizeServers(
        values.map(parseServer).filter(Boolean)
    );
}

function serializeBuildingAssignment(building) {
    return encodeBase64Url(
        JSON.stringify([
            String(building.id),
            getAssignedServerNo(building)
        ])
    );
}

function parseBuildingAssignment(value) {
    try {
        const [buildingId, serverNo] = JSON.parse(
            decodeBase64Url(value)
        );
        const normalizedServerNo = Number(serverNo);

        if (
            !buildingId ||
            !Number.isInteger(normalizedServerNo) ||
            normalizedServerNo <= 0
        ) {
            return null;
        }

        return {
            buildingId: String(buildingId),
            serverNo: normalizedServerNo
        };
    } catch {
        return null;
    }
}

function createBuildings(buildingParams, servers) {
    const validServerNos = new Set(
        servers.map((server) => server.no)
    );
    const assignmentMap = new Map();

    buildingParams
        .map(parseBuildingAssignment)
        .filter(Boolean)
        .forEach(({ buildingId, serverNo }) => {
            if (validServerNos.has(serverNo)) {
                assignmentMap.set(buildingId, serverNo);
            }
        });

    return BASE_BUILDINGS.map((building) => ({
        ...building,
        serverNo:
            assignmentMap.get(String(building.id)) ?? null,
        server: undefined
    }));
}

function serializeBuildings(buildings, servers) {
    const buildingMap = new Map(
        (Array.isArray(buildings) ? buildings : []).map(
            (building) => [String(building.id), building]
        )
    );
    const validServerNos = new Set(
        servers.map((server) => server.no)
    );

    return BASE_BUILDINGS.flatMap((baseBuilding) => {
        const building = buildingMap.get(
            String(baseBuilding.id)
        );
        const serverNo = building
            ? getAssignedServerNo(building)
            : null;

        if (!validServerNos.has(serverNo)) {
            return [];
        }

        return [
            serializeBuildingAssignment({
                ...baseBuilding,
                serverNo
            })
        ];
    });
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

    const [searchParams, setSearchParams] =
        useSearchParams();

    const initialFixedAt = useMemo(
        () => parseFixedAt(
            searchParams.get("fixedAt")
        ),
        []
    );

    const defaultStart = useMemo(
        () => getDateTimeParts(
            initialFixedAt ?? new Date()
        ),
        [initialFixedAt]
    );

    const defaultEndDate = useMemo(
        () => getDateAfter(7),
        []
    );

    const parseStartDate = useCallback(
        (value) =>
            isValidDateParam(value)
                ? value
                : defaultStart.date,
        [defaultStart.date]
    );

    const parseStartTime = useCallback(
        (value) =>
            isValidTimeParam(value)
                ? value
                : defaultStart.time,
        [defaultStart.time]
    );

    const parseEndDate = useCallback(
        (value) =>
            isValidDateParam(value)
                ? value
                : defaultEndDate,
        [defaultEndDate]
    );

    const [selectedServerNo, setSelectedServerNo] =
        useParamState("selected", null, {
            parse: parseSelectedServerNo,
            validate: validateSelectedServerNo
        });

    const [startDate, setStartDate] = useParamState(
        "startDate",
        defaultStart.date,
        {
            parse: parseStartDate,
            validate: isValidDateParam
        }
    );

    const [startTime, setStartTime] = useParamState(
        "startTime",
        defaultStart.time,
        {
            parse: parseStartTime,
            validate: isValidTimeParam
        }
    );

    const [endDate, setEndDate] = useParamState(
        "endDate",
        defaultEndDate,
        {
            parse: parseEndDate,
            validate: isValidDateParam
        }
    );

    const [endTime, setEndTime] = useParamState(
        "endTime",
        "23:00",
        {
            parse: (value) =>
                isValidTimeParam(value)
                    ? value
                    : "23:00",
            validate: isValidTimeParam
        }
    );

    const [fixedAt, setFixedAt] = useParamState(
        "fixedAt",
        initialFixedAt,
        {
            parse: parseFixedAt,
            validate: validateFixedAt
        }
    );

    const [viewAt, setViewAt] = useParamState(
        "viewAt",
        initialFixedAt,
        {
            parse: parseFixedAt,
            validate: validateFixedAt
        }
    );

    const [serverParams, setServerParams] =
        useListParamState("servers");
    const [buildingParams, setBuildingParams] =
        useListParamState("buildings");

    const servers = useMemo(
        () => parseServers(serverParams),
        [serverParams]
    );

    const setServers = useCallback(
        (newValue) => {
            setServerParams((currentParams) => {
                const currentServers =
                    parseServers(currentParams);
                const resolvedValue =
                    typeof newValue === "function"
                        ? newValue(currentServers)
                        : newValue;

                return normalizeServers(resolvedValue).map(
                    serializeServer
                );
            });
        },
        [setServerParams]
    );

    const buildings = useMemo(
        () => createBuildings(buildingParams, servers),
        [buildingParams, servers]
    );

    const setBuildings = useCallback(
        (newValue) => {
            setBuildingParams((currentParams) => {
                const currentBuildings = createBuildings(
                    currentParams,
                    servers
                );
                const resolvedValue =
                    typeof newValue === "function"
                        ? newValue(currentBuildings)
                        : newValue;

                return serializeBuildings(
                    resolvedValue,
                    servers
                );
            });
        },
        [servers, setBuildingParams]
    );

    const [serverInput, setServerInput] = useState("");
    const [serverInputError, setServerInputError] =
        useState("");

    const selectedServer = useMemo(
        () =>
            servers.find(
                (server) => server.no === selectedServerNo
            ) ?? null,
        [selectedServerNo, servers]
    );

    const lockedStartParts = useMemo(
        () =>
            fixedAt !== null
                ? getDateTimeParts(fixedAt)
                : null,
        [fixedAt]
    );

    const displayedStartDate =
        lockedStartParts?.date ?? startDate;
    const displayedStartTime =
        lockedStartParts?.time ?? startTime;

    const startCandidateAt = useMemo(
        () => getTimestamp(startDate, startTime),
        [startDate, startTime]
    );

    const deadline = useMemo(
        () => getDeadline(endDate, endTime),
        [endDate, endTime]
    );

    const deadlineAt = deadline?.getTime() ?? null;

    const hasValidWindow =
        fixedAt !== null &&
        deadlineAt !== null &&
        fixedAt < deadlineAt;

    const selectedTimestamp = useMemo(() => {
        if (!hasValidWindow) {
            return null;
        }

        return clampTimestamp(
            viewAt ?? fixedAt,
            fixedAt,
            deadlineAt
        );
    }, [deadlineAt, fixedAt, hasValidWindow, viewAt]);

    const normalizedServerParams = useMemo(
        () => servers.map(serializeServer),
        [servers]
    );
    const normalizedBuildingParams = useMemo(
        () => serializeBuildings(buildings, servers),
        [buildings, servers]
    );

    const normalizedQueryValues = useMemo(
        () => ({
            startDate: displayedStartDate,
            startTime: displayedStartTime,
            endDate,
            endTime,
            fixedAt:
                fixedAt !== null
                    ? String(fixedAt)
                    : null,
            viewAt:
                selectedTimestamp !== null
                    ? String(selectedTimestamp)
                    : null,
            servers:
                normalizedServerParams.length > 0
                    ? normalizedServerParams.join(",")
                    : null,
            buildings:
                normalizedBuildingParams.length > 0
                    ? normalizedBuildingParams.join(",")
                    : null,
            selected:
                selectedServer !== null
                    ? String(selectedServer.no)
                    : null
        }),
        [
            displayedStartDate,
            displayedStartTime,
            endDate,
            endTime,
            fixedAt,
            normalizedBuildingParams,
            normalizedServerParams,
            selectedServer,
            selectedTimestamp
        ]
    );

    const queryNeedsNormalization = useMemo(
        () =>
            Object.entries(normalizedQueryValues).some(
                ([key, value]) =>
                    searchParams.get(key) !== value
            ),
        [normalizedQueryValues, searchParams]
    );

    useEffect(() => {
        if (!queryNeedsNormalization) {
            return;
        }

        setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(
                currentParams
            );

            Object.entries(normalizedQueryValues).forEach(
                ([key, value]) => {
                    if (value === null) {
                        nextParams.delete(key);
                    } else {
                        nextParams.set(key, value);
                    }
                }
            );

            return nextParams;
        }, { replace: true });
    }, [
        normalizedQueryValues,
        queryNeedsNormalization,
        setSearchParams
    ]);

    const shareUrl = useMemo(() => {
        const url = new URL(window.location.href);

        url.searchParams.set("endDate", endDate);
        url.searchParams.set("endTime", endTime);

        Object.entries(normalizedQueryValues).forEach(
            ([key, value]) => {
                if (value === null) {
                    url.searchParams.delete(key);
                } else {
                    url.searchParams.set(key, value);
                }
            }
        );

        return url.toString();
    }, [normalizedQueryValues]);

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

    const lockStartTime = useCallback(() => {
        if (
            startCandidateAt === null ||
            deadlineAt === null ||
            startCandidateAt >= deadlineAt
        ) {
            window.alert(
                t("elScoreCalculator.strategyWindow.invalidRange", {
                    defaultValue:
                        "종료 시간은 시작 시간보다 뒤여야 합니다."
                })
            );
            return;
        }

        setSearchParams(
            (currentParams) => {
                const nextParams =
                    new URLSearchParams(currentParams);

                nextParams.set("startDate", startDate);
                nextParams.set("startTime", startTime);
                nextParams.set(
                    "fixedAt",
                    String(startCandidateAt)
                );
                nextParams.set(
                    "viewAt",
                    String(startCandidateAt)
                );

                return nextParams;
            },
            { replace: true }
        );
    }, [
        deadlineAt,
        setSearchParams,
        startCandidateAt,
        startDate,
        startTime,
        t
    ]);

    const unlockStartTime = useCallback(() => {
        setSearchParams(
            (currentParams) => {
                const nextParams =
                    new URLSearchParams(currentParams);

                nextParams.delete("fixedAt");
                nextParams.delete("viewAt");

                return nextParams;
            },
            { replace: true }
        );
    }, [setSearchParams]);

    const updateSelectedTime = useCallback(
        (timestamp) => {
            if (!hasValidWindow) {
                return;
            }

            const normalizedTimestamp = Number(timestamp);

            if (!Number.isFinite(normalizedTimestamp)) {
                return;
            }

            setViewAt(
                clampTimestamp(
                    normalizedTimestamp,
                    fixedAt,
                    deadlineAt
                )
            );
        },
        [deadlineAt, fixedAt, hasValidWindow, setViewAt]
    );

    const moveSelectedTime = useCallback(
        (minutes) => {
            updateSelectedTime(
                (selectedTimestamp ?? fixedAt ?? 0) +
                    minutes * 60000
            );
        },
        [fixedAt, selectedTimestamp, updateSelectedTime]
    );

    const dateTimeFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short"
            }),
        [locale]
    );

    const fixedAtText = useMemo(
        () =>
            fixedAt !== null
                ? dateTimeFormatter.format(
                    new Date(fixedAt)
                )
                : "",
        [dateTimeFormatter, fixedAt]
    );

    const selectedTimeText = useMemo(
        () =>
            selectedTimestamp !== null
                ? dateTimeFormatter.format(
                    new Date(selectedTimestamp)
                )
                : "",
        [dateTimeFormatter, selectedTimestamp]
    );

    const elapsedMinutes = useMemo(() => {
        if (
            fixedAt === null ||
            selectedTimestamp === null
        ) {
            return 0;
        }

        return Math.max(
            0,
            Math.floor(
                (selectedTimestamp - fixedAt) / 60000
            )
        );
    }, [fixedAt, selectedTimestamp]);


    const scoreByServerNo = useMemo(() => {
        const result = {};

        buildings.forEach((building) => {
            const serverNo =
                getAssignedServerNo(building);

            if (serverNo === null) {
                return;
            }

            result[serverNo] =
                (result[serverNo] ?? 0) +
                Number(building.point ?? 0);
        });

        return result;
    }, [buildings]);

    const sortedServers = useMemo(
        () =>
            servers
                .map((server) => {
                    const scorePerMinute =
                        scoreByServerNo[server.no] ?? 0;

                    return {
                        ...server,
                        scorePerMinute,
                        scoreTotal:
                            Number(
                                server.currentScore ?? 0
                            ) +
                            scorePerMinute *
                                elapsedMinutes
                    };
                })
                .sort(
                    (left, right) =>
                        right.scoreTotal -
                        left.scoreTotal
                ),
        [elapsedMinutes, scoreByServerNo, servers]
    );

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
                            "elScoreCalculator.strategyWindow.title",
                            {
                                defaultValue:
                                    "전략 시간 범위 설정"
                            }
                        )}
                        description={t(
                            "elScoreCalculator.strategyWindow.description",
                            {
                                defaultValue:
                                    "점수 기준이 되는 시작 시간을 잠그고 종료 시간을 설정하세요."
                            }
                        )}
                    />

                    <div className="el-score-time-config-grid">
                        <div className="el-score-time-config-card">
                            <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                                <div>
                                    <h3 className="h6 mb-1">
                                        {t(
                                            "elScoreCalculator.strategyWindow.startTitle",
                                            {
                                                defaultValue:
                                                    "시작 시간"
                                            }
                                        )}
                                    </h3>
                                    <small className="text-muted">
                                        {fixedAt !== null
                                            ? t(
                                                "elScoreCalculator.strategyWindow.lockedAt",
                                                {
                                                    time: fixedAtText,
                                                    defaultValue:
                                                        "{{time}}에 잠김"
                                                }
                                            )
                                            : t(
                                                "elScoreCalculator.strategyWindow.unlocked",
                                                {
                                                    defaultValue:
                                                        "시간을 설정한 뒤 잠그세요."
                                                }
                                            )}
                                    </small>
                                </div>

                                <button
                                    type="button"
                                    className={`btn btn-sm ${
                                        fixedAt !== null
                                            ? "btn-warning"
                                            : "btn-primary"
                                    }`}
                                    onClick={
                                        fixedAt !== null
                                            ? unlockStartTime
                                            : lockStartTime
                                    }
                                >
                                    {fixedAt !== null ? (
                                        <FaLockOpen className="me-2" />
                                    ) : (
                                        <FaLock className="me-2" />
                                    )}
                                    {fixedAt !== null
                                        ? t(
                                            "elScoreCalculator.strategyWindow.unlock",
                                            {
                                                defaultValue:
                                                    "시작 시간 잠금 해제"
                                            }
                                        )
                                        : t(
                                            "elScoreCalculator.strategyWindow.lock",
                                            {
                                                defaultValue:
                                                    "시작 시간 잠금"
                                            }
                                        )}
                                </button>
                            </div>

                            <div className="el-score-form-grid">
                                <label className="el-score-field">
                                    <span>
                                        {t(
                                            "elScoreCalculator.strategyWindow.startDate",
                                            {
                                                defaultValue:
                                                    "시작 날짜"
                                            }
                                        )}
                                    </span>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={displayedStartDate}
                                        disabled={fixedAt !== null}
                                        onChange={(event) =>
                                            setStartDate(
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label className="el-score-field">
                                    <span>
                                        {t(
                                            "elScoreCalculator.strategyWindow.startTime",
                                            {
                                                defaultValue:
                                                    "시작 시각"
                                            }
                                        )}
                                    </span>
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={displayedStartTime}
                                        disabled={fixedAt !== null}
                                        onChange={(event) =>
                                            setStartTime(
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="el-score-time-config-card">
                            <h3 className="h6 mb-3">
                                {t(
                                    "elScoreCalculator.strategyWindow.endTitle",
                                    {
                                        defaultValue:
                                            "종료 시간"
                                    }
                                )}
                            </h3>

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
                        </div>
                    </div>

                    {fixedAt !== null && !hasValidWindow && (
                        <div className="alert alert-danger mt-3 mb-0">
                            {t(
                                "elScoreCalculator.strategyWindow.invalidRange",
                                {
                                    defaultValue:
                                        "종료 시간은 시작 시간보다 뒤여야 합니다."
                                }
                            )}
                        </div>
                    )}
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
                            "elScoreCalculator.baselineScore.title",
                            {
                                defaultValue:
                                    "시작 시간 기준 점수"
                            }
                        )}
                        description={t(
                            "elScoreCalculator.baselineScore.description",
                            {
                                defaultValue:
                                    "잠근 시작 시간에 각 서버가 보유한 점수를 입력하세요."
                            }
                        )}
                    />

                    {servers.length === 0 ? (
                        <EmptyState
                            icon={<FaFlagCheckered />}
                            text={t(
                                "elScoreCalculator.currentScore.empty"
                            )}
                        />
                    ) : (
                        <>
                            {fixedAt === null && (
                                <div className="alert alert-warning">
                                    {t(
                                        "elScoreCalculator.baselineScore.lockFirst",
                                        {
                                            defaultValue:
                                                "점수를 입력하기 전에 시작 시간을 잠그세요."
                                        }
                                    )}
                                </div>
                            )}

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
                                                disabled={
                                                    fixedAt === null
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
                        </>
                    )}
                </section>

                <div className="el-score-strategy-workspace">
                <section className="el-score-panel el-score-map-panel">
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

                <section className="el-score-panel el-score-analysis-panel">
                    <SectionTitle
                        number={5}
                        icon={<FaRankingStar />}
                        title={t(
                            "elScoreCalculator.timeline.title",
                            {
                                defaultValue:
                                    "시간대별 예상 점수"
                            }
                        )}
                        description={t(
                            "elScoreCalculator.timeline.description",
                            {
                                defaultValue:
                                    "슬라이더를 움직여 원하는 시각의 예상 점수와 순위를 확인하세요."
                            }
                        )}
                    />

                    {!hasValidWindow ? (
                        <div className="el-score-inline-notice">
                            <FaTriangleExclamation aria-hidden="true" />
                            {t(
                                "elScoreCalculator.timeline.notReady",
                                {
                                    defaultValue:
                                        "시작 시간을 잠그고 올바른 종료 시간을 설정하세요."
                                }
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="el-score-time-explorer">
                                <div className="el-score-time-explorer-header">
                                    <div>
                                        <span className="text-muted">
                                            {t(
                                                "elScoreCalculator.timeline.selectedTime",
                                                {
                                                    defaultValue:
                                                        "선택 시각"
                                                }
                                            )}
                                        </span>
                                        <strong>
                                            {selectedTimeText}
                                        </strong>
                                    </div>
                                    <div className="text-end">
                                        <span className="text-muted">
                                            {t(
                                                "elScoreCalculator.timeline.elapsed",
                                                {
                                                    defaultValue:
                                                        "시작 후 경과"
                                                }
                                            )}
                                        </span>
                                        <strong>
                                            {t(
                                                "elScoreCalculator.timeline.elapsedMinutes",
                                                {
                                                    count:
                                                        elapsedMinutes,
                                                    defaultValue:
                                                        "{{count}}분"
                                                }
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                <input
                                    type="range"
                                    className="form-range el-score-time-slider"
                                    min={fixedAt}
                                    max={deadlineAt}
                                    step={60000}
                                    value={selectedTimestamp}
                                    onChange={(event) =>
                                        updateSelectedTime(
                                            event.target.valueAsNumber
                                        )
                                    }
                                    aria-label={t(
                                        "elScoreCalculator.timeline.sliderAria",
                                        {
                                            defaultValue:
                                                "예상 점수를 확인할 시각"
                                        }
                                    )}
                                />

                                <div className="el-score-time-range-labels">
                                    <span>{fixedAtText}</span>
                                    <span>
                                        {dateTimeFormatter.format(
                                            deadline
                                        )}
                                    </span>
                                </div>

                                <div className="el-score-time-controls">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() =>
                                            updateSelectedTime(
                                                fixedAt
                                            )
                                        }
                                    >
                                        {t(
                                            "elScoreCalculator.timeline.goStart",
                                            {
                                                defaultValue:
                                                    "시작"
                                            }
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() =>
                                            moveSelectedTime(-60)
                                        }
                                    >
                                        -1h
                                    </button>
                                    <label className="el-score-time-direct-input">
                                        <span>
                                            {t(
                                                "elScoreCalculator.timeline.directTime",
                                                {
                                                    defaultValue:
                                                        "직접 선택"
                                                }
                                            )}
                                        </span>
                                        <input
                                            type="datetime-local"
                                            className="form-control form-control-sm"
                                            min={toDateTimeLocalValue(
                                                fixedAt
                                            )}
                                            max={toDateTimeLocalValue(
                                                deadlineAt
                                            )}
                                            value={toDateTimeLocalValue(
                                                selectedTimestamp
                                            )}
                                            onChange={(event) =>
                                                updateSelectedTime(
                                                    new Date(
                                                        event.target.value
                                                    ).getTime()
                                                )
                                            }
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() =>
                                            moveSelectedTime(60)
                                        }
                                    >
                                        +1h
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() =>
                                            updateSelectedTime(
                                                deadlineAt
                                            )
                                        }
                                    >
                                        {t(
                                            "elScoreCalculator.timeline.goEnd",
                                            {
                                                defaultValue:
                                                    "종료"
                                            }
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="table-responsive mt-3">
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
                                                    "elScoreCalculator.timeline.startScore",
                                                    {
                                                        defaultValue:
                                                            "시작 점수"
                                                    }
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
                                                    "elScoreCalculator.timeline.expectedScore",
                                                    {
                                                        defaultValue:
                                                            "예상 점수"
                                                    }
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
                        </>
                    )}
                </section>
                </div>

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