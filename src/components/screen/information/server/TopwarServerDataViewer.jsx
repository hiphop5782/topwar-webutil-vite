import { useTranslation } from "react-i18next";
import ServerChooser from "./ServerChooser";
import { useMemo, useState } from "react";

export default function TopwarServerDataViewer() {
    const [selectedServers, setSelectedServers] = useState([]);

    //서버 계산 기준
    //- 후속 길드가 앞 길드의 80% 수준이라면 운영중인 길드로 판단
    const calculateData = useMemo(()=>{
        if(!selectedServers && selectedServers.length === 0) return [];

        const newData = selectedServers.map(server=>{

            //활성 동맹 분석
            let allianceCountFlag = false;
            const activeAllianceData = server.allianceList.reduce((acc, cur, idx, arr)=>{
                if(idx === 0) return {count:1, score:cur.score};
                if(!allianceCountFlag && cur.score > arr[idx-1].score * 0.8) 
                    return {count:acc.count+1, score:acc.score + cur.score};
                allianceCountFlag = true;
                return acc;
            }, {});

            //동맹별 12시간이내 접속자 수 파악
            const now = parseInt(Date.now() / 1000);
            const playerMap = {};
            const activePlayers = server.playerList.filter(player=>now-player.lastLogin < 7*24*60*60);
            const activePlayerData = activePlayers.reduce((acc, cur)=>({count:acc.count+1, score:acc.score + cur.score}), {count:0, score:0});
            activePlayers.forEach(player=>{
                playerMap[player.allianceTag] = playerMap[player.allianceTag ?? "소속없음"] ?? [];
                playerMap[player.allianceTag].push(player);
            });
            
            return {
                ...server,
                activeAllianceData: activeAllianceData,
                activePlayerData : activePlayerData,
                activePlayerMap : playerMap,
                activePlayerCount : activePlayers.length,
            };
        });

        return newData;
    }, [selectedServers]);

    return (<>
        <ServerChooser onChangeServer={servers=>setSelectedServers(servers)}/>
        <hr/>
        <div className="row my-4">
        {calculateData.map(server=>(
            <div className="col-sm-6" key={server.serverNumber}>
                <div className="shadow rounded p-4">
                    <h3>{server.serverNumber} 서버</h3>
                    <div className="fs-5 mt-4">활성 동맹 : {server.activeAllianceData.count}</div>
                    <ul className="list-group mt-2">
                        {server.allianceList.filter((a, i)=>i < server.activeAllianceData.count).map((alliance, idx)=>(
                        <li className="list-group-item d-flex justify-content-between align-items-center" key={idx}>
                            <div>
                                <span className="badge text-bg-primary me-2">{alliance.tag}</span>
                                <span>{alliance.name}</span>
                            </div>
                            <div>
                                <span className="numeric-cell fw-bold text-primary">{alliance.score.toLocaleString()}</span>
                            </div>
                        </li>
                        ))}
                        <li className="list-group-item d-flex justify-content-between align-items-center bg-dark text-light">
                            <div>
                                <span>합계</span>
                            </div>
                            <div>
                                <span className="numeric-cell fw-bold text-info">{server.activeAllianceData.score.toLocaleString()}</span>
                            </div>
                        </li>
                    </ul>
                    <div className="fs-5 mt-4">활성 사용자(7일이내 접속) : {server.activePlayerCount}</div>
                    <ul className="list-group mt-2">
                        {Object.keys(server.activePlayerMap).map((k,i)=>(
                        <li className="list-group-item">
                            <li className="list-group-item d-flex justify-content-between align-items-center" key={i}>
                                <div className="d-flex align-items-center">
                                    {k === "null" ? <span className="badge text-bg-secondary">소속없음</span> : <span className="badge text-bg-primary">{k}</span>}
                                    <span className="numeric-cell fw-bold text-primary ms-2">{server.activePlayerMap[k].length.toLocaleString()}명</span>
                                </div>
                                <div>
                                    <span className="numeric-cell fw-bold text-primary">{server.activePlayerMap[k].reduce((acc,cur)=>acc+cur.score, 0).toLocaleString()}</span>
                                </div>
                            </li>
                        </li>
                        ))}
                    </ul>
                </div>
            </div>
        ))}
        </div>
    </>);
}