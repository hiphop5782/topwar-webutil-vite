import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaMagnifyingGlass } from "react-icons/fa6";

import "./KartzData.css";

const jsonModules = import.meta.glob('@src/assets/json/kartz/history/*.json');

export default function KartzRankViewer(){
    const { t } = useTranslation("viewer");
    const fileNames = useMemo(()=>{
        return Object.keys(jsonModules).map(path=>{
            const fileName = path.split('/').pop().replace(".json", "");
            return {path, fileName};
        }).sort((a,b)=>b.fileName.localeCompare(a.fileName));
    }, []);
    const [selectedData, setSelectedData] = useState(()=>{
        return fileNames?.length > 0 ? fileNames[0].path : null
    });

    const [loading, setLoading] = useState(false);
    useEffect(()=>{
        if(selectedData === null) return;
        handleFileSelect();
    }, [selectedData]);
    const handleFileSelect = useCallback(async ()=>{
        setLoading(true);
        try {
            const module = await jsonModules[selectedData]();
            setRankData(module.default);
        }
        catch(error) {
            console.error("데이터 로드 실패", error);
        }
        finally {
            setLoading(false);
        }
    }, [selectedData]);
    
    const [rankData, setRankData] = useState(null);    
    const userRankData = useMemo(()=>{
        if(rankData === null) return [];
        return rankData.playerRankList ?? [];
    }, [rankData]);
    const allianceRankData = useMemo(()=>{
        if(rankData === null) return [];
        return rankData.allianceRankList ?? [];
    }, [rankData]);

    const dataExist = useMemo(()=>{
        return rankData !== null;
    }, [rankData]);

    const [serverInput, setServerInput] = useState("");
    const changeServerInput = useCallback((e) => {
        const value = e.target.value;
        // 빈 문자열이거나(전체 삭제 대응) 숫자만 포함된 경우에만 업데이트
        if (value === "" || /^[0-9]+$/.test(value)) {
            setServerInput(value);
        }
    }, []); // 의존성 배열을 비워 함수 재생성을 방지합니다.

    const filteredUserRankData = useMemo(()=>{
        if(serverInput === "") return userRankData;
        return userRankData.filter(user=>user.server === parseInt(serverInput));
    }, [userRankData, serverInput]);
    const filteredAllianceRankData = useMemo(()=>{
        if(serverInput === "") return allianceRankData;
        return allianceRankData.filter(alliance=>alliance.server === parseInt(serverInput));
    }, [allianceRankData, serverInput]);

    return (<>
        <label className="d-flex">
            <span className="d-flex align-items-center">회차</span>
            <select className="form-select w-auto ms-4" onChange={e=>setSelectedData(e.target.value)}>
                {fileNames.map((file, index)=>(
                <option key={index} value={file.path}>{file.fileName}</option>
                ))}
            </select>
        </label>

        {dataExist && (
        <div className="row mt-2">
            <div className="col d-flex">
                <label className="col-form-label me-4">서버</label>
                <input type="text" className="form-control w-auto" placeholder="e.g., 3223"
                            value={serverInput} onChange={changeServerInput} inputMode="numeric"/>
            </div>
        </div>
        )}

        {dataExist && (
        <div className="row mt-4">
            <div className="col-md-6">
                <h3>유저 순위 (총 {filteredUserRankData.length}명)</h3>
                <div className="text-nowrap text-responsive">
                    <table className="table table-striped table-rank">
                        <thead>
                            <tr>
                                <th width={45}>순위</th>
                                <th width={55}>서버</th>
                                <th>유저명</th>
                                <th className="text-end">라운드</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUserRankData.map((player, index)=>(
                            <tr key={index} className={`rank-${player.rank}`}>
                                <td>{player.rank}</td>
                                <td className="numeric-cell">{player.server}</td>
                                <td>{player.nickname ?? "Unknown"}</td>
                                <td className=" numeric-cell text-end">{player.round}</td>
                                <td>{player.damage?.length > 0 ? <span>{player.damage}</span> : <span className="text-danger fw-bold">Clear</span>}</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {allianceRankData.length > 0 && (
            <div className="col-md-6">
                <h3>동맹 순위 (총 {filteredAllianceRankData.length}개)</h3>
                <div className="text-nowrap table-responsive">
                    <table className="table table-striped table-rank">
                        <thead>
                            <tr>
                                <th width={45}>순위</th>
                                <th width={55}>서버</th>
                                <th>동맹명</th>
                                <th className="text-end" width={75}>점수</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAllianceRankData.map((alliance, index)=>(
                            <tr key={index} className={`rank-${alliance.rank}`}>
                                <td>{alliance.rank}</td>
                                <td className="numeric-cell">{alliance.server}</td>
                                <td className="text-truncate">[{alliance.tag}] {alliance.name}</td>
                                <td className="text-end numeric-cell">{alliance.score.toLocaleString()}</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
        </div>
        )}
    </>)
}