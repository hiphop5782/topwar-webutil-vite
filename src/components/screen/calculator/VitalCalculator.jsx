import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import VitalInfo from "@src/assets/images/vital-info.png";
import VitalInfo2 from "@src/assets/images/vital-info2.png";

const DEFAULT_VALUES = {
    vitSpeed: "111.0",
    baseSpeed: "91.0",
    addSpeed: "8.0",
};

function VitalCalculator() {
    const { t, i18n } = useTranslation("viewer");

    const [vitSpeed, setVitSpeed] = useState(DEFAULT_VALUES.vitSpeed);
    const [baseSpeed, setBaseSpeed] = useState(DEFAULT_VALUES.baseSpeed);
    const [addSpeed, setAddSpeed] = useState(DEFAULT_VALUES.addSpeed);

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
        () =>
            new Intl.NumberFormat(currentLocale, {
                maximumFractionDigits: 2,
            }),
        [currentLocale]
    );

    const percentFormatter = useMemo(
        () =>
            new Intl.NumberFormat(currentLocale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }),
        [currentLocale]
    );

    const parseInput = (value) => {
        if (value === "") {
            return null;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const calculateRecoverySeconds = (
        totalRecoverySpeed,
        baseRecoverySpeed
    ) => {
        if (
            totalRecoverySpeed === null ||
            baseRecoverySpeed === null
        ) {
            return null;
        }

        const denominator = 100 + baseRecoverySpeed;

        if (denominator <= 0) {
            return null;
        }

        const seconds =
            ((100 -
                totalRecoverySpeed +
                baseRecoverySpeed) /
                denominator) *
            360;

        return Math.max(0, seconds);
    };

    const values = useMemo(
        () => ({
            vitSpeed: parseInput(vitSpeed),
            baseSpeed: parseInput(baseSpeed),
            addSpeed: parseInput(addSpeed),
        }),
        [vitSpeed, baseSpeed, addSpeed]
    );

    const currentRecoverySeconds = useMemo(
        () =>
            calculateRecoverySeconds(
                values.vitSpeed,
                values.baseSpeed
            ),
        [values.vitSpeed, values.baseSpeed]
    );

    const futureRecoverySeconds = useMemo(() => {
        if (
            values.vitSpeed === null ||
            values.baseSpeed === null ||
            values.addSpeed === null
        ) {
            return null;
        }

        return calculateRecoverySeconds(
            values.vitSpeed + values.addSpeed,
            values.baseSpeed + values.addSpeed
        );
    }, [
        values.vitSpeed,
        values.baseSpeed,
        values.addSpeed,
    ]);

    const comparison = useMemo(() => {
        if (
            currentRecoverySeconds === null ||
            futureRecoverySeconds === null
        ) {
            return {
                reducedSeconds: null,
                improvementPercent: null,
                currentPerHour: null,
                futurePerHour: null,
                currentPerDay: null,
                futurePerDay: null,
            };
        }

        const reducedSeconds = Math.max(
            currentRecoverySeconds - futureRecoverySeconds,
            0
        );

        const improvementPercent =
            currentRecoverySeconds > 0
                ? (reducedSeconds /
                      currentRecoverySeconds) *
                  100
                : 0;

        return {
            reducedSeconds,
            improvementPercent,
            currentPerHour:
                currentRecoverySeconds > 0
                    ? 3600 / currentRecoverySeconds
                    : null,
            futurePerHour:
                futureRecoverySeconds > 0
                    ? 3600 / futureRecoverySeconds
                    : null,
            currentPerDay:
                currentRecoverySeconds > 0
                    ? 86400 / currentRecoverySeconds
                    : null,
            futurePerDay:
                futureRecoverySeconds > 0
                    ? 86400 / futureRecoverySeconds
                    : null,
        };
    }, [currentRecoverySeconds, futureRecoverySeconds]);

    const isValid =
        currentRecoverySeconds !== null &&
        futureRecoverySeconds !== null;

    const formatDuration = (seconds) => {
        if (seconds === null) {
            return t("VitalCalculator.format.invalid");
        }

        const roundedSeconds = Math.max(
            0,
            Math.round(seconds)
        );

        const minutes = Math.floor(roundedSeconds / 60);
        const remainingSeconds = roundedSeconds % 60;

        return t("VitalCalculator.format.duration", {
            minutes: numberFormatter.format(minutes),
            seconds: numberFormatter.format(
                remainingSeconds
            ),
        });
    };

    const formatSeconds = (seconds) => {
        if (seconds === null) {
            return "-";
        }

        return t("VitalCalculator.format.seconds", {
            value: numberFormatter.format(seconds),
        });
    };

    const formatPercent = (value) => {
        if (value === null) {
            return "-";
        }

        return t("VitalCalculator.format.percent", {
            value: percentFormatter.format(value),
        });
    };

    const formatRecoveryCount = (value) => {
        if (value === null) {
            return "-";
        }

        return t("VitalCalculator.format.recoveryCount", {
            value: numberFormatter.format(value),
        });
    };

    const resetCalculator = () => {
        setVitSpeed(DEFAULT_VALUES.vitSpeed);
        setBaseSpeed(DEFAULT_VALUES.baseSpeed);
        setAddSpeed(DEFAULT_VALUES.addSpeed);
    };

    return (
        <main className="container py-4">
            <header className="row mb-4">
                <div className="col-12">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3 border-bottom pb-3">
                        <div>
                            <h1 className="fw-bold mb-2">
                                {t(
                                    "VitalCalculator.header.title"
                                )}
                            </h1>

                            <p className="text-secondary mb-0">
                                {t(
                                    "VitalCalculator.header.description"
                                )}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={resetCalculator}
                        >
                            {t(
                                "VitalCalculator.buttons.reset"
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <div className="row g-4 align-items-start">
                <div className="col-12 col-lg-8">
                    <section
                        className="card border-0 shadow-sm mb-4"
                        aria-labelledby="current-vital-title"
                    >
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start gap-3 mb-3">
                                <span className="badge rounded-pill text-bg-primary fs-6">
                                    1
                                </span>

                                <div>
                                    <h2
                                        id="current-vital-title"
                                        className="h4 fw-bold mb-1"
                                    >
                                        {t(
                                            "VitalCalculator.current.title"
                                        )}
                                    </h2>

                                    <p className="small text-secondary mb-0">
                                        {t(
                                            "VitalCalculator.current.description"
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="text-center mb-4">
                                <img
                                    src={VitalInfo}
                                    className="img-fluid rounded border"
                                    style={{
                                        maxWidth: "400px",
                                    }}
                                    alt={t(
                                        "VitalCalculator.current.imageAlt"
                                    )}
                                />
                            </div>

                            <div className="row g-3">
                                <div className="col-12 col-md-6">
                                    <label
                                        htmlFor="vital-speed"
                                        className="form-label fw-semibold"
                                    >
                                        {t(
                                            "VitalCalculator.current.totalSpeedLabel"
                                        )}
                                    </label>

                                    <div className="input-group">
                                        <input
                                            id="vital-speed"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            inputMode="decimal"
                                            className="form-control form-control-lg text-end"
                                            value={vitSpeed}
                                            onChange={(event) =>
                                                setVitSpeed(
                                                    event.target
                                                        .value
                                                )
                                            }
                                            placeholder={t(
                                                "VitalCalculator.current.totalSpeedPlaceholder"
                                            )}
                                        />

                                        <span className="input-group-text">
                                            %
                                        </span>
                                    </div>
                                </div>

                                <div className="col-12 col-md-6">
                                    <label
                                        htmlFor="base-speed"
                                        className="form-label fw-semibold"
                                    >
                                        {t(
                                            "VitalCalculator.current.baseSpeedLabel"
                                        )}
                                    </label>

                                    <div className="input-group">
                                        <input
                                            id="base-speed"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            inputMode="decimal"
                                            className="form-control form-control-lg text-end"
                                            value={baseSpeed}
                                            onChange={(event) =>
                                                setBaseSpeed(
                                                    event.target
                                                        .value
                                                )
                                            }
                                            placeholder={t(
                                                "VitalCalculator.current.baseSpeedPlaceholder"
                                            )}
                                        />

                                        <span className="input-group-text">
                                            %
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="alert alert-success mt-4 mb-0">
                                <div className="small mb-1">
                                    {t(
                                        "VitalCalculator.current.resultLabel"
                                    )}
                                </div>

                                <strong className="fs-4">
                                    {formatDuration(
                                        currentRecoverySeconds
                                    )}
                                </strong>

                                <div className="small mt-1">
                                    {t(
                                        "VitalCalculator.current.resultDescription"
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section
                        className="card border-0 shadow-sm"
                        aria-labelledby="decoration-title"
                    >
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start gap-3 mb-3">
                                <span className="badge rounded-pill text-bg-danger fs-6">
                                    2
                                </span>

                                <div>
                                    <h2
                                        id="decoration-title"
                                        className="h4 fw-bold mb-1"
                                    >
                                        {t(
                                            "VitalCalculator.decoration.title"
                                        )}
                                    </h2>

                                    <p className="small text-secondary mb-0">
                                        {t(
                                            "VitalCalculator.decoration.description"
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="text-center mb-4">
                                <img
                                    src={VitalInfo2}
                                    className="img-fluid rounded border"
                                    style={{
                                        maxWidth: "350px",
                                    }}
                                    alt={t(
                                        "VitalCalculator.decoration.imageAlt"
                                    )}
                                />
                            </div>

                            <label
                                htmlFor="additional-speed"
                                className="form-label fw-semibold"
                            >
                                {t(
                                    "VitalCalculator.decoration.addSpeedLabel"
                                )}
                            </label>

                            <div className="input-group">
                                <input
                                    id="additional-speed"
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    inputMode="decimal"
                                    className="form-control form-control-lg text-end"
                                    value={addSpeed}
                                    onChange={(event) =>
                                        setAddSpeed(
                                            event.target.value
                                        )
                                    }
                                    placeholder={t(
                                        "VitalCalculator.decoration.addSpeedPlaceholder"
                                    )}
                                />

                                <span className="input-group-text">
                                    %
                                </span>
                            </div>

                            <div className="alert alert-danger mt-4 mb-0">
                                <div className="small mb-1">
                                    {t(
                                        "VitalCalculator.decoration.resultLabel"
                                    )}
                                </div>

                                <strong className="fs-4">
                                    {formatDuration(
                                        futureRecoverySeconds
                                    )}
                                </strong>

                                <div className="small mt-1">
                                    {t(
                                        "VitalCalculator.decoration.resultDescription"
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="col-12 col-lg-4">
                    <aside
                        className="card border-0 shadow-sm position-sticky"
                        style={{ top: "1rem" }}
                        aria-labelledby="comparison-title"
                    >
                        <div className="card-body p-4">
                            <h2
                                id="comparison-title"
                                className="h4 fw-bold mb-4"
                            >
                                {t(
                                    "VitalCalculator.comparison.title"
                                )}
                            </h2>

                            {!isValid ? (
                                <div className="alert alert-warning mb-0">
                                    {t(
                                        "VitalCalculator.validation.invalid"
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="border rounded p-3 mb-3">
                                        <div className="small text-secondary">
                                            {t(
                                                "VitalCalculator.comparison.currentInterval"
                                            )}
                                        </div>

                                        <div className="fs-5 fw-bold text-success">
                                            {formatDuration(
                                                currentRecoverySeconds
                                            )}
                                        </div>
                                    </div>

                                    <div className="border rounded p-3 mb-4">
                                        <div className="small text-secondary">
                                            {t(
                                                "VitalCalculator.comparison.futureInterval"
                                            )}
                                        </div>

                                        <div className="fs-5 fw-bold text-danger">
                                            {formatDuration(
                                                futureRecoverySeconds
                                            )}
                                        </div>
                                    </div>

                                    <dl className="row mb-0">
                                        <dt className="col-7 fw-normal text-secondary">
                                            {t(
                                                "VitalCalculator.comparison.reducedTime"
                                            )}
                                        </dt>
                                        <dd className="col-5 text-end fw-semibold">
                                            {formatSeconds(
                                                comparison.reducedSeconds
                                            )}
                                        </dd>

                                        <dt className="col-7 fw-normal text-secondary">
                                            {t(
                                                "VitalCalculator.comparison.improvement"
                                            )}
                                        </dt>
                                        <dd className="col-5 text-end fw-semibold">
                                            {formatPercent(
                                                comparison.improvementPercent
                                            )}
                                        </dd>

                                        <dt className="col-7 fw-normal text-secondary">
                                            {t(
                                                "VitalCalculator.comparison.currentPerHour"
                                            )}
                                        </dt>
                                        <dd className="col-5 text-end">
                                            {formatRecoveryCount(
                                                comparison.currentPerHour
                                            )}
                                        </dd>

                                        <dt className="col-7 fw-normal text-secondary">
                                            {t(
                                                "VitalCalculator.comparison.futurePerHour"
                                            )}
                                        </dt>
                                        <dd className="col-5 text-end fw-semibold text-danger">
                                            {formatRecoveryCount(
                                                comparison.futurePerHour
                                            )}
                                        </dd>

                                        <dt className="col-7 fw-normal text-secondary">
                                            {t(
                                                "VitalCalculator.comparison.currentPerDay"
                                            )}
                                        </dt>
                                        <dd className="col-5 text-end">
                                            {formatRecoveryCount(
                                                comparison.currentPerDay
                                            )}
                                        </dd>

                                        <dt className="col-7 fw-normal text-secondary">
                                            {t(
                                                "VitalCalculator.comparison.futurePerDay"
                                            )}
                                        </dt>
                                        <dd className="col-5 text-end fw-semibold text-danger">
                                            {formatRecoveryCount(
                                                comparison.futurePerDay
                                            )}
                                        </dd>
                                    </dl>

                                    <div className="alert alert-light border mt-4 mb-0 small">
                                        {t(
                                            "VitalCalculator.comparison.theoreticalNotice"
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            <section className="card border-0 shadow-sm mt-5">
                <div className="card-body p-4 p-lg-5">
                    <h2 className="h3 fw-bold mb-3">
                        {t(
                            "VitalCalculator.guide.introductionTitle"
                        )}
                    </h2>

                    <p>
                        {t(
                            "VitalCalculator.guide.introduction1"
                        )}
                    </p>

                    <p>
                        {t(
                            "VitalCalculator.guide.introduction2"
                        )}
                    </p>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t("VitalCalculator.guide.usageTitle")}
                    </h2>

                    <ol className="lh-lg">
                        <li>
                            {t(
                                "VitalCalculator.guide.usage1"
                            )}
                        </li>
                        <li>
                            {t(
                                "VitalCalculator.guide.usage2"
                            )}
                        </li>
                        <li>
                            {t(
                                "VitalCalculator.guide.usage3"
                            )}
                        </li>
                        <li>
                            {t(
                                "VitalCalculator.guide.usage4"
                            )}
                        </li>
                    </ol>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t(
                            "VitalCalculator.guide.formulaTitle"
                        )}
                    </h2>

                    <p>
                        {t(
                            "VitalCalculator.guide.formulaDescription"
                        )}
                    </p>

                    <div className="bg-light border rounded p-3 mb-3">
                        <div className="fw-semibold mb-2">
                            {t(
                                "VitalCalculator.guide.currentFormulaTitle"
                            )}
                        </div>

                        <code>
                            {t(
                                "VitalCalculator.guide.currentFormula"
                            )}
                        </code>
                    </div>

                    <div className="bg-light border rounded p-3">
                        <div className="fw-semibold mb-2">
                            {t(
                                "VitalCalculator.guide.futureFormulaTitle"
                            )}
                        </div>

                        <code>
                            {t(
                                "VitalCalculator.guide.futureFormula"
                            )}
                        </code>
                    </div>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t(
                            "VitalCalculator.guide.cautionTitle"
                        )}
                    </h2>

                    <ul className="lh-lg mb-0">
                        <li>
                            {t(
                                "VitalCalculator.guide.caution1"
                            )}
                        </li>
                        <li>
                            {t(
                                "VitalCalculator.guide.caution2"
                            )}
                        </li>
                        <li>
                            {t(
                                "VitalCalculator.guide.caution3"
                            )}
                        </li>
                        <li>
                            {t(
                                "VitalCalculator.guide.caution4"
                            )}
                        </li>
                    </ul>
                </div>
            </section>

            <section className="card border-0 shadow-sm mt-4">
                <div className="card-body p-4 p-lg-5">
                    <h2 className="h3 fw-bold mb-4">
                        {t("VitalCalculator.faq.title")}
                    </h2>

                    <div className="accordion" id="vitalCalculatorFaq">
                        {[1, 2, 3].map((number) => (
                            <div
                                className="accordion-item"
                                key={number}
                            >
                                <h3
                                    className="accordion-header"
                                    id={`vital-faq-heading-${number}`}
                                >
                                    <button
                                        className={`accordion-button ${
                                            number === 1
                                                ? ""
                                                : "collapsed"
                                        }`}
                                        type="button"
                                        data-bs-toggle="collapse"
                                        data-bs-target={`#vital-faq-${number}`}
                                        aria-expanded={
                                            number === 1
                                        }
                                        aria-controls={`vital-faq-${number}`}
                                    >
                                        {t(
                                            `VitalCalculator.faq.question${number}`
                                        )}
                                    </button>
                                </h3>

                                <div
                                    id={`vital-faq-${number}`}
                                    className={`accordion-collapse collapse ${
                                        number === 1
                                            ? "show"
                                            : ""
                                    }`}
                                    aria-labelledby={`vital-faq-heading-${number}`}
                                    data-bs-parent="#vitalCalculatorFaq"
                                >
                                    <div className="accordion-body">
                                        {t(
                                            `VitalCalculator.faq.answer${number}`
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}

export default VitalCalculator;