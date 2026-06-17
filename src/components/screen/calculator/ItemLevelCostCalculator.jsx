import { useEffect, useMemo, useState } from "react";
import costData from "/src/assets/json/item/cost.json";
import "./ItemLevelCostCalculator.css";

const EMPTY_MATERIAL = {
    id: "",
    name: "알 수 없는 재료",
    unit: "",
    icon: "",
};

function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString("ko-KR");
}

function getMaterial(materialMap, materialId) {
    return (
        materialMap.get(materialId) ?? {
            ...EMPTY_MATERIAL,
            id: materialId,
            name: materialId || EMPTY_MATERIAL.name,
        }
    );
}

function ImageWithFallback({
    src,
    alt,
    className = "",
    width,
    height,
}) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <div
                className={`image-placeholder ${className}`}
                style={{ width, height }}
                aria-hidden="true"
            >
                ?
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={className}
            loading="lazy"
            onError={() => setFailed(true)}
        />
    );
}

function MaterialAmount({
    material,
    amount,
    cumulativeAmount,
    showCumulative = false,
}) {
    return (
        <div className="material-amount">
            <ImageWithFallback
                src={material.icon}
                alt={material.name}
                width={36}
                height={36}
                className="material-amount__icon"
            />

            <div className="material-amount__content">
                <div className="material-amount__name">
                    {material.name}
                </div>

                <div className="material-amount__value">
                    {formatNumber(amount)}
                    {material.unit && (
                        <span className="material-amount__unit">
                            {material.unit}
                        </span>
                    )}
                </div>

                {showCumulative && (
                    <div className="material-amount__cumulative">
                        누적 {formatNumber(cumulativeAmount)}
                        {material.unit}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ItemLevelCostCalculator() {
    const items = useMemo(
        () => (Array.isArray(costData.items) ? costData.items : []),
        [],
    );

    const materials = useMemo(
        () =>
            Array.isArray(costData.materials)
                ? costData.materials
                : [],
        [],
    );

    const [selectedItemId, setSelectedItemId] = useState(
        () => items[0]?.id ?? "",
    );

    const selectedItem = useMemo(() => {
        return (
            items.find(
                item => String(item.id) === String(selectedItemId),
            ) ??
            items[0] ??
            null
        );
    }, [items, selectedItemId]);

    const materialMap = useMemo(() => {
        return new Map(
            materials.map(material => [
                String(material.id),
                material,
            ]),
        );
    }, [materials]);

    const sortedLevels = useMemo(() => {
        if (!Array.isArray(selectedItem?.levels)) {
            return [];
        }

        return [...selectedItem.levels]
            .filter(levelInfo =>
                Number.isFinite(Number(levelInfo.level)),
            )
            .sort(
                (a, b) =>
                    Number(a.level) - Number(b.level),
            );
    }, [selectedItem]);

    const targetLevels = useMemo(() => {
        return sortedLevels.map(levelInfo =>
            Number(levelInfo.level),
        );
    }, [sortedLevels]);

    const minTargetLevel = targetLevels[0] ?? 1;

    const startLevel =
        selectedItem?.startLevel != null
            ? Number(selectedItem.startLevel)
            : Math.max(0, minTargetLevel - 1);

    const maxLevel =
        targetLevels[targetLevels.length - 1] ??
        startLevel;

    const currentLevels = useMemo(() => {
        if (targetLevels.length === 0) {
            return [startLevel];
        }

        return [
            startLevel,
            ...targetLevels.slice(0, -1),
        ];
    }, [startLevel, targetLevels]);

    const [currentLevel, setCurrentLevel] =
        useState(startLevel);

    const [targetLevel, setTargetLevel] =
        useState(maxLevel);

    useEffect(() => {
        setCurrentLevel(startLevel);
        setTargetLevel(maxLevel);
    }, [selectedItemId, startLevel, maxLevel]);

    const handleItemSelect = itemId => {
        setSelectedItemId(itemId);
    };

    const handleCurrentLevelChange = event => {
        const nextLevel = Number(event.target.value);

        setCurrentLevel(nextLevel);

        if (targetLevel < nextLevel) {
            setTargetLevel(nextLevel);
        }
    };

    const handleTargetLevelChange = event => {
        const nextLevel = Number(event.target.value);

        setTargetLevel(
            Math.max(nextLevel, currentLevel),
        );
    };

    const calculation = useMemo(() => {
        if (!selectedItem) {
            return {
                rows: [],
                totals: [],
                levelCount: 0,
            };
        }

        const totalMap = new Map();

        const rows = sortedLevels
            .filter(levelInfo => {
                const level = Number(levelInfo.level);

                return (
                    level > currentLevel &&
                    level <= targetLevel
                );
            })
            .map(levelInfo => {
                const costs = Array.isArray(levelInfo.costs)
                    ? levelInfo.costs
                    : [];

                const calculatedCosts = costs
                    .map(cost => {
                        const materialId = String(
                            cost.materialId ?? "",
                        );

                        const amount = Math.max(
                            0,
                            Number(cost.amount) || 0,
                        );

                        if (!materialId || amount <= 0) {
                            return null;
                        }

                        const previousAmount =
                            totalMap.get(materialId) ?? 0;

                        const cumulativeAmount =
                            previousAmount + amount;

                        totalMap.set(
                            materialId,
                            cumulativeAmount,
                        );

                        return {
                            materialId,
                            amount,
                            cumulativeAmount,
                            material: getMaterial(
                                materialMap,
                                materialId,
                            ),
                        };
                    })
                    .filter(Boolean);

                return {
                    fromLevel:
                        Number(levelInfo.level) - 1,
                    toLevel: Number(levelInfo.level),
                    costs: calculatedCosts,
                };
            });

        const totals = [...totalMap.entries()]
            .map(([materialId, amount]) => ({
                materialId,
                amount,
                material: getMaterial(
                    materialMap,
                    materialId,
                ),
            }))
            .sort((a, b) =>
                String(a.material.name).localeCompare(
                    String(b.material.name),
                    "ko",
                ),
            );

        return {
            rows,
            totals,
            levelCount: rows.length,
        };
    }, [
        selectedItem,
        sortedLevels,
        currentLevel,
        targetLevel,
        materialMap,
    ]);

    if (!selectedItem) {
        return (
            <div className="container py-4">
                <div className="alert alert-warning mb-0">
                    계산할 아이템 데이터가 없습니다.
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4 item-cost-calculator">
            <div className="row justify-content-center">
                <div className="col-12 col-xl-10">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body p-3 p-md-4">
                            <header className="mb-4">
                                <h1 className="h3 fw-bold mb-2">
                                    아이템 레벨별 소모량 계산기
                                </h1>

                                <p className="text-body-secondary mb-0">
                                    강화 종류와 레벨 구간을 선택하면
                                    필요한 재료를 자동으로 계산합니다.
                                </p>
                            </header>

                            <section className="mb-4">
                                <h2 className="h5 fw-bold mb-3">
                                    강화 종류 선택
                                </h2>

                                <div
                                    className="item-selector-grid"
                                    role="radiogroup"
                                    aria-label="강화 종류"
                                >
                                    {items.map(item => {
                                        const selected =
                                            String(item.id) ===
                                            String(
                                                selectedItemId,
                                            );

                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                role="radio"
                                                aria-checked={
                                                    selected
                                                }
                                                className={[
                                                    "item-selector-card",
                                                    selected
                                                        ? "is-selected"
                                                        : "",
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ")}
                                                onClick={() =>
                                                    handleItemSelect(
                                                        item.id,
                                                    )
                                                }
                                            >
                                                <span className="item-selector-card__image">
                                                    <ImageWithFallback
                                                        src={
                                                            item.icon
                                                        }
                                                        alt={
                                                            item.name
                                                        }
                                                        width={64}
                                                        height={64}
                                                        className="item-selector-card__icon"
                                                    />
                                                </span>

                                                <span className="item-selector-card__name">
                                                    {item.name}
                                                </span>

                                                {item.shortDescription && (
                                                    <span className="item-selector-card__description">
                                                        {
                                                            item.shortDescription
                                                        }
                                                    </span>
                                                )}

                                                {selected && (
                                                    <span
                                                        className="item-selector-card__check"
                                                        aria-hidden="true"
                                                    >
                                                        ✓
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="level-selector-section">
                                <div className="row g-3 align-items-end">
                                    <div className="col-6 col-md-4">
                                        <label
                                            htmlFor="current-level"
                                            className="form-label fw-semibold"
                                        >
                                            현재 레벨
                                        </label>

                                        <select
                                            id="current-level"
                                            className="form-select"
                                            value={currentLevel}
                                            onChange={
                                                handleCurrentLevelChange
                                            }
                                        >
                                            {currentLevels.map(
                                                level => (
                                                    <option
                                                        key={
                                                            level
                                                        }
                                                        value={
                                                            level
                                                        }
                                                    >
                                                        Lv.{" "}
                                                        {level}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>

                                    <div className="col-6 col-md-4">
                                        <label
                                            htmlFor="target-level"
                                            className="form-label fw-semibold"
                                        >
                                            목표 레벨
                                        </label>

                                        <select
                                            id="target-level"
                                            className="form-select"
                                            value={targetLevel}
                                            onChange={
                                                handleTargetLevelChange
                                            }
                                        >
                                            {targetLevels
                                                .filter(
                                                    level =>
                                                        level >=
                                                        currentLevel,
                                                )
                                                .map(level => (
                                                    <option
                                                        key={
                                                            level
                                                        }
                                                        value={
                                                            level
                                                        }
                                                    >
                                                        Lv.{" "}
                                                        {level}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    <div className="col-12 col-md-4">
                                        <div className="selected-range">
                                            <span className="selected-range__label">
                                                선택 구간
                                            </span>

                                            <strong className="selected-range__value">
                                                Lv.{" "}
                                                {currentLevel}
                                                <span className="mx-2">
                                                    →
                                                </span>
                                                Lv.{" "}
                                                {targetLevel}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {selectedItem.description && (
                                <div className="alert alert-light border mt-3 mb-0">
                                    {
                                        selectedItem.description
                                    }
                                </div>
                            )}

                            <section className="summary-section mt-4">
                                <div className="summary-card">
                                    <span className="summary-card__label">
                                        강화 대상
                                    </span>

                                    <strong className="summary-card__value">
                                        {selectedItem.name}
                                    </strong>
                                </div>

                                <div className="summary-card">
                                    <span className="summary-card__label">
                                        상승 단계
                                    </span>

                                    <strong className="summary-card__value">
                                        {
                                            calculation.levelCount
                                        }
                                        단계
                                    </strong>
                                </div>

                                <div className="summary-card">
                                    <span className="summary-card__label">
                                        최대 레벨
                                    </span>

                                    <strong className="summary-card__value">
                                        Lv. {maxLevel}
                                    </strong>
                                </div>
                            </section>

                            <section className="mt-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h2 className="h5 fw-bold mb-0">
                                        총 필요 재료
                                    </h2>

                                    <span className="badge text-bg-secondary">
                                        {
                                            calculation.totals
                                                .length
                                        }
                                        종류
                                    </span>
                                </div>

                                {calculation.totals.length ===
                                    0 ? (
                                    <div className="alert alert-info mb-0">
                                        현재 레벨과 목표 레벨이
                                        같거나 추가로 필요한 재료가
                                        없습니다.
                                    </div>
                                ) : (
                                    <div className="total-material-grid">
                                        {calculation.totals.map(
                                            total => (
                                                <article
                                                    key={
                                                        total.materialId
                                                    }
                                                    className="total-material-card"
                                                >
                                                    <ImageWithFallback
                                                        src={
                                                            total
                                                                .material
                                                                .icon
                                                        }
                                                        alt={
                                                            total
                                                                .material
                                                                .name
                                                        }
                                                        width={
                                                            56
                                                        }
                                                        height={
                                                            56
                                                        }
                                                        className="total-material-card__icon"
                                                    />

                                                    <div className="total-material-card__content">
                                                        <span className="total-material-card__name">
                                                            {
                                                                total
                                                                    .material
                                                                    .name
                                                            }
                                                        </span>

                                                        <strong className="total-material-card__value">
                                                            {formatNumber(
                                                                total.amount,
                                                            )}
                                                            {total
                                                                .material
                                                                .unit && (
                                                                    <small>
                                                                        {
                                                                            total
                                                                                .material
                                                                                .unit
                                                                        }
                                                                    </small>
                                                                )}
                                                        </strong>
                                                    </div>
                                                </article>
                                            ),
                                        )}
                                    </div>
                                )}
                            </section>

                            <section className="mt-4">
                                <h2 className="h5 fw-bold mb-3">
                                    레벨별 필요 재료
                                </h2>

                                {calculation.rows.length === 0 ? (
                                    <div className="alert alert-info mb-0">
                                        표시할 레벨 구간이 없습니다.
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle level-cost-table">
                                            <thead>
                                                <tr>
                                                    <th className="text-nowrap">
                                                        레벨 구간
                                                    </th>
                                                    <th>
                                                        필요 재료
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {calculation.rows.map(
                                                    row => (
                                                        <tr
                                                            key={
                                                                row.toLevel
                                                            }
                                                        >
                                                            <td className="text-nowrap fw-semibold">
                                                                Lv.{" "}
                                                                {
                                                                    row.fromLevel
                                                                }
                                                                <span className="mx-2 text-body-secondary">
                                                                    →
                                                                </span>
                                                                Lv.{" "}
                                                                {
                                                                    row.toLevel
                                                                }
                                                            </td>

                                                            <td>
                                                                {row
                                                                    .costs
                                                                    .length ===
                                                                    0 ? (
                                                                    <span className="text-body-secondary">
                                                                        없음
                                                                    </span>
                                                                ) : (
                                                                    <div className="level-material-list">
                                                                        {row.costs.map(
                                                                            cost => (
                                                                                <MaterialAmount
                                                                                    key={
                                                                                        cost.materialId
                                                                                    }
                                                                                    material={
                                                                                        cost.material
                                                                                    }
                                                                                    amount={
                                                                                        cost.amount
                                                                                    }
                                                                                    cumulativeAmount={
                                                                                        cost.cumulativeAmount
                                                                                    }
                                                                                    showCumulative
                                                                                />
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}