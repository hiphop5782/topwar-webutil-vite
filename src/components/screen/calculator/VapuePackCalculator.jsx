import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import "./ValuePackCalculator.css";

const INITIAL_SKILL_SHARD_LIST = [
    { no: 1, price: 7000, count: 40, buy: false, double: false },
    { no: 2, price: 12800, count: 70, buy: false, double: false },
    { no: 3, price: 28500, count: 128, buy: false, double: false },
    { no: 4, price: 70500, count: 328, buy: false, double: false },
    { no: 5, price: 141000, count: 648, buy: false, double: false },
    { no: 6, price: 141000, count: 648, buy: false, double: false },
    { no: 7, price: 141000, count: 648, buy: false, double: false },
    { no: 8, price: 141000, count: 648, buy: false, double: false },
    { no: 9, price: 141000, count: 648, buy: false, double: false },
];

const ValuePackCalculator = () => {
    const { t, i18n } = useTranslation("viewer");

    const [skillShardList, setSkillShardList] = useState(() =>
        INITIAL_SKILL_SHARD_LIST.map((item) => ({ ...item }))
    );

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

    const unitPriceFormatter = useMemo(
        () =>
            new Intl.NumberFormat(currentLocale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }),
        [currentLocale]
    );

    const formatPrice = (value) =>
        t("ValuePackCalculator.format.price", {
            value: numberFormatter.format(value),
        });

    const formatCount = (value) =>
        t("ValuePackCalculator.format.count", {
            value: numberFormatter.format(value),
        });

    const formatUnitPrice = (value) =>
        t("ValuePackCalculator.format.unitPrice", {
            value: unitPriceFormatter.format(value),
        });

    const formatPackageCount = (value) =>
        t("ValuePackCalculator.format.packageCount", {
            value: numberFormatter.format(value),
        });

    const formatCouponCount = (value) =>
        t("ValuePackCalculator.format.couponCount", {
            value: numberFormatter.format(value),
        });

    const changeSkillBuy = (selectedNo, checked) => {
        setSkillShardList((previous) =>
            previous.map((item) => {
                if (checked) {
                    if (item.no <= selectedNo) {
                        return {
                            ...item,
                            buy: true,
                        };
                    }

                    return item;
                }

                if (item.no >= selectedNo) {
                    return {
                        ...item,
                        buy: false,
                        double: false,
                    };
                }

                return item;
            })
        );
    };

    const changeSkillDouble = (selectedNo, checked) => {
        setSkillShardList((previous) =>
            previous.map((item) =>
                item.no === selectedNo
                    ? {
                          ...item,
                          double: checked,
                      }
                    : item
            )
        );
    };

    const skillShardSummary = useMemo(() => {
        return skillShardList.reduce(
            (summary, item) => {
                if (!item.buy) {
                    return summary;
                }

                summary.price += item.price;
                summary.baseCount += item.count;
                summary.purchaseCount += 1;

                if (item.double) {
                    summary.bonusCount += item.count;
                    summary.doubleCouponCount += 1;
                }

                return summary;
            },
            {
                price: 0,
                baseCount: 0,
                bonusCount: 0,
                purchaseCount: 0,
                doubleCouponCount: 0,
            }
        );
    }, [skillShardList]);

    const totalShardCount =
        skillShardSummary.baseCount +
        skillShardSummary.bonusCount;

    const averageUnitPrice =
        totalShardCount > 0
            ? skillShardSummary.price / totalShardCount
            : 0;

    const normalAverageUnitPrice =
        skillShardSummary.baseCount > 0
            ? skillShardSummary.price /
              skillShardSummary.baseCount
            : 0;

    const couponEfficiency = useMemo(() => {
        if (
            normalAverageUnitPrice === 0 ||
            averageUnitPrice === 0
        ) {
            return 0;
        }

        return (
            (1 -
                averageUnitPrice /
                    normalAverageUnitPrice) *
            100
        );
    }, [averageUnitPrice, normalAverageUnitPrice]);

    const resetCalculator = () => {
        setSkillShardList(
            INITIAL_SKILL_SHARD_LIST.map((item) => ({
                ...item,
            }))
        );
    };

    const selectAllPackages = () => {
        setSkillShardList((previous) =>
            previous.map((item) => ({
                ...item,
                buy: true,
            }))
        );
    };

    const applyDoubleCouponToAll = () => {
        setSkillShardList((previous) =>
            previous.map((item) => ({
                ...item,
                double: item.buy,
            }))
        );
    };

    const removeAllDoubleCoupons = () => {
        setSkillShardList((previous) =>
            previous.map((item) => ({
                ...item,
                double: false,
            }))
        );
    };

    return (
        <main className="value-pack-calculator container py-4">
            <header className="value-pack-header mb-4">
                <div>
                    <span className="value-pack-header__badge">
                        {t(
                            "ValuePackCalculator.header.badge"
                        )}
                    </span>

                    <h1 className="fw-bold mt-2 mb-2">
                        {t(
                            "ValuePackCalculator.header.title"
                        )}
                    </h1>

                    <p className="text-secondary mb-0">
                        {t(
                            "ValuePackCalculator.header.description"
                        )}
                    </p>
                </div>
            </header>

            <div className="row g-4 align-items-start">
                <div className="col-12 col-xl-8">
                    <section
                        className="card value-pack-card border-0 shadow-sm"
                        aria-labelledby="skill-package-title"
                    >
                        <div className="card-body p-3 p-lg-4">
                            <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
                                <div>
                                    <h2
                                        id="skill-package-title"
                                        className="h4 fw-bold mb-1"
                                    >
                                        {t(
                                            "ValuePackCalculator.package.title"
                                        )}
                                    </h2>

                                    <p className="small text-secondary mb-0">
                                        {t(
                                            "ValuePackCalculator.package.description"
                                        )}
                                    </p>
                                </div>

                                <div className="d-flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={
                                            selectAllPackages
                                        }
                                    >
                                        {t(
                                            "ValuePackCalculator.buttons.selectAll"
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-success"
                                        onClick={
                                            applyDoubleCouponToAll
                                        }
                                        disabled={
                                            skillShardSummary.purchaseCount ===
                                            0
                                        }
                                    >
                                        {t(
                                            "ValuePackCalculator.buttons.applyDoubleAll"
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={
                                            resetCalculator
                                        }
                                    >
                                        {t(
                                            "ValuePackCalculator.buttons.reset"
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table value-pack-table align-middle mb-0">
                                    <thead className="text-center">
                                        <tr>
                                            <th scope="col">
                                                {t(
                                                    "ValuePackCalculator.table.stage"
                                                )}
                                            </th>
                                            <th scope="col">
                                                {t(
                                                    "ValuePackCalculator.table.price"
                                                )}
                                            </th>
                                            <th scope="col">
                                                {t(
                                                    "ValuePackCalculator.table.baseCount"
                                                )}
                                            </th>
                                            <th scope="col">
                                                {t(
                                                    "ValuePackCalculator.table.appliedCount"
                                                )}
                                            </th>
                                            <th scope="col">
                                                {t(
                                                    "ValuePackCalculator.table.unitPrice"
                                                )}
                                            </th>
                                            <th scope="col">
                                                {t(
                                                    "ValuePackCalculator.table.buy"
                                                )}
                                            </th>
                                            <th scope="col">
                                                {t(
                                                    "ValuePackCalculator.table.doubleCoupon"
                                                )}
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="text-center">
                                        {skillShardList.map(
                                            (data) => {
                                                const appliedCount =
                                                    data.double
                                                        ? data.count *
                                                          2
                                                        : data.count;

                                                const unitPrice =
                                                    data.price /
                                                    appliedCount;

                                                return (
                                                    <tr
                                                        key={
                                                            data.no
                                                        }
                                                        className={
                                                            data.buy
                                                                ? "value-pack-table__selected"
                                                                : ""
                                                        }
                                                    >
                                                        <th scope="row">
                                                            <span className="value-pack-step">
                                                                {
                                                                    data.no
                                                                }
                                                            </span>
                                                        </th>

                                                        <td>
                                                            <strong>
                                                                {formatPrice(
                                                                    data.price
                                                                )}
                                                            </strong>
                                                        </td>

                                                        <td>
                                                            {formatCount(
                                                                data.count
                                                            )}
                                                        </td>

                                                        <td>
                                                            {data.buy ? (
                                                                <span
                                                                    className={
                                                                        data.double
                                                                            ? "fw-bold text-success"
                                                                            : "fw-semibold"
                                                                    }
                                                                >
                                                                    {formatCount(
                                                                        appliedCount
                                                                    )}
                                                                </span>
                                                            ) : (
                                                                <span className="text-secondary">
                                                                    -
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td>
                                                            {data.buy ? (
                                                                formatUnitPrice(
                                                                    unitPrice
                                                                )
                                                            ) : (
                                                                <span className="text-secondary">
                                                                    -
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td>
                                                            <div className="form-check d-flex justify-content-center">
                                                                <input
                                                                    id={`buy-package-${data.no}`}
                                                                    type="checkbox"
                                                                    className="form-check-input value-pack-checkbox"
                                                                    checked={
                                                                        data.buy
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        changeSkillBuy(
                                                                            data.no,
                                                                            event
                                                                                .target
                                                                                .checked
                                                                        )
                                                                    }
                                                                    aria-label={t(
                                                                        "ValuePackCalculator.aria.buy",
                                                                        {
                                                                            stage: data.no,
                                                                        }
                                                                    )}
                                                                />
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <div className="form-check d-flex justify-content-center">
                                                                <input
                                                                    id={`double-package-${data.no}`}
                                                                    type="checkbox"
                                                                    className="form-check-input value-pack-checkbox"
                                                                    checked={
                                                                        data.double
                                                                    }
                                                                    disabled={
                                                                        !data.buy
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        changeSkillDouble(
                                                                            data.no,
                                                                            event
                                                                                .target
                                                                                .checked
                                                                        )
                                                                    }
                                                                    aria-label={t(
                                                                        "ValuePackCalculator.aria.doubleCoupon",
                                                                        {
                                                                            stage: data.no,
                                                                        }
                                                                    )}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                        )}
                                    </tbody>

                                    <tfoot className="text-center">
                                        <tr>
                                            <th scope="row">
                                                {t(
                                                    "ValuePackCalculator.table.total"
                                                )}
                                            </th>

                                            <td className="fw-bold">
                                                {formatPrice(
                                                    skillShardSummary.price
                                                )}
                                            </td>

                                            <td className="fw-bold">
                                                {formatCount(
                                                    skillShardSummary.baseCount
                                                )}
                                            </td>

                                            <td className="fw-bold text-success">
                                                {formatCount(
                                                    totalShardCount
                                                )}
                                            </td>

                                            <td className="fw-bold">
                                                {totalShardCount >
                                                0
                                                    ? formatUnitPrice(
                                                          averageUnitPrice
                                                      )
                                                    : "-"}
                                            </td>

                                            <td colSpan="2">
                                                {formatPackageCount(
                                                    skillShardSummary.purchaseCount
                                                )}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="d-flex justify-content-end mt-3">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-link text-secondary text-decoration-none"
                                    onClick={
                                        removeAllDoubleCoupons
                                    }
                                    disabled={
                                        skillShardSummary.doubleCouponCount ===
                                        0
                                    }
                                >
                                    {t(
                                        "ValuePackCalculator.buttons.removeDoubleAll"
                                    )}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="col-12 col-xl-4">
                    <aside
                        className="card value-pack-card value-pack-summary border-0 shadow-sm"
                        aria-labelledby="summary-title"
                    >
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h2
                                    id="summary-title"
                                    className="h4 fw-bold mb-0"
                                >
                                    {t(
                                        "ValuePackCalculator.summary.title"
                                    )}
                                </h2>

                                <span className="badge text-bg-primary">
                                    {t(
                                        "ValuePackCalculator.format.stage",
                                        {
                                            value: numberFormatter.format(
                                                skillShardSummary.purchaseCount
                                            ),
                                        }
                                    )}
                                </span>
                            </div>

                            {skillShardSummary.purchaseCount ===
                            0 ? (
                                <div className="value-pack-empty text-center py-4">
                                    <div className="value-pack-empty__icon mb-3">
                                        ₩
                                    </div>

                                    <p className="fw-semibold mb-1">
                                        {t(
                                            "ValuePackCalculator.summary.emptyTitle"
                                        )}
                                    </p>

                                    <p className="small text-secondary mb-0">
                                        {t(
                                            "ValuePackCalculator.summary.emptyDescription"
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="value-pack-result-main mb-4">
                                        <span className="small">
                                            {t(
                                                "ValuePackCalculator.summary.expectedPayment"
                                            )}
                                        </span>

                                        <strong>
                                            {formatPrice(
                                                skillShardSummary.price
                                            )}
                                        </strong>
                                    </div>

                                    <dl className="row value-pack-summary-list mb-4">
                                        <dt className="col-7">
                                            {t(
                                                "ValuePackCalculator.summary.purchasePackages"
                                            )}
                                        </dt>
                                        <dd className="col-5 text-end">
                                            {formatPackageCount(
                                                skillShardSummary.purchaseCount
                                            )}
                                        </dd>

                                        <dt className="col-7">
                                            {t(
                                                "ValuePackCalculator.summary.baseShards"
                                            )}
                                        </dt>
                                        <dd className="col-5 text-end">
                                            {formatCount(
                                                skillShardSummary.baseCount
                                            )}
                                        </dd>

                                        <dt className="col-7">
                                            {t(
                                                "ValuePackCalculator.summary.bonusShards"
                                            )}
                                        </dt>
                                        <dd className="col-5 text-end text-success fw-semibold">
                                            +
                                            {formatCount(
                                                skillShardSummary.bonusCount
                                            )}
                                        </dd>

                                        <dt className="col-7">
                                            {t(
                                                "ValuePackCalculator.summary.finalShards"
                                            )}
                                        </dt>
                                        <dd className="col-5 text-end fw-bold">
                                            {formatCount(
                                                totalShardCount
                                            )}
                                        </dd>

                                        <dt className="col-7">
                                            {t(
                                                "ValuePackCalculator.summary.usedCoupons"
                                            )}
                                        </dt>
                                        <dd className="col-5 text-end">
                                            {formatCouponCount(
                                                skillShardSummary.doubleCouponCount
                                            )}
                                        </dd>
                                    </dl>

                                    <div className="value-pack-unit-price mb-3">
                                        <span>
                                            {t(
                                                "ValuePackCalculator.summary.averageUnitPrice"
                                            )}
                                        </span>

                                        <strong>
                                            {formatUnitPrice(
                                                averageUnitPrice
                                            )}
                                        </strong>
                                    </div>

                                    {skillShardSummary.bonusCount >
                                        0 && (
                                        <div
                                            className="alert alert-success mb-0"
                                            role="status"
                                        >
                                            <strong>
                                                {t(
                                                    "ValuePackCalculator.summary.discountMessage",
                                                    {
                                                        percent:
                                                            unitPriceFormatter.format(
                                                                couponEfficiency
                                                            ),
                                                    }
                                                )}
                                            </strong>

                                            <div className="small mt-1">
                                                {t(
                                                    "ValuePackCalculator.summary.bonusMessage",
                                                    {
                                                        count: numberFormatter.format(
                                                            skillShardSummary.bonusCount
                                                        ),
                                                    }
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            <section className="card value-pack-card border-0 shadow-sm mt-5">
                <div className="card-body p-4 p-lg-5">
                    <h2 className="h3 fw-bold mb-3">
                        {t(
                            "ValuePackCalculator.guide.introductionTitle"
                        )}
                    </h2>

                    <p>
                        {t(
                            "ValuePackCalculator.guide.introduction1"
                        )}
                    </p>

                    <p className="mb-0">
                        {t(
                            "ValuePackCalculator.guide.introduction2"
                        )}
                    </p>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t(
                            "ValuePackCalculator.guide.usageTitle"
                        )}
                    </h2>

                    <ol className="lh-lg">
                        <li>
                            {t(
                                "ValuePackCalculator.guide.usage1"
                            )}
                        </li>
                        <li>
                            {t(
                                "ValuePackCalculator.guide.usage2"
                            )}
                        </li>
                        <li>
                            {t(
                                "ValuePackCalculator.guide.usage3"
                            )}
                        </li>
                        <li>
                            {t(
                                "ValuePackCalculator.guide.usage4"
                            )}
                        </li>
                    </ol>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t(
                            "ValuePackCalculator.guide.calculationTitle"
                        )}
                    </h2>

                    <div className="row g-3">
                        <div className="col-12 col-lg-4">
                            <div className="value-pack-formula h-100">
                                <h3 className="h6 fw-bold">
                                    {t(
                                        "ValuePackCalculator.guide.basicFormulaTitle"
                                    )}
                                </h3>

                                <code>
                                    {t(
                                        "ValuePackCalculator.guide.basicFormula"
                                    )}
                                </code>
                            </div>
                        </div>

                        <div className="col-12 col-lg-4">
                            <div className="value-pack-formula h-100">
                                <h3 className="h6 fw-bold">
                                    {t(
                                        "ValuePackCalculator.guide.doubleFormulaTitle"
                                    )}
                                </h3>

                                <code>
                                    {t(
                                        "ValuePackCalculator.guide.doubleFormula"
                                    )}
                                </code>
                            </div>
                        </div>

                        <div className="col-12 col-lg-4">
                            <div className="value-pack-formula h-100">
                                <h3 className="h6 fw-bold">
                                    {t(
                                        "ValuePackCalculator.guide.averageFormulaTitle"
                                    )}
                                </h3>

                                <code>
                                    {t(
                                        "ValuePackCalculator.guide.averageFormula"
                                    )}
                                </code>
                            </div>
                        </div>
                    </div>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t(
                            "ValuePackCalculator.guide.exampleTitle"
                        )}
                    </h2>

                    <p>
                        {t(
                            "ValuePackCalculator.guide.exampleDescription"
                        )}
                    </p>

                    <div className="table-responsive">
                        <table className="table table-bordered align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th scope="col">
                                        {t(
                                            "ValuePackCalculator.example.type"
                                        )}
                                    </th>
                                    <th
                                        scope="col"
                                        className="text-end"
                                    >
                                        {t(
                                            "ValuePackCalculator.example.price"
                                        )}
                                    </th>
                                    <th
                                        scope="col"
                                        className="text-end"
                                    >
                                        {t(
                                            "ValuePackCalculator.example.count"
                                        )}
                                    </th>
                                    <th
                                        scope="col"
                                        className="text-end"
                                    >
                                        {t(
                                            "ValuePackCalculator.example.unitPrice"
                                        )}
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr>
                                    <td>
                                        {t(
                                            "ValuePackCalculator.example.normalPurchase"
                                        )}
                                    </td>
                                    <td className="text-end">
                                        {formatPrice(7000)}
                                    </td>
                                    <td className="text-end">
                                        {formatCount(40)}
                                    </td>
                                    <td className="text-end">
                                        {formatUnitPrice(175)}
                                    </td>
                                </tr>

                                <tr>
                                    <td>
                                        {t(
                                            "ValuePackCalculator.example.doublePurchase"
                                        )}
                                    </td>
                                    <td className="text-end">
                                        {formatPrice(7000)}
                                    </td>
                                    <td className="text-end">
                                        {formatCount(80)}
                                    </td>
                                    <td className="text-end text-success fw-bold">
                                        {formatUnitPrice(
                                            87.5
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t(
                            "ValuePackCalculator.guide.cautionTitle"
                        )}
                    </h2>

                    <ul className="lh-lg mb-0">
                        <li>
                            {t(
                                "ValuePackCalculator.guide.caution1"
                            )}
                        </li>
                        <li>
                            {t(
                                "ValuePackCalculator.guide.caution2"
                            )}
                        </li>
                        <li>
                            {t(
                                "ValuePackCalculator.guide.caution3"
                            )}
                        </li>
                        <li>
                            {t(
                                "ValuePackCalculator.guide.caution4"
                            )}
                        </li>
                    </ul>
                </div>
            </section>

            <section className="card value-pack-card border-0 shadow-sm mt-4">
                <div className="card-body p-4 p-lg-5">
                    <h2 className="h3 fw-bold mb-4">
                        {t(
                            "ValuePackCalculator.faq.title"
                        )}
                    </h2>

                    <div className="value-pack-faq">
                        <article>
                            <h3>
                                {t(
                                    "ValuePackCalculator.faq.question1"
                                )}
                            </h3>

                            <p>
                                {t(
                                    "ValuePackCalculator.faq.answer1"
                                )}
                            </p>
                        </article>

                        <article>
                            <h3>
                                {t(
                                    "ValuePackCalculator.faq.question2"
                                )}
                            </h3>

                            <p>
                                {t(
                                    "ValuePackCalculator.faq.answer2"
                                )}
                            </p>
                        </article>

                        <article>
                            <h3>
                                {t(
                                    "ValuePackCalculator.faq.question3"
                                )}
                            </h3>

                            <p>
                                {t(
                                    "ValuePackCalculator.faq.answer3"
                                )}
                            </p>
                        </article>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default ValuePackCalculator;