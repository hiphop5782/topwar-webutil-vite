import ServerChooser from "@src/components/template/ServerChooser";
import { useCallback, useMemo, useState } from "react";

import "./KartzData.css";

const jsonModules = import.meta.glob('@src/assets/json/kartz/history/*.json');

import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import { Line } from 'react-chartjs-2';
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const serverLabelPlugin = {
    id: 'serverLabelPlugin',
    afterDatasetsDraw(chart) {
        const { ctx, data } = chart;
        ctx.save();

        data.datasets.forEach((dataset, i) => {
            if (dataset.hidden) return;
            // 강조되지 않은(order가 100인) 데이터셋은 라벨 그리기를 건너뜀
            if (dataset.order !== 0) return;

            const meta = chart.getDatasetMeta(i);
            const midIndex = Math.floor(meta.data.length / 2);
            const lastIndex = meta.data.length - 1;
            const midPoint = meta.data[midIndex];
            const lastPoint = meta.data[lastIndex];

            ctx.fillStyle = dataset.borderColor || '#000';
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";

            // 중간 라벨
            if (midPoint) {
                ctx.fillText(dataset.label, midPoint.x, midPoint.y - 10);
            }

            // 오른쪽 끝 라벨
            if (lastPoint) {
                ctx.textAlign = "right"; // 오른쪽에 그릴 때는 왼쪽 정렬이 자연스러움
                ctx.fillText(dataset.label, lastPoint.x - 10, lastPoint.y - 10);
            }
        });

        ctx.restore();
    }
};

const chartBackgroundColors = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
    "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#008080",
    "#9a6324", "#800000", "#aaffc3", "#808000", "#000075",
    "#808080", "#d72638", "#3f88c5", "#f49d37",
    "#2b9348", "#f6bd60", "#ff6f61", "#3d348b", "#ff9f1c",
    "#2ec4b6", "#ff3366", "#28df99", "#247ba0",
    "#00afb9", "#fed766", "#ef476f", "#118ab2", "#06d6a0",
    "#073b4c", "#8ecae6", "#219ebc", "#023047", "#ffb703",
    "#fb8500", "#6a4c93", "#5e548e", "#9d4edd", "#3a0ca3",
    "#4361ee", "#4895ef", "#4cc9f0", "#ff006e", "#8338ec"
];

