import { useTranslation } from "react-i18next";
import ServerChooser from "@src/components/template/ServerChooser";
import { useMemo, useState, useCallback } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, plugins } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { ResponsiveHeatMapCanvas } from "@nivo/heatmap";
import { FaArrowLeft, FaPlus, FaShare, FaShareNodes, FaXmark } from "react-icons/fa6";

// Chart.js 요소 등록 (ArcElement 필수!)
ChartJS.register(ArcElement, Tooltip, Legend);

const chartBackgroundColors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
    '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78',
    '#98df8a', '#ff9896', '#c5b0d5', '#c49c94', '#f7b6d2', '#c7c7c7',
    '#dbdb8d', '#9edae5'
];

export default function TopwarServerDataViewer() {
    const { t } = useTranslation("viewer");
    const [selectedServers, setSelectedServers] = useState([]);

    //서버 계산 기준
    //- 후속 길드가 앞 길드의 80% 수준이라면 운영중인 길드로 판단
    const calculateData = useMemo(() => {
        if (!selectedServers && selectedServers.length === 0) return [];

        const newData = selectedServers.map(server => {

            //활성 동맹 분석
            let allianceCountFlag = false;
            const activeAllianceData = server.allianceList.reduce((acc, cur, idx, arr) => {
                if (idx === 0) return { count: 1, score: cur.score, tags: [cur.tag] };
                if (!allianceCountFlag && cur.score > arr[idx - 1].score * 0.8)
                    return { count: acc.count + 1, score: acc.score + cur.score, tags: [...acc.tags, cur.tag] };
                allianceCountFlag = true;
                return acc;
            }, {});

            //동맹별 7일이내 접속자 수 파악
            const now = parseInt(Date.now() / 1000);
            const playerMap = {};
            const activePlayers = server.playerList.filter(player => now - player.lastLogin < 7 * 24 * 60 * 60);
            const activePlayerData = activePlayers.reduce((acc, cur) => ({ count: acc.count + 1, score: acc.score + cur.score }), { count: 0, score: 0 });
            activePlayers.forEach(player => {
                playerMap[player.allianceTag] = playerMap[player.allianceTag ?? "소속없음"] ?? { cpTotal: 0, players: [] };
                playerMap[player.allianceTag].cpTotal += player.cp;
                playerMap[player.allianceTag].players.push(player);
            });
            const activePlayerCpTotal = activePlayers.reduce((acc, player) => activeAllianceData.tags.includes(player.allianceTag) ? acc + player.cp : acc, 0);

            //차트데이터 생성
            const allianceChartObj = {
                labels: [],
                datasets: [
                    {
                        data: [],
                        backgroundColor: chartBackgroundColors
                    }
                ]
            };
            const playerChartObj = {
                labels: [],
                datasets: [
                    {
                        data: [],
                        backgroundColor: chartBackgroundColors
                    }
                ]
            };
            server.allianceList.filter((alliance, index) => index < activeAllianceData.count).forEach((alliance) => {
                allianceChartObj.labels.push(alliance.tag);
                allianceChartObj.datasets[0].data.push(alliance.score);
            });
            Object.keys(playerMap).forEach((k, i) => {
                if (activeAllianceData.tags.includes(k)) {
                    playerChartObj.labels.push(k);
                    //console.log(playerMap);
                    playerChartObj.datasets[0].data.push(playerMap[k].players.reduce((a, c) => a + c.cp, 0));
                }
            });

            return {
                ...server,
                activeAllianceData: activeAllianceData,
                activePlayerData: activePlayerData,
                activePlayerMap: playerMap,
                activePlayerCount: activePlayers.length,
                allianceChartData: allianceChartObj,
                playerChartData: playerChartObj,
                activePlayerCpTotal: activePlayerCpTotal
            };
        });

        return newData;
    }, [selectedServers]);

    //차트
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

    //히트맵 관련
    const [cutoff, setCutoff] = useState(100);
    const convertToHeatmapData = useCallback((datalist) => {
        const dataset = [];
        for (let i = 0; i < 250; i += 10) {
            dataset.push({ x: i, y: 0 });
        }

        //const convertlist = datalist.map(str => parseFloat(str)).filter(n => !Number.isNaN(n));
        const convertlist = datalist.map(player => parseInt(player.cp / 1000000));

        const countObject = {};
        for (let i = 0; i < convertlist.length; i++) {
            const range = Math.floor(convertlist[i] / 10) * 10;
            countObject[range] = countObject[range] ? countObject[range] + 1 : 1;
        };

        return dataset.map(data => {
            return { x: data.x, y: countObject[data.x] ?? 0 };
        });
    }, []);

    //memo
    const chartData = useMemo(() => {
        const dataset = [];

        selectedServers.forEach(server => {
            const dataObject = { id: server.serverNumber, data: convertToHeatmapData(server.playerList) };
            dataset.push(dataObject);
        });

        return dataset;
    }, [selectedServers]);

    const sortedKeys = useMemo(() => {
        const keySet = new Set();
        chartData.forEach(row => {
            row.data.forEach(d => {
                keySet.add(d.x);
            });
        });
        return Array.from(keySet)
            .map(x => parseInt(x, 10))
            .filter(x => !Number.isNaN(x))
            .sort((a, b) => a - b)
            .map(x => x.toString()); // 다시 문자열로 변환
    }, [chartData]);

    const getMaximumCP = useCallback((server) => {
        const average = server.playerList.map(player => player.cp / 1000000).reduce((acc, cur) => acc > cur ? acc : cur, 0);
        return average.toFixed(1) + "M";
    }, []);
    const getMinimumCP = useCallback((server) => {
        const average = server.playerList.map(player => player.cp / 1000000).reduce((acc, cur) => acc > cur ? cur : acc, 9999);
        return average.toFixed(1) + "M";
    }, []);
    const getAverageCP = useCallback((server) => {
        const average = server.playerList.map(player => player.cp / 1000000).reduce((acc, cur) => acc + cur, 0) / server.playerList.length;
        return average.toFixed(1) + "M";
    }, []);
    const getCutoffCount = useCallback((server) => {
        const filter = server.playerList.map(player => player.cp / 1000000).filter(cp => cp >= cutoff);
        return filter.length;
    }, [cutoff]);
    const getTopNCP = useCallback((server, n) => {
        const average = server.playerList.filter((player, idx) => idx < n).map(player => player.cp / 1000000).reduce((acc, cur) => acc + cur, 0) / n;
        return average.toFixed(1) + "M";
    }, []);

    const changeCutoff = useCallback(e => {
        const regex = /^[0-9]+\.?[0-9]*$/;
        const value = e.target.value;
        if (value.length === 0 || regex.test(value)) {
            setCutoff(value);
        }
    }, []);

    const cutoffIsDecimal = useMemo(() => {
        const fvalue = parseFloat(cutoff);
        return isNaN(fvalue) === false;
    }, [cutoff]);
    const cutoffNumber = useMemo(() => {
        return parseFloat(cutoff);
    }, [cutoff]);

    const listData = useMemo(() => {
        return selectedServers.sort((server1, server2) => {
            try {
                if (cutoffIsDecimal) {
                    const n1 = getCutoffCount(server1);
                    const n2 = getCutoffCount(server2);
                    if (n1 === n2) throw "pass";
                    return n2 - n1;
                }
            }
            catch (e) { }
            return parseFloat(getTopNCP(server2, 5)) - parseFloat(getTopNCP(server1, 5));

        });
    }, [cutoffIsDecimal, cutoffNumber, selectedServers]);

    return (<>
        <ServerChooser onChangeServer={servers => setSelectedServers(servers)}/>
        <hr />
        {selectedServers.length > 0 && (<>
        <div className="row my-4">
            {calculateData.map(server => (
                <div className="col-12" key={server.serverNumber}>
                    <div className="shadow rounded p-4">
                        <h3>{server.serverNumber} {t("TopwarServerDataViewer.server-suffix")}</h3>
                        <div className="fs-5 mt-4 d-flex align-items-center">
                            <span>{t("TopwarServerDataViewer.server-leader")} : </span>
                            <span className="badge text-bg-danger ms-2">{server.allianceTag}</span>
                            <span className="fw-bold ms-2">{server.kingName}</span>
                        </div>
                        <div className="fs-5 mt-4">{t("TopwarServerDataViewer.active-alliance")} : {server.activeAllianceData.count}</div>
                        <div className="row align-items-stretch">
                            <div className="col-sm-8">
                                <ul className="list-group mt-2">
                                    {server.allianceList.filter((a, i) => i < server.activeAllianceData.count).map((alliance, idx) => (
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
                                    <li className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: "rgba(255, 255, 0, 0.15)" }}>
                                        <div>
                                            <span>{t("TopwarServerDataViewer.label-total")}</span>
                                        </div>
                                        <div>
                                            <span className="numeric-cell fw-bold text-primary">{server.activeAllianceData.score.toLocaleString()}</span>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            <div className="col-sm-4 d-none d-sm-block">
                                {server.allianceChartData !== null && <Pie data={server.allianceChartData} options={chartOptions} />}
                            </div>
                        </div>
                        <div className="fs-5 mt-4">{t("TopwarServerDataViewer.active-user")} : {server.activePlayerCount}</div>
                        <div className="row align-items-stretch">
                            <div className="col-sm-8">
                                <ul className="list-group mt-2">
                                    {Object.keys(server.activePlayerMap)
                                        //.filter(k=>server.activeAllianceData.tags.includes(k))
                                        .map((k, i) => (
                                            <li className="list-group-item d-flex justify-content-between align-items-center" key={i}>
                                                {server.activeAllianceData.tags.includes(k) ? (<>
                                                    <div className="d-flex align-items-center">
                                                        <span className={`badge ${k === server.allianceTag ? 'text-bg-danger' : 'text-bg-primary'}`}>{k}</span>
                                                        <span className="numeric-cell fw-bold text-primary ms-2">
                                                            {server.activePlayerMap[k].players.length.toLocaleString()}
                                                            {t("TopwarServerDataViewer.people-suffix")}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="numeric-cell fw-bold text-primary">{server.activePlayerMap[k].cpTotal.toLocaleString()}</span>
                                                    </div>
                                                </>) : (<>
                                                    <div className="d-flex align-items-center">
                                                        <span className="badge text-bg-secondary">{k === "null" ? "소속없음" : k}</span>
                                                        <span className="numeric-cell fw-bold text-muted ms-2">
                                                            <s>
                                                                {server.activePlayerMap[k].players.length.toLocaleString()}
                                                                {t("TopwarServerDataViewer.people-suffix")}
                                                            </s>
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="numeric-cell fw-bold text-muted">
                                                            <s>{server.activePlayerMap[k].cpTotal.toLocaleString()}</s>
                                                        </span>
                                                    </div>
                                                </>)}
                                            </li>
                                        ))}
                                    <li className="list-group-item d-flex justify-content-between align-items-center" style={{ backgroundColor: "rgba(255, 255, 0, 0.15)" }}>
                                        <div>
                                            <span>{t("TopwarServerDataViewer.label-total")}</span>
                                        </div>
                                        <div>
                                            <span className="numeric-cell fw-bold text-primary">{server.activePlayerCpTotal.toLocaleString()}</span>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            <div className="col-sm-4 d-none d-sm-block">
                                {server.playerChartData !== null && <Pie data={server.playerChartData} options={chartOptions} />}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <h3 className="my-5">HeatMap</h3>

        <div style={{ height: `calc(8vw + ${(selectedServers.length - 1) * 45}px)`, minHeight: 150 }}>
            {Array.isArray(chartData) && chartData.length > 0 && (
                <ResponsiveHeatMapCanvas
                    data={chartData}
                    keys={sortedKeys}
                    indexBy="id"
                    margin={{ top: 70, right: 60, bottom: 20, left: 80 }}
                    axisTop={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -90,
                        legend: 'CP(M)',
                        legendOffset: 46
                    }}
                    axisRight={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Server Number',
                        legendPosition: 'middle',
                        legendOffset: 40
                    }}
                    axisLeft={null}
                    colors={{
                        type: 'sequential',
                        scheme: 'reds', // 내장 red 계열 색상 스케일
                        minValue: 0,    // 최소값
                        maxValue: 50,  // 최대값 (데이터 크기에 따라 조절해줘야 해)
                    }}
                    emptyColor="#555555"
                    borderWidth={1}
                    borderColor="#000000"
                    cellOpacity={1}
                    enableLabels={true}
                    legends={[
                        {
                            anchor: 'left',
                            translateX: -50,
                            translateY: 0,
                            length: 200,
                            thickness: 10,
                            direction: 'column',
                            tickPosition: 'after',
                            tickSize: 3,
                            tickSpacing: 4,
                            tickOverlap: false,
                            tickFormat: '>-.2s',
                            title: 'Value →',
                            titleAlign: 'start',
                            titleOffset: 4
                        }
                    ]}
                    theme={{
                        labels: {
                            text: {
                                fontSize: 20,
                                fontWeight: "bold"
                            }
                        },
                    }}
                    label={({ width, value }) => (width < 25 || value === 0) ? '' : value}
                    annotations={[]}
                />
            )}
        </div>

        <hr />

        <div className="row">
            <div className="col">
                <input type="text" className="form-control d-inline-block me-4 w-auto" value={cutoff} onChange={changeCutoff} />
                <FaArrowLeft />
                <span>{t(`TopwarServerDataViewer.label-cutoff`)}</span>
            </div>
        </div>
        <div className="row mt-4">
            {listData.map(server => (
                <div className="col-lg-6 mb-4 border p-4" key={server.serverNumber}>
                    <h3 className="mb-4 fw-bold">
                        {server.serverNumber} {t(`TopwarServerDataViewer.label-server`)}
                    </h3>
                    {/* <div>({dayjs(server.data?.time).format("YYYY년 M월 D일 H시")} 기준)</div> */}

                    {cutoffIsDecimal && (
                        <div className="text-danger fw-bold mb-2">
                            {cutoff}M {t(`TopwarServerDataViewer.label-user`)} : {getCutoffCount(server)}
                        </div>
                    )}

                    <div className="d-flex flex-wrap">
                        <div className="w-100 w-lg-50">
                            <div>{t(`TopwarServerDataViewer.label-maxcp`)} : {getMaximumCP(server)}</div>
                            <div>{t(`TopwarServerDataViewer.label-avgcp`)} : {getAverageCP(server)}</div>
                            <div>{t(`TopwarServerDataViewer.label-mincp`)} : {getMinimumCP(server)}</div>
                        </div>
                        <div className="w-100 w-lg-50">
                            <div>Top <span className="d-inline-block text-danger fw-bold" style={{ width: 30 }}>5</span> {t(`TopwarServerDataViewer.label-avg`)} : <span className="text-danger fw-bold">{getTopNCP(server, 5)}</span></div>
                            <div>Top <span className="d-inline-block text-danger" style={{ width: 30 }}>10</span> {t(`TopwarServerDataViewer.label-avg`)} : <span className="text-danger">{getTopNCP(server, 10)}</span></div>
                            <div>Top <span className="d-inline-block text-danger opacity-75" style={{ width: 30 }}>20</span> {t(`TopwarServerDataViewer.label-avg`)} : <span className="text-danger opacity-75">{getTopNCP(server, 20)}</span></div>
                            <div>Top <span className="d-inline-block text-warning" style={{ width: 30 }}>30</span> {t(`TopwarServerDataViewer.label-avg`)} : <span className="text-warning">{getTopNCP(server, 30)}</span></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
        </>)}
    </>);
}