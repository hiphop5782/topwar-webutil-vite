import CountryFlagJson from "@src/assets/json/power/countryFlag.json";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import "flag-icons/sass/flag-icons.scss";
import "./TopwarData.css";
import { FaChevronDown, FaChevronUp, FaMars, FaVenus } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import PacmanLoader from "react-spinners/PacmanLoader"

export default function TopwarSscPointViewer() {
    const [mainData, setMainData] = useState(null);
    const playerList = useMemo(() => mainData?.rows ?? [], [mainData]);
    const [dataLoading, setDataLoading] = useState(true);
    const [minimum, setMinimum] = useState(0);
    const loadData = useCallback(async () => {
        const data = await import("@src/assets/json/ssc/userData.json");
        setMainData(data.default);
        setDataLoading(false);
    }, []);
    useEffect(() => { loadData(); }, []);

    const [searchTerm, setSearchTerm] = useState("");
    const { t } = useTranslation(["viewer", "commons"]);

    // 1. 원본 데이터 정렬 (기존 유지, 렌더링 시 재계산 방지)
    const sortedPlayers = useMemo(() => {
        return [...playerList].sort((p1, p2) => p2.cp - p1.cp).map((player, index) => ({ ...player, rank: index + 1 }));
    }, [playerList]);

    // 2. 검색 필터링 로직 추가
    const filteredPlayers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        const empty = term.length === 0;

        return sortedPlayers.filter(player => {
            return (empty ? true : player.sid.toString() === term) && player.score > minimum;
        });
    }, [searchTerm, minimum, sortedPlayers]);

    const calculateDays = useCallback((player) => {
        const today = parseInt(Date.now() / 24 / 60 / 60 / 1000);
        const lastLogin = parseInt(player.lastLogin / 24 / 60 / 60);
        const days = today - lastLogin;
        if (days > 30) return 'day30';
        else if (days > 7) return 'day7';
        return '';
    }, []);

    const nationObj = useMemo(() => {
        return filteredPlayers.reduce((acc, player) => {
            acc[player.nationalflag] = acc[player.nationalflag] ?? 0;
            acc[player.nationalflag]++;
            return acc;
        }, {});
    }, [filteredPlayers]);

    const minNations = useMemo(() => {
        return searchTerm.length > 0 ? 1 : 100;
    }, [searchTerm]);

    const [expendNations, setExpendNations] = useState(false);
    const sortedNationKeys = useMemo(() => {
        return Object.keys(nationObj).filter(k => nationObj[k] >= minNations).sort((a, b) => nationObj[b] - nationObj[a]);
    }, [nationObj, minNations]);
    const firstRowNationKeys = useMemo(() => {
        return sortedNationKeys.slice(0, 12);
    }, [sortedNationKeys]);
    const restRowNationKeys = useMemo(() => {
        return sortedNationKeys.slice(12);
    }, [sortedNationKeys]);

    const filteredPlayerTotalScore = useMemo(() => {
        return filteredPlayers.reduce((acc, cur) => acc + cur.score, 0);
    }, [filteredPlayers]);
    const filteredPlayerAverageScore = useMemo(() => {
        return filteredPlayerTotalScore / filteredPlayers.length;
    }, [filteredPlayers, filteredPlayerTotalScore]);

    const formatCompactNumber = useCallback((num, locale = 'en', maxFraction = 1) => {
        if (num === undefined || num === null || isNaN(num)) return '0';

        return new Intl.NumberFormat(locale, {
            notation: 'compact',
            maximumFractionDigits: maxFraction
        }).format(num);
    }, []);

    const getPercentile = useCallback((arr, percentile)=>{
        const index = (arr.length - 1) * percentile;
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        return arr[lower].score * (1 - weight) + arr[upper].score * weight;
    }, []);

    //이상치를 제거한 합계와 평균
    const filteredPlayersConsiderIQR = useMemo(()=>{
        // 데이터가 너무 적으면 사분위수를 구하는 의미가 없으므로 그대로 반환
        if (filteredPlayers.length < 4) {
            return filteredPlayers;
        }

        // 1. 오름차순 정렬
        const sorted = [...filteredPlayers].sort((a, b) => a.score - b.score);

        // 2. Q1(25%), Q3(75%) 계산
        const q1 = getPercentile(sorted, 0.25);
        const q3 = getPercentile(sorted, 0.75);

        // 3. IQR 계산
        const iqr = q3 - q1;

        // 4. 정상 범위 경계 설정 (보통 1.5를 곱합니다)
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        // 5. 너무 크거나 작은 값 필터링
        const filtered = sorted.filter(player => player.score >= lowerBound && player.score <= upperBound);
        return filtered;
    }, [filteredPlayers]);

    const filteredPlayerTotalScoreWithIQR = useMemo(() => {
        return filteredPlayersConsiderIQR.reduce((acc, cur) => acc + cur.score, 0);
    }, [filteredPlayersConsiderIQR]);
    const filteredPlayerAverageScoreWithIQR = useMemo(() => {
        return filteredPlayerTotalScoreWithIQR / filteredPlayersConsiderIQR.length;
    }, [filteredPlayersConsiderIQR, filteredPlayerTotalScoreWithIQR]);

    return (
        <>
            <h1>{t("TopwarSscPointViewer.title")}</h1>
            <div className="d-flex align-items-center mb-1 mt-4">
                {/* <h3>{searchTerm.length === 0 ? "서버별" : searchTerm} Top 100 (총 {filteredPlayers.length.toLocaleString()}명)</h3> */}
                {/* 검색 입력창 추가 */}
                <span>{t(`TopwarSscPointViewer.label-input`)}</span>
                <input
                    type="text"
                    className="form-control w-auto ms-4"
                    placeholder="e.g., 3223"
                    value={searchTerm}
                    onChange={(e) => {
                        const regex = /[0-9]*/;
                        if (!regex.test(e.target.value)) return;
                        setSearchTerm(e.target.value);
                    }}
                />
                
                <span className="ms-4">{t("TopwarSscPointViewer.label-cutoff")}</span>
                <input
                    type="text"
                    className="form-control w-auto ms-4"
                    placeholder="e.g., 10000"
                    value={minimum}
                    onChange={(e) => {
                        const regex = /[0-9]*/;
                        if (!regex.test(e.target.value)) return;
                        setMinimum(parseInt(e.target.value || 0));
                    }}
                />

            </div>

            <div className="row mt-4">
                <div className="col-sm-4 text-primary">{t("TopwarSscPointViewer.result-count")}</div>
                <div className="col-sm-8 fw-bold">
                    {formatCompactNumber(filteredPlayers.length)} &nbsp;&nbsp;&nbsp;&nbsp;
                    ( {filteredPlayers.length.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} )
                </div>
            </div>
            <div className="row mt-2">
                <div className="col-sm-4 text-primary">{t("TopwarSscPointViewer.result-total")}</div>
                <div className="col-sm-8 fw-bold">
                    {formatCompactNumber(filteredPlayerTotalScore)} &nbsp;&nbsp;&nbsp;&nbsp;
                    ( {filteredPlayerTotalScore.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} )
                </div>
            </div>
            <div className="row mt-2">
                <div className="col-sm-4 text-primary">{t("TopwarSscPointViewer.result-average")}</div>
                <div className="col-sm-8 fw-bold">
                    {formatCompactNumber(filteredPlayerAverageScore)} &nbsp;&nbsp;&nbsp;&nbsp;
                    ( {filteredPlayerAverageScore.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} )
                </div>
            </div>
            <div className="row mt-2">
                <div className="col-sm-4 text-danger">{t("TopwarSscPointViewer.result-iqr-total")}</div>
                <div className="col-sm-8 fw-bold">
                    {formatCompactNumber(filteredPlayerTotalScoreWithIQR)} &nbsp;&nbsp;&nbsp;&nbsp;
                    ( {filteredPlayerTotalScoreWithIQR.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} )
                </div>
            </div>
            <div className="row mt-2">
                <div className="col-sm-4 text-danger">{t("TopwarSscPointViewer.result-iqr-average")}</div>
                <div className="col-sm-8 fw-bold">
                    {formatCompactNumber(filteredPlayerAverageScoreWithIQR)} &nbsp;&nbsp;&nbsp;&nbsp;
                    ( {filteredPlayerAverageScoreWithIQR.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} )
                </div>
            </div>

            <div className="row mt-2">
                {firstRowNationKeys.map((key, index) => (
                    <div key={index} className="col-1 mb-2 p-1">
                        <div className="border p-2 d-flex flex-column rounded">
                            <span className={`fi fi-sq fi-${CountryFlagJson[key]} w-100 d-block`} style={{ aspectRatio: '1 / 1' }}></span>
                            <span className="numeric-cell text-center">{nationObj[key].toLocaleString()}</span>
                        </div>
                    </div>
                ))}
                {sortedNationKeys.length > 12 && (<>
                    {expendNations && (<>
                        {restRowNationKeys.map((key, index) => (
                            <div key={index} className="col-1 mb-2 p-1">
                                <div className="border p-2 d-flex flex-column rounded">
                                    <span className={`fi fi-sq fi-${CountryFlagJson[key]} w-100 d-block`} style={{ aspectRatio: '1 / 1' }}></span>
                                    <span className="numeric-cell text-center">{nationObj[key].toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </>)}
                    <div className="col-12">
                        {expendNations ? (
                            <button className="btn btn-outline-secondary w-100" onClick={e => setExpendNations(false)}>
                                <FaChevronUp />
                                <span className="fw-bold mx-2">{t("common:show-less")}</span>
                                <FaChevronUp />
                            </button>
                        ) : (
                            <button className="btn btn-outline-secondary w-100" onClick={e => setExpendNations(true)}>
                                <FaChevronDown />
                                <span className="fw-bold mx-2">{t("common:show-more")}</span>
                                <FaChevronDown />
                            </button>
                        )}
                    </div>
                </>)}
            </div>

            <div className="row mt-2">
                <div className="col">
                    {filteredPlayers.length > 0 && (
                        <Virtuoso
                            // useWindowScroll 사용 시 style의 height는 초기 렌더링 높이 역할을 하거나 
                            // 제거해도 무방하지만, 영역 확보를 위해 유지합니다.
                            style={{ height: '600px', border: 'none', outline: 'none' }}
                            data={filteredPlayers}
                            useWindowScroll
                            itemContent={(index, player) => (
                                <div className={`user-panel position-relative d-flex align-items-center border-bottom bg-white`}
                                    style={{ height: '35px', boxShadow: "0 0 0 0 lightgray" }}>
                                    <div style={{ width: 100 }}>
                                        {/* filteredPlayers를 기준으로 index 재계산 */}
                                        <span className="badge text-bg-primary">{player.rank}</span>
                                    </div>
                                    <div style={{ width: 200 }} className="text-truncate flex-grow-1 d-flex align-items-center">
                                        <span className={`fi fi-sq fi-${CountryFlagJson[player.nationalflag]}`}></span>
                                        <strong className="ms-2">{player.name}</strong>
                                        {/* <span>{player.countryFlag}</span> */}

                                        {/* {player.gender === 0 && <FaMars className="text-info"/>} */}
                                        {/* {player.gender === 1 && <FaVenus className="text-danger"/>} */}
                                    </div>
                                    <div style={{ width: 80 }} className="numeric-cell fw-bold">
                                        {player.score.toLocaleString()}
                                    </div>
                                    <div style={{ width: 140 }} className="text-end pe-3 numeric-cell fw-bold text-nowrap d-inline-flex">
                                        <span className="text-info w-100 numeric-cell">{player.sid}</span>
                                    </div>
                                </div>
                            )}
                        />
                    )}
                    {dataLoading === true && filteredPlayers.length === 0 && (
                        <div className="text-center py-5 text-muted fs-2">
                            <PacmanLoader color="#0984e3" />
                        </div>
                    )}
                    {dataLoading === false && filteredPlayers.length === 0 && (
                        <div className="text-center py-5 text-muted fs-2">{t(`TopwarSscPointViewer.no-result`)}</div>
                    )}
                </div>
            </div>
        </>
    );
}