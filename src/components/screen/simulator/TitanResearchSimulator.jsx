import "./TitanResearchSimulator.css";

import {
    useMemo,
    useState,
} from "react";
import { useTranslation } from "react-i18next";

import gearOptions from "@src/assets/json/titan/titan-gear-options.json";
import successRateList from "@src/assets/json/titan/titan-success-rate.json";
import catalystTypeList from "@src/assets/json/titan/titan-catalyst-types.json";
import partsList from "@src/assets/json/titan/titan-parts-types.json";
import specialEffectRateList from "@src/assets/json/titan/titan-special-effect-rate.json";
import colorList from "@src/assets/json/titan/titan-colors.json";
import specialEffectNames from "@src/assets/json/titan/titan-special-effect-names.json";
import gearNames from "@src/assets/json/titan/titan-gear-names.json";

import { useParamState } from "@src/hooks/useParamState";

const MIN_CREATE_COUNT = 1;
const MAX_CREATE_COUNT = 100;

const GRADE_DRAW_ORDER = [
    "gold",
    "purple",
    "blue",
    "green",
];

const GRADE_DISPLAY_ORDER = [
    "gold",
    "purple",
    "blue",
    "green",
];

const OPTION_COUNT_VALUES = [1, 2, 3];
const OPTION_COUNT_WEIGHTS = [0.4, 0.4, 0.2];

const VALID_CATALYST_TYPES = new Set([
    ...catalystTypeList,
    "none",
]);

const OPTION_TITLE_KEYS = {
    "육군 공격력 증가": "armyAttack",
    "해군 공격력 증가": "navyAttack",
    "공군 공격력 증가": "airAttack",

    "육군 데미지 증가": "armyDamageIncrease",
    "해군 데미지 증가": "navyDamageIncrease",
    "공군 데미지 증가": "airDamageIncrease",

    "육군 생명력 증가": "armyHp",
    "해군 생명력 증가": "navyHp",
    "공군 생명력 증가": "airHp",

    "육군 방어도 증가": "armyDefense",
    "해군 방어도 증가": "navyDefense",
    "공군 방어도 증가": "airDefense",

    "육군 데미지 감면": "armyDamageReduction",
    "해군 데미지 감면": "navyDamageReduction",
    "공군 데미지 감면": "airDamageReduction",
};

const clamp = (value, min, max) =>
    Math.min(Math.max(value, min), max);

const getRandomUnit = () => {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.getRandomValues === "function"
    ) {
        const buffer = new Uint32Array(1);
        crypto.getRandomValues(buffer);

        return buffer[0] / 0x100000000;
    }

    return Math.random();
};

const getRandomInArray = (array) => {
    if (!Array.isArray(array) || array.length === 0) {
        return null;
    }

    const index = Math.floor(
        getRandomUnit() * array.length
    );

    return array[index];
};

const getWeightedRandomValue = (
    values,
    weights
) => {
    const totalWeight = weights.reduce(
        (total, weight) => total + weight,
        0
    );

    if (totalWeight <= 0) {
        return values[0] ?? null;
    }

    const target = getRandomUnit() * totalWeight;
    let accumulated = 0;

    for (
        let index = 0;
        index < values.length;
        index++
    ) {
        accumulated += weights[index] ?? 0;

        if (target < accumulated) {
            return values[index];
        }
    }

    return values.at(-1) ?? null;
};

const getGaussianRandomValue = (
    min,
    max,
    mean = (min + max) / 2,
    standardDeviation = (max - min) / 6
) => {
    if (min === max) {
        return Number(min.toFixed(2));
    }

    for (let attempt = 0; attempt < 1000; attempt++) {
        let u = 0;
        let v = 0;

        while (u === 0) {
            u = getRandomUnit();
        }

        while (v === 0) {
            v = getRandomUnit();
        }

        const standardNormal =
            Math.sqrt(-2 * Math.log(u)) *
            Math.cos(2 * Math.PI * v);

        const value =
            standardNormal * standardDeviation + mean;

        if (value >= min && value <= max) {
            return Number(value.toFixed(2));
        }
    }

    return Number(
        clamp(mean, min, max).toFixed(2)
    );
};

