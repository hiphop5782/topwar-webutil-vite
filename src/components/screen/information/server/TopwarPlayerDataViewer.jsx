import CountryFlagJson from "@src/assets/json/power/countryFlag.json";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import "flag-icons/sass/flag-icons.scss";
import "./TopwarData.css";
import { FaChevronDown, FaChevronUp, FaMars, FaVenus } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import PacmanLoader from "react-spinners/PacmanLoader"

export default function TopwarPlayerDataViewer() {
    const [playerList, setPlayerList] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const loadData = useCallback(async ()=>{
        const data = await import("@src/assets/json/power/playerData.json");
        setPlayerList(data.default);
        setDataLoading(false);
    }, []);
    useEffect(()=>{ loadData(); }, []);

    const [searchTerm, setSearchTerm] = useState("");
    const [searchNickname, setSearchNickname] = useState("");
    const { t } = useTranslation(["viewer", "commons"]);

    // 1. 원본 데이터 정렬 (기존 유지, 렌더링 시 재계산 방지)
    const sortedPlayers = useMemo(() => {
        return [...playerList].sort((p1, p2) => p2.cp - p1.cp).map((player, index)=>({...player, rank:index+1}));
    }, [playerList]);

    // 2. 검색 필터링 로직 추가
    const filteredPlayers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        const nickname = searchNickname.trim().toLowerCase();
        if (!term && !nickname) return sortedPlayers;
        
        if(nickname.length > 0) return sortedPlayers.filter(player => {
            return player.nickname?.toLowerCase().startsWith(nickname);
        });
        if(term.length > 0) return sortedPlayers.filter(player => {
            return player.server.toString() === term;
        });

        return sortedPlayers.filter(player=>{
            return player.nickname === nickname && player.server.toString() === term;
        });
    }, [searchTerm, searchNickname, sortedPlayers]);

    const calculateDays = useCallback((player)=>{
        const today = parseInt(Date.now() / 24 / 60 / 60 / 1000);
        const lastLogin = parseInt(player.lastLogin / 24 / 60 / 60);
        const days = today - lastLogin;
        if(days > 30) return 'fold day-30';
        else if(days > 7) return 'fold day-7';
        return '';
    }, []);

    const countObj = useMemo(()=>{
        return filteredPlayers.reduce((acc, player)=>{
            const today = parseInt(Date.now() / 24 / 60 / 60 / 1000);
            const lastLogin = parseInt(player.lastLogin / 24 / 60 / 60);
            const days = today - lastLogin;
            if(days > 30) return {...acc, total : acc.total + 1 , stop : acc.stop + 1};
            if(days > 7) return {...acc, total : acc.total + 1 , pause : acc.pause + 1};
            return {...acc, total : acc.total + 1 , active : acc.active + 1};
        }, {total : 0 , active : 0, pause : 0 , stop : 0});
    }, [filteredPlayers]);

    const nationObj = useMemo(()=>{
        return filteredPlayers.reduce((acc, player)=>{
            acc[player.countryFlag] = acc[player.countryFlag] ?? 0;
            acc[player.countryFlag]++;
            return acc;
        }, {});
    }, [filteredPlayers]);

    const minNations = useMemo(()=>{
        return searchTerm.length > 0 ? 1 : 100;
    }, [searchTerm]);

    const [expendNations, setExpendNations] = useState(false);
    const sortedNationKeys = useMemo(()=>{
        return Object.keys(nationObj).filter(k=>nationObj[k] >= minNations).sort((a,b)=>nationObj[b] - nationObj[a]);
    }, [nationObj, minNations]);
    const firstRowNationKeys = useMemo(()=>{
        return sortedNationKeys.slice(0, 12);
    }, [sortedNationKeys]);
    const restRowNationKeys = useMemo(()=>{
        return sortedNationKeys.slice(12);
    }, [sortedNationKeys]);

    return (
        <>
            <div className="d-flex align-items-center mb-1">
                {/* <h3>{searchTerm.length === 0 ? "서버별" : searchTerm} Top 100 (총 {filteredPlayers.length.toLocaleString()}명)</h3> */}
                    {/* 검색 입력창 추가 */}
                    <span>{t(`TopwarPlayerDataViewer.label-input`)}</span>
                    <input 
                        type="text" 
                        className="form-control w-auto ms-4" 
                        placeholder="e.g., 3223" 
                        value={searchTerm}
                        onChange={(e) => {
                            const regex = /[0-9]*/;
                            if(!regex.test(e.target.value)) return;
                            setSearchTerm(e.target.value);
                        }}
                    />
                    <span className="ms-4">{t(`TopwarPlayerDataViewer.label-nickname`)}</span>
                    <input type="text" className="form-control w-auto ms-4" placeholder="e.g., ＫＩＤ" value={searchNickname} onChange={e=>setSearchNickname(e.target.value)}/>
            </div>
            <div className="row mb-3">
                <div className="col-6 col-lg-3 p-2">
                    <div className="d-flex flex-column shadow rounded text-nowrap">
                        <span className="text-dark text-center">{t(`TopwarPlayerDataViewer.label-total`)}</span> 
                        <span className="text-dark text-center">({countObj.total.toLocaleString()})</span>
                    </div>
                </div>
                <div className="col-6 col-lg-3 p-2">
                    <div className="d-flex flex-column shadow rounded text-nowrap">
                        <span className="text-info text-center">{t(`TopwarPlayerDataViewer.label-active`)}</span> 
                        <span className="text-info text-center">({countObj.active.toLocaleString()})</span>
                    </div>
                </div>
                <div className="col-6 col-lg-3 p-2">
                    <div className="d-flex flex-column shadow rounded text-nowrap">
                        <span className="text-warning text-center">{t(`TopwarPlayerDataViewer.label-pause`)}</span> 
                        <span className="text-warning text-center">({countObj.pause.toLocaleString()})</span>
                    </div>
                </div>
                <div className="col-6 col-lg-3 p-2">
                    <div className="d-flex flex-column shadow rounded text-nowrap">
                        <span className="text-danger text-center">{t(`TopwarPlayerDataViewer.label-stop`)}</span> 
                        <span className="text-danger text-center">({countObj.stop.toLocaleString()})</span>
                    </div>
                </div>
            </div>

            <div className="row mt-2">
                {firstRowNationKeys.map((key, index)=>(
                <div key={index} className="col-1 mb-2 p-1">
                    <div className="border p-2 d-flex flex-column rounded">
                        <span className={`fi fi-sq fi-${CountryFlagJson[key]} w-100 d-block`} style={{aspectRatio: '1 / 1'}}></span>
                        <span className="numeric-cell text-center">{nationObj[key].toLocaleString()}</span>
                    </div>
                </div>
                ))}
                {sortedNationKeys.length > 12 && (<>
                    {expendNations && (<>
                    {restRowNationKeys.map((key, index)=>(
                        <div key={index} className="col-1 mb-2 p-1">
                        <div className="border p-2 d-flex flex-column rounded">
                            <span className={`fi fi-sq fi-${CountryFlagJson[key]} w-100 d-block`} style={{aspectRatio: '1 / 1'}}></span>
                            <span className="numeric-cell text-center">{nationObj[key].toLocaleString()}</span>
                        </div>
                    </div>
                    ))}
                    </>)}
                    <div className="col-12">
                        {expendNations ? (
                        <button className="btn btn-outline-secondary w-100" onClick={e=>setExpendNations(false)}>
                            <FaChevronUp/>
                            <span className="fw-bold mx-2">{t("common:show-less")}</span>
                            <FaChevronUp/>
                        </button>
                        ) : (
                        <button className="btn btn-outline-secondary w-100" onClick={e=>setExpendNations(true)}>
                            <FaChevronDown/>
                            <span className="fw-bold mx-2">{t("common:show-more")}</span>
                            <FaChevronDown/>
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
                            <div className={`d-flex align-items-center border-bottom bg-white ${calculateDays(player)}`}
                                 style={{ height: '35px', boxShadow: "0 0 0 0 lightgray" }}>
                                <div style={{ width: 100 }}>
                                    {/* filteredPlayers를 기준으로 index 재계산 */}
                                    <span className="badge text-bg-primary">{player.rank}</span>
                                </div>
                                <div style={{ width: 200 }} className="text-truncate flex-grow-1 d-flex align-items-center">
                                    <span className={`fi fi-sq fi-${CountryFlagJson[player.countryFlag]}`}></span>
                                    <strong className="ms-2">{player.nickname}</strong>
                                    {/* <span>{player.countryFlag}</span> */}
                                    
                                    {/* {player.gender === 0 && <FaMars className="text-info"/>} */}
                                    {/* {player.gender === 1 && <FaVenus className="text-danger"/>} */}
                                </div>
                                <div style={{ width: 80 }} className="numeric-cell fw-bold">
                                    {(player.cp / 1000000).toFixed(2) + "M"}
                                </div>
                                <div style={{ width: 120 }} className="text-end pe-3 numeric-cell fw-bold text-nowrap">
                                    <span className="text-info">{player.server}</span>
                                    
                                    <span className="d-none d-sm-inline">
                                        &nbsp;
                                        <span className="text-danger">[{player.allianceTag ? player.allianceTag.padEnd(4) : <>&nbsp;&nbsp;&nbsp;&nbsp;</>}]</span>
                                    </span>
                                </div>
                            </div>
                        )}
                    />
                    )}
                    {dataLoading === true && filteredPlayers.length === 0 && (
                        <div className="text-center py-5 text-muted fs-2">
                            <PacmanLoader color="#0984e3"/>
                        </div>
                    )}
                    {dataLoading === false && filteredPlayers.length === 0 && (
                        <div className="text-center py-5 text-muted fs-2">{t(`TopwarPlayerDataViewer.no-result`)}</div>
                    )}
                </div>
            </div>
        </>
    );
}