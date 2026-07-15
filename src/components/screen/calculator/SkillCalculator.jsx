import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

const SKILL_PRICE_OPTIONS = [
    { value: 15, descriptionKey: "dianaCrusoe" },
    { value: 20, descriptionKey: "tsuruBessel" },
    { value: 23, descriptionKey: "violet" },
    { value: 25, descriptionKey: "mostCombatHeroes" },
    { value: 30, descriptionKey: "villiersSilenceAmalia" },
];

const SKILL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function SkillCalculator() {
    const { t, i18n } = useTranslation("viewer");

    const [skillPrice, setSkillPrice] = useState(25);
    const [dstSkillLevel, setDstSkillLevel] = useState(7);

    const [hasShard, setHasShard] = useState(false);
    const [hasShardCount, setHasShardCount] = useState(0);

    const [hasSkill, setHasSkill] = useState(false);
    const [hasSkillCount, setHasSkillCount] = useState(
        Array(6).fill(0)
    );

    useEffect(() => {
        const inputCount = Math.max(dstSkillLevel - 1, 0);

        setHasSkillCount((previous) =>
            Array.from(
                { length: inputCount },
                (_, index) => previous[index] ?? 0
            )
        );
    }, [dstSkillLevel]);

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
    }, [i18n.resolvedLanguage, i18n.language]);

    const numberFormatter = useMemo(
        () => new Intl.NumberFormat(currentLocale),
        [currentLocale]
    );

    const requiredShardCount = useMemo(() => {
        return skillPrice * Math.pow(3, dstSkillLevel - 1);
    }, [skillPrice, dstSkillLevel]);

    const ownedSkillShardCount = useMemo(() => {
        if (!hasSkill) {
            return 0;
        }

        return hasSkillCount.reduce((total, count, index) => {
            const skillLevel = index + 1;
            const shardValue =
                skillPrice * Math.pow(3, skillLevel - 1);

            return total + count * shardValue;
        }, 0);
    }, [hasSkill, hasSkillCount, skillPrice]);

    const ownedNormalShardCount = useMemo(() => {
        return hasShard ? hasShardCount : 0;
    }, [hasShard, hasShardCount]);

    const totalOwnedShardCount = useMemo(() => {
        return ownedSkillShardCount + ownedNormalShardCount;
    }, [ownedSkillShardCount, ownedNormalShardCount]);

    const shortageShardCount = useMemo(() => {
        return Math.max(
            requiredShardCount - totalOwnedShardCount,
            0
        );
    }, [requiredShardCount, totalOwnedShardCount]);

    const surplusShardCount = useMemo(() => {
        return Math.max(
            totalOwnedShardCount - requiredShardCount,
            0
        );
    }, [requiredShardCount, totalOwnedShardCount]);

    const progressPercent = useMemo(() => {
        if (requiredShardCount === 0) {
            return 0;
        }

        return Math.min(
            (totalOwnedShardCount / requiredShardCount) * 100,
            100
        );
    }, [totalOwnedShardCount, requiredShardCount]);

    const canCreateSkill =
        totalOwnedShardCount >= requiredShardCount;

    const formatCount = (value) =>
        t("SkillCalculator.format.count", {
            value: numberFormatter.format(value),
        });

    const formatLevel = (value) =>
        t("SkillCalculator.format.level", {
            value: numberFormatter.format(value),
        });

    const changeHasSkillCount = (index, value) => {
        const count = Math.max(0, Number(value) || 0);

        setHasSkillCount((previous) =>
            previous.map((item, currentIndex) =>
                currentIndex === index ? count : item
            )
        );
    };

    const resetCalculator = () => {
        setSkillPrice(25);
        setDstSkillLevel(7);
        setHasShard(false);
        setHasShardCount(0);
        setHasSkill(false);
        setHasSkillCount(Array(6).fill(0));
    };

    return (
        <main className="container py-4">
            <header className="row mb-4">
                <div className="col-12">
                    <div className="border-bottom pb-3">
                        <h1 className="fw-bold mb-2">
                            {t("SkillCalculator.header.title")}
                        </h1>

                        <p className="text-secondary mb-0">
                            {t("SkillCalculator.header.description")}
                        </p>
                    </div>
                </div>
            </header>

            <div className="row g-4 align-items-start">
                <div className="col-12 col-lg-8">
                    <section
                        className="card border-0 shadow-sm"
                        aria-labelledby="calculator-title"
                    >
                        <div className="card-body p-4">
                            <h2
                                id="calculator-title"
                                className="h4 fw-bold mb-4"
                            >
                                {t("SkillCalculator.form.title")}
                            </h2>

                            <div className="mb-4">
                                <label
                                    htmlFor="skill-price"
                                    className="form-label fw-semibold"
                                >
                                    {t("SkillCalculator.form.price.label")}
                                </label>

                                <p className="small text-secondary mb-2">
                                    {t("SkillCalculator.form.price.description")}
                                </p>

                                <select
                                    id="skill-price"
                                    className="form-select form-select-lg"
                                    value={skillPrice}
                                    onChange={(event) =>
                                        setSkillPrice(
                                            Number(event.target.value)
                                        )
                                    }
                                >
                                    {SKILL_PRICE_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {t(
                                                "SkillCalculator.form.price.option",
                                                {
                                                    count: numberFormatter.format(
                                                        option.value
                                                    ),
                                                    description: t(
                                                        `SkillCalculator.priceOptions.${option.descriptionKey}`
                                                    ),
                                                }
                                            )}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label
                                    htmlFor="destination-level"
                                    className="form-label fw-semibold"
                                >
                                    {t("SkillCalculator.form.target.label")}
                                </label>

                                <p className="small text-secondary mb-2">
                                    {t("SkillCalculator.form.target.description")}
                                </p>

                                <select
                                    id="destination-level"
                                    className="form-select form-select-lg"
                                    value={dstSkillLevel}
                                    onChange={(event) =>
                                        setDstSkillLevel(
                                            Number(event.target.value)
                                        )
                                    }
                                >
                                    {SKILL_LEVELS.map((level) => (
                                        <option
                                            key={level}
                                            value={level}
                                        >
                                            {formatLevel(level)}
                                        </option>
                                    ))}
                                </select>

                                <div className="alert alert-light border mt-3 mb-0">
                                    <Trans
                                        ns="viewer"
                                        i18nKey="SkillCalculator.form.target.required"
                                        values={{
                                            count: numberFormatter.format(
                                                requiredShardCount
                                            ),
                                        }}
                                        components={{
                                            strong: (
                                                <strong className="text-primary" />
                                            ),
                                        }}
                                    />
                                </div>
                            </div>

                            <hr className="my-4" />

                            <fieldset className="mb-4">
                                <legend className="h6 fw-semibold">
                                    {t("SkillCalculator.form.ownedShard.title")}
                                </legend>

                                <div className="form-check form-switch mb-3">
                                    <input
                                        id="has-shard"
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        checked={hasShard}
                                        onChange={(event) =>
                                            setHasShard(
                                                event.target.checked
                                            )
                                        }
                                    />

                                    <label
                                        className="form-check-label"
                                        htmlFor="has-shard"
                                    >
                                        {t(
                                            "SkillCalculator.form.ownedShard.toggle"
                                        )}
                                    </label>
                                </div>

                                {hasShard && (
                                    <div>
                                        <label
                                            htmlFor="shard-count"
                                            className="form-label"
                                        >
                                            {t(
                                                "SkillCalculator.form.ownedShard.countLabel"
                                            )}
                                        </label>

                                        <div className="input-group">
                                            <input
                                                id="shard-count"
                                                type="number"
                                                min="0"
                                                step="1"
                                                className="form-control form-control-lg text-end"
                                                value={hasShardCount}
                                                onChange={(event) =>
                                                    setHasShardCount(
                                                        Math.max(
                                                            0,
                                                            Number(
                                                                event.target
                                                                    .value
                                                            ) || 0
                                                        )
                                                    )
                                                }
                                            />

                                            <span className="input-group-text">
                                                {t(
                                                    "SkillCalculator.units.shard"
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </fieldset>

                            <hr className="my-4" />

                            <fieldset>
                                <legend className="h6 fw-semibold">
                                    {t("SkillCalculator.form.ownedSkill.title")}
                                </legend>

                                <div className="form-check form-switch mb-3">
                                    <input
                                        id="has-skill"
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        checked={hasSkill}
                                        onChange={(event) =>
                                            setHasSkill(
                                                event.target.checked
                                            )
                                        }
                                    />

                                    <label
                                        className="form-check-label"
                                        htmlFor="has-skill"
                                    >
                                        {t(
                                            "SkillCalculator.form.ownedSkill.toggle"
                                        )}
                                    </label>
                                </div>

                                {hasSkill && dstSkillLevel === 1 && (
                                    <div className="alert alert-secondary mb-0">
                                        {t(
                                            "SkillCalculator.form.ownedSkill.noLowerLevel"
                                        )}
                                    </div>
                                )}

                                {hasSkill &&
                                    hasSkillCount.length > 0 && (
                                        <div className="row g-3">
                                            {hasSkillCount.map(
                                                (count, index) => {
                                                    const level =
                                                        index + 1;

                                                    const convertedCount =
                                                        count *
                                                        skillPrice *
                                                        Math.pow(
                                                            3,
                                                            level - 1
                                                        );

                                                    return (
                                                        <div
                                                            className="col-12 col-md-6"
                                                            key={level}
                                                        >
                                                            <label
                                                                htmlFor={`skill-level-${level}`}
                                                                className="form-label"
                                                            >
                                                                {t(
                                                                    "SkillCalculator.form.ownedSkill.levelLabel",
                                                                    {
                                                                        level: numberFormatter.format(
                                                                            level
                                                                        ),
                                                                    }
                                                                )}
                                                            </label>

                                                            <div className="input-group">
                                                                <input
                                                                    id={`skill-level-${level}`}
                                                                    type="number"
                                                                    min="0"
                                                                    step="1"
                                                                    className="form-control text-end"
                                                                    value={
                                                                        count
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        changeHasSkillCount(
                                                                            index,
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                />

                                                                <span className="input-group-text">
                                                                    {t(
                                                                        "SkillCalculator.units.skill"
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <div className="form-text text-end">
                                                                {t(
                                                                    "SkillCalculator.form.ownedSkill.convertedValue",
                                                                    {
                                                                        count: numberFormatter.format(
                                                                            convertedCount
                                                                        ),
                                                                    }
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </div>
                                    )}

                                {hasSkill && (
                                    <div className="alert alert-light border mt-3 mb-0">
                                        <Trans
                                            ns="viewer"
                                            i18nKey="SkillCalculator.form.ownedSkill.convertedTotal"
                                            values={{
                                                count: numberFormatter.format(
                                                    ownedSkillShardCount
                                                ),
                                            }}
                                            components={{
                                                strong: <strong />,
                                            }}
                                        />
                                    </div>
                                )}
                            </fieldset>
                        </div>
                    </section>
                </div>

                <div className="col-12 col-lg-4">
                    <aside
                        className="card border-0 shadow-sm position-sticky"
                        style={{ top: "1rem" }}
                        aria-labelledby="result-title"
                    >
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h2
                                    id="result-title"
                                    className="h4 fw-bold mb-0"
                                >
                                    {t("SkillCalculator.result.title")}
                                </h2>

                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={resetCalculator}
                                >
                                    {t("SkillCalculator.buttons.reset")}
                                </button>
                            </div>

                            <dl className="row mb-3">
                                <dt className="col-7 fw-normal text-secondary">
                                    {t("SkillCalculator.result.targetLevel")}
                                </dt>
                                <dd className="col-5 text-end fw-semibold">
                                    {formatLevel(dstSkillLevel)}
                                </dd>

                                <dt className="col-7 fw-normal text-secondary">
                                    {t("SkillCalculator.result.requiredTotal")}
                                </dt>
                                <dd className="col-5 text-end fw-semibold">
                                    {formatCount(requiredShardCount)}
                                </dd>

                                <dt className="col-7 fw-normal text-secondary">
                                    {t("SkillCalculator.result.ownedShards")}
                                </dt>
                                <dd className="col-5 text-end">
                                    {formatCount(ownedNormalShardCount)}
                                </dd>

                                <dt className="col-7 fw-normal text-secondary">
                                    {t("SkillCalculator.result.skillValue")}
                                </dt>
                                <dd className="col-5 text-end">
                                    {formatCount(ownedSkillShardCount)}
                                </dd>

                                <dt className="col-7 fw-normal text-secondary">
                                    {t("SkillCalculator.result.totalOwnedValue")}
                                </dt>
                                <dd className="col-5 text-end fw-bold">
                                    {formatCount(totalOwnedShardCount)}
                                </dd>
                            </dl>

                            <div
                                className="progress mb-2"
                                style={{ height: "12px" }}
                                role="progressbar"
                                aria-label={t(
                                    "SkillCalculator.aria.progress"
                                )}
                                aria-valuenow={Math.round(
                                    progressPercent
                                )}
                                aria-valuemin="0"
                                aria-valuemax="100"
                            >
                                <div
                                    className={`progress-bar ${
                                        canCreateSkill
                                            ? "bg-success"
                                            : ""
                                    }`}
                                    style={{
                                        width: `${progressPercent}%`,
                                    }}
                                />
                            </div>

                            <p className="small text-secondary text-end mb-4">
                                {t(
                                    "SkillCalculator.result.progress",
                                    {
                                        percent: numberFormatter.format(
                                            Math.round(progressPercent)
                                        ),
                                    }
                                )}
                            </p>

                            {canCreateSkill ? (
                                <div
                                    className="alert alert-success mb-0"
                                    role="status"
                                >
                                    <div className="fw-bold mb-1">
                                        {t(
                                            "SkillCalculator.result.successTitle"
                                        )}
                                    </div>

                                    <div>
                                        <Trans
                                            ns="viewer"
                                            i18nKey="SkillCalculator.result.successRemaining"
                                            values={{
                                                count: numberFormatter.format(
                                                    surplusShardCount
                                                ),
                                            }}
                                            components={{
                                                strong: <strong />,
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="alert alert-danger mb-0"
                                    role="status"
                                >
                                    <div className="fw-bold mb-1">
                                        {t(
                                            "SkillCalculator.result.shortageTitle"
                                        )}
                                    </div>

                                    <div className="fs-5">
                                        <Trans
                                            ns="viewer"
                                            i18nKey="SkillCalculator.result.shortageAmount"
                                            values={{
                                                count: numberFormatter.format(
                                                    shortageShardCount
                                                ),
                                            }}
                                            components={{
                                                strong: <strong />,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            <section className="row mt-5">
                <div className="col-12">
                    <article className="card border-0 shadow-sm">
                        <div className="card-body p-4 p-lg-5">
                            <h2 className="h3 fw-bold mb-3">
                                {t(
                                    "SkillCalculator.guide.introductionTitle"
                                )}
                            </h2>

                            <p>
                                {t(
                                    "SkillCalculator.guide.introduction1"
                                )}
                            </p>

                            <p>
                                {t(
                                    "SkillCalculator.guide.introduction2"
                                )}
                            </p>

                            <hr className="my-4" />

                            <h2 className="h4 fw-bold">
                                {t("SkillCalculator.guide.usageTitle")}
                            </h2>

                            <ol className="lh-lg">
                                <li>
                                    {t("SkillCalculator.guide.usage1")}
                                </li>
                                <li>
                                    {t("SkillCalculator.guide.usage2")}
                                </li>
                                <li>
                                    {t("SkillCalculator.guide.usage3")}
                                </li>
                                <li>
                                    {t("SkillCalculator.guide.usage4")}
                                </li>
                                <li>
                                    {t("SkillCalculator.guide.usage5")}
                                </li>
                            </ol>

                            <hr className="my-4" />

                            <h2 className="h4 fw-bold">
                                {t(
                                    "SkillCalculator.guide.calculationTitle"
                                )}
                            </h2>

                            <p>
                                {t(
                                    "SkillCalculator.guide.calculationDescription"
                                )}
                            </p>

                            <div className="bg-light border rounded p-3 mb-3">
                                <div className="fw-semibold mb-2">
                                    {t(
                                        "SkillCalculator.guide.targetFormulaTitle"
                                    )}
                                </div>

                                <code>
                                    {t(
                                        "SkillCalculator.guide.targetFormulaBase"
                                    )}
                                    <sup>
                                        {t(
                                            "SkillCalculator.guide.targetFormulaExponent"
                                        )}
                                    </sup>
                                </code>
                            </div>

                            <div className="bg-light border rounded p-3">
                                <div className="fw-semibold mb-2">
                                    {t(
                                        "SkillCalculator.guide.ownedFormulaTitle"
                                    )}
                                </div>

                                <code>
                                    {t(
                                        "SkillCalculator.guide.ownedFormulaBase"
                                    )}
                                    <sup>
                                        {t(
                                            "SkillCalculator.guide.ownedFormulaExponent"
                                        )}
                                    </sup>
                                </code>
                            </div>

                            <hr className="my-4" />

                            <h2 className="h4 fw-bold">
                                {t(
                                    "SkillCalculator.guide.exampleTitle"
                                )}
                            </h2>

                            <p>
                                {t(
                                    "SkillCalculator.guide.exampleDescription"
                                )}
                            </p>

                            <div className="table-responsive">
                                <table className="table table-bordered align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th scope="col">
                                                {t(
                                                    "SkillCalculator.example.item"
                                                )}
                                            </th>
                                            <th
                                                scope="col"
                                                className="text-end"
                                            >
                                                {t(
                                                    "SkillCalculator.example.calculation"
                                                )}
                                            </th>
                                            <th
                                                scope="col"
                                                className="text-end"
                                            >
                                                {t(
                                                    "SkillCalculator.example.result"
                                                )}
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        <tr>
                                            <td>
                                                {t(
                                                    "SkillCalculator.example.requiredLevel7"
                                                )}
                                            </td>
                                            <td className="text-end">
                                                25 × 3<sup>6</sup>
                                            </td>
                                            <td className="text-end fw-semibold">
                                                {formatCount(18225)}
                                            </td>
                                        </tr>

                                        <tr>
                                            <td>
                                                {t(
                                                    "SkillCalculator.example.ownedLevel5"
                                                )}
                                            </td>
                                            <td className="text-end">
                                                25 × 3<sup>4</sup>
                                            </td>
                                            <td className="text-end fw-semibold">
                                                {formatCount(2025)}
                                            </td>
                                        </tr>

                                        <tr>
                                            <td>
                                                {t(
                                                    "SkillCalculator.example.withExtraShards"
                                                )}
                                            </td>
                                            <td className="text-end">
                                                18,225 - 2,025 -
                                                1,000
                                            </td>
                                            <td className="text-end fw-semibold text-danger">
                                                {t(
                                                    "SkillCalculator.example.shortageResult",
                                                    {
                                                        count: numberFormatter.format(
                                                            15200
                                                        ),
                                                    }
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <hr className="my-4" />

                            <h2 className="h4 fw-bold">
                                {t(
                                    "SkillCalculator.guide.cautionTitle"
                                )}
                            </h2>

                            <ul className="lh-lg mb-0">
                                <li>
                                    {t(
                                        "SkillCalculator.guide.caution1"
                                    )}
                                </li>
                                <li>
                                    {t(
                                        "SkillCalculator.guide.caution2"
                                    )}
                                </li>
                                <li>
                                    {t(
                                        "SkillCalculator.guide.caution3"
                                    )}
                                </li>
                                <li>
                                    {t(
                                        "SkillCalculator.guide.caution4"
                                    )}
                                </li>
                            </ul>
                        </div>
                    </article>
                </div>
            </section>

            <section className="row mt-4">
                <div className="col-12">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body p-4 p-lg-5">
                            <h2 className="h3 fw-bold mb-4">
                                {t("SkillCalculator.faq.title")}
                            </h2>

                            <div
                                className="accordion"
                                id="skillCalculatorFaq"
                            >
                                <div className="accordion-item">
                                    <h3
                                        className="accordion-header"
                                        id="faq-heading-one"
                                    >
                                        <button
                                            className="accordion-button"
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target="#faq-one"
                                            aria-expanded="true"
                                            aria-controls="faq-one"
                                        >
                                            {t(
                                                "SkillCalculator.faq.question1"
                                            )}
                                        </button>
                                    </h3>

                                    <div
                                        id="faq-one"
                                        className="accordion-collapse collapse show"
                                        aria-labelledby="faq-heading-one"
                                        data-bs-parent="#skillCalculatorFaq"
                                    >
                                        <div className="accordion-body">
                                            {t(
                                                "SkillCalculator.faq.answer1"
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="accordion-item">
                                    <h3
                                        className="accordion-header"
                                        id="faq-heading-two"
                                    >
                                        <button
                                            className="accordion-button collapsed"
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target="#faq-two"
                                            aria-expanded="false"
                                            aria-controls="faq-two"
                                        >
                                            {t(
                                                "SkillCalculator.faq.question2"
                                            )}
                                        </button>
                                    </h3>

                                    <div
                                        id="faq-two"
                                        className="accordion-collapse collapse"
                                        aria-labelledby="faq-heading-two"
                                        data-bs-parent="#skillCalculatorFaq"
                                    >
                                        <div className="accordion-body">
                                            {t(
                                                "SkillCalculator.faq.answer2"
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="accordion-item">
                                    <h3
                                        className="accordion-header"
                                        id="faq-heading-three"
                                    >
                                        <button
                                            className="accordion-button collapsed"
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target="#faq-three"
                                            aria-expanded="false"
                                            aria-controls="faq-three"
                                        >
                                            {t(
                                                "SkillCalculator.faq.question3"
                                            )}
                                        </button>
                                    </h3>

                                    <div
                                        id="faq-three"
                                        className="accordion-collapse collapse"
                                        aria-labelledby="faq-heading-three"
                                        data-bs-parent="#skillCalculatorFaq"
                                    >
                                        <div className="accordion-body">
                                            {t(
                                                "SkillCalculator.faq.answer3"
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default SkillCalculator;