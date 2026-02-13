import { useTranslation } from "react-i18next";
import ServerChooser from "./ServerChooser";
import { useCallback, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, plugins } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Chart.js 요소 등록 (ArcElement 필수!)
ChartJS.register(ArcElement, Tooltip, Legend);

const chartBackgroundColors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
    '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78',
    '#98df8a', '#ff9896', '#c5b0d5', '#c49c94', '#f7b6d2', '#c7c7c7',
    '#dbdb8d', '#9edae5'
];

export default function TopwarServerRealtimeDataViewer() {
    const [selectedServers, setSelectedServers] = useState([]);
    const [loading, setLoading] = useState(false);

    //서버 계산 기준
    //- 후속 길드가 앞 길드의 80% 수준이라면 운영중인 길드로 판단
    const calculateData = useMemo(()=>{
        if(!selectedServers && selectedServers.length === 0) return [];

        const newData = selectedServers.map(server=>{

            //활성 동맹 분석
            let allianceCountFlag = false;
            const activeAllianceData = server.allianceList.reduce((acc, cur, idx, arr)=>{
                if(idx === 0) return {count:1, score:cur.score, tags:[cur.tag]};
                if(!allianceCountFlag && cur.score > arr[idx-1].score * 0.8) 
                    return {count:acc.count+1, score:acc.score + cur.score, tags:[...acc.tags, cur.tag]};
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

    const searchServer = useCallback(async (server)=>{
        if(loading) return;
        setLoading(true);
        const {data} = await axios.post("http://192.168.0.9:55555", {server:server});
        setSelectedServers(prev=>([...prev, data]));
        setLoading(false);
    }, [loading]);

    //차트
    const playerChartRef = useRef(null);
    const allianceChartRef = useRef(null);
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            animationScale: true,
            animationRotate: true,
        },
        plugins: {
            legend: {
                display: false,
                position: "left",
            }
        }
    };

    const allianceChartData = useMemo(()=>{
        const obj = {
            labels:[],
            datasets:[
                {
                    data:[],
                    backgroundColor:chartBackgroundColors
                }
            ]
        };
        calculateData.forEach(server=>{
            server.allianceList.filter((alliance, index)=>index < server.activeAllianceData.count).forEach((alliance)=>{
                obj.labels.push(alliance.tag);
                obj.datasets[0].data.push(alliance.score);
            });
        });
        return obj;
    }, [calculateData]);

    const playerChartData = useMemo(()=>{
        const obj = {
            labels:[],
            datasets:[
                {
                    data:[],
                    backgroundColor:chartBackgroundColors
                }
            ]
        };
        calculateData.forEach(server=>{
            Object.keys(server.activePlayerMap).forEach((k, i)=>{
                if(server.activeAllianceData.tags.includes(k)) {
                    obj.labels.push(k);
                    obj.datasets[0].data.push(server.activePlayerMap[k].reduce((a, c)=>a + c.cp, 0));
                }
            });
        });
        return obj;
    }, [calculateData]);

    return (<>
        <ServerChooser onSelectServer={server=>searchServer(server)} useParameter={false} disabled={loading}/>
        <hr/>
        <div className="row my-4">
        {calculateData.map(server=>(
            <div className="col-12" key={server.serverNumber}>
                <div className="shadow rounded p-4">
                    <h3>{server.serverNumber} 서버</h3>
                    <div className="fs-5 mt-4 d-flex align-items-center">
                        <span>지도자 : </span>
                        <span className="badge text-bg-danger ms-2">{server.allianceTag}</span>
                        <span className="fw-bold ms-2">{server.kingName}</span>
                    </div>
                    <div className="fs-5 mt-4">활성 동맹 : {server.activeAllianceData.count}</div>
                    <div className="row align-items-stretch">
                        <div className="col-sm-8">
                            <ul className="list-group mt-2">
                                {server.allianceList.filter((a, i)=>i < server.activeAllianceData.count).map((alliance, idx)=>(
                                <li className="list-group-item d-flex justify-content-between align-items-center" key={idx}>
                                    <div>
                                        <span className={`badge ${alliance.tag === server.allianceTag ? 'text-bg-danger' : 'text-bg-primary'} me-2`}>{alliance.tag}</span>
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
                        </div>
                        <div className="col-sm-4 d-none d-sm-block">
                                <div ref={allianceChartRef}>
                                    {allianceChartData !== null && <Pie data={allianceChartData} options={chartOptions}/>}
                                </div>
                        </div>
                    </div>
                    <div className="fs-5 mt-4">활성 사용자(7일이내 접속) : {server.activePlayerCount}</div>
                    <div className="row align-items-stretch">
                        <div className="col-sm-8">
                            <ul className="list-group mt-2">
                                {Object.keys(server.activePlayerMap).map((k,i)=>(
                                <li className="list-group-item d-flex justify-content-between align-items-center" key={i}>
                                    {server.activeAllianceData.tags.includes(k) ? (<>
                                    <div className="d-flex align-items-center">
                                            <span className={`badge ${k === server.allianceTag ? 'text-bg-danger' : 'text-bg-primary'}`}>{k}</span>
                                            <span className="numeric-cell fw-bold text-primary ms-2">{server.activePlayerMap[k].length.toLocaleString()}명</span>
                                    </div>
                                    <div>
                                        <span className="numeric-cell fw-bold text-primary">{server.activePlayerMap[k].reduce((acc,cur)=>acc+cur.score, 0).toLocaleString()}</span>
                                    </div>
                                    </>) : (<>
                                    <div className="d-flex align-items-center">
                                            <span className="badge text-bg-secondary">{k === "null" ? "소속없음" : k}</span>
                                            <span className="numeric-cell fw-bold text-muted ms-2">{server.activePlayerMap[k].length.toLocaleString()}명</span>
                                    </div>
                                    <div>
                                        <span className="numeric-cell fw-bold text-muted">{server.activePlayerMap[k].reduce((acc,cur)=>acc+cur.score, 0).toLocaleString()}</span>
                                    </div>
                                    </>)}
                                </li>
                                ))}
                            </ul>
                        </div>
                        <div className="col-sm-4 d-none d-sm-block">
                            <div ref={playerChartRef}>
                                {playerChartData !== null && <Pie data={playerChartData} options={chartOptions}/>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ))}
        </div>

        {loading === true && (
            <div id="loadingCover" 
                className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
                style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 9999 }}>
                <div className="text-center">
                    <div className="spinner-border text-light" style={{ width: "3rem", height: "3rem" }} role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="text-white mt-3">실시간 조회 중... 잠시만 기다려주세요</h5>
                </div>
            </div>
        )}
    </>);
}