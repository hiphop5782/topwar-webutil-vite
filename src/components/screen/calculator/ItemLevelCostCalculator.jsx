import { useEffect, useMemo, useState } from "react";
import costData from "/src/assets/json/item/cost.json";

function formatNumber(value) {
    return Number(value || 0).toLocaleString();
}

export default function ItemLevelCostCalculator() {
    const items = Array.isArray(costData.items)
        ? costData.items
        : [];

    const materials = Array.isArray(costData.materials)
        ? costData.materials
        : [];

    const [selectedItemId, setSelectedItemId] = useState(
        items[0]?.id ?? ""
    );

    const selectedItem = useMemo(() => {
        return (
            items.find(item => item.id === selectedItemId) ??
            items[0] ??
            null
        );
    }, [items, selectedItemId]);

    const materialMap = useMemo(() => {
        return new Map(
            materials.map(material => [
                material.id,
                material
            ])
        );
    }, [materials]);

    const sortedLevels = useMemo(() => {
        if (!selectedItem?.levels) return [];

        return [...selectedItem.levels].sort(
            (a, b) => Number(a.level) - Number(b.level)
        );
    }, [selectedItem]);

    const minLevel =
        sortedLevels[0]?.level ?? 1;

    const maxLevel =
        sortedLevels[sortedLevels.length - 1]?.level ??
        minLevel;

    const [currentLevel, setCurrentLevel] = useState(minLevel);
    const [targetLevel, setTargetLevel] = useState(maxLevel);

    useEffect(() => {
        setCurrentLevel(minLevel);
        setTargetLevel(maxLevel);
    }, [selectedItemId, minLevel, maxLevel]);

    const handleItemChange = event => {
        setSelectedItemId(event.target.value);
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

        if (nextLevel < currentLevel) return;

        setTargetLevel(nextLevel);
    };

    const calculation = useMemo(() => {
        if (!selectedItem) {
            return {
                rows: [],
                totals: [],
                levelCount: 0
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

                const calculatedCosts = costs.map(cost => {
                    const materialId = cost.materialId;
                    const amount = Number(cost.amount || 0);

                    const previousAmount =
                        totalMap.get(materialId) || 0;

                    const cumulativeAmount =
                        previousAmount + amount;

                    totalMap.set(
                        materialId,
                        cumulativeAmount
                    );

                    return {
                        materialId,
                        amount,
                        cumulativeAmount,
                        material:
                            materialMap.get(materialId) ?? {
                                id: materialId,
                                name: materialId,
                                unit: "",
                                icon: ""
                            }
                    };
                });

                return {
                    fromLevel: Number(levelInfo.level) - 1,
                    toLevel: Number(levelInfo.level),
                    costs: calculatedCosts
                };
            });

        const totals = [...totalMap.entries()]
            .map(([materialId, amount]) => ({
                materialId,
                amount,
                material:
                    materialMap.get(materialId) ?? {
                        id: materialId,
                        name: materialId,
                        unit: "",
                        icon: ""
                    }
            }))
            .sort((a, b) => {
                return String(a.material.name).localeCompare(
                    String(b.material.name),
                    "ko"
                );
            });

        return {
            rows,
            totals,
            levelCount: rows.length
        };
    }, [
        selectedItem,
        sortedLevels,
        currentLevel,
        targetLevel,
        materialMap
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
        <div className="container py-4">
            <div className="row justify-content-center">
                <div className="col-12 col-xl-10">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body p-4">
                            <div className="mb-4">
                                <h1 className="h3 fw-bold mb-2">
                                    아이템 레벨별 소모량 계산기
                                </h1>

                                <p className="text-body-secondary mb-0">
                                    현재 레벨부터 목표 레벨까지
                                    필요한 재료를 종류별로 누적 계산합니다.
                                </p>
                            </div>

                            <div className="row g-3 align-items-end">
                                <div className="col-12 col-lg-5">
                                    <label
                                        htmlFor="item-select"
                                        className="form-label fw-semibold"
                                    >
                                        강화 대상
                                    </label>

                                    <select
                                        id="item-select"
                                        className="form-select"
                                        value={selectedItemId}
                                        onChange={handleItemChange}
                                    >
                                        {items.map(item => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-6 col-lg-3">
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
                                        onChange={handleCurrentLevelChange}
                                    >
                                        {sortedLevels.map(levelInfo => (
                                            <option
                                                key={levelInfo.level}
                                                value={levelInfo.level}
                                            >
                                                Lv. {levelInfo.level}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-6 col-lg-3">
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
                                        onChange={handleTargetLevelChange}
                                    >
                                        {sortedLevels
                                            .filter(
                                                levelInfo =>
                                                    Number(levelInfo.level) >=
                                                    currentLevel
                                            )
                                            .map(levelInfo => (
                                                <option
                                                    key={levelInfo.level}
                                                    value={levelInfo.level}
                                                >
                                                    Lv. {levelInfo.level}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            {selectedItem.description && (
                                <div className="alert alert-light border mt-4 mb-0">
                                    {selectedItem.description}
                                </div>
                            )}

                            <div className="row g-3 mt-1">
                                <div className="col-12 col-md-6">
                                    <div className="card h-100">
                                        <div className="card-body">
                                            <div className="small text-body-secondary mb-1">
                                                강화 구간
                                            </div>

                                            <div className="fs-4 fw-bold">
                                                Lv. {currentLevel}
                                                <span className="mx-2">→</span>
                                                Lv. {targetLevel}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 col-md-6">
                                    <div className="card h-100">
                                        <div className="card-body">
                                            <div className="small text-body-secondary mb-1">
                                                상승 단계
                                            </div>

                                            <div className="fs-4 fw-bold">
                                                {calculation.levelCount}단계
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h2 className="h5 fw-bold mb-0">
                                        총 필요 재료
                                    </h2>

                                    <span className="badge text-bg-secondary">
                                        최대 Lv. {maxLevel}
                                    </span>
                                </div>

                                {calculation.totals.length === 0 ? (
                                    <div className="alert alert-info mb-0">
                                        현재 레벨과 목표 레벨이 같거나,
                                        추가로 필요한 재료가 없습니다.
                                    </div>
                                ) : (
                                    <div className="row g-3">
                                        {calculation.totals.map(total => (
                                            <div
                                                key={total.materialId}
                                                className="col-12 col-sm-6 col-lg-4"
                                            >
                                                <div className="card h-100 border-primary">
                                                    <div className="card-body d-flex align-items-center gap-3">
                                                        {total.material.icon && (
                                                            <img
                                                                src={
                                                                    total.material
                                                                        .icon
                                                                }
                                                                alt={
                                                                    total.material
                                                                        .name
                                                                }
                                                                width="52"
                                                                height="52"
                                                                className="object-fit-contain"
                                                                onError={event => {
                                                                    event.currentTarget.style.display =
                                                                        "none";
                                                                }}
                                                            />
                                                        )}

                                                        <div>
                                                            <div className="small text-body-secondary">
                                                                {
                                                                    total.material
                                                                        .name
                                                                }
                                                            </div>

                                                            <div className="fs-4 fw-bold text-primary">
                                                                {formatNumber(
                                                                    total.amount
                                                                )}
                                                                <span className="fs-6 ms-1">
                                                                    {
                                                                        total
                                                                            .material
                                                                            .unit
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4">
                                <h2 className="h5 fw-bold mb-3">
                                    레벨별 필요 재료
                                </h2>

                                {calculation.rows.length === 0 ? (
                                    <div className="alert alert-info mb-0">
                                        표시할 레벨 구간이 없습니다.
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle">
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
                                                {calculation.rows.map(row => (
                                                    <tr key={row.toLevel}>
                                                        <td className="text-nowrap fw-semibold">
                                                            Lv. {row.fromLevel}
                                                            <span className="mx-2 text-body-secondary">
                                                                →
                                                            </span>
                                                            Lv. {row.toLevel}
                                                        </td>

                                                        <td>
                                                            {row.costs.length ===
                                                                0 ? (
                                                                <span className="text-body-secondary">
                                                                    없음
                                                                </span>
                                                            ) : (
                                                                <div className="d-flex flex-wrap gap-2">
                                                                    {row.costs.map(cost => (
                                                                        <div
                                                                            key={cost.materialId}
                                                                            className="d-inline-flex align-items-center gap-2 border rounded px-2 py-2 bg-body-tertiary"
                                                                        >
                                                                            {cost.material.icon && (
                                                                                <img
                                                                                    src={cost.material.icon}
                                                                                    alt={cost.material.name}
                                                                                    width="32"
                                                                                    height="32"
                                                                                    className="object-fit-contain flex-shrink-0"
                                                                                    onError={event => {
                                                                                        event.currentTarget.style.display = "none";
                                                                                    }}
                                                                                />
                                                                            )}

                                                                            <div className="lh-sm">
                                                                                <div className="small text-body-secondary">
                                                                                    {cost.material.name}
                                                                                </div>

                                                                                <div className="fw-semibold">
                                                                                    {formatNumber(cost.amount)}
                                                                                    {cost.material.unit}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {calculation.totals.length > 0 && (
                                <div className="border-top pt-4 mt-4">
                                    <h2 className="h5 fw-bold mb-3">
                                        누적 합계
                                    </h2>

                                    <div className="row g-3">
                                        {calculation.totals.map(total => (
                                            <div
                                                key={total.materialId}
                                                className="col-12 col-sm-6 col-lg-4"
                                            >
                                                <div className="card h-100">
                                                    <div className="card-body d-flex align-items-center gap-3">
                                                        {total.material.icon && (
                                                            <img
                                                                src={total.material.icon}
                                                                alt={total.material.name}
                                                                width="48"
                                                                height="48"
                                                                className="object-fit-contain flex-shrink-0"
                                                                onError={event => {
                                                                    event.currentTarget.style.display =
                                                                        "none";
                                                                }}
                                                            />
                                                        )}

                                                        <div className="min-w-0">
                                                            <div className="small text-body-secondary text-truncate">
                                                                {total.material.name}
                                                            </div>

                                                            <div className="fs-5 fw-bold">
                                                                {formatNumber(total.amount)}
                                                                <span className="fs-6 ms-1">
                                                                    {total.material.unit}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}