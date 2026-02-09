import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import { ResponsiveHeatMapCanvas } from "@nivo/heatmap";
import { FaArrowLeft, FaPlus, FaShare, FaShareNodes, FaXmark } from "react-icons/fa6";

import ServerDataJson from "@src/assets/json/power/serverData.json";

import "./TopwarData.css";
import { useLocation, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import dayjs from "dayjs";
import "dayjs/locale/ko";
import relativeTime from "dayjs/plugin/relativeTime";
import { useTranslation } from "react-i18next";
dayjs.extend(relativeTime);
dayjs.locale("ko");

export default function TopwarCompareViewer() {
    const { t } = useTranslation("viewer");
    const [params, setParams] = useSearchParams();
    const [serverList, setServerList] = useState(()=>{
        return ServerDataJson.map(server=>server.serverNumber);
    });
    const [selectedServers, setSelectedServers] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (params !== null && selectedServers.length === 0) {
            const value = params.get("server");
            if(value !== null) {
                const decoded = decodeURIComponent(value);
                decoded.split(",").forEach(addServerByParameter);
            }
        }
        setLoading(true);
    }, []);
    useEffect(() => {
        if (loading == false) return;
        if (selectedServers.length === 0) {
            setParams({});
        }
        else {
            setParams({ server: selectedServers.map(server => server.serverNumber).join(",") });
        }
    }, [selectedServers, loading]);


    const [serverInput, setServerInput] = useState("");
    const [cutoff, setCutoff] = useState(100);

    const addServerByParameter = useCallback(async (target) => {
        if(!target) return;

        const datalist = ServerDataJson.filter(server=>server.serverNumber === parseInt(target));
        setSelectedServers(prev => [...prev, datalist[0]]);
        setServerList(prev => prev.filter(server => server !== target));
    }, []);
    const addServer = useCallback(async () => {
        const selectedServer = parseInt(serverInput);
        if (serverList.includes(selectedServer) === false) {
            window.alert(t(`TopwarCompareViewer.label-noserver`));
            return;
        }

        const datalist = ServerDataJson.filter(server=>server.serverNumber === selectedServer);
        setSelectedServers(prev => [...prev, datalist[0]]);
        setServerList(prev => prev.filter(server => server !== selectedServer));
        setServerInput("");
    }, [serverInput]);

    const removeServer = useCallback(targetServer => {
        setSelectedServers(prev => prev.filter(server => server.serverNumber !== targetServer.serverNumber));
        setServerList(prev => [...prev, targetServer.serverNumber].sort());
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

    const copyUrlToClipboard = useCallback(() => {
        const text = window.location.href;

        // 최신 브라우저 (clipboard API 지원)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => toast.success(t(`TopwarCompareViewer.label-copy-ok`)))
                .catch(err => toast.error(t(`TopwarCompareViewer.label-copy-nok`) + "<br/>"+err));
        } else {
            // fallback (구형 브라우저 대응)
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed"; // iOS 대응
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();

            try {
                document.execCommand("copy");
                toast.success(t(`TopwarCompareViewer.label-copy-ok`));
            } catch (err) {
                toast.error(t(`TopwarCompareViewer.label-copy-nok`) + "<br/>" +err);
            } finally {
                document.body.removeChild(textarea);
            }
        }
    }, [selectedServers]);

    return (<>
        <div className="row">
            <div className="col">
                <div className="d-flex align-items-center">
                    <span className="me-2">{t(`TopwarCompareViewer.label-input`)}</span>
                    <input type="text" className="form-control w-auto" placeholder="(ex) 3223"
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
        <div className="row mt-3">
            <div className="col">
                <div className="d-flex flex-wrap">
                    {selectedServers.map(server => (
                        <button className="btn btn-info me-2 mb-2" key={server.serverNumber} onClick={e => removeServer(server)}>
                            {server.serverNumber}
                            <FaXmark className="ms-2" />
                        </button>
                    ))}
                    {selectedServers.length > 0 && (
                        <button className="btn btn-primary mb-2" onClick={copyUrlToClipboard}>
                            <FaShareNodes className="me-2"/>
                            <span>{t(`TopwarCompareViewer.btn-share`)}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
        <hr />

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

        {selectedServers.length > 0 && (<>
            <div className="row">
                <div className="col">
                    <input type="text" className="form-control d-inline-block me-4 w-auto" value={cutoff} onChange={changeCutoff} />
                    <FaArrowLeft />
                    <span>{t(`TopwarCompareViewer.label-cutoff`)}</span>
                </div>
            </div>
            <div className="row mt-4">
                {listData.map(server => (
                    <div className="col-lg-6 mb-4 border p-4" key={server.serverNumber}>
                        <h3 className="mb-4 fw-bold">
                            {server.serverNumber} {t(`TopwarCompareViewer.label-server`)}
                        </h3>
                        {/* <div>({dayjs(server.data?.time).format("YYYY년 M월 D일 H시")} 기준)</div> */}

                        {cutoffIsDecimal && (
                            <div className="text-danger fw-bold mb-2">
                                {cutoff}M {t(`TopwarCompareViewer.label-user`)} : {getCutoffCount(server)}
                            </div>
                        )}

                        <div className="d-flex flex-wrap">
                            <div className="w-100 w-lg-50">
                                <div>{t(`TopwarCompareViewer.label-maxcp`)} : {getMaximumCP(server)}</div>
                                <div>{t(`TopwarCompareViewer.label-avgcp`)} : {getAverageCP(server)}</div>
                                <div>{t(`TopwarCompareViewer.label-mincp`)} : {getMinimumCP(server)}</div>
                            </div>
                            <div className="w-100 w-lg-50">
                                <div>Top <span className="d-inline-block text-danger fw-bold" style={{ width: 30 }}>5</span> {t(`TopwarCompareViewer.label-avg`)} : <span className="text-danger fw-bold">{getTopNCP(server, 5)}</span></div>
                                <div>Top <span className="d-inline-block text-danger" style={{ width: 30 }}>10</span> {t(`TopwarCompareViewer.label-avg`)} : <span className="text-danger">{getTopNCP(server, 10)}</span></div>
                                <div>Top <span className="d-inline-block text-danger opacity-75" style={{ width: 30 }}>20</span> {t(`TopwarCompareViewer.label-avg`)} : <span className="text-danger opacity-75">{getTopNCP(server, 20)}</span></div>
                                <div>Top <span className="d-inline-block text-warning" style={{ width: 30 }}>30</span> {t(`TopwarCompareViewer.label-avg`)} : <span className="text-warning">{getTopNCP(server, 30)}</span></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>)}
    </>)
}