const getGradeByRate = (successRates) => {
    const target = getRandomUnit() * 100;
    let accumulated = 0;

    for (const grade of GRADE_DRAW_ORDER) {
        accumulated += successRates[grade] ?? 0;

        if (target < accumulated) {
            return grade;
        }
    }

    return "green";
};

const getSpecialEffectByRate = (rateList) => {
    const target = getRandomUnit() * 100;
    let accumulated = 0;

    for (const [effect, rate] of Object.entries(
        rateList
    )) {
        accumulated += rate;

        if (target < accumulated) {
            return effect;
        }
    }

    return null;
};

const TitanResearchSimulator = () => {
    const { t, i18n } = useTranslation("viewer");

    const [parts, setParts] = useParamState(
        "type",
        "pistol"
    );
    const [catalyst, setCatalyst] = useParamState(
        "catalyst",
        "none"
    );
    const [count, setCount] = useParamState(
        "count",
        1
    );

    const [titanResult, setTitanResult] =
        useState([]);

    const currentLocale = useMemo(() => {
        const language =
            i18n.resolvedLanguage ||
            i18n.language ||
            "ko";

        if (language.startsWith("ja")) {
            return "ja-JP";
        }

        if (language.startsWith("en")) {
            return "en-US";
        }

        return "ko-KR";
    }, [
        i18n.resolvedLanguage,
        i18n.language,
    ]);

    const numberFormatter = useMemo(
        () =>
            new Intl.NumberFormat(currentLocale, {
                maximumFractionDigits: 2,
            }),
        [currentLocale]
    );

    const activePart = partsList.includes(parts)
        ? parts
        : partsList[0];

    const activeCatalyst =
        VALID_CATALYST_TYPES.has(catalyst)
            ? catalyst
            : "none";

    const normalizedCount = clamp(
        Number.parseInt(count, 10) ||
            MIN_CREATE_COUNT,
        MIN_CREATE_COUNT,
        MAX_CREATE_COUNT
    );

    const publicUrl = useMemo(
        () =>
            (
                import.meta.env.VITE_PUBLIC_URL ?? ""
            ).replace(/\/$/, ""),
        []
    );


    const successRates = useMemo(
        () => successRateList[activeCatalyst],
        [activeCatalyst]
    );

    const partOptions = useMemo(
        () => gearOptions[activePart] ?? [],
        [activePart]
    );

    const specialEffectRates = useMemo(
        () =>
            specialEffectRateList[
                activePart
            ] ?? {},
        [activePart]
    );

    const specialEffectConditionalRate =
        useMemo(
            () =>
                Object.values(
                    specialEffectRates
                ).reduce(
                    (total, rate) =>
                        total + rate,
                    0
                ),
            [specialEffectRates]
        );

    const overallSpecialEffectRate = useMemo(
        () =>
            ((successRates.gold ?? 0) *
                specialEffectConditionalRate) /
            100,
        [
            successRates.gold,
            specialEffectConditionalRate,
        ]
    );

    const formatNumber = (value) =>
        numberFormatter.format(value);

    const formatPercent = (value) =>
        t(
            "TitanResearchSimulator.format.percent",
            {
                value: numberFormatter.format(
                    value
                ),
            }
        );

    const getPartName = (part) =>
        t(
            `TitanResearchSimulator.parts.${part}`,
            {
                defaultValue:
                    gearNames[part] ?? part,
            }
        );

    const getCatalystName = (tier) =>
        t(
            `TitanResearchSimulator.catalysts.${
                tier ?? "none"
            }`
        );

    const getGradeName = (grade) =>
        t(
            `TitanResearchSimulator.grades.${grade}`
        );

    const getSpecialEffectName = (effect) =>
        t(
            `TitanResearchSimulator.specialEffects.${effect}`,
            {
                defaultValue:
                    specialEffectNames[effect] ??
                    effect,
            }
        );

    const getOptionName = (title) => {
        const key = OPTION_TITLE_KEYS[title];

        if (!key) {
            return title;
        }

        return t(
            `TitanResearchSimulator.options.${key}`,
            {
                defaultValue: title,
            }
        );
    };

    const getPartImageUrl = (part) =>
        `${publicUrl}/images/titan/titan-item-${part}.png`;

    const getCatalystImageUrl = (tier) =>
        `${publicUrl}/images/titan/titan-catalyst-${tier}.png`;

    const getGearImageUrl = (
        part,
        grade
    ) =>
        `${publicUrl}/images/titan/${part}-${grade}.png`;

    const getSpecialEffectImageUrl = (
        effect
    ) =>
        `${publicUrl}/images/titan/${effect}.png`;

    const handleCountChange = (event) => {
        const value = Number.parseInt(
            event.target.value,
            10
        );

        if (Number.isNaN(value)) {
            return;
        }

        setCount(
            clamp(
                value,
                MIN_CREATE_COUNT,
                MAX_CREATE_COUNT
            )
        );
    };

    const setPresetCount = (value) => {
        setCount(value);
    };

    const createRandomTitanGearOptions = () => {
        const optionCount =
            getWeightedRandomValue(
                OPTION_COUNT_VALUES,
                OPTION_COUNT_WEIGHTS
            );

        return Array.from(
            { length: optionCount },
            (_, optionIndex) => {
                const selectedOption =
                    getRandomInArray(
                        partOptions
                    );

                const selectedValue =
                    getGaussianRandomValue(
                        selectedOption.min,
                        selectedOption.max
                    );

                return {
                    id: optionIndex + 1,
                    title:
                        selectedOption.title,
                    value:
                        selectedValue,
                };
            }
        );
    };

    const createRandomTitanGear = (index) => {
        const grade =
            getGradeByRate(successRates);

        return {
            no: index + 1,
            type: activePart,
            grade,
            options:
                createRandomTitanGearOptions(),
            specialEffect:
                grade === "gold"
                    ? getSpecialEffectByRate(
                          specialEffectRates
                      )
                    : null,
        };
    };

    const createRandomTitanGears = () => {
        const result = Array.from(
            { length: normalizedCount },
            (_, index) =>
                createRandomTitanGear(index)
        );

        setTitanResult(result);
    };

    const clearResult = () => {
        setTitanResult([]);
    };

    const statistics = useMemo(() => {
        const gradeCounts = {
            green: 0,
            blue: 0,
            purple: 0,
            gold: 0,
        };

        let specialEffectCount = 0;
        let optionCount = 0;

        for (const gear of titanResult) {
            gradeCounts[gear.grade] += 1;
            optionCount +=
                gear.options.length;

            if (gear.specialEffect) {
                specialEffectCount += 1;
            }
        }

        const total = titanResult.length;

        return {
            total,
            gradeCounts,
            specialEffectCount,
            specialEffectRate:
                total > 0
                    ? (specialEffectCount /
                          total) *
                      100
                    : 0,
            averageOptionCount:
                total > 0
                    ? optionCount / total
                    : 0,
        };
    }, [titanResult]);

    return (
        <main className="titan-research-simulator container py-4">
            <header className="titan-research-header mb-4">
                <span className="badge text-bg-primary mb-2">
                    {t(
                        "TitanResearchSimulator.header.badge"
                    )}
                </span>

                <h1 className="fw-bold mb-2">
                    {t(
                        "TitanResearchSimulator.header.title"
                    )}
                </h1>

                <p className="text-secondary mb-0">
                    {t(
                        "TitanResearchSimulator.header.description"
                    )}
                </p>
            </header>

            <div className="row g-4 align-items-start">
                <div className="col-12 col-xl-8">
                    <section
                        className="card titan-research-card border-0 shadow-sm"
                        aria-labelledby="titan-settings-title"
                    >
                        <div className="card-body p-4">
                            <h2
                                id="titan-settings-title"
                                className="h4 fw-bold mb-4"
                            >
                                {t(
                                    "TitanResearchSimulator.settings.title"
                                )}
                            </h2>

                            <fieldset className="mb-4">
                                <legend className="h6 fw-bold mb-3">
                                    {t(
                                        "TitanResearchSimulator.settings.partTitle"
                                    )}
                                </legend>

                                <div className="titan-selector-grid">
                                    {partsList.map(
                                        (part) => (
                                            <button
                                                type="button"
                                                key={part}
                                                className={`titan-selector-button ${
                                                    activePart ===
                                                    part
                                                        ? "active"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    setParts(
                                                        part
                                                    )
                                                }
                                                aria-pressed={
                                                    activePart ===
                                                    part
                                                }
                                            >
                                                <img
                                                    src={getPartImageUrl(
                                                        part
                                                    )}
                                                    className="catalyst-img"
                                                    alt=""
                                                    aria-hidden="true"
                                                />

                                                <span>
                                                    {getPartName(
                                                        part
                                                    )}
                                                </span>
                                            </button>
                                        )
                                    )}
                                </div>
                            </fieldset>

                            <hr className="my-4" />

                            <fieldset>
                                <legend className="h6 fw-bold mb-3">
                                    {t(
                                        "TitanResearchSimulator.settings.catalystTitle"
                                    )}
                                </legend>

                                <div className="titan-selector-grid">
                                    {catalystTypeList.map(
                                        (tier) => (
                                            <button
                                                type="button"
                                                key={tier}
                                                className={`titan-selector-button ${
                                                    activeCatalyst ===
                                                    tier
                                                        ? "active"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    setCatalyst(
                                                        tier
                                                    )
                                                }
                                                aria-pressed={
                                                    activeCatalyst ===
                                                    tier
                                                }
                                            >
                                                <img
                                                    src={getCatalystImageUrl(
                                                        tier
                                                    )}
                                                    className="catalyst-img"
                                                    alt=""
                                                    aria-hidden="true"
                                                />

                                                <span>
                                                    {getCatalystName(
                                                        tier
                                                    )}
                                                </span>
                                            </button>
                                        )
                                    )}

                                    <button
                                        type="button"
                                        className={`titan-selector-button titan-selector-button--none ${
                                            activeCatalyst ===
                                            "none"
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setCatalyst("none")
                                        }
                                        aria-pressed={
                                            activeCatalyst ===
                                            "none"
                                        }
                                    >
                                        <span className="titan-none-icon">
                                            ×
                                        </span>

                                        <span>
                                            {getCatalystName(
                                                "none"
                                            )}
                                        </span>
                                    </button>
                                </div>
                            </fieldset>

                            <hr className="my-4" />

                            <div className="row g-3 align-items-end">
                                <div className="col-12 col-md-5">
                                    <label
                                        htmlFor="titan-create-count"
                                        className="form-label fw-bold"
                                    >
                                        {t(
                                            "TitanResearchSimulator.settings.countLabel"
                                        )}
                                    </label>

                                    <div className="input-group">
                                        <input
                                            id="titan-create-count"
                                            type="number"
                                            min={
                                                MIN_CREATE_COUNT
                                            }
                                            max={
                                                MAX_CREATE_COUNT
                                            }
                                            step="1"
                                            className="form-control form-control-lg text-end"
                                            value={
                                                normalizedCount
                                            }
                                            onChange={
                                                handleCountChange
                                            }
                                        />

                                        <span className="input-group-text">
                                            {t(
                                                "TitanResearchSimulator.units.times"
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="col-12 col-md-7">
                                    <div className="d-flex flex-wrap gap-2">
                                        {[1, 10, 50, 100].map(
                                            (
                                                preset
                                            ) => (
                                                <button
                                                    type="button"
                                                    key={
                                                        preset
                                                    }
                                                    className={`btn btn-sm ${
                                                        normalizedCount ===
                                                        preset
                                                            ? "btn-secondary"
                                                            : "btn-outline-secondary"
                                                    }`}
                                                    onClick={() =>
                                                        setPresetCount(
                                                            preset
                                                        )
                                                    }
                                                >
                                                    {t(
                                                        "TitanResearchSimulator.settings.presetCount",
                                                        {
                                                            count: preset,
                                                        }
                                                    )}
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex flex-wrap gap-2 mt-4">
                                <button
                                    type="button"
                                    className="btn btn-primary btn-lg"
                                    onClick={
                                        createRandomTitanGears
                                    }
                                >
                                    {t(
                                        "TitanResearchSimulator.buttons.create",
                                        {
                                            count: normalizedCount,
                                        }
                                    )}
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-lg"
                                    onClick={clearResult}
                                    disabled={
                                        titanResult.length ===
                                        0
                                    }
                                >
                                    {t(
                                        "TitanResearchSimulator.buttons.clear"
                                    )}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="col-12 col-xl-4">
                    <aside
                        className="card titan-research-card border-0 shadow-sm position-sticky"
                        style={{ top: "1rem" }}
                        aria-labelledby="titan-rate-title"
                    >
                        <div className="card-body p-4">
                            <h2
                                id="titan-rate-title"
                                className="h4 fw-bold mb-1"
                            >
                                {t(
                                    "TitanResearchSimulator.rate.title"
                                )}
                            </h2>

                            <p className="small text-secondary mb-4">
                                {t(
                                    "TitanResearchSimulator.rate.description",
                                    {
                                        catalyst:
                                            getCatalystName(
                                                activeCatalyst
                                            ),
                                    }
                                )}
                            </p>

                            <div className="d-grid gap-3">
                                {GRADE_DISPLAY_ORDER.map(
                                    (grade) => {
                                        const rate =
                                            successRates[
                                                grade
                                            ] ?? 0;

                                        return (
                                            <div
                                                className="titan-grade-rate"
                                                key={
                                                    grade
                                                }
                                            >
                                                <div className="d-flex justify-content-between gap-3 mb-1">
                                                    <span className="fw-semibold">
                                                        {getGradeName(
                                                            grade
                                                        )}
                                                    </span>

                                                    <span>
                                                        {formatPercent(
                                                            rate
                                                        )}
                                                    </span>
                                                </div>

                                                <div
                                                    className="progress"
                                                    role="progressbar"
                                                    aria-label={t(
                                                        "TitanResearchSimulator.rate.gradeAria",
                                                        {
                                                            grade: getGradeName(
                                                                grade
                                                            ),
                                                        }
                                                    )}
                                                    aria-valuenow={
                                                        rate
                                                    }
                                                    aria-valuemin="0"
                                                    aria-valuemax="100"
                                                >
                                                    <div
                                                        className="progress-bar"
                                                        style={{
                                                            width: `${rate}%`,
                                                            backgroundColor:
                                                                colorList[
                                                                    grade
                                                                ],
                                                        }}
                                                    />
                                                </div>

                                                <div className="small text-secondary mt-1 text-end">
                                                    {t(
                                                        "TitanResearchSimulator.rate.expectedCount",
                                                        {
                                                            count: formatNumber(
                                                                (normalizedCount *
                                                                    rate) /
                                                                    100
                                                            ),
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>

                            <hr className="my-4" />

                            <dl className="row mb-0">
                                <dt className="col-8 fw-normal text-secondary">
                                    {t(
                                        "TitanResearchSimulator.rate.goldSpecialConditional"
                                    )}
                                </dt>

                                <dd className="col-4 text-end fw-semibold">
                                    {formatPercent(
                                        specialEffectConditionalRate
                                    )}
                                </dd>

                                <dt className="col-8 fw-normal text-secondary">
                                    {t(
                                        "TitanResearchSimulator.rate.overallSpecial"
                                    )}
                                </dt>

                                <dd className="col-4 text-end fw-bold text-info">
                                    {formatPercent(
                                        overallSpecialEffectRate
                                    )}
                                </dd>
                            </dl>

                            <div className="alert alert-light border small mt-4 mb-0">
                                {t(
                                    "TitanResearchSimulator.rate.notice"
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <section
                className="card titan-research-card border-0 shadow-sm mt-4"
                aria-labelledby="titan-statistics-title"
            >
                <div className="card-body p-4">
                    <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
                        <div>
                            <h2
                                id="titan-statistics-title"
                                className="h4 fw-bold mb-1"
                            >
                                {t(
                                    "TitanResearchSimulator.statistics.title"
                                )}
                            </h2>

                            <p className="small text-secondary mb-0">
                                {t(
                                    "TitanResearchSimulator.statistics.description"
                                )}
                            </p>
                        </div>

                        <span className="badge text-bg-primary align-self-start fs-6">
                            {t(
                                "TitanResearchSimulator.statistics.total",
                                {
                                    count: statistics.total,
                                }
                            )}
                        </span>
                    </div>

                    {statistics.total === 0 ? (
                        <div className="alert alert-secondary mb-0">
                            {t(
                                "TitanResearchSimulator.statistics.empty"
                            )}
                        </div>
                    ) : (
                        <div className="row g-3">
                            {GRADE_DISPLAY_ORDER.map(
                                (grade) => (
                                    <div
                                        className="col-6 col-lg"
                                        key={grade}
                                    >
                                        <div className="titan-stat-card h-100">
                                            <div
                                                className="small fw-semibold"
                                                style={{
                                                    color: colorList[
                                                        grade
                                                    ],
                                                }}
                                            >
                                                {getGradeName(
                                                    grade
                                                )}
                                            </div>

                                            <strong className="fs-4">
                                                {formatNumber(
                                                    statistics
                                                        .gradeCounts[
                                                        grade
                                                    ]
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                )
                            )}

                            <div className="col-6 col-lg">
                                <div className="titan-stat-card h-100">
                                    <div className="small text-secondary">
                                        {t(
                                            "TitanResearchSimulator.statistics.specialEffects"
                                        )}
                                    </div>

                                    <strong className="fs-4 text-info">
                                        {formatNumber(
                                            statistics.specialEffectCount
                                        )}
                                    </strong>

                                    <div className="small text-secondary">
                                        {formatPercent(
                                            statistics.specialEffectRate
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-lg">
                                <div className="titan-stat-card h-100">
                                    <div className="small text-secondary">
                                        {t(
                                            "TitanResearchSimulator.statistics.averageOptions"
                                        )}
                                    </div>

                                    <strong className="fs-4">
                                        {formatNumber(
                                            statistics.averageOptionCount
                                        )}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section
                className="mt-4"
                aria-labelledby="titan-results-title"
            >
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-2 mb-3">
                    <div>
                        <h2
                            id="titan-results-title"
                            className="h3 fw-bold mb-1"
                        >
                            {t(
                                "TitanResearchSimulator.results.title"
                            )}
                        </h2>

                        <p className="text-secondary mb-0">
                            {t(
                                "TitanResearchSimulator.results.description"
                            )}
                        </p>
                    </div>
                </div>

                {titanResult.length === 0 ? (
                    <div className="card titan-research-card border-0 shadow-sm">
                        <div className="card-body p-5 text-center text-secondary">
                            {t(
                                "TitanResearchSimulator.results.empty"
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="row g-3">
                        {titanResult.map(
                            (gear) => (
                                <div
                                    className="col-12 col-xl-6"
                                    key={
                                        gear.no
                                    }
                                >
                                    <article className="card titan-result-card bg-dark text-light h-100">
                                        <div className="titan-gear-image-panel position-relative">
                                            <img
                                                src={getGearImageUrl(
                                                    gear.type,
                                                    gear.grade
                                                )}
                                                className="titan-gear-image"
                                                alt={t(
                                                    "TitanResearchSimulator.results.gearImageAlt",
                                                    {
                                                        grade: getGradeName(
                                                            gear.grade
                                                        ),
                                                        gear: getPartName(
                                                            gear.type
                                                        ),
                                                    }
                                                )}
                                            />

                                            <span className="titan-result-number badge text-bg-dark">
                                                #
                                                {
                                                    gear.no
                                                }
                                            </span>

                                            {gear.specialEffect && (
                                                <div className="titan-special-effect-icon">
                                                    <img
                                                        src={getSpecialEffectImageUrl(
                                                            gear.specialEffect
                                                        )}
                                                        alt={getSpecialEffectName(
                                                            gear.specialEffect
                                                        )}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="card-body titan-result-body">
                                            <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                                                <h3
                                                    className="h5 card-title fw-bold mb-0"
                                                    style={{
                                                        color: colorList[
                                                            gear
                                                                .grade
                                                        ],
                                                    }}
                                                >
                                                    {getPartName(
                                                        gear.type
                                                    )}
                                                </h3>

                                                <span
                                                    className="badge"
                                                    style={{
                                                        color: "#111",
                                                        backgroundColor:
                                                            colorList[
                                                                gear
                                                                    .grade
                                                            ],
                                                    }}
                                                >
                                                    {getGradeName(
                                                        gear.grade
                                                    )}
                                                </span>
                                            </div>

                                            <div className="d-grid gap-2">
                                                {gear.options.map(
                                                    (
                                                        option
                                                    ) => (
                                                        <div
                                                            className="titan-option-row"
                                                            key={`${gear.no}-${option.id}`}
                                                        >
                                                            <span>
                                                                {getOptionName(
                                                                    option.title
                                                                )}
                                                            </span>

                                                            <strong>
                                                                {formatPercent(
                                                                    option.value
                                                                )}
                                                            </strong>
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            {gear.specialEffect && (
                                                <>
                                                    <hr />

                                                    <div className="titan-special-effect-name">
                                                        <span className="small text-secondary">
                                                            {t(
                                                                "TitanResearchSimulator.results.specialEffect"
                                                            )}
                                                        </span>

                                                        <strong className="text-info">
                                                            {getSpecialEffectName(
                                                                gear.specialEffect
                                                            )}
                                                        </strong>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </article>
                                </div>
                            )
                        )}
                    </div>
                )}
            </section>

            <section className="card titan-research-card border-0 shadow-sm mt-5">
                <div className="card-body p-4 p-lg-5">
                    <h2 className="h3 fw-bold mb-3">
                        {t(
                            "TitanResearchSimulator.guide.introductionTitle"
                        )}
                    </h2>

                    <p>
                        {t(
                            "TitanResearchSimulator.guide.introduction1"
                        )}
                    </p>

                    <p>
                        {t(
                            "TitanResearchSimulator.guide.introduction2"
                        )}
                    </p>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t(
                            "TitanResearchSimulator.guide.usageTitle"
                        )}
                    </h2>

                    <ol className="lh-lg">
                        <li>
                            {t(
                                "TitanResearchSimulator.guide.usage1"
                            )}
                        </li>
                        <li>
                            {t(
                                "TitanResearchSimulator.guide.usage2"
                            )}
                        </li>
                        <li>
                            {t(
                                "TitanResearchSimulator.guide.usage3"
                            )}
                        </li>
                        <li>
                            {t(
                                "TitanResearchSimulator.guide.usage4"
                            )}
                        </li>
                    </ol>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t(
                            "TitanResearchSimulator.guide.methodTitle"
                        )}
                    </h2>

                    <div className="row g-3">
                        <div className="col-12 col-lg-4">
                            <div className="titan-guide-box h-100">
                                <h3 className="h6 fw-bold">
                                    {t(
                                        "TitanResearchSimulator.guide.gradeMethodTitle"
                                    )}
                                </h3>

                                <p className="mb-0">
                                    {t(
                                        "TitanResearchSimulator.guide.gradeMethod"
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="col-12 col-lg-4">
                            <div className="titan-guide-box h-100">
                                <h3 className="h6 fw-bold">
                                    {t(
                                        "TitanResearchSimulator.guide.optionMethodTitle"
                                    )}
                                </h3>

                                <p className="mb-0">
                                    {t(
                                        "TitanResearchSimulator.guide.optionMethod"
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="col-12 col-lg-4">
                            <div className="titan-guide-box h-100">
                                <h3 className="h6 fw-bold">
                                    {t(
                                        "TitanResearchSimulator.guide.specialMethodTitle"
                                    )}
                                </h3>

                                <p className="mb-0">
                                    {t(
                                        "TitanResearchSimulator.guide.specialMethod"
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t(
                            "TitanResearchSimulator.guide.specialRateTitle"
                        )}
                    </h2>

                    <p>
                        {t(
                            "TitanResearchSimulator.guide.specialRateDescription",
                            {
                                part: getPartName(
                                    activePart
                                ),
                            }
                        )}
                    </p>

                    <div className="table-responsive">
                        <table className="table table-bordered align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th scope="col">
                                        {t(
                                            "TitanResearchSimulator.guide.effect"
                                        )}
                                    </th>

                                    <th
                                        scope="col"
                                        className="text-end"
                                    >
                                        {t(
                                            "TitanResearchSimulator.guide.goldConditionalRate"
                                        )}
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {Object.entries(
                                    specialEffectRates
                                ).map(
                                    ([
                                        effect,
                                        rate,
                                    ]) => (
                                        <tr
                                            key={
                                                effect
                                            }
                                        >
                                            <td>
                                                {getSpecialEffectName(
                                                    effect
                                                )}
                                            </td>

                                            <td className="text-end">
                                                {formatPercent(
                                                    rate
                                                )}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>

                            <tfoot>
                                <tr className="table-secondary">
                                    <th scope="row">
                                        {t(
                                            "TitanResearchSimulator.guide.total"
                                        )}
                                    </th>

                                    <th className="text-end">
                                        {formatPercent(
                                            specialEffectConditionalRate
                                        )}
                                    </th>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t(
                            "TitanResearchSimulator.guide.cautionTitle"
                        )}
                    </h2>

                    <ul className="lh-lg mb-0">
                        <li>
                            {t(
                                "TitanResearchSimulator.guide.caution1"
                            )}
                        </li>
                        <li>
                            {t(
                                "TitanResearchSimulator.guide.caution2"
                            )}
                        </li>
                        <li>
                            {t(
                                "TitanResearchSimulator.guide.caution3"
                            )}
                        </li>
                        <li>
                            {t(
                                "TitanResearchSimulator.guide.caution4"
                            )}
                        </li>
                    </ul>
                </div>
            </section>

            <section className="card titan-research-card border-0 shadow-sm mt-4">
                <div className="card-body p-4 p-lg-5">
                    <h2 className="h3 fw-bold mb-4">
                        {t(
                            "TitanResearchSimulator.faq.title"
                        )}
                    </h2>

                    <div
                        className="accordion"
                        id="titanResearchFaq"
                    >
                        {[1, 2, 3].map(
                            (number) => (
                                <div
                                    className="accordion-item"
                                    key={
                                        number
                                    }
                                >
                                    <h3
                                        className="accordion-header"
                                        id={`titan-faq-heading-${number}`}
                                    >
                                        <button
                                            className={`accordion-button ${
                                                number ===
                                                1
                                                    ? ""
                                                    : "collapsed"
                                            }`}
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target={`#titan-faq-${number}`}
                                            aria-expanded={
                                                number ===
                                                1
                                            }
                                            aria-controls={`titan-faq-${number}`}
                                        >
                                            {t(
                                                `TitanResearchSimulator.faq.question${number}`
                                            )}
                                        </button>
                                    </h3>

                                    <div
                                        id={`titan-faq-${number}`}
                                        className={`accordion-collapse collapse ${
                                            number ===
                                            1
                                                ? "show"
                                                : ""
                                        }`}
                                        aria-labelledby={`titan-faq-heading-${number}`}
                                        data-bs-parent="#titanResearchFaq"
                                    >
                                        <div className="accordion-body">
                                            {t(
                                                `TitanResearchSimulator.faq.answer${number}`
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
};

export default TitanResearchSimulator;
