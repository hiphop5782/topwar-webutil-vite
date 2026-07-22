import BuildingList from "@src/assets/json/el/buildings.json";
import ColorList from "@src/assets/json/colors.json";
import useLocalStorage from "@src/hooks/useLocalStorage";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import {
    FaBuildingFlag,
    FaCalculator,
    FaClock,
    FaEraser,
    FaFlagCheckered,
    FaMapLocationDot,
    FaPlus,
    FaRankingStar,
    FaServer,
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

    const [selectedServerNo, setSelectedServerNo] =
        useState(null);
    const [serverInput, setServerInput] = useState("");
    const [serverInputError, setServerInputError] =
        useState("");

    const [servers, setServers] = useLocalStorage(
        "el-score-servers",
        []
    );

    const [buildings, setBuildings] = useLocalStorage(
        "el-score-buildings",
        normalizeBuildings(BuildingList)
    );

    const [endDate, setEndDate] = useLocalStorage(
        "el-score-endDate",
        getDateAfter(7)
    );

    const [endTime, setEndTime] = useLocalStorage(
        "el-score-endTime",
        "23:00"
    );

    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        setBuildings((current) => {
            const normalized = normalizeBuildings(current);

            const changed = normalized.some(
                (building, index) =>
                    building.serverNo !==
                        current[index]?.serverNo ||
                    current[index]?.server !== undefined ||
                    current[index]?.id === undefined ||
                    current[index]?.i18nKey === undefined
            );

            return changed ? normalized : current;
        });
    }, [setBuildings]);

    useEffect(() => {
        const handle = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(handle);
        };
    }, []);

    const selectedServer = useMemo(
        () =>
            servers.find(
                (server) => server.no === selectedServerNo
            ) ?? null,
        [selectedServerNo, servers]
    );

    useEffect(() => {
        if (
            selectedServerNo !== null &&
            selectedServer === null
        ) {
            setSelectedServerNo(null);
        }
    }, [selectedServer, selectedServerNo]);

    const deadline = useMemo(
        () => getDeadline(endDate, endTime),
        [endDate, endTime]
    );

    const remainingMilliseconds = useMemo(
        () =>
            deadline
                ? Math.max(0, deadline.getTime() - now)
                : 0,
        [deadline, now]
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
        setBuildings((current) =>
            current.map((building) => ({
                ...building,
                serverNo: null,
                server: undefined
            }))
        );
        setSelectedServerNo(null);
    }, [setBuildings, setServers, t]);

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

            setBuildings((current) =>
                current.map((building) =>
                    getAssignedServerNo(building) ===
                    target.no
                        ? {
                            ...building,
                            serverNo: null,
                            server: undefined
                        }
                        : building
                )
            );

            if (selectedServerNo === target.no) {
                setSelectedServerNo(null);
            }
        },
        [
            selectedServerNo,
            setBuildings,
            setServers,
            t
        ]
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