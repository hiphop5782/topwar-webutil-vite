import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

import BannerImage from "@src/assets/images/topwar-helper-banner.jpg";
import { loadHomeStatistics } from "@src/services/topwarDataRepository";

import "./Home.css";
import SEO from "../template/SEO";

const EMPTY_STATISTICS = Object.freeze({
    generatedAt: null,
    snapshotAt: null,
    server: {},
    player: {},
    power: {},
    changes: {},
    realPower: {},
});

function Home() {

    const { t, i18n } = useTranslation("viewer");
    const [statistics, setStatistics] = useState(EMPTY_STATISTICS);
    const [statisticsState, setStatisticsState] = useState("loading");

    useEffect(() => {
        let mounted = true;

        loadHomeStatistics()
            .then((data) => {
                if (mounted && data && typeof data === "object") {
                    setStatistics(data);
                    setStatisticsState("success");
                }
            })
            .catch((error) => {
                console.error("Failed to load home statistics", error);
                if (mounted) {
                    setStatistics(EMPTY_STATISTICS);
                    setStatisticsState("error");
                }
            });

        return () => {
            mounted = false;
        };
    }, []);

    const {
        generatedAt,
        snapshotAt,
        server = {},
        player = {},
        power = {},
        changes = {},
        realPower = {},
    } = statistics;


    const activity =
        player.activity ?? {};


    const localeMap = {
        ko: "ko-KR",
        ja: "ja-JP",
        en: "en-US",
    };


    const locale =
        localeMap[i18n.resolvedLanguage]
        ?? "en-US";


    const numberFormatter =
        new Intl.NumberFormat(locale);


    const formatNumber = value => {

        if (statisticsState === "loading") {
            return "…";
        }

        if (
            value === null ||
            value === undefined
        ) {
            return "-";
        }

        return numberFormatter.format(
            Math.round(value)
        );
    };


    const formatRate = value => {

        if (statisticsState === "loading") {
            return "…";
        }

        if (
            value === null ||
            value === undefined
        ) {
            return "-";
        }

        return `${Number(value).toFixed(1)}%`;
    };


    const formatPower = value => {

        if (statisticsState === "loading") {
            return "…";
        }

        if (
            value === null ||
            value === undefined
        ) {
            return "-";
        }

        if (value >= 1_000_000_000) {
            return `${(value / 1_000_000_000).toFixed(1)}B`;
        }

        if (value >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(1)}M`;
        }

        if (value >= 1_000) {
            return `${(value / 1_000).toFixed(1)}K`;
        }

        return formatNumber(value);
    };


    const formatDateTime = value => {

        if (statisticsState === "loading") {
            return "…";
        }

        if (!value) {
            return "-";
        }

        return new Intl.DateTimeFormat(
            locale,
            {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            }
        ).format(
            new Date(value)
        );
    };


    const serverGrades = [
        {
            key: "VERY_ACTIVE",
            label: t("home.serverActivity.veryActive"),
            className: "very-active",
        },
        {
            key: "ACTIVE",
            label: t("home.serverActivity.active"),
            className: "active",
        },
        {
            key: "NORMAL",
            label: t("home.serverActivity.normal"),
            className: "normal",
        },
        {
            key: "QUIET",
            label: t("home.serverActivity.quiet"),
            className: "quiet",
        },
        {
            key: "DEAD",
            label: t("home.serverActivity.dead"),
            className: "dead",
        },
    ];

    return (<>
        <SEO title={t("seo:home.title")}/>

        <main
            className={`home-dashboard ${
                statisticsState === "loading" ? "is-loading" : ""
            }`}
            aria-busy={statisticsState === "loading"}
        >

            {/* ========================================
                HERO
            ======================================== */}

            <section
                className="home-hero"
                style={{
                    backgroundImage: `
                        linear-gradient(
                            90deg,
                            rgba(8, 12, 22, 0.94),
                            rgba(8, 12, 22, 0.72),
                            rgba(8, 12, 22, 0.35)
                        ),
                        url(${BannerImage})
                    `,
                }}
            >

                <div className="home-hero-content">

                    <div className="home-hero-label">
                        {t("home.hero.eyebrow")}
                    </div>

                    <h1>
                        {t("home.hero.title")}
                    </h1>

                    <p>
                        {t("home.hero.description")}
                    </p>


                    <div className="home-hero-summary">

                        <HeroMetric
                            value={formatNumber(server.count)}
                            label={t("home.kpi.server.title")}
                        />

                        <HeroMetric
                            value={formatNumber(player.tracked)}
                            label={t("home.kpi.player.title")}
                        />

                        <HeroMetric
                            value={formatRate(
                                activity.within1dRate
                            )}
                            label={t("home.kpi.active24h.title")}
                        />

                        <HeroMetric
                            value={formatNumber(player.online)}
                            label={t("home.kpi.online.title")}
                        />

                    </div>


                    <div className="home-updated">

                        {t("home.hero.dataAsOf")}
                        {" "}
                        {formatDateTime(snapshotAt)}

                    </div>

                </div>

            </section>



            {/* ========================================
                KPI
            ======================================== */}

            <section className="dashboard-section">

                <div className="dashboard-kpi-grid">

                    <KpiCard
                        title={t("home.kpi.server.title")}
                        value={formatNumber(server.count)}
                        description={
                            t(
                                "kpi.server.change7d",
                                {
                                    count:
                                        formatSignedNumber(
                                            server.change7d
                                        ),
                                }
                            )
                        }
                    />


                    <KpiCard
                        title={t("home.kpi.player.title")}
                        value={formatNumber(player.tracked)}
                        description={
                            t("home.kpi.player.description")
                        }
                    />


                    <KpiCard
                        title={t("home.kpi.active24h.title")}
                        value={
                            formatNumber(
                                activity.within1d
                            )
                        }
                        description={
                            formatRate(
                                activity.within1dRate
                            )
                        }
                        accent="success"
                    />


                    <KpiCard
                        title={t("home.kpi.online.title")}
                        value={formatNumber(player.online)}
                        description={
                            formatRate(
                                player.onlineRate
                            )
                        }
                        accent="primary"
                    />

                </div>

            </section>



            {/* ========================================
                PLAYER ACTIVITY / SERVER ACTIVITY
            ======================================== */}

            <section className="dashboard-section">

                <div className="row g-4">

                    <div className="col-lg-7">

                        <DashboardPanel
                            title={t("home.activity.title")}
                            description={
                                t("home.activity.description")
                            }
                        >

                            <ActivityProgress
                                label={t("home.activity.within1d")}
                                value={activity.within1d}
                                rate={activity.within1dRate}
                                formatNumber={formatNumber}
                                formatRate={formatRate}
                            />

                            <ActivityProgress
                                label={t("home.activity.within3d")}
                                value={activity.within3d}
                                rate={activity.within3dRate}
                                formatNumber={formatNumber}
                                formatRate={formatRate}
                            />

                            <ActivityProgress
                                label={t("home.activity.within7d")}
                                value={activity.within7d}
                                rate={activity.within7dRate}
                                formatNumber={formatNumber}
                                formatRate={formatRate}
                            />

                            <ActivityProgress
                                label={t("home.activity.within14d")}
                                value={activity.within14d}
                                rate={activity.within14dRate}
                                formatNumber={formatNumber}
                                formatRate={formatRate}
                            />

                            <ActivityProgress
                                label={t("home.activity.within30d")}
                                value={activity.within30d}
                                rate={activity.within30dRate}
                                formatNumber={formatNumber}
                                formatRate={formatRate}
                            />

                        </DashboardPanel>

                    </div>


                    <div className="col-lg-5">

                        <DashboardPanel
                            title={t(
                                "home.serverActivity.title"
                            )}
                            description={
                                t(
                                    "home.serverActivity.description",
                                    {
                                        count:
                                            formatNumber(
                                                realPower
                                                    .analyzedServers
                                            ),
                                    }
                                )
                            }
                        >

                            <div className="server-grade-list">

                                {serverGrades.map(item => {

                                    const count =
                                        realPower
                                            .activityGrades
                                            ?.[item.key]
                                        ?? 0;


                                    const rate =
                                        realPower
                                            .analyzedServers
                                        ? (
                                            count /
                                            realPower
                                                .analyzedServers
                                            * 100
                                        )
                                        : 0;


                                    return (
                                        <ServerGrade
                                            key={item.key}
                                            label={item.label}
                                            count={count}
                                            rate={rate}
                                            className={
                                                item.className
                                            }
                                            formatNumber={
                                                formatNumber
                                            }
                                        />
                                    );

                                })}

                            </div>

                        </DashboardPanel>

                    </div>

                </div>

            </section>



            {/* ========================================
                POWER / PLAYER DATA
            ======================================== */}

            <section className="dashboard-section">

                <div className="row g-4">

                    <div className="col-lg-8">

                        <DashboardPanel
                            title={t("home.power.title")}
                            description={
                                t("home.power.description")
                            }
                        >

                            <div className="power-grid">

                                <PowerCard
                                    label={t("home.power.average")}
                                    value={
                                        formatPower(
                                            power.average
                                        )
                                    }
                                />

                                <PowerCard
                                    label={t("home.power.median")}
                                    value={
                                        formatPower(
                                            power.median
                                        )
                                    }
                                />

                                <PowerCard
                                    label={t("home.power.top10")}
                                    value={
                                        formatPower(
                                            power
                                                .top10Threshold
                                        )
                                    }
                                />

                                <PowerCard
                                    label={t("home.power.top5")}
                                    value={
                                        formatPower(
                                            power
                                                .top5Threshold
                                        )
                                    }
                                />

                                <PowerCard
                                    label={t("home.power.top1")}
                                    value={
                                        formatPower(
                                            power
                                                .top1Threshold
                                        )
                                    }
                                    highlight
                                />

                                <PowerCard
                                    label={t("home.power.max")}
                                    value={
                                        formatPower(
                                            power.max
                                        )
                                    }
                                    highlight
                                />

                            </div>

                        </DashboardPanel>

                    </div>


                    <div className="col-lg-4">

                        <DashboardPanel
                            title={
                                t(
                                    "home.playerComposition.title"
                                )
                            }
                        >

                            <MetricRow
                                label={
                                    t(
                                        "home.playerComposition.level100"
                                    )
                                }
                                value={
                                    formatNumber(
                                        player.level100
                                    )
                                }
                                detail={
                                    formatRate(
                                        player.level100Rate
                                    )
                                }
                            />

                            <MetricRow
                                label={
                                    t(
                                        "home.playerComposition.allianceJoined"
                                    )
                                }
                                value={
                                    formatNumber(
                                        player.allianceJoined
                                    )
                                }
                                detail={
                                    formatRate(
                                        player
                                            .allianceJoinedRate
                                    )
                                }
                            />

                            <MetricRow
                                label={
                                    t(
                                        "home.playerComposition.uniqueUid"
                                    )
                                }
                                value={
                                    formatNumber(
                                        player.unique
                                    )
                                }
                            />

                            <MetricRow
                                label={
                                    t(
                                        "home.playerComposition.duplicate"
                                    )
                                }
                                value={
                                    formatNumber(
                                        Math.max(
                                            0,
                                            (player.tracked ?? 0) -
                                            (player.unique ?? 0)
                                        )
                                    )
                                }
                            />

                        </DashboardPanel>

                    </div>

                </div>

            </section>



            {/* ========================================
                DETECTED CHANGES / SERVER TREND
            ======================================== */}

            <section className="dashboard-section">

                <div className="row g-4">

                    <div className="col-lg-5">

                        <DashboardPanel
                            title={t("home.changes.title")}
                            description={
                                t("home.changes.description")
                            }
                        >

                            <ChangeItem
                                title={
                                    t("home.changes.movement")
                                }
                                value={
                                    changes
                                        .movement
                                        ?.count
                                    ?? 0
                                }
                                date={
                                    changes
                                        .movement
                                        ?.date
                                }
                                formatNumber={
                                    formatNumber
                                }
                            />

                            <ChangeItem
                                title={
                                    t("home.changes.nickname")
                                }
                                value={
                                    changes
                                        .nickname
                                        ?.count
                                    ?? 0
                                }
                                date={
                                    changes
                                        .nickname
                                        ?.date
                                }
                                formatNumber={
                                    formatNumber
                                }
                            />

                        </DashboardPanel>

                    </div>


                    <div className="col-lg-7">

                        <DashboardPanel
                            title={
                                t("home.serverTrend.title")
                            }
                            description={
                                t(
                                    "home.serverTrend.description"
                                )
                            }
                        >

                            <div className="server-change-grid">

                                <ServerChange
                                    label={
                                        t(
                                            "home.serverTrend.previousDay"
                                        )
                                    }
                                    value={
                                        server.change1d
                                    }
                                />

                                <ServerChange
                                    label={
                                        t(
                                            "home.serverTrend.sevenDays"
                                        )
                                    }
                                    value={
                                        server.change7d
                                    }
                                />

                                <ServerChange
                                    label={
                                        t(
                                            "home.serverTrend.thirtyDays"
                                        )
                                    }
                                    value={
                                        server.change30d
                                    }
                                />

                            </div>

                        </DashboardPanel>

                    </div>

                </div>

            </section>



            {/* ========================================
                NOTICE
            ======================================== */}

            <footer className="dashboard-footer">

                <div>
                    {t("home.notice")}
                </div>

                <div>
                    {t("home.hero.generatedAt")}
                    {" "}
                    {formatDateTime(generatedAt)}
                </div>

            </footer>

        </main>
    </>);
}



function HeroMetric({
    value,
    label,
}) {

    return (
        <span>

            <strong>
                {value}
            </strong>

            {label}

        </span>
    );
}



function KpiCard({
    title,
    value,
    description,
    accent = "",
}) {

    return (
        <div
            className={
                `dashboard-kpi ${accent}`
            }
        >

            <div className="kpi-title">
                {title}
            </div>

            <div className="kpi-value">
                {value}
            </div>

            <div className="kpi-description">
                {description}
            </div>

        </div>
    );
}



function DashboardPanel({
    title,
    description,
    children,
}) {

    return (
        <div className="dashboard-panel">

            <div className="dashboard-panel-header">

                <h2>
                    {title}
                </h2>

                {description && (
                    <p>
                        {description}
                    </p>
                )}

            </div>

            {children}

        </div>
    );
}



function ActivityProgress({
    label,
    value,
    rate,
    formatNumber,
    formatRate,
}) {

    const safeRate =
        Math.min(
            100,
            Math.max(
                0,
                Number(rate ?? 0)
            )
        );


    return (
        <div className="activity-progress">

            <div className="activity-progress-header">

                <strong>
                    {label}
                </strong>

                <span>

                    {formatNumber(value)}

                    <b>
                        {formatRate(rate)}
                    </b>

                </span>

            </div>


            <div className="activity-progress-track">

                <div
                    className="activity-progress-bar"
                    style={{
                        width: `${safeRate}%`,
                    }}
                />

            </div>

        </div>
    );
}



function ServerGrade({
    label,
    count,
    rate,
    className,
    formatNumber,
}) {

    return (
        <div className="server-grade">

            <div className="server-grade-header">

                <span>

                    <i
                        className={
                            `grade-dot ${className}`
                        }
                    />

                    {label}

                </span>

                <strong>
                    {formatNumber(count)}
                </strong>

            </div>


            <div className="grade-progress">

                <div
                    className={
                        `grade-progress-bar ${className}`
                    }
                    style={{
                        width: `${rate}%`,
                    }}
                />

            </div>

        </div>
    );
}



function PowerCard({
    label,
    value,
    highlight = false,
}) {

    return (
        <div
            className={
                `power-card ${
                    highlight
                        ? "highlight"
                        : ""
                }`
            }
        >

            <div>
                {label}
            </div>

            <strong>
                {value}
            </strong>

        </div>
    );
}



function MetricRow({
    label,
    value,
    detail,
}) {

    return (
        <div className="metric-row">

            <span>
                {label}
            </span>

            <div>

                <strong>
                    {value}
                </strong>

                {detail && (
                    <small>
                        {detail}
                    </small>
                )}

            </div>

        </div>
    );
}



function ChangeItem({
    title,
    value,
    date,
    formatNumber,
}) {

    return (
        <div className="change-item">

            <div>

                <strong>
                    {title}
                </strong>

                {date && (
                    <small>
                        {date}
                    </small>
                )}

            </div>

            <div className="change-value">

                {formatNumber(value)}

            </div>

        </div>
    );
}



function ServerChange({
    label,
    value,
}) {

    const className =
        value > 0
            ? "positive"
            : value < 0
                ? "negative"
                : "";


    return (
        <div className="server-change">

            <span>
                {label}
            </span>

            <strong className={className}>
                {formatSignedNumber(value)}
            </strong>

        </div>
    );
}



function formatSignedNumber(value) {

    if (value === null || value === undefined) {
        return "-";
    }

    const number =
        Number(value);

    if (number > 0) {
        return `+${number}`;
    }

    return String(number);
}


export default Home;
