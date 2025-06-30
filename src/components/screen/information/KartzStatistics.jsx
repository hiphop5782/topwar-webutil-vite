import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import { Line } from 'react-chartjs-2';
// Chart.js 구성 요소 등록
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const serverLabelPlugin = {
    id: 'serverLabelPlugin',
    afterDatasetsDraw(chart) {
        const { ctx, data } = chart;
        ctx.save();

        data.datasets.forEach((dataset, i) => {
            if (dataset.hidden) return;

            const meta = chart.getDatasetMeta(i);
            const midIndex = Math.floor(meta.data.length / 2);
            const point = meta.data[midIndex];
            if (!point) return;

            ctx.fillStyle = dataset.borderColor || '#000';
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(dataset.label, point.x, point.y - 10);
        });

        ctx.restore();
    }
};

const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        title: {
            display: true,
            text: "카르츠 500위 유저 변화",
        },
        legend: {
            labels: {
                filter: (legendItem, chartData) => {
                    //return legendItem.datasetIndex < 10;
                    return null;
                }
            }
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            title: {
                display: true,
                text: "유저 수",
            },
        },
        x: {
            title: {
                display: false,
                text: "날짜",
            },
        },
    },
};

const chartBackgroundColors = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
    "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#008080",
    "#9a6324", "#800000", "#aaffc3", "#808000", "#000075",
    "#808080", "#000000", "#d72638", "#3f88c5", "#f49d37",
    "#2b9348", "#f6bd60", "#ff6f61", "#3d348b", "#ff9f1c",
    "#2ec4b6", "#011627", "#ff3366", "#28df99", "#247ba0",
    "#00afb9", "#fed766", "#ef476f", "#118ab2", "#06d6a0",
    "#073b4c", "#8ecae6", "#219ebc", "#023047", "#ffb703",
    "#fb8500", "#6a4c93", "#5e548e", "#9d4edd", "#3a0ca3",
    "#4361ee", "#4895ef", "#4cc9f0", "#ff006e", "#8338ec"
];

