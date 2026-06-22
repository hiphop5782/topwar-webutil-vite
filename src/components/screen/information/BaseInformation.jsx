import baseTypeJson from "@src/assets/json/base-type.json";
import baseListJson from "@src/assets/json/base.json";
import "./BaseInformation.css";

import {
useCallback,
useEffect,
useMemo,
useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import SafeImage from "@src/components/template/SafeImage";

function BaseInformation() {
const [params, setParams] = useSearchParams();

const [selectedTypes, setSelectedTypes] = useState(() => {
    const typeParam = params.get("type");

    if (!typeParam) {
        return [];
    }

    const validTypes = new Set(
        baseTypeJson.map((type) => type.value)
    );

    return decodeURIComponent(typeParam)
        .split(",")
        .map((type) => type.trim())
        .filter((type) => validTypes.has(type));
});

const baseList = useMemo(
    () => [...baseListJson].reverse(),
    []
);

/*
 * 선택된 필터를 URL 파라미터에 반영합니다.
 * 기존의 다른 파라미터는 유지하고 type만 변경합니다.
 */
useEffect(() => {
    setParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);

        if (selectedTypes.length === 0) {
            nextParams.delete("type");
        } else {
            nextParams.set(
                "type",
                selectedTypes.join(",")
            );
        }

        return nextParams;
    }, {
        replace: true,
    });
}, [selectedTypes, setParams]);

const toggleType = useCallback((value) => {
    setSelectedTypes((currentTypes) => {
        if (currentTypes.includes(value)) {
            return currentTypes.filter(
                (type) => type !== value
            );
        }

        return [...currentTypes, value];
    });
}, []);

const clearFilters = useCallback(() => {
    setSelectedTypes([]);
}, []);

const includesSelectedType = useCallback(
    (name = "") => {
        return selectedTypes.some((type) =>
            name.includes(type)
        );
    },
    [selectedTypes]
);

const filterList = useMemo(() => {
    if (selectedTypes.length === 0) {
        return baseList;
    }

    return baseList.filter((base) => {
        const hasSkill =
            selectedTypes.includes("스킬") &&
            typeof base.skill === "string" &&
            base.skill.trim().length > 0;

        if (hasSkill) {
            return true;
        }

        const optionNames = [
            ...(base.options1 ?? []),
            ...(base.options2 ?? []),
        ].map((option) => option.name ?? "");

        return selectedTypes.some((selectedType) =>
            optionNames.some((optionName) =>
                optionName.includes(selectedType)
            )
        );
    });
}, [baseList, selectedTypes]);

const renderOption = useCallback(
    (option, index) => {
        const highlighted =
            selectedTypes.length > 0 &&
            includesSelectedType(option.name);

        return (
            <div
                key={`${option.name}-${index}`}
                className={`base-option ${
                    highlighted
                        ? "base-option-highlighted"
                        : ""
                }`}
            >
                <span className="base-option-name">
                    {option.name}
                </span>

                {option.value && (
                    <strong className="base-option-value">
                        {option.value}
                    </strong>
                )}
            </div>
        );
    },
    [includesSelectedType, selectedTypes.length]
);

