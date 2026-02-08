import { useCallback, useMemo, useState } from "react";

export default function StrategyTool () {
    const [mode, setMode] = useState(null);
    const [duration, setDuration] = useState("");
    const [durationType, setDurationType] = useState("분");

    const [timeline, setTimeline] = useState([]);

    const changeDuration = useCallback(e=>{
        if(e.target.value === "") {
            setDuration("");
            return;
        }
        const value = parseInt(e.target.value);
        if(isNaN(value)) return;

        setDuration(value);
    }, []);

    const step1Complete = useMemo(()=>{
        return mode !== null;
    }, [mode]);
    const step2Complete = useMemo(()=>{
        return step1Complete && duration !== "";        
    }, [step1Complete, duration]);

    return (<>
        <h1>이벤트 전략 도우미</h1>
        <hr/>
        <h6>[Step 1] 표시할 지도를 선택하세요</h6>
        <div className="row"><div className="col">
            <label className="me-4">
                <input type="radio" value="TC" checked={mode === "TC"} onChange={e=>setMode("TC")}></input>
                <span className="ms-2">TC(거인전)</span>
            </label>
            <label className="me-4">
                <input type="radio" value="SvS" checked={mode === "SvS"} onChange={e=>setMode("SvS")}></input>
                <span className="ms-2">SvS(서버전)</span>
            </label>
            <label className="me-4">
                <input type="radio" value="Legend" checked={mode === "Legend"} onChange={e=>setMode("Legend")}></input>
                <span className="ms-2">레전드팀</span>
            </label>
            {/* <label className="me-4">
                <input type="radio" value="EL" checked={mode === "EL"} onChange={e=>setMode("EL")}></input>
                <span className="ms-2">EL(영원의땅)</span>
            </label> */}
            
            <label className="me-4">
                <input type="file" className="d-none"/>
                <span className="ms-2 badge bg-danger">직접 업로드</span>
            </label>
        </div></div>

        {step1Complete && (
        <div className="row mt-4"><div className="col">
            <h6>[Step 2] 기간 입력</h6>
            <input type="text" className="form-control w-auto d-inline-block" value={duration} onChange={changeDuration}/>
            <select className="form-select w-auto d-inline-block ms-2" value={durationType} onChange={e=>setDurationType(e.target.value)}>
                <option>분</option>
                <option>시간</option>
            </select>
        </div></div>
        )}

        <hr/>
        
        {step2Complete && (
        <div className="row">
            <div className="col">
                <img src={`${import.meta.env.VITE_PUBLIC_URL}/images/map/${mode}.jpg`} width="100%"/>
            </div>
        </div>
        )}
    </>);
}