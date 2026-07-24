import ELmap from "@src/assets/images/el-map.jpg";
import Buildings from "@src/assets/json/el/buildings.json";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import {
    FaAsterisk,
    FaCircleInfo,
    FaClock,
    FaMapLocationDot,
    FaRotateLeft
} from "react-icons/fa6";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import "./EternalLandScore.css";
import { useCanonicalUrl } from "@src/hooks/useCanonicalUrl";

const createFacilities = () =>
    Buildings.map((building, index) => {
        const i18nKey =
            building.i18nKey ??
            building.key ??
            building.code ??
            building.id ??
            `facility-${index}`;

        return {
            ...building,
            id: building.id ?? `${i18nKey}-${index}`,
            i18nKey,
            selected: false
        };
    });

export default function EternalLandScore() {
    const { t, i18n } = useTranslation("viewer");

    const mapRef = useRef(null);

    const [mapWidth, setMapWidth] = useState(0);
    const [hoverObject, setHoverObject] = useState(null);
    const [activeObject, setActiveObject] = useState(null);
    const [facilities, setFacilities] = useState(createFacilities);

    const locale =
        i18n.resolvedLanguage ??
        i18n.language ??
        "ko";

    const languageCode = locale.split("-")[0];

    const numberFormatter = useMemo(
        () => new Intl.NumberFormat(locale),
        [locale]
    );

    const getFacilityName = useCallback(
        (facility) =>
            t(
                `eternalLandScore.facilities.${facility.i18nKey}`,
                {
                    defaultValue: facility.name
                }
            ),
        [t]
    );

    const canonicalUrl = useCanonicalUrl();

    useEffect(() => {
        const mapElement = mapRef.current;

        if (!mapElement) {
            return undefined;
        }

        const updateSize = () => {
            setMapWidth(mapElement.clientWidth);
        };

        updateSize();

        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(mapElement);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    const markerSize = useMemo(
        () => Math.max(24, Math.min(34, mapWidth * 0.024)),
        [mapWidth]
    );

    const calculateTooltipTransform = useCallback((building) => {
        let translateX = -50;
        let translateY = 12;

        if (building.x < 25) {
            translateX = 0;
        } else if (building.x > 75) {
            translateX = -100;
        }

        if (building.y > 72) {
            translateY = -112;
        }

        return `translate(${translateX}%, ${translateY}%)`;
    }, []);

    const toggleFacility = useCallback((targetId) => {
        setFacilities((currentFacilities) =>
            currentFacilities.map((facility) =>
                facility.id === targetId
                    ? {
                        ...facility,
                        selected: !facility.selected
                    }
                    : facility
            )
        );
    }, []);

    const resetFacilities = useCallback(() => {
        setFacilities((currentFacilities) =>
            currentFacilities.map((facility) => ({
                ...facility,
                selected: false
            }))
        );

        setHoverObject(null);
        setActiveObject(null);
    }, []);

    const selectedFacilities = useMemo(
        () => facilities.filter((facility) => facility.selected),
        [facilities]
    );

    const selectedFacilitiesPoint = useMemo(
        () =>
            selectedFacilities.reduce(
                (total, facility) => total + facility.point,
                0
            ),
        [selectedFacilities]
    );

    const scoreSummary = useMemo(
        () => ({
            minute: selectedFacilitiesPoint,
            hour: selectedFacilitiesPoint * 60,
            day: selectedFacilitiesPoint * 60 * 24
        }),
        [selectedFacilitiesPoint]
    );

    const displayedObject = hoverObject ?? activeObject;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: t("eternalLandScore.meta.applicationName"),
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        description: t("eternalLandScore.meta.description"),
        inLanguage: languageCode,
        url: canonicalUrl
    };

    return (
        <>
            <Helmet>
                <title>
                    {t("eternalLandScore.meta.title")}
                </title>
                <meta
                    name="description"
                    content={t(
                        "eternalLandScore.meta.description"
                    )}
                />
                <link rel="canonical" href={canonicalUrl} />
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>

            <article className="eternal-land-page">
                <header className="eternal-land-hero">
                    <div className="eternal-land-eyebrow">
                        <FaMapLocationDot aria-hidden="true" />
                        {t("eternalLandScore.hero.eyebrow")}
                    </div>

                    <h1>
                        {t("eternalLandScore.hero.title")}
                    </h1>

                    <p>
                        {t("eternalLandScore.hero.description")}
                    </p>
                </header>

                <section
                    className="eternal-land-guide-alert"
                    aria-label={t(
                        "eternalLandScore.guide.ariaLabel"
                    )}
                >
                    <FaAsterisk aria-hidden="true" />

                    <div>
                        <strong>
                            {t("eternalLandScore.guide.title")}
                        </strong>
                        <p>
                            {t(
                                "eternalLandScore.guide.description"
                            )}
                        </p>
                    </div>
                </section>

                <section
                    className="eternal-land-map-section"
                    aria-labelledby="eternal-land-map-title"
                >
                    <div className="eternal-land-section-heading">
                        <div>
                            <h2 id="eternal-land-map-title">
                                {t(
                                    "eternalLandScore.map.title"
                                )}
                            </h2>
                            <p>
                                {t(
                                    "eternalLandScore.map.description"
                                )}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={resetFacilities}
                            disabled={
                                selectedFacilities.length === 0
                            }
                        >
                            <FaRotateLeft className="me-2" />
                            {t(
                                "eternalLandScore.map.reset"
                            )}
                        </button>
                    </div>

                    <div
                        className={`eternal-land-live-summary${
                            selectedFacilities.length > 0
                                ? " has-selection"
                                : ""
                        }`}
                        aria-live="polite"
                    >
                        <div>
                            <span>
                                {t(
                                    "eternalLandScore.live.selectedLabel"
                                )}
                            </span>
                            <strong>
                                {t(
                                    "eternalLandScore.units.facilityCount",
                                    {
                                        count:
                                            selectedFacilities.length
                                    }
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                {t(
                                    "eternalLandScore.live.minuteTotal"
                                )}
                            </span>
                            <strong>
                                {t(
                                    "eternalLandScore.units.pointValue",
                                    {
                                        value:
                                            numberFormatter.format(
                                                scoreSummary.minute
                                            )
                                    }
                                )}
                            </strong>
                        </div>
                    </div>

                    <div className="eternal-land-mobile-hint">
                        {t(
                            "eternalLandScore.map.mobileHint"
                        )}
                    </div>

                    <div
                        className="eternal-land-map-scroll"
                        tabIndex={0}
                        aria-label={t(
                            "eternalLandScore.map.scrollAria"
                        )}
                    >
                        <div
                            className="eternal-land-map"
                            ref={mapRef}
                        >
                            <img
                                src={ELmap}
                                className="eternal-land-map-image"
                                alt={t(
                                    "eternalLandScore.map.imageAlt"
                                )}
                            />

                            {facilities.map((facility) => {
                                const facilityName =
                                    getFacilityName(facility);

                                return (
                                    <button
                                        type="button"
                                        key={facility.id}
                                        className={`eternal-land-marker${
                                            facility.selected
                                                ? " is-selected"
                                                : ""
                                        }`}
                                        style={{
                                            top: `${facility.y}%`,
                                            left: `${facility.x}%`,
                                            width: `${markerSize}px`,
                                            height: `${markerSize}px`,
                                            backgroundColor:
                                                facility.color
                                        }}
                                        aria-label={t(
                                            "eternalLandScore.map.markerAria",
                                            {
                                                name: facilityName,
                                                score:
                                                    numberFormatter.format(
                                                        facility.point
                                                    )
                                            }
                                        )}
                                        aria-pressed={
                                            facility.selected
                                        }
                                        onMouseEnter={() =>
                                            setHoverObject(
                                                facility
                                            )
                                        }
                                        onMouseLeave={() =>
                                            setHoverObject(null)
                                        }
                                        onFocus={() =>
                                            setHoverObject(
                                                facility
                                            )
                                        }
                                        onBlur={() =>
                                            setHoverObject(null)
                                        }
                                        onClick={() => {
                                            toggleFacility(
                                                facility.id
                                            );
                                            setActiveObject(
                                                facility
                                            );
                                        }}
                                    />
                                );
                            })}

                            {displayedObject && (
                                <div
                                    className="building-information"
                                    role="status"
                                    style={{
                                        top: `${displayedObject.y}%`,
                                        left: `${displayedObject.x}%`,
                                        transform:
                                            calculateTooltipTransform(
                                                displayedObject
                                            )
                                    }}
                                >
                                    <strong>
                                        {getFacilityName(
                                            displayedObject
                                        )}
                                    </strong>

                                    <dl>
                                        <div>
                                            <dt>
                                                {t(
                                                    "eternalLandScore.tooltip.perMinute"
                                                )}
                                            </dt>
                                            <dd>
                                                {t(
                                                    "eternalLandScore.units.pointValue",
                                                    {
                                                        value:
                                                            numberFormatter.format(
                                                                displayedObject.point
                                                            )
                                                    }
                                                )}
                                            </dd>
                                        </div>

                                        <div>
                                            <dt>
                                                {t(
                                                    "eternalLandScore.tooltip.perHour"
                                                )}
                                            </dt>
                                            <dd>
                                                {t(
                                                    "eternalLandScore.units.pointValue",
                                                    {
                                                        value:
                                                            numberFormatter.format(
                                                                displayedObject.point *
                                                                    60
                                                            )
                                                    }
                                                )}
                                            </dd>
                                        </div>

                                        <div>
                                            <dt>
                                                {t(
                                                    "eternalLandScore.tooltip.perDay"
                                                )}
                                            </dt>
                                            <dd>
                                                {t(
                                                    "eternalLandScore.units.pointValue",
                                                    {
                                                        value:
                                                            numberFormatter.format(
                                                                displayedObject.point *
                                                                    60 *
                                                                    24
                                                            )
                                                    }
                                                )}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section
                    className="eternal-land-summary"
                    aria-labelledby="eternal-land-summary-title"
                >
                    <div className="eternal-land-section-heading">
                        <div>
                            <h2 id="eternal-land-summary-title">
                                {t(
                                    "eternalLandScore.summary.title"
                                )}
                            </h2>
                            <p>
                                {t(
                                    "eternalLandScore.summary.selectedCount",
                                    {
                                        count:
                                            selectedFacilities.length
                                    }
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="eternal-land-score-grid">
                        <ScoreCard
                            label={t(
                                "eternalLandScore.summary.minuteScore"
                            )}
                            value={scoreSummary.minute}
                            formatter={numberFormatter}
                            unit={t(
                                "eternalLandScore.units.points"
                            )}
                        />

                        <ScoreCard
                            label={t(
                                "eternalLandScore.summary.hourScore"
                            )}
                            value={scoreSummary.hour}
                            formatter={numberFormatter}
                            unit={t(
                                "eternalLandScore.units.points"
                            )}
                        />

                        <ScoreCard
                            label={t(
                                "eternalLandScore.summary.dayScore"
                            )}
                            value={scoreSummary.day}
                            formatter={numberFormatter}
                            unit={t(
                                "eternalLandScore.units.points"
                            )}
                        />
                    </div>

                    <div className="eternal-land-selected-list">
                        <h3>
                            {t(
                                "eternalLandScore.selectedList.title"
                            )}
                        </h3>

                        {selectedFacilities.length === 0 ? (
                            <div className="eternal-land-empty">
                                {t(
                                    "eternalLandScore.selectedList.empty"
                                )}
                            </div>
                        ) : (
                            <ul>
                                {selectedFacilities.map(
                                    (facility) => (
                                        <li key={facility.id}>
                                            <span>
                                                {getFacilityName(
                                                    facility
                                                )}
                                            </span>
                                            <strong>
                                                {t(
                                                    "eternalLandScore.selectedList.perMinuteScore",
                                                    {
                                                        score:
                                                            numberFormatter.format(
                                                                facility.point
                                                            )
                                                    }
                                                )}
                                            </strong>
                                        </li>
                                    )
                                )}
                            </ul>
                        )}
                    </div>

                    <div className="eternal-land-calculator-link">
                        {t(
                            "eternalLandScore.calculatorLink.before"
                        )}{" "}
                        <LanguageRouterLink to="/calculator/el-score">
                            {t(
                                "eternalLandScore.calculatorLink.label"
                            )}
                        </LanguageRouterLink>
                        {t(
                            "eternalLandScore.calculatorLink.after"
                        )}
                    </div>
                </section>

                <section
                    className="eternal-land-content-grid"
                    aria-label={t(
                        "eternalLandScore.info.ariaLabel"
                    )}
                >
                    <div className="eternal-land-info-card">
                        <FaClock aria-hidden="true" />

                        <div>
                            <h2>
                                {t(
                                    "eternalLandScore.info.calculation.title"
                                )}
                            </h2>
                            <p>
                                {t(
                                    "eternalLandScore.info.calculation.description1"
                                )}
                            </p>
                            <p>
                                {t(
                                    "eternalLandScore.info.calculation.description2"
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="eternal-land-info-card">
                        <FaCircleInfo aria-hidden="true" />

                        <div>
                            <h2>
                                {t(
                                    "eternalLandScore.info.caution.title"
                                )}
                            </h2>
                            <p>
                                {t(
                                    "eternalLandScore.info.caution.description1"
                                )}
                            </p>
                            <p>
                                {t(
                                    "eternalLandScore.info.caution.description2"
                                )}
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    className="eternal-land-faq"
                    aria-labelledby="eternal-land-faq-title"
                >
                    <h2 id="eternal-land-faq-title">
                        {t("eternalLandScore.faq.title")}
                    </h2>

                    <details>
                        <summary>
                            {t(
                                "eternalLandScore.faq.multiple.question"
                            )}
                        </summary>
                        <p>
                            {t(
                                "eternalLandScore.faq.multiple.answer"
                            )}
                        </p>
                    </details>

                    <details>
                        <summary>
                            {t(
                                "eternalLandScore.faq.daily.question"
                            )}
                        </summary>
                        <p>
                            {t(
                                "eternalLandScore.faq.daily.answer"
                            )}
                        </p>
                    </details>

                    <details>
                        <summary>
                            {t(
                                "eternalLandScore.faq.location.question"
                            )}
                        </summary>
                        <p>
                            {t(
                                "eternalLandScore.faq.location.answer"
                            )}
                        </p>
                    </details>
                </section>
            </article>
        </>
    );
}

function ScoreCard({
    label,
    value,
    formatter,
    unit
}) {
    return (
        <div
            className={`eternal-land-score-card${
                value > 0 ? " has-value" : ""
            }`}
        >
            <span>{label}</span>
            <strong>{formatter.format(value)}</strong>
            <small>{unit}</small>
        </div>
    );
}