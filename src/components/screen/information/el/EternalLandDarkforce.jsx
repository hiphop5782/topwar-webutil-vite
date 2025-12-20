import DarkforceImage from "@src/assets/images/el/darkforce.jpg";
import { useCallback, useMemo, useState } from "react";

const scoreByArea = {
    "Zone-1" : 100, 
    "Zone-2" : 110, 
    "Zone-3" : 120, 
    "Zone-4" : 140, 
    "SRA-1" : 120, 
    "SRA-2" : 130, 
    "SRA-3" : 140
};

const dateOptions = {
    year: 'numeric',
    month: '2-digit', // 월을 두 자리 숫자로 표시 (01, 02, ..., 12)
    day: '2-digit'    // 일을 두 자리 숫자로 표시 (01, 02, ..., 31)
};

export default function EternalLandDarkforce() {
    const [troop, setTroop] = useState(1);
    const [area, setArea] = useState("Zone-1");
    const [tech, setTech] = useState(0);
    const [count, setCount] = useState(5);
    const [delay, setDelay] = useState(40);
    const [currentScore, setCurrentScore] = useState(0);

    const getDayAfter = useCallback(diff=>{
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + diff);
        return nextWeek.toLocaleDateString("sv-SE", dateOptions);
    }, []);
    const [endDate, setEndDate] = useState(()=>getDayAfter(15));

    const changeDuration = useCallback(e=>{
        const replacement = e.target.value.replace(/[^0-9]+/g, "");
        const result = replacement.length === 0 ? 0 : parseInt(replacement);
        setDuration(result);
    });

    const turnDuration = useMemo(()=>{
        return count === 1 ? delay : 240 + delay;
    }, [count, delay]);
    const scorePerTurn = useMemo(()=>{
        return scoreByArea[area] * (100 + tech) / 100;
    }, [area, tech]);
    const tryCount = useMemo(()=>{
        return 3600 / turnDuration;
    }, []);
    const scorePerHour = useMemo(()=>{
        return tryCount * troop * scorePerTurn;
    }, [troop, scorePerTurn, turnDuration, tryCount]);
    const scorePerDay = useMemo(()=>{
        return scorePerHour * 24;
    }, [scorePerHour]);

    const formatting = useCallback((number, fixed=2)=>{
        const v1 = number.toFixed(fixed);
        const v2 = parseFloat(v1);
        return v2.toLocaleString();
    }, []);

    const changeCurrentScore = useCallback(e=>{
        const replacement = e.target.value.replace(/[^0-9]+/g, "");
        const result = replacement.length === 0 ? 0 : parseInt(replacement);
        setCurrentScore(result);
    }, []);

    const targetScore = useMemo(()=>{
        const now = new Date();
        const deadline = new Date(`${endDate} 23:00`);

        const diff = deadline.getTime() - now.getTime();
        if(diff <= 0) return 0;

        const diffHour = diff / 1000 / 60 / 60;
        return diffHour * scorePerHour + currentScore;
    }, [scorePerHour, currentScore, endDate]);

    //render
    return (<>
        <h2>암흑 점수 계산기</h2>
        <p className="text-muted">암흑은 성급이 아니라 <b className="text-danger">구역</b>에 따라 점수가 다릅니다</p>

        <div className="row mt-4">
            <div className="col-sm-6">
                <img src={DarkforceImage} width={"100%"}/>
            </div>
            <div className="col-sm-6 mt-4 mt-sm-0 text-nowrap">
                <h3>점수 계산</h3>
                <hr/>
                <div className="row mt-2">
                    <div className="col-form-label col-4">
                        사냥 구역
                    </div>
                    <div className="col-8">
                        <select  className="form-select" value={area} onChange={e=>setArea(e.target.value)}>
                            <option value={"Zone-1"}>1구역 (시작지점)</option>
                            <option value={"Zone-2"}>2구역 (무기고,군사요새)</option>
                            <option value={"Zone-3"}>3구역 (연구 시설)</option>
                            <option value={"Zone-4"}>중심부 (영원의 도시)</option>
                            <option value={"SRA-1"}>특수채집 1구역</option>
                            <option value={"SRA-2"}>특수채집 2구역</option>
                            <option value={"SRA-3"}>특수채집 3구역</option>
                        </select>
                    </div>
                </div>
                <div className="row mt-2">
                    <div className="col-form-label col-4">
                        대열 수
                    </div>
                    <div className="col-8">
                        <select  className="form-select" value={troop} onChange={e=>setTroop(parseInt(e.target.value))}>
                            <option value={1}>1개 대열 (자동)</option>
                            <option value={2}>2개 대열 (자동)</option>
                            <option value={3}>3개 대열 (자동)</option>
                            <option value={4}>4개 대열 (수동)</option>
                            <option value={5}>5개 대열 (수동)</option>
                            <option value={6}>6개 대열 (수동)</option>
                            <option value={7}>7개 대열 (수동)</option>
                        </select>
                    </div>
                </div>
                <div className="row mt-2">
                    <div className="col-form-label col-4">
                        영원의 기술
                    </div>
                    <div className="col-8">
                        <select  className="form-select" value={tech} onChange={e=>setTech(parseInt(e.target.value))}>
                            <option value={0}>0레벨 (0%)</option>
                            <option value={4}>1레벨 (4%)</option>
                            <option value={8}>2레벨 (8%)</option>
                            <option value={12}>3레벨 (12%)</option>
                            <option value={16}>4레벨 (16%)</option>
                            <option value={20}>5레벨 (20%)</option>
                        </select>
                    </div>
                </div>
                <hr/>
                <div className="row mt-2">
                    <div className="col-form-label col-4">
                        시간당 공격횟수
                    </div>
                    <div className="col-form-label col-8 text-end">
                        약 {formatting(tryCount * troop)} 번
                    </div>
                </div>
                <div className="row mt-2">
                    <div className="col-form-label col-4">
                        시간당 예상점수
                    </div>
                    <div className="col-form-label col-8 text-end">
                        약 {formatting(scorePerHour)} 점
                    </div>
                </div>
                <div className="row mt-2">
                    <div className="col-form-label col-4">
                        1일당 예상점수
                    </div>
                    <div className="col-form-label col-8 text-end">
                        약 {formatting(scorePerDay)} 점
                    </div>
                </div>
                <hr/>
                <div className="row mt-2">
                    <div className="col-form-label col-4">
                        현재 점수
                    </div>
                    <div className="col-8">
                        <input type="text" inputMode="numeric" className="form-control"
                            value={currentScore} onChange={changeCurrentScore}/>
                    </div>
                </div>
                <div className="row mt-2">
                    <div className="col-form-label col-4">
                        종료 일자
                    </div>
                    <div className="col-8">
                        <input type="date" className="form-control"
                            value={endDate} onChange={e=>setEndDate(e.target.value)}/>
                    </div>
                </div>
                <div className="row mt-4 fw-bold text-danger">
                    <div className="col-form-label col-4">
                        최종 예상 점수
                    </div>
                    <div className="col-form-label col-8 text-end">
                        {formatting(targetScore, 0)} 점
                    </div>
                </div>
            </div>
        </div>
    </>)
}