export default function KartzServerHistoryViewer() {
    const [selectedServers, setSelectedServers] = useState([]);
    const onChangeServer = useCallback((servers)=>{
        if(servers.length === 0) 
            setSelectedFiles(null);
        setSelectedServers(servers);
    }, []);

    const [fileNames, setFileNames] = useState(()=>{
        return Object.keys(jsonModules).map(path=>{
            const fileName = path.split('/').pop().replace(".json", "");
            return {path, fileName, checked:false};
        }).sort((a,b)=>b.fileName.localeCompare(a.fileName));
    });

    //구현중
    const [selectedFiles, setSelectedFiles] = useState(null);
    const [fileLoading, setFileLoading] = useState(false);
    const checkItem = useCallback(async (file, checked)=>{
        if(checked) {//체크시 추가
            setFileLoading(true);
            try {
                const module = await jsonModules[file.path]();
                setSelectedFiles(prev=>({...prev, [file.fileName] : module.default}));
                setFileNames(prev=>prev.map(f=>{
                    if(f.fileName === file.fileName) {
                        return {...f , checked : checked};
                    }
                    return {...f};
                }));
            }
            catch(error) {
                console.error("데이터 로드 실패", error);
            }
            finally {
                setFileLoading(false);
            }
        }
        else {//체크 해제시 제거
            setSelectedFiles(prev=>{
                const { [file.fileName] : _, ...rest } = prev;
                if(Object.keys(rest).length === 0)
                    return null;
                return rest;
            });
        }
    }, [selectedServers]);

    const isServerExist = useMemo(()=>selectedServers.length > 0, [selectedServers]);
    const isFileSelected = useMemo(()=>selectedFiles !== null, [selectedFiles]);

    //차트 표시 속성
    const options = useMemo(() => {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: "상위 500위 유저 분포",
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
                        text: "인원수",
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
    }, []);

    //차트 데이터
    const [showOthers, setShowOthers] = useState(false);//다른 서버 같이 보기
    const chartDataset = useMemo(()=>{
        //선택된 서버나 파일이 없으면 차단
        if(selectedServers.length === 0) return null;
        if(selectedFiles === null) return null;

        //선택 서버 명단 추출
        const serverList = selectedServers.map(server=>server.serverNumber);

        //차트 데이터 생성
        //1. 라벨 생성
        const chartLabels = Object.keys(selectedFiles).sort((a, b)=>a.localeCompare(b));

        //2. 누적 데이터 계산
        const dummyDatasets = {};
        chartLabels.forEach((date, index)=>{
            const temp = {};
            const origin = selectedFiles[date].playerRankList;
            origin.forEach(player=>{
                if(showOthers || serverList.includes(player.server)) {
                    temp[player.server] = temp[player.server] ?? 0;
                    temp[player.server]++;
                }
            });
            Object.keys(temp).forEach(server=>{
                dummyDatasets[server] = dummyDatasets[server] ?? Array.from({length:chartLabels.length}, ()=>0);
                dummyDatasets[server][index] = temp[server];
            });
        });

        //3.차트데이터로 변환
        const chartDatasets = Object.keys(dummyDatasets).map((key, index)=>{
            const isSelected = serverList.includes(parseInt(key));
            return {
                label : "s"+key , //서버명
                data : dummyDatasets[key].map(v=>v || 0),
                tension : 0.4,
                fill : isSelected,
                order: isSelected ? 0 : 100,
                borderColor : isSelected ? chartBackgroundColors[index % chartBackgroundColors.length] : "#EEE",
                pointRadius : isSelected ? 2 : 0,
            }
        });

        return {
            labels: chartLabels,
            datasets: chartDatasets
        };

        //더미
        return {
            labels:['2025-10', '2025-11', '2025-12', '2026-01'],
            datasets:[
                {label:'s3223', data:[65,59,80,81,56], tension:0.2},
                {label:'s3224', data:[28,48,40,19,86], tension:0.2},
            ]
        };
    }, [selectedServers, selectedFiles, showOthers]);

    const checkPeriod = useCallback(n=>{
        if(selectedFiles === null) return false;

        const filenameList = fileNames.map(file=>file.fileName).sort((a,b)=>a.localeCompare(b));
        const selectedFilenameList = Object.keys(selectedFiles).sort((a,b)=>a.localeCompare(b));
        if(n === undefined) 
            return filenameList.length === selectedFilenameList.length && selectedFilenameList.every((v,i)=>v === filenameList[i]);

        if(selectedFilenameList.length !== n) return false;
        return filenameList.length >= selectedFilenameList.length 
                && selectedFilenameList.every((v,i)=>{
                    const offset = filenameList.length - selectedFilenameList.length;
                    return v === filenameList[offset + i];
                });
    }, [selectedFiles, fileNames]);

    const changePeriod = useCallback(async (n)=>{
        setFileLoading(true);
        
        const filenameList = fileNames.sort((a,b)=>b.fileName.localeCompare(a.fileName)).slice(0, n);

        const newSelectedFiles = {};
        try {
            for(const file of filenameList) {
                const loader = jsonModules[file.path];
                if(typeof loader === 'function') {
                    const module = await loader();
                    newSelectedFiles[file.fileName] = module.default;
                }
            }

            setSelectedFiles(newSelectedFiles);
            setFileNames(prev=>prev.map((file,index)=>({
                ...file, checked : index < n
            })));
        }
        catch(error) {
            console.error("데이터 로드 실패", error);
        }
        finally {
            setFileLoading(false);
        }
    }, [fileNames, jsonModules]);

    return (<>
        <ServerChooser onChangeServer={onChangeServer} enableShare={false}/>
        
        {isServerExist && (<>
            {/* 주요 기간 버튼 생성 */}
            <div className="my-1">
                <button className={`btn ${checkPeriod(3) ? 'btn-primary' : 'btn-outline-primary'} me-2`} onClick={e=>changePeriod(3)}>최근 3회차</button>
                <button className={`btn ${checkPeriod(6) ? 'btn-primary' : 'btn-outline-primary'} me-2`} onClick={e=>changePeriod(6)}>최근 6회차</button>
                <button className={`btn ${checkPeriod(12) ? 'btn-primary' : 'btn-outline-primary'} me-2`} onClick={e=>changePeriod(12)}>최근 12회차</button>
                <button className={`btn ${checkPeriod() ? 'btn-primary' : 'btn-outline-primary'} me-2`} onClick={e=>changePeriod()}>전체 회차</button>
            </div>

            {/* 파일명을 체크박스로 생성 */}
            {fileNames.map((file, index)=>(
            <label className="me-4" key={index}>
                <input type="checkbox" className="form-check-input" onChange={e=>checkItem(file, e.target.checked)} checked={file.checked}/>
                <span className="form-check-label ms-2 numeric-cell">{file.fileName}</span>
            </label>
            ))}

            {isFileSelected && (<>
            <label className="d-block mt-2">
                <input type="checkbox" className="form-check-input" checked={showOthers} onChange={e=>setShowOthers(e.target.checked)}/>
                <span className="form-check-label ms-2 text-primary fw-bold">다른 서버 같이 보기</span>
            </label>
            </>)}
            {chartDataset !== null && (
            <div className="row" style={{ height: "75vh", maxHeight: "75vh", marginBottom: "400px" }}>
                <div className="col">
                    <Line options={options} data={chartDataset} plugins={[serverLabelPlugin]} />
                </div>
            </div>
            )}
        </>)}
    </>)
}