export default function KartzStatistics() {
    const [history, setHistory] = useState([]);
    const [serverData, setServerData] = useState([]);
    const [allServer, setAllServer] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const checkDates = useMemo(() => {
        return history.filter(h => h.check) || [];
    }, [history]);

    useEffect(() => {
        if (checkDates.length === 0) return;

        const fetchAllData = async () => {
            const sortedDates = checkDates.sort((a, b) => a.date.localeCompare(b.date));

            const result = await Promise.all(
                sortedDates
                    .map(d => loadData(d.date)
                        .then(
                            data => ({ date: d.date, data })
                        )
                    )
            );
            const newServerData = {};
            result.forEach(({ date, data }) => {
                newServerData[date] = data;
            });

            setServerData(newServerData);
        };

        fetchAllData();
    }, [history]);

    const loadHistory = useCallback(async () => {
        const { data } = await axios.get("https://raw.githubusercontent.com/hiphop5782/topwar-kartz/refs/heads/main/history.json");
        setHistory(data.map(d => ({
            date: d,
            check: false
        })));
    }, []);

    const loadData = useCallback(async (date) => {
        const { data } = await axios.get(`${import.meta.env.VITE_KARTZ_URL}/${date}/rank.json`);
        return data;
    }, []);

    const checkDate = useCallback((e, target) => {
        setHistory(prev => prev.map(h => {
            if (h.date === target.date) {
                return { ...h, check: e.target.checked };
            }
            return h;
        }));
    }, []);

    const summaryOfDate = useCallback((date, data) => {
        const countObject = {};
        const accObject = {};
        let total = 0;
        data.forEach(user => {
            const isClear = user.damage === "";
            if (!countObject[user.server]) {
                countObject[user.server] = 1;
                //데미지가 있으면 stage를 1 감소
                accObject[user.server] = isClear ? user.stage : user.stage - 1;
            }
            else {
                countObject[user.server]++;
                accObject[user.server] += isClear ? user.stage : user.stage - 1;
            }
        });

        const average = total / 500;
        const weightObject = {};

        data.forEach(data => {
            if (!weightObject[data.server]) {
                weightObject[data.server] = Math.pow(Math.max(data.stage - average, 0), 2);
            }
            else {
                weightObject[data.server] += Math.pow(Math.max(data.stage - average, 0), 2);
            }
        });

        return Object.entries(countObject).map(([key, value]) => ({
            date: date,
            server: Number(key),
            count: value,
            average: accObject[key] / value,
            point: weightObject[key],
        }));
    }, []);

    const [chartDataset, setChartDataset] = useState(null);
    const [serverList, setServerList] = useState([]);

    useEffect(() => {
        if (checkDates.length === 0) return;

        //1차 - 데이터 서버별로 정리
        const first = {};
        Object.keys(serverData).sort((a, b) => a.localeCompare(b))
            .forEach(date => {
                const summary = summaryOfDate(date, serverData[date]);
                //summary를 서버별로 정리
                summary.forEach(s => {
                    if (first[s.server] === undefined) {
                        //console.log(`${s.server} 서버 데이터 신규 생성`);
                        first[s.server] = { label: "s" + s.server };
                    }
                    first[s.server][date] = s;
                });
            });

        //2차 - 차트데이터로 변환
        const second = [];
        Object.keys(first).sort((a, b) => parseInt(a) - parseInt(b))
            .forEach((key, index) => {
                const sData = first[key];
                const serverObject = {
                    label: sData.label,
                    data: [],
                    borderColor: chartBackgroundColors[index % chartBackgroundColors.length]
                };
                checkDates.forEach(d => {
                    serverObject.data.push(sData[d.date]?.count || 0);
                });
                second.push(serverObject);
            });

        //3차 - 마지막 주기 카운트 순으로 정렬
        const third = second.sort((a, b) => {
            const front = a.data[a.data.length - 1];
            const back = b.data[b.data.length - 1];
            return back - front;
        });
        setServerList(third.map(d => {
            return {
                number: parseInt(d.label.replace("s", "")),
                check: true,
            }
        }));

        setChartDataset({
            labels: [...checkDates.map(c => c.date)],
            datasets: third,
        });
    }, [checkDates, serverData]);

    const checkServer = useCallback((e, target) => {
        setServerList(prev => prev.map(server => {
            if (server.number === target.number) {
                return {
                    ...server,
                    check: e.target.checked
                };
            }
            return server;
        }));

        setChartDataset(prev => ({
            ...prev,
            datasets: prev.datasets.map(d => {
                if (target.number === parseInt(d.label.replace("s", ""))) {
                    return {
                        ...d,
                        hidden: !e.target.checked
                    }
                }
                return d;
            })
        }));
    }, []);

    useEffect(() => {
        setServerList(prev => prev.map(server => {
            return { ...server, check: allServer };
        }));
        if (chartDataset !== null) {
            setChartDataset(prev => ({
                ...prev,
                datasets: prev.datasets.map(d => {
                    return {
                        ...d,
                        hidden: !allServer
                    }
                })
            }));
        }
    }, [allServer]);

    return (<>
        <h1>카르츠 서버 랭커 변화</h1>
        <hr />
        <div className="row">
            <div className="col">
                <h6>표시할 기간 선택</h6>
                {history.map(h => (
                    <label key={h.date} className="me-4">
                        <input type="checkbox" checked={h.check} onChange={e => checkDate(e, h)} />
                        <span className="ms-2">{h.date}</span>
                    </label>
                ))}
            </div>
        </div>

        {chartDataset !== null && (<>
            <div className="row mt-4 mb-4">
                <div className="col">
                    <h6>
                        표시할 서버 선택
                        <label className="ms-4">
                            <input type="checkbox" checked={allServer} onChange={e => setAllServer(e.target.checked)} />
                            <span className="ms-2">전체</span>
                        </label>
                    </h6>
                    {serverList.map(s => (
                        <label key={s.number} className="me-4">
                            <input type="checkbox" checked={s.check} onChange={e => checkServer(e, s)} />
                            <span className="ms-2">{s.number}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div className="row" style={{ height: "75vh", maxHeight: "75vh", marginBottom: "400px" }}>
                <div className="col">
                    <Line options={options} data={chartDataset} plugins={[serverLabelPlugin]} />
                </div>
            </div>
        </>)}
    </>);
}