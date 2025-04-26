import ServerListJson from "@src/assets/json/servers.json";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import { ResponsiveHeatMapCanvas } from "@nivo/heatmap";
import { FaPlus, FaXmark } from "react-icons/fa6";

export default function ServerAnalyzer() {
    const [selectedServers, setSelectedServers] = useState([]);
    const [serverList, setServerList] = useState([...ServerListJson.list]);
    const [serverInput, setServerInput] = useState("");

    const addServer = useCallback(async () => {
        const selectedServer = parseInt(serverInput);
        if (serverList.includes(selectedServer) === false) {
            window.alert("존재하지 않거나 이미 추가한 서버 번호입니다");
            return;
        }

        //console.log("source 변경 테스트");

        //src의 json 불러오기(gh-pages 길이 오류로 제거)
        //const module = await import(`@src/assets/json/top100/${selectedServer}.json`)
        // setSelectedServers(prev => [...prev, {
        //     number: selectedServer,
        //     data: module.default || []
        // }]);

        //ajax 불러오기
        const { data } = await axios.get(`http://data.progamer.info/${selectedServer}.json`);
        setSelectedServers(prev => [...prev, {
            number: selectedServer,
            data: data ?? []
        }]);

        setServerList(prev => prev.filter(server => server !== selectedServer));
        setServerInput("");
    }, [serverInput]);

    const removeServer = useCallback(targetServer => {
        setSelectedServers(prev => prev.filter(server => server.number !== targetServer.number));
        setServerList(prev => [...prev, targetServer.number].sort());
    }, []);

    const inputServer = useCallback(e => {
        const regex = /^[1-9][0-9]*$/;
        const value = e.target.value;
        const isValid = value.length === 0 || regex.test(value);
        if (isValid === false) return;
        setServerInput(value);
    }, []);

    const convertToHeatmapData = useCallback((datalist) => {
        const dataset = [];
        for (let i = 0; i < 200; i += 10) {
            dataset.push({ x: i, y: 0 });
        }

        const convertlist = datalist.map(str => parseFloat(str)).filter(n => !Number.isNaN(n));

        const countObject = {};
        for (let i = 0; i < convertlist.length; i++) {
            let cpNumber = parseFloat(convertlist[i]);
            try {
                const prev = parseFloat(convertlist[i - 1]);
                const next = parseFloat(convertlist[i + 1]);
                if (isNaN(prev) || isNaN(next)) throw "skip";
                if (!(prev >= cpNumber && cpNumber >= next)) {
                    cpNumber = (prev + next) / 2;
                }
            }
            catch (e) { }
            const range = Math.floor(cpNumber / 10) * 10;
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
            const dataObject = { id: server.number, data: convertToHeatmapData(server.data.okList) };
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

    return (<>
        <h1>서버별 Top 100 분석</h1>
        <p className="text-muted">여러 서버의 Top 100 유저 분포를 히트맵으로 확인해보세요</p>
        <hr />
        <div className="row">
            <div className="col">
                <div className="d-flex">
                    <input type="text" className="form-control w-auto" placeholder="서버 번호 입력"
                        onChange={inputServer} value={serverInput}
                        onKeyUp={e => {
                            if (e.key === "Enter") addServer();
                        }} />
                    <button className="btn btn-success ms-2" onClick={addServer}>
                        <FaPlus className="fw-bold" />
                    </button>
                </div>
            </div>
        </div>
        <div className="row mt-2">
            <div className="col">
                <div className="d-flex flex-wrap">
                    {selectedServers.map(server => (
                        <button className="btn btn-info me-2" key={server.number} onClick={e => removeServer(server)}>
                            {server.number}
                            <FaXmark className="ms-2" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
        <hr />

        <div style={{ height: 130 + selectedServers.length * 55 }}>
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
                    label={({ value }) => value === 0 ? '' : value}
                    annotations={[]}
                />
            )}
        </div>
    </>)
}