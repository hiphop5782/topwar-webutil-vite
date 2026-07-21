import ELmap from "@src/assets/images/el-map.jpg";
import Buildings from "@src/assets/json/el/buildings.json";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { Helmet } from "react-helmet-async";
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

const createFacilities = () =>
    Buildings.map((building, index) => ({
        ...building,
        id: building.id ?? `${building.name}-${index}`,
        selected: false
    }));

export default function EternalLandScore() {
    const mapRef = useRef(null);

    const [mapWidth, setMapWidth] = useState(0);
    const [hoverObject, setHoverObject] = useState(null);
    const [activeObject, setActiveObject] = useState(null);
    const [facilities, setFacilities] = useState(createFacilities);

    const numberFormatter = useMemo(
        () => new Intl.NumberFormat("ko-KR"),
        []
    );

    const canonicalUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}${window.location.pathname}`
            : "https://www.progamer.info/ko/information/el";

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

    return (
        <>
            <Helmet>
                <title>
                    Top War 영원의 땅 시설 점수 지도 | Progamer.info
                </title>
                <meta
                    name="description"
                    content="Top War 영원의 땅 지도에서 점령 시설을 선택하고 분당, 시간당, 일일 예상 점수를 계산할 수 있는 비공식 도구입니다."
                />
                <link rel="canonical" href={canonicalUrl} />
            </Helmet>

            <article className="eternal-land-page">
                <header className="eternal-land-hero">
                    <div className="eternal-land-eyebrow">
                        <FaMapLocationDot aria-hidden="true" />
                        Top War 영원의 땅
                    </div>

                    <h1>영원의 땅 시설 점수 지도</h1>

                    <p>
                        지도 위 시설을 선택하면 점령 중 획득할 수 있는
                        분당·시간당·일일 예상 점수를 한 번에 계산합니다.
                        여러 시설을 동시에 선택해 연합의 전체 점수 생산량도
                        비교할 수 있습니다.
                    </p>
                </header>

                <section
                    className="eternal-land-guide-alert"
                    aria-label="지도 사용 안내"
                >
                    <FaAsterisk aria-hidden="true" />
                    <div>
                        <strong>지도 사용 방법</strong>
                        <p>
                            마름모 표시 위에 마우스를 올리거나 키보드로
                            포커스하면 시설 정보를 확인할 수 있습니다.
                            표시를 누르면 해당 시설이 합계에 추가됩니다.
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
                                시설 선택 지도
                            </h2>
                            <p>
                                빛나는 표시가 현재 선택된 시설입니다.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={resetFacilities}
                            disabled={selectedFacilities.length === 0}
                        >
                            <FaRotateLeft className="me-2" />
                            선택 초기화
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
                            <span>선택 시설</span>
                            <strong>{selectedFacilities.length}개</strong>
                        </div>
                        <div>
                            <span>분당 합계</span>
                            <strong>
                                {numberFormatter.format(
                                    scoreSummary.minute
                                )}
                                점
                            </strong>
                        </div>
                    </div>

                    <div className="eternal-land-mobile-hint">
                        지도를 좌우로 밀어서 시설을 확인하세요.
                    </div>

                    <div
                        className="eternal-land-map-scroll"
                        tabIndex={0}
                        aria-label="영원의 땅 지도. 모바일에서는 좌우로 스크롤할 수 있습니다."
                    >
                        <div
                            className="eternal-land-map"
                            ref={mapRef}
                        >
                            <img
                                src={ELmap}
                                className="eternal-land-map-image"
                                alt="Top War 영원의 땅 시설 위치가 표시된 전체 지도"
                            />

                            {facilities.map((facility) => (
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
                                        backgroundColor: facility.color
                                    }}
                                    aria-label={`${facility.name}, 분당 ${numberFormatter.format(
                                        facility.point
                                    )}점`}
                                    aria-pressed={facility.selected}
                                    onMouseEnter={() =>
                                        setHoverObject(facility)
                                    }
                                    onMouseLeave={() =>
                                        setHoverObject(null)
                                    }
                                    onFocus={() =>
                                        setHoverObject(facility)
                                    }
                                    onBlur={() =>
                                        setHoverObject(null)
                                    }
                                    onClick={() => {
                                        toggleFacility(facility.id);
                                        setActiveObject(facility);
                                    }}
                                />
                            ))}

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
                                        {displayedObject.name}
                                    </strong>

                                    <dl>
                                        <div>
                                            <dt>1분당</dt>
                                            <dd>
                                                {numberFormatter.format(
                                                    displayedObject.point
                                                )}
                                                점
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>1시간당</dt>
                                            <dd>
                                                {numberFormatter.format(
                                                    displayedObject.point *
                                                        60
                                                )}
                                                점
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>1일당</dt>
                                            <dd>
                                                {numberFormatter.format(
                                                    displayedObject.point *
                                                        60 *
                                                        24
                                                )}
                                                점
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
                                선택 시설 점수 합계
                            </h2>
                            <p>
                                현재 {selectedFacilities.length}개 시설이
                                선택되었습니다.
                            </p>
                        </div>
                    </div>

                    <div className="eternal-land-score-grid">
                        <ScoreCard
                            label="1분 예상 점수"
                            value={scoreSummary.minute}
                            formatter={numberFormatter}
                        />
                        <ScoreCard
                            label="1시간 예상 점수"
                            value={scoreSummary.hour}
                            formatter={numberFormatter}
                        />
                        <ScoreCard
                            label="1일 예상 점수"
                            value={scoreSummary.day}
                            formatter={numberFormatter}
                        />
                    </div>

                    <div className="eternal-land-selected-list">
                        <h3>선택한 시설</h3>

                        {selectedFacilities.length === 0 ? (
                            <div className="eternal-land-empty">
                                지도에서 시설을 선택하면 이곳에 시설명과
                                분당 점수가 표시됩니다.
                            </div>
                        ) : (
                            <ul>
                                {selectedFacilities.map((facility) => (
                                    <li key={facility.id}>
                                        <span>{facility.name}</span>
                                        <strong>
                                            분당{" "}
                                            {numberFormatter.format(
                                                facility.point
                                            )}
                                            점
                                        </strong>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="eternal-land-calculator-link">
                        더 세부적인 점령 시간과 목표 점수 계산은{" "}
                        <LanguageRouterLink to="/calculator/el-score">
                            영원의 땅 점수 계산기
                        </LanguageRouterLink>
                        에서 확인하세요.
                    </div>
                </section>

                <section
                    className="eternal-land-content-grid"
                    aria-label="점수 계산 안내"
                >
                    <div className="eternal-land-info-card">
                        <FaClock aria-hidden="true" />
                        <div>
                            <h2>점수 계산 기준</h2>
                            <p>
                                시설별 기본 분당 점수를 기준으로
                                시간당 점수는 60배, 일일 점수는 1,440배로
                                계산합니다.
                            </p>
                            <p>
                                계산 결과는 선택한 시설을 해당 시간 동안
                                계속 점령한다고 가정한 단순 예상치입니다.
                            </p>
                        </div>
                    </div>

                    <div className="eternal-land-info-card">
                        <FaCircleInfo aria-hidden="true" />
                        <div>
                            <h2>결과 확인 시 주의사항</h2>
                            <p>
                                실제 획득 점수는 점령 시작 시각, 시설 상실,
                                서버 진행 상황, 이벤트 규칙 변경 등에 따라
                                달라질 수 있습니다.
                            </p>
                            <p>
                                게임 업데이트 이후 수치가 달라졌다면
                                사이트 문의 기능으로 알려주세요.
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    className="eternal-land-faq"
                    aria-labelledby="eternal-land-faq-title"
                >
                    <h2 id="eternal-land-faq-title">
                        자주 묻는 질문
                    </h2>

                    <details>
                        <summary>
                            여러 시설을 동시에 선택할 수 있나요?
                        </summary>
                        <p>
                            가능합니다. 지도에서 시설 표시를 차례로 누르면
                            선택한 모든 시설의 점수가 자동으로 합산됩니다.
                        </p>
                    </details>

                    <details>
                        <summary>
                            표시된 일일 점수를 실제로 모두 얻나요?
                        </summary>
                        <p>
                            일일 점수는 24시간 동안 시설을 계속 점령한다는
                            가정으로 계산한 값입니다. 점령 시간이 짧거나
                            시설을 빼앗기면 실제 점수는 더 적습니다.
                        </p>
                    </details>

                    <details>
                        <summary>
                            지도와 게임 화면의 시설 위치가 다른 경우는
                            어떻게 하나요?
                        </summary>
                        <p>
                            영원의 땅 시즌 또는 게임 업데이트에 따라
                            배치와 수치가 변경될 수 있습니다. 최신 게임
                            화면을 우선 기준으로 확인해 주세요.
                        </p>
                    </details>
                </section>
            </article>
        </>
    );
}

function ScoreCard({ label, value, formatter }) {
    return (
        <div
            className={`eternal-land-score-card${
                value > 0 ? " has-value" : ""
            }`}
        >
            <span>{label}</span>
            <strong>{formatter.format(value)}</strong>
            <small>점</small>
        </div>
    );
}