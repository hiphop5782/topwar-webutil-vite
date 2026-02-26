import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaMagnifyingGlass } from "react-icons/fa6";

const jsonModules = import.meta.glob('@src/assets/json/kartz/history/*.json');

export default function KartzRankViewer(){
    const { t } = useTranslation("viewer");
    const fileNames = useMemo(()=>{
        return Object.keys(jsonModules).map(path=>{
            const fileName = path.split('/').pop().replace(".json", "");
            return {path, fileName};
        });
    }, []);
    const [selectedData, setSelectedData] = useState(()=>{
        return fileNames?.length > 0 ? fileNames[0].path : null
    });

    const [loading, setLoading] = useState(false);
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
        return rankData.playerRankList;
    }, [rankData]);
    const allianceRankData = useMemo(()=>{
        if(rankData === null) return [];
        return rankData.allianceRankList;
    }, [rankData]);

    const dataExist = useMemo(()=>{
        return rankData !== null;
    }, [rankData]);

    return (<>
        <label className="d-flex align-items-center">
            <span>회차</span>
            <select className="form-select w-auto ms-4" onChange={e=>setSelectedData(e.target.value)}>
                {fileNames.map((file, index)=>(
                <option key={index} value={file.path}>{file.fileName}</option>
                ))}
            </select>
            <button className="btn btn-primary ms-2 d-flex align-items-center"
                    onClick={handleFileSelect}>
                <FaMagnifyingGlass/>
                <span className="d-none d-md-inline-block ms-1">검색</span>
            </button>
        </label>

        {rankData !== null && (
        <div className="row mt-4">
            <div className="col-md-6">
                <h3>유저 순위</h3>
                <div className="text-nowrap text-responsive">
                    <table className="table table-striped">
                        <thead>
                            <tr>
                                <th>순위</th>
                                <th>서버</th>
                                <th>유저명</th>
                                <th>라운드</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userRankData.map((player, index)=>(
                            <tr key={index}>
                                <td>{player.rank}</td>
                                <td>{player.server}</td>
                                <td>{player.nickname}</td>
                                <td>{player.round}</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="col-md-6">
                <h3>동맹 순위</h3>
                <table className="table table-striped">
                    <thead>
                        <tr>
                            <th>순위</th>
                            <th>서버</th>
                            <th>동맹명</th>
                            <th>점수</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allianceRankData.map((alliance, index)=>(
                        <tr key={index}>
                            <td>{alliance.rank}</td>
                            <td>{alliance.server}</td>
                            <td>{alliance.name}</td>
                            <td>{alliance.score}</td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        )}
    </>)
}