return (
    <div className="base-information">
        {/* 페이지 헤더 */}
        <section className="base-page-header mb-4">
            <div className="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3">
                <div>
                    <div className="small fw-bold text-primary mb-1">
                        BASE INFORMATION
                    </div>

                    <h1 className="display-6 fw-bold mb-2">
                        기지 정보
                    </h1>

                    <p className="text-secondary mb-0">
                        기지의 사용 효과와 보유 효과를
                        확인하고 원하는 능력치로 검색할 수
                        있습니다.
                    </p>
                </div>

                <div className="base-count-summary">
                    <strong>{filterList.length}</strong>
                    <span>개의 기지</span>
                </div>
            </div>
        </section>

        {/* 필터 영역 */}
        <section className="card border-0 shadow-sm mb-4">
            <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                    <div>
                        <h2 className="h6 fw-bold mb-1">
                            효과 필터
                        </h2>

                        <p className="small text-secondary mb-0">
                            여러 효과를 동시에 선택할 수
                            있습니다.
                        </p>
                    </div>

                    {selectedTypes.length > 0 && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={clearFilters}
                        >
                            선택 초기화
                        </button>
                    )}
                </div>

                <div className="d-flex flex-wrap gap-2">
                    {baseTypeJson.map((type) => {
                        const active =
                            selectedTypes.includes(
                                type.value
                            );

                        return (
                            <button
                                type="button"
                                key={type.no}
                                className={`base-filter-chip ${
                                    active ? "active" : ""
                                }`}
                                style={{
                                    "--filter-color":
                                        `var(--bs-${type.color})`,
                                }}
                                onClick={() =>
                                    toggleType(type.value)
                                }
                                aria-pressed={active}
                            >
                                {active && (
                                    <span
                                        className="base-filter-check"
                                        aria-hidden="true"
                                    >
                                        ✓
                                    </span>
                                )}

                                {type.value}
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>

        {/* 검색 결과 안내 */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div className="text-secondary">
                총{" "}
                <strong className="text-body">
                    {filterList.length}
                </strong>
                개의 기지가{" "}
                {selectedTypes.length > 0
                    ? "검색되었습니다."
                    : "등록되어 있습니다."}
            </div>

            {selectedTypes.length > 0 && (
                <div className="small text-secondary">
                    선택된 필터:
                    <strong className="text-primary ms-1">
                        {selectedTypes.length}개
                    </strong>
                </div>
            )}
        </div>

        {/* 기지 목록 */}
        {filterList.length > 0 ? (
            <div className="row g-3 g-xl-4">
                {filterList.map((base) => {
                    const options1 =
                        base.options1 ?? [];
                    const options2 =
                        base.options2 ?? [];

                    return (
                        <div
                            key={base.no}
                            className="col-12 col-sm-6 col-lg-4 col-xl-3"
                        >
                            <article className="card base-card h-100 border-0 shadow-sm">
                                <div className="base-card-image">
                                    <SafeImage
                                        src={`${import.meta.env.VITE_PUBLIC_URL}/images/base/${base.no}.png`}
                                        alt={base.name}
                                        className="w-100 h-100"
                                        style={{
                                            objectFit:
                                                "contain",
                                        }}
                                    />

                                    {base.soldout === true && (
                                        <span className="badge text-bg-danger base-soldout-badge">
                                            구매 불가
                                        </span>
                                    )}
                                </div>

                                <div className="card-body d-flex flex-column p-3">
                                    <h2
                                        className="h6 fw-bold text-truncate mb-3"
                                        title={base.name}
                                    >
                                        {base.name}
                                    </h2>

                                    <div className="base-effect-section">
                                        <div className="base-effect-title">
                                            <span className="base-effect-icon">
                                                ⚡
                                            </span>
                                            사용 시 효과
                                        </div>

                                        <div className="base-option-list">
                                            {options1.length >
                                            0 ? (
                                                options1.map(
                                                    renderOption
                                                )
                                            ) : (
                                                <div className="base-option-empty">
                                                    효과 없음
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="base-effect-section">
                                        <div className="base-effect-title">
                                            <span className="base-effect-icon">
                                                ◆
                                            </span>
                                            보유 시 효과
                                        </div>

                                        <div className="base-option-list">
                                            {options2.length >
                                            0 ? (
                                                options2.map(
                                                    renderOption
                                                )
                                            ) : (
                                                <div className="base-option-empty">
                                                    효과 없음
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {base.skill && (
                                        <div className="base-special-box base-skill-box mt-3">
                                            <div className="base-special-title">
                                                기지 스킬
                                            </div>

                                            <div className="small">
                                                {base.skill}
                                            </div>
                                        </div>
                                    )}

                                    {base.memo && (
                                        <div className="base-special-box base-memo-box mt-2">
                                            {base.memo}
                                        </div>
                                    )}
                                </div>
                            </article>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="base-empty-state">
                <div
                    className="base-empty-icon"
                    aria-hidden="true"
                >
                    🔍
                </div>

                <h2 className="h5 fw-bold">
                    검색 결과가 없습니다
                </h2>

                <p className="text-secondary mb-3">
                    다른 효과를 선택하거나 필터를
                    초기화해 주세요.
                </p>

                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={clearFilters}
                >
                    필터 초기화
                </button>
            </div>
        )}
    </div>
);

}

export default BaseInformation;
