import DarkforceImage from "@src/assets/images/el/darkforce.jpg";
import useLocalStorage from "@src/hooks/useLocalStorage";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import {
    FaArrowTrendUp,
    FaClock,
    FaCrosshairs,
    FaMapLocationDot,
    FaPalette,
    FaRotateLeft,
    FaTriangleExclamation
} from "react-icons/fa6";
import { useCallback, useMemo } from "react";

import "./EternalLandDarkforce.css";
import { useCanonicalUrl } from "@src/hooks/useCanonicalUrl";

const SCORE_BY_AREA = {
    "Zone-1": 100,
    "Zone-2": 110,
    "Zone-3": 120,
    "Zone-4": 140,
    "SRA-1": 120,
    "SRA-2": 130,
    "SRA-3": 140
};

const AREA_VALUES = [
    "Zone-1",
    "Zone-2",
    "Zone-3",
    "Zone-4",
    "SRA-1",
    "SRA-2",
    "SRA-3"
];

const TROOP_VALUES = [1, 2, 3, 4, 5, 6, 7];

const TECH_VALUES = [0, 4, 8, 12, 16, 20];

function getDateAfter(diff) {
    const result = new Date();
    result.setDate(result.getDate() + diff);

    const year = result.getFullYear();
    const month = String(result.getMonth() + 1).padStart(2, "0");
    const day = String(result.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

const DEFAULT_DATA = {
    troop: 3,
    area: "Zone-4",
    tech: 20,
    count: 5,
    delay: 40,
    currentScore: 0,
    highlightColor: "#ffd43b",
    highlightOpacity: 0.75,
    endDate: getDateAfter(15)
};

function toSafeNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const parsed = Number(String(value).replace(/[^0-9.]/g, ""));

    if (!Number.isFinite(parsed)) {
        return min;
    }

    return Math.min(max, Math.max(min, parsed));
}

export default function EternalLandDarkforce() {
    const { t, i18n } = useTranslation("viewer");

    const [data, setData] = useLocalStorage(
        "el-darkforce",
        DEFAULT_DATA
    );

    const locale =
        i18n.resolvedLanguage ??
        i18n.language ??
        "ko";

    const languageCode = locale.split("-")[0];

    const formatter = useMemo(
        () =>
            new Intl.NumberFormat(locale, {
                maximumFractionDigits: 2
            }),
        [locale]
    );

    const areaScore =
        SCORE_BY_AREA[data.area] ??
        SCORE_BY_AREA["Zone-4"];

    const highlightColor =
        /^#[0-9a-f]{6}$/i.test(data.highlightColor ?? "")
            ? data.highlightColor
            : "#ffd43b";

    const highlightOpacity = Number.isFinite(
        Number(data.highlightOpacity)
    )
        ? Number(data.highlightOpacity)
        : 0.75;

    const turnDuration = useMemo(
        () =>
            data.count === 1
                ? Math.max(data.delay, 1)
                : 240 + Math.max(data.delay, 0),
        [data.count, data.delay]
    );

    const scorePerTurn = useMemo(
        () =>
            areaScore *
            ((100 + data.tech) / 100),
        [areaScore, data.tech]
    );

    const attacksPerHour = useMemo(
        () => (3600 / turnDuration) * data.troop,
        [data.troop, turnDuration]
    );

    const scorePerHour = useMemo(
        () => attacksPerHour * scorePerTurn,
        [attacksPerHour, scorePerTurn]
    );

    const scorePerDay = useMemo(
        () => scorePerHour * 24,
        [scorePerHour]
    );

    const projection = useMemo(() => {
        if (!data.endDate) {
            return {
                remainingHours: 0,
                targetScore: data.currentScore,
                expired: true
            };
        }

        const deadline = new Date(
            `${data.endDate}T23:00:00`
        );
        const remainingMilliseconds =
            deadline.getTime() - Date.now();

        if (
            !Number.isFinite(deadline.getTime()) ||
            remainingMilliseconds <= 0
        ) {
            return {
                remainingHours: 0,
                targetScore: data.currentScore,
                expired: true
            };
        }

        const remainingHours =
            remainingMilliseconds / 1000 / 60 / 60;

        return {
            remainingHours,
            targetScore:
                data.currentScore +
                remainingHours * scorePerHour,
            expired: false
        };
    }, [
        data.currentScore,
        data.endDate,
        scorePerHour
    ]);

    const canonicalUrl = useCanonicalUrl();

    const changeStringValue = useCallback((event) => {
        const { name, value } = event.target;

        setData((previous) => ({
            ...previous,
            [name]: value
        }));
    }, [setData]);

    const changeNumberValue = useCallback((event) => {
        const { name, value, min, max } = event.target;

        setData((previous) => ({
            ...previous,
            [name]: toSafeNumber(
                value,
                min === "" ? 0 : Number(min),
                max === ""
                    ? Number.MAX_SAFE_INTEGER
                    : Number(max)
            )
        }));
    }, [setData]);

    const changeOpacity = useCallback((event) => {
        setData((previous) => ({
            ...previous,
            highlightOpacity: Number(event.target.value)
        }));
    }, [setData]);

    const resetSettings = useCallback(() => {
        setData(DEFAULT_DATA);
    }, [setData]);

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: t("eternalLandDarkforce.meta.applicationName"),
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        description: t(
            "eternalLandDarkforce.meta.description"
        ),
        inLanguage: languageCode,
        url: canonicalUrl
    };

    return (
        <>
            <Helmet>
                <title>
                    {t("eternalLandDarkforce.meta.title")}
                </title>
                <meta
                    name="description"
                    content={t(
                        "eternalLandDarkforce.meta.description"
                    )}
                />
                <link rel="canonical" href={canonicalUrl} />
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>

            <article className="darkforce-page">
                <header className="darkforce-hero">
                    <div className="darkforce-eyebrow">
                        <FaCrosshairs aria-hidden="true" />
                        {t("eternalLandDarkforce.hero.eyebrow")}
                    </div>

                    <h1>
                        {t("eternalLandDarkforce.hero.title")}
                    </h1>

                    <p>
                        {t(
                            "eternalLandDarkforce.hero.description"
                        )}
                    </p>
                </header>

                <section className="darkforce-notice">
                    <FaTriangleExclamation aria-hidden="true" />
                    <div>
                        <strong>
                            {t(
                                "eternalLandDarkforce.notice.title"
                            )}
                        </strong>
                        <p>
                            {t(
                                "eternalLandDarkforce.notice.description"
                            )}
                        </p>
                    </div>
                </section>

                <section className="darkforce-calculator-layout">
                    <div className="darkforce-map-card">
                        <div className="darkforce-card-heading">
                            <div>
                                <span className="darkforce-section-kicker">
                                    {t(
                                        "eternalLandDarkforce.map.kicker"
                                    )}
                                </span>
                                <h2>
                                    {t(
                                        "eternalLandDarkforce.map.title"
                                    )}
                                </h2>
                            </div>

                            <span className="darkforce-area-badge">
                                {t(
                                    `eternalLandDarkforce.areas.${data.area}.label`
                                )}
                                <small>
                                    {t(
                                        "eternalLandDarkforce.map.baseScore",
                                        {
                                            score: formatter.format(
                                                areaScore
                                            )
                                        }
                                    )}
                                </small>
                            </span>
                        </div>

                        <div
                            className="overlay-container"
                            style={{
                                "--overlay-color":
                                    highlightColor
                            }}
                        >
                            <img
                                src={DarkforceImage}
                                alt={t(
                                    "eternalLandDarkforce.map.imageAlt"
                                )}
                            />

                            <svg
                                className="overlay"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                                aria-hidden="true"
                                focusable="false"
                            >
                                {/* 1구역 */}
                        {data.area === "Zone-1" && (<>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="11.88,14.60 12.39,15.33 11.62,17.45 14.36,19.50 16.24,19.00 16.32,21.21 16.92,23.41 19.15,22.84 20.34,23.65 19.91,24.96 22.31,26.18 23.42,23.98 23.93,22.02 27.61,20.39 32.48,21.21 32.65,22.76 34.62,20.96 35.04,22.76 36.41,23.16 38.46,21.53 41.28,21.37 46.84,19.66 49.23,21.04 49.66,17.94 47.69,16.07 47.95,15.17 47.01,14.44 46.41,13.13 47.78,12.15 37.61,13.87 34.70,11.91 27.18,14.60 21.20,12.81 19.32,13.21 18.63,12.48 13.50,13.13 12.56,13.70"/>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="48.63,12.40 49.15,13.95 49.83,14.03 49.40,14.68 50.85,16.15 50.34,16.48 51.28,17.46 51.11,19.00 50.51,20.31 51.11,21.53 52.99,21.21 54.10,22.76 61.28,22.19 64.02,22.92 65.56,22.51 68.38,23.16 70.43,22.76 73.85,23.16 77.18,22.19 77.52,21.37 77.95,22.10 79.32,21.13 79.15,20.47 80.34,20.80 82.14,20.55 83.50,19.09 82.74,17.54 83.76,16.97 84.62,15.17 84.27,14.60 84.79,13.95 84.27,13.13 79.83,13.46 79.66,12.40 78.89,12.07 78.03,12.81 73.16,11.66 68.38,12.32 66.07,11.42 66.50,10.69 65.73,10.60 64.87,11.34 63.93,10.93 63.33,11.34 62.14,10.60 61.62,11.42 54.70,11.50 53.42,11.83 52.39,12.40 51.28,11.91"/>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="89.06,16.64 88.38,17.05 87.69,18.60 85.56,18.92 83.68,19.90 82.39,22.19 77.78,23.25 75.64,24.47 75.47,26.51 76.75,29.12 77.09,32.22 78.21,33.28 78.80,34.91 79.40,36.05 80.34,40.05 79.74,41.19 80.77,42.09 81.79,44.86 83.42,44.94 84.02,46.33 86.75,42.82 88.72,41.84 88.89,40.86 90.17,41.35 90.17,39.64 89.74,39.07 90.34,37.68 89.91,34.91 90.51,34.01 90.17,32.30 89.66,29.85 90.51,29.69 91.20,27.73 91.11,26.84 90.17,24.88 89.91,22.02 89.15,21.37 89.83,20.15 90.00,17.78"/>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="90.26,42.66 88.80,43.07 88.03,43.88 87.26,44.05 87.26,44.86 86.41,45.19 84.62,47.72 82.91,47.31 82.48,46.49 80.60,46.82 80.60,48.04 79.49,49.59 78.38,52.85 78.72,53.92 79.83,55.63 80.60,58.32 80.34,60.11 80.85,60.85 80.68,62.23 79.06,63.70 80.77,65.33 80.05,66.86 85.73,72.76 87.61,72.84 87.78,73.90 85.90,74.63 85.04,76.10 84.87,79.77 85.73,80.42 85.98,83.03 89.91,83.52 91.88,80.34 92.48,69.33 91.79,68.52 90.77,68.35 90.60,65.50 92.05,64.44 92.05,61.91 90.85,61.50 90.43,59.05 91.88,57.83 91.97,55.38 90.94,55.06 90.34,53.34 91.37,49.67 90.77,48.29 91.20,48.12 91.03,47.15 90.17,46.74 89.15,46.98 89.15,45.76 89.74,44.54"/>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="84.36,81.32 83.08,79.53 83.59,77.16 83.50,75.77 84.02,74.14 84.02,72.68 82.74,72.51 80.94,70.07 79.32,68.92 77.09,70.07 76.07,72.10 71.45,72.68 69.74,74.47 63.50,75.20 58.97,76.59 55.73,76.43 53.33,75.53 52.99,77.16 48.80,77.73 47.09,78.63 46.15,80.34 47.95,80.59 50.77,82.95 49.91,84.10 48.63,84.75 48.12,85.24 48.03,86.38 47.44,87.28 48.97,87.44 53.68,86.54 56.75,86.62 59.49,88.17 66.67,88.83 74.27,88.34 75.30,85.89 78.46,84.18 81.97,83.36 83.25,83.44 83.76,82.30"/>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="47.52,82.79 46.32,81.57 45.21,81.08 44.19,79.85 44.87,77.08 41.88,75.20 37.78,74.31 34.36,73.49 28.38,72.76 25.64,73.98 24.02,74.23 23.25,74.79 16.41,76.51 13.85,75.77 10.85,78.38 8.55,76.59 6.84,75.86 7.61,77.98 7.52,78.87 8.89,80.34 8.80,82.22 10.34,84.01 12.91,85.15 13.85,85.32 14.27,84.75 17.44,84.42 20.77,85.48 23.85,86.46 26.41,84.83 29.23,85.89 32.56,85.24 33.76,85.48 32.91,86.38 34.70,86.38 34.70,87.11 37.01,87.93 38.80,87.68 42.56,88.58 43.76,88.34 44.62,86.62 46.50,86.38 47.18,84.99 46.92,83.61"/>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="8.80,48.04 8.72,49.43 7.69,50.08 7.18,52.28 7.26,53.51 6.07,54.40 6.41,54.89 5.81,55.38 5.47,57.10 6.07,57.83 4.53,59.38 3.85,61.42 5.73,62.97 6.41,65.01 5.81,66.64 6.41,68.84 6.15,71.86 6.92,73.33 6.67,74.23 8.46,74.47 10.60,76.43 11.88,75.77 14.27,74.71 16.24,75.04 16.24,74.14 17.18,74.79 18.12,74.63 18.63,75.20 19.57,75.37 19.91,73.08 18.21,68.19 18.72,67.37 18.89,65.66 17.78,64.76 18.80,62.81 18.55,61.50 17.95,60.69 18.97,59.71 18.97,58.89 18.63,58.24 19.40,55.71 20.34,54.65 20.60,52.20 18.89,49.51 16.41,48.53 13.50,48.37 10.85,48.45"/>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="17.18,45.43 17.26,46.82 15.56,47.31 14.70,46.17 12.74,46.98 9.66,46.08 8.72,45.11 9.06,44.05 7.52,42.99 8.46,42.25 6.92,39.56 7.26,36.95 5.04,33.36 6.24,32.06 7.69,32.54 8.12,31.08 7.69,30.02 8.12,28.30 8.29,27.00 7.95,26.51 8.55,25.86 7.61,23.82 8.46,22.51 9.57,22.92 10.26,22.02 9.66,20.88 10.09,19.82 9.74,18.92 11.28,18.03 11.79,19.09 14.62,20.80 15.56,20.80 15.73,21.78 14.79,22.84 15.30,23.90 15.98,23.98 17.69,25.37 19.06,25.29 19.91,26.59 22.14,25.29 21.37,27.32 20.34,28.38 21.97,27.65 20.85,28.63 20.43,30.51 20.85,31.97 21.11,33.28 20.94,36.62 19.83,39.15 20.43,40.13 20.00,41.92 21.11,43.47 19.83,44.94 19.91,42.50 19.00,43.56 18.97,45.19"/>
                        </>)}
                        {/* 2구역 */}
                        {data.area === "Zone-2" && (<>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="25.13,25.04 25.64,23.82 28.03,22.02 30.51,21.86 31.97,22.59 32.22,23.16 35.21,24.47 36.15,24.14 37.44,24.88 39.91,22.51 41.20,21.86 43.16,22.27 45.13,20.72 46.67,20.80 48.21,22.02 52.56,22.68 53.42,22.76 54.19,23.82 57.44,23.65 59.23,23.25 61.97,23.33 62.91,24.06 64.87,23.98 66.58,23.57 67.95,24.39 67.09,25.20 65.56,24.80 64.96,25.29 65.73,25.45 68.46,25.53 67.86,26.51 67.18,26.92 65.47,27.41 64.44,29.04 62.65,29.93 61.88,32.71 60.60,34.26 59.32,34.18 58.89,34.83 56.67,35.48 54.10,34.75 51.54,34.83 49.57,33.52 47.01,33.12 43.25,33.61 39.83,33.93 38.12,32.30 36.50,31.73 36.50,30.75 35.38,29.77 34.70,28.06 34.70,27.16 34.19,26.92 33.85,25.29 30.77,24.71 29.32,24.71 27.78,24.47 26.15,24.88" />
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="73.85,25.53 73.33,27.24 71.54,27.98 71.71,28.87 73.16,30.42 73.08,32.06 71.28,32.46 70.68,33.93 69.06,34.58 68.38,35.48 66.41,34.75 64.53,35.15 63.76,36.05 64.79,37.60 64.96,39.07 67.18,39.97 68.89,41.84 68.97,43.39 68.12,44.70 70.60,48.53 70.85,51.39 69.74,53.02 68.21,55.06 68.63,55.87 67.01,57.42 67.26,58.97 69.32,59.79 71.37,60.69 73.25,60.77 74.96,61.99 75.81,62.48 77.26,64.85 77.95,64.36 77.44,63.62 78.72,61.66 79.57,57.91 78.46,57.01 75.81,56.93 77.69,56.28 77.95,55.22 77.01,54.08 76.50,53.02 76.58,52.04 77.44,50.57 78.29,47.63 79.06,47.06 79.66,44.78 79.74,43.15 78.38,41.52 77.86,40.62 77.92,39.80 77.98,39.07 78.56,37.62 76.53,34.99 75.25,32.79 74.62,30.75 74.62,25.86" />
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="79.15,66.48 77.52,66.15 76.24,67.94 73.76,67.94 71.71,70.31 68.38,69.58 65.90,67.46 65.30,64.60 62.48,60.28 61.11,60.03 60.68,61.34 59.49,61.09 57.44,62.72 55.64,63.62 50.77,64.60 48.29,63.54 46.84,64.85 44.27,63.70 42.99,64.19 41.37,63.29 40.51,63.70 38.80,63.95 38.21,62.97 36.75,63.05 35.73,62.32 34.36,61.99 33.33,65.09 33.93,67.70 33.42,69.00 31.11,70.88 32.99,71.78 35.21,71.78 36.58,70.72 39.15,71.04 43.16,69.66 42.22,71.04 41.37,71.37 40.85,71.21 40.09,71.86 40.68,72.35 43.68,72.59 45.56,71.94 48.38,72.02 47.44,72.84 40.58,72.95 40.58,73.41 48.09,76.14 50.44,76.00 50.68,75.04 53.16,75.31 56.75,74.31 60.17,74.23 66.15,74.71 66.62,73.90 66.18,74.47 66.89,74.00 66.56,73.52 70.91,72.19 71.37,71.96 73.08,71.86 75.38,71.37 76.75,69.00" />
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="20.77,67.54 20.77,66.15 20.43,64.03 19.23,63.05 20.26,61.66 20.09,59.38 20.94,58.40 21.28,56.04 22.14,53.34 22.05,51.39 22.82,49.92 21.45,49.43 20.85,46.00 20.17,44.70 21.45,39.72 23.08,34.26 22.48,30.75 22.65,28.06 23.85,26.75 24.19,25.45 24.96,25.04 24.53,27.32 24.79,28.63 24.02,30.91 24.27,31.81 25.47,32.30 26.84,34.01 30.09,33.69 31.62,33.20 35.13,34.18 35.58,34.69 36.76,35.89 33.82,35.81 33.68,36.54 32.48,36.38 29.91,37.19 28.12,40.62 27.95,42.99 28.72,43.31 29.32,48.37 30.85,52.28 30.51,54.65 31.11,54.98 32.82,56.53 31.28,60.36 27.95,62.48 25.90,62.40 23.33,61.91 22.56,62.72 21.88,65.09 23.25,66.97 22.48,68.52 22.05,69.25 23.11,71.49 20.43,69.50" />
                        </>)}
                        {/* 3구역 */}
                        {data.area === "Zone-3" && (<>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="31.03,38.01 31.62,38.83 29.32,39.89 29.32,41.11 30.26,41.19 29.23,42.25 30.09,44.37 29.83,46.17 30.17,46.90 29.91,48.53 30.34,49.18 31.71,50.16 32.05,51.63 31.88,52.77 32.91,53.10 33.50,54.57 33.33,55.46 34.19,57.10 34.53,57.91 35.90,55.71 38.21,56.12 40.85,57.10 41.37,60.52 39.06,62.56 40.94,62.89 41.11,62.52 45.47,63.13 47.61,64.27 49.06,63.46 51.54,63.13 53.68,63.38 57.35,62.89 59.23,60.60 59.06,59.71 57.69,59.71 57.01,56.36 54.10,55.30 53.33,52.85 50.10,53.43 45.50,53.77 43.77,53.33 41.63,47.10 40.16,46.47 40.00,43.25 39.54,40.84 39.08,40.25 36.54,39.51 35.38,37.22 32.25,37.27"/>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="41.28,36.70 42.22,37.44 42.48,38.66 41.88,40.05 41.20,40.05 40.43,40.54 40.43,41.03 41.37,40.54 42.82,40.70 43.50,40.62 45.13,41.52 44.70,42.01 45.81,42.25 47.95,42.50 49.40,42.41 50.34,42.33 50.94,43.15 52.74,43.80 53.68,44.37 55.98,44.86 56.15,47.63 56.67,47.88 57.18,50.33 58.46,50.57 60.26,52.12 60.60,53.02 62.31,53.43 63.76,54.65 63.68,55.95 64.10,57.01 64.02,57.83 63.68,58.40 65.47,57.99 65.56,57.42 66.41,56.69 66.24,55.71 66.75,55.46 66.32,54.98 66.58,54.57 67.86,54.24 68.55,52.53 69.91,50.49 69.40,50.33 69.32,49.84 67.95,49.76 68.03,47.72 68.72,46.49 67.69,45.02 67.52,43.47 67.26,42.66 67.86,41.52 66.67,40.54 66.58,39.40 65.56,39.40 64.36,38.91 64.27,39.48 63.50,39.97 62.65,40.95 60.26,40.95 58.80,39.15 56.92,38.34 56.92,35.56 58.03,35.07 57.09,34.50 55.90,35.24 55.38,34.83 52.99,35.24 50.85,35.15 50.77,34.58 49.06,33.85 46.15,33.52 44.96,34.01 43.25,34.18 42.31,34.83 41.54,35.56" />
                        </>)}
                        {/* 중심 구역 */}
                        {data.area === "Zone-4" && (<>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="45.73,43.47 44.96,45.76 43.85,47.88 42.56,47.88 43.42,49.59 47.01,52.45 49.32,52.04 50.85,51.14 52.74,51.88 55.47,50.65 55.38,48.37 54.19,45.68 53.08,45.19 52.65,44.29 49.83,43.07"/>
                        </>)}
                        {/* SRA-1 */}
                        {data.area === "SRA-1" && (<>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="24.87,25.61 24.96,27.65 25.38,28.63 24.79,30.91 26.32,31.89 27.01,33.12 30.09,32.87 32.14,32.14 35.56,33.28 36.75,34.58 37.69,34.09 34.79,31.08 33.85,27.41 33.16,27.65 31.97,25.61 29.91,24.80 29.40,25.37 27.26,24.71" />
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="70.43,26.51 68.21,26.59 67.35,27.32 65.81,27.65 64.70,28.79 64.70,29.61 63.68,30.18 63.68,31.08 62.14,33.77 62.56,34.67 63.76,34.99 64.27,34.50 66.50,34.09 67.86,34.67 68.97,33.77 70.00,33.20 71.11,31.97 72.31,31.57 72.56,30.59 71.88,29.53 70.85,29.53 70.51,28.63" />
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="23.16,62.23 22.82,63.21 22.82,64.36 22.56,65.42 23.33,66.07 24.02,66.07 23.68,67.05 23.16,67.94 22.82,69.33 23.93,71.04 25.81,70.88 27.61,71.29 30.09,70.64 32.74,68.27 33.16,67.05 32.48,65.42 33.50,61.34 32.05,60.11 28.97,62.32 27.44,62.32 25.98,63.21" />
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="63.33,59.05 63.68,60.28 66.07,64.11 66.15,66.48 68.03,68.27 68.97,69.09 71.11,69.50 73.50,67.46 76.41,67.37 77.09,66.23 76.92,64.44 76.07,63.46 74.96,62.32 72.91,61.17 70.94,61.01 69.40,60.20 67.86,60.28 65.21,58.89" />
                        </>)}
                        {/* SRA-2 */}
                        {data.area === "SRA-2" && (<>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="39.06,34.67 37.26,35.64 36.24,37.52 36.75,38.66 37.69,39.64 40.26,39.97 41.97,39.23 42.05,38.34 41.45,37.60 39.49,37.36 39.83,35.48" />
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="59.91,34.50 58.55,36.22 57.26,36.70 57.61,38.42 58.89,39.15 60.68,41.11 62.31,41.27 63.50,39.72 64.53,38.17 63.76,36.22 62.14,34.67" />
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="34.10,58.56 33.68,59.38 34.10,59.87 34.62,59.95 35.47,61.34 36.41,61.42 37.18,61.99 38.55,61.99 40.34,60.28 40.68,58.97 40.00,57.99 38.12,56.36 35.90,56.12 35.13,58.08" />
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="60.85,53.83 60.60,54.73 59.23,55.30 58.46,56.44 57.61,56.69 57.61,57.99 58.38,58.65 59.23,58.89 61.11,58.89 62.05,58.81 62.91,57.99 63.25,57.18 62.82,56.12 62.99,55.06 62.99,54.40 61.88,53.83" />
                        </>)}
                        {/* SRA-3 */}
                        {data.area === "SRA-3" && (<>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="40.43,41.60 40.51,42.66 39.83,43.47 40.34,44.62 40.34,45.60 41.11,46.17 41.79,45.60 42.99,44.29 43.93,43.80 44.44,42.66 44.02,41.68 43.16,40.78 42.31,41.27 41.11,41.11"/>
                        <polygon fill={highlightColor} opacity={highlightOpacity} points="54.19,53.43 53.93,55.14 54.44,55.55 55.90,55.30 56.58,55.87 57.01,56.77 57.52,56.28 58.55,54.65 59.32,54.89 60.09,54.65 59.91,52.94 59.49,52.20 58.03,50.98 56.41,51.22 55.81,52.61"/>
                        </>)}
                            </svg>

                            <div className="darkforce-map-caption">
                                <FaMapLocationDot aria-hidden="true" />
                                <span>
                                    <strong>
                                        {t(
                                            `eternalLandDarkforce.areas.${data.area}.label`
                                        )}
                                    </strong>
                                    {t(
                                        `eternalLandDarkforce.areas.${data.area}.description`
                                    )}
                                </span>
                            </div>
                        </div>

                        <div className="darkforce-highlight-controls">
                            <div className="darkforce-highlight-title">
                                <FaPalette aria-hidden="true" />
                                {t(
                                    "eternalLandDarkforce.highlight.title"
                                )}
                            </div>

                            <label>
                                <span>
                                    {t(
                                        "eternalLandDarkforce.highlight.color"
                                    )}
                                </span>
                                <input
                                    type="color"
                                    name="highlightColor"
                                    value={highlightColor}
                                    onChange={changeStringValue}
                                    aria-label={t(
                                        "eternalLandDarkforce.highlight.colorAria"
                                    )}
                                />
                            </label>

                            <label className="darkforce-opacity-control">
                                <span>
                                    {t(
                                        "eternalLandDarkforce.highlight.opacity"
                                    )}
                                    <strong>
                                        {Math.round(
                                            highlightOpacity * 100
                                        )}
                                        %
                                    </strong>
                                </span>
                                <input
                                    type="range"
                                    min="0.25"
                                    max="1"
                                    step="0.05"
                                    value={highlightOpacity}
                                    onChange={changeOpacity}
                                    aria-label={t(
                                        "eternalLandDarkforce.highlight.opacityAria"
                                    )}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="darkforce-input-card">
                        <div className="darkforce-card-heading">
                            <div>
                                <span className="darkforce-section-kicker">
                                    {t(
                                        "eternalLandDarkforce.settings.kicker"
                                    )}
                                </span>
                                <h2>
                                    {t(
                                        "eternalLandDarkforce.settings.title"
                                    )}
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={resetSettings}
                            >
                                <FaRotateLeft className="me-2" />
                                {t(
                                    "eternalLandDarkforce.settings.reset"
                                )}
                            </button>
                        </div>

                        <div className="darkforce-form-grid">
                            <Field
                                label={t(
                                    "eternalLandDarkforce.fields.area.label"
                                )}
                                description={t(
                                    "eternalLandDarkforce.fields.area.description"
                                )}
                            >
                                <select
                                    className="form-select"
                                    name="area"
                                    value={data.area}
                                    onChange={changeStringValue}
                                >
                                    {AREA_VALUES.map((area) => (
                                        <option
                                            key={area}
                                            value={area}
                                        >
                                            {t(
                                                `eternalLandDarkforce.areas.${area}.option`,
                                                {
                                                    score:
                                                        formatter.format(
                                                            SCORE_BY_AREA[
                                                                area
                                                            ]
                                                        )
                                                }
                                            )}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                label={t(
                                    "eternalLandDarkforce.fields.troop.label"
                                )}
                                description={t(
                                    "eternalLandDarkforce.fields.troop.description"
                                )}
                            >
                                <select
                                    className="form-select"
                                    name="troop"
                                    value={data.troop}
                                    onChange={changeNumberValue}
                                >
                                    {TROOP_VALUES.map((troop) => (
                                        <option
                                            key={troop}
                                            value={troop}
                                        >
                                            {t(
                                                `eternalLandDarkforce.troops.${troop}`
                                            )}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                label={t(
                                    "eternalLandDarkforce.fields.tech.label"
                                )}
                                description={t(
                                    "eternalLandDarkforce.fields.tech.description"
                                )}
                            >
                                <select
                                    className="form-select"
                                    name="tech"
                                    value={data.tech}
                                    onChange={changeNumberValue}
                                >
                                    {TECH_VALUES.map((tech) => (
                                        <option
                                            key={tech}
                                            value={tech}
                                        >
                                            {t(
                                                `eternalLandDarkforce.techLevels.${tech}`
                                            )}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                label={t(
                                    "eternalLandDarkforce.fields.count.label"
                                )}
                                description={t(
                                    "eternalLandDarkforce.fields.count.description"
                                )}
                            >
                                <select
                                    className="form-select"
                                    name="count"
                                    value={data.count}
                                    onChange={changeNumberValue}
                                >
                                    {[1, 2, 3, 4, 5].map((count) => (
                                        <option
                                            key={count}
                                            value={count}
                                        >
                                            {t(
                                                "eternalLandDarkforce.fields.count.option",
                                                { count }
                                            )}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                label={t(
                                    "eternalLandDarkforce.fields.delay.label"
                                )}
                                description={t(
                                    "eternalLandDarkforce.fields.delay.description"
                                )}
                            >
                                <div className="input-group">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        className="form-control"
                                        name="delay"
                                        min="0"
                                        max="600"
                                        value={data.delay}
                                        onChange={changeNumberValue}
                                    />
                                    <span className="input-group-text">
                                        {t(
                                            "eternalLandDarkforce.units.seconds"
                                        )}
                                    </span>
                                </div>
                            </Field>
                        </div>

                        <div className="darkforce-cycle-summary">
                            <span>
                                {t(
                                    "eternalLandDarkforce.cycle.title"
                                )}
                            </span>
                            <strong>
                                {t(
                                    "eternalLandDarkforce.cycle.duration",
                                    {
                                        seconds:
                                            formatter.format(
                                                turnDuration
                                            )
                                    }
                                )}
                            </strong>
                            <small>
                                {data.count === 1
                                    ? t(
                                        "eternalLandDarkforce.cycle.single"
                                    )
                                    : t(
                                        "eternalLandDarkforce.cycle.multiple",
                                        {
                                            delay:
                                                formatter.format(
                                                    data.delay
                                                )
                                        }
                                    )}
                            </small>
                        </div>
                    </div>
                </section>

                <section className="darkforce-result-section">
                    <div className="darkforce-section-heading">
                        <div>
                            <span className="darkforce-section-kicker">
                                {t(
                                    "eternalLandDarkforce.results.kicker"
                                )}
                            </span>
                            <h2>
                                {t(
                                    "eternalLandDarkforce.results.title"
                                )}
                            </h2>
                        </div>
                    </div>

                    <div className="darkforce-result-grid">
                        <ResultCard
                            icon={<FaCrosshairs />}
                            label={t(
                                "eternalLandDarkforce.results.attacksPerHour"
                            )}
                            value={formatter.format(attacksPerHour)}
                            unit={t(
                                "eternalLandDarkforce.units.times"
                            )}
                            detail={t(
                                "eternalLandDarkforce.results.troopTotal",
                                {
                                    troop: data.troop,
                                    count: data.troop
                                }
                            )}
                        />

                        <ResultCard
                            icon={<FaClock />}
                            label={t(
                                "eternalLandDarkforce.results.scorePerHour"
                            )}
                            value={formatter.format(scorePerHour)}
                            unit={t(
                                "eternalLandDarkforce.units.points"
                            )}
                            detail={t(
                                "eternalLandDarkforce.results.scorePerTurn",
                                {
                                    score: formatter.format(
                                        scorePerTurn
                                    )
                                }
                            )}
                            emphasized
                        />

                        <ResultCard
                            icon={<FaArrowTrendUp />}
                            label={t(
                                "eternalLandDarkforce.results.scorePerDay"
                            )}
                            value={formatter.format(scorePerDay)}
                            unit={t(
                                "eternalLandDarkforce.units.points"
                            )}
                            detail={t(
                                "eternalLandDarkforce.results.dayAssumption"
                            )}
                        />
                    </div>
                </section>

                <section className="darkforce-projection-section">
                    <div className="darkforce-projection-form">
                        <div className="darkforce-section-heading">
                            <div>
                                <span className="darkforce-section-kicker">
                                    {t(
                                        "eternalLandDarkforce.projection.kicker"
                                    )}
                                </span>
                                <h2>
                                    {t(
                                        "eternalLandDarkforce.projection.title"
                                    )}
                                </h2>
                            </div>
                        </div>

                        <div className="darkforce-form-grid two-columns">
                            <Field
                                label={t(
                                    "eternalLandDarkforce.projection.currentScore"
                                )}
                                description={t(
                                    "eternalLandDarkforce.projection.currentScoreDescription"
                                )}
                            >
                                <div className="input-group">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        className="form-control"
                                        name="currentScore"
                                        min="0"
                                        value={data.currentScore}
                                        onChange={changeNumberValue}
                                    />
                                    <span className="input-group-text">
                                        {t(
                                            "eternalLandDarkforce.units.points"
                                        )}
                                    </span>
                                </div>
                            </Field>

                            <Field
                                label={t(
                                    "eternalLandDarkforce.projection.endDate"
                                )}
                                description={t(
                                    "eternalLandDarkforce.projection.endDateDescription"
                                )}
                            >
                                <input
                                    type="date"
                                    className="form-control"
                                    name="endDate"
                                    value={data.endDate}
                                    onChange={changeStringValue}
                                />
                            </Field>
                        </div>
                    </div>

                    <div
                        className={`darkforce-final-score${
                            projection.expired
                                ? " is-expired"
                                : ""
                        }`}
                        aria-live="polite"
                    >
                        <span>
                            {projection.expired
                                ? t(
                                    "eternalLandDarkforce.projection.expired"
                                )
                                : t(
                                    "eternalLandDarkforce.projection.remainingHours",
                                    {
                                        hours:
                                            formatter.format(
                                                projection.remainingHours
                                            )
                                    }
                                )}
                        </span>
                        <strong>
                            {formatter.format(
                                projection.targetScore
                            )}
                            <small>
                                {t(
                                    "eternalLandDarkforce.units.points"
                                )}
                            </small>
                        </strong>
                        <p>
                            {t(
                                "eternalLandDarkforce.projection.assumption"
                            )}
                        </p>
                    </div>
                </section>

                <section className="darkforce-info-grid">
                    <div className="darkforce-info-card">
                        <h2>
                            {t(
                                "eternalLandDarkforce.info.calculation.title"
                            )}
                        </h2>
                        <p>
                            {t(
                                "eternalLandDarkforce.info.calculation.description"
                            )}
                        </p>
                        <code>
                            {t(
                                "eternalLandDarkforce.info.calculation.formula"
                            )}
                        </code>
                    </div>

                    <div className="darkforce-info-card">
                        <h2>
                            {t(
                                "eternalLandDarkforce.info.caution.title"
                            )}
                        </h2>
                        <p>
                            {t(
                                "eternalLandDarkforce.info.caution.description1"
                            )}
                        </p>
                        <p>
                            {t(
                                "eternalLandDarkforce.info.caution.description2"
                            )}
                        </p>
                    </div>
                </section>

                <section className="darkforce-faq">
                    <h2>
                        {t(
                            "eternalLandDarkforce.faq.title"
                        )}
                    </h2>

                    <details>
                        <summary>
                            {t(
                                "eternalLandDarkforce.faq.items.grade.question"
                            )}
                        </summary>
                        <p>
                            {t(
                                "eternalLandDarkforce.faq.items.grade.answer"
                            )}
                        </p>
                    </details>

                    <details>
                        <summary>
                            {t(
                                "eternalLandDarkforce.faq.items.count.question"
                            )}
                        </summary>
                        <p>
                            {t(
                                "eternalLandDarkforce.faq.items.count.answer"
                            )}
                        </p>
                    </details>

                    <details>
                        <summary>
                            {t(
                                "eternalLandDarkforce.faq.items.difference.question"
                            )}
                        </summary>
                        <p>
                            {t(
                                "eternalLandDarkforce.faq.items.difference.answer"
                            )}
                        </p>
                    </details>
                </section>
            </article>
        </>
    );
}

function Field({ label, description, children }) {
    return (
        <label className="darkforce-field">
            <span className="darkforce-field-label">
                {label}
            </span>
            <small>{description}</small>
            {children}
        </label>
    );
}

function ResultCard({
    icon,
    label,
    value,
    unit,
    detail,
    emphasized = false
}) {
    return (
        <div
            className={`darkforce-result-card${
                emphasized ? " is-emphasized" : ""
            }`}
        >
            <div className="darkforce-result-icon">
                {icon}
            </div>
            <span>{label}</span>
            <strong>
                {value}
                <small>{unit}</small>
            </strong>
            <p>{detail}</p>
        </div>
    );
}