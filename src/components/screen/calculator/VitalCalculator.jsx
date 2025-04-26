import { useMemo, useState } from "react";
import VitalInfo from "@src/assets/images/vital-info.png";
import VitalInfo2 from "@src/assets/images/vital-info2.png";

function VitalCalculator() {
    const [vitSpeed, setVitSpeed] = useState(111.0);
    const [baseSpeed, setBaseSpeed] = useState(91.0);

    const [addSpeed, setAddSpeed] = useState(8);

    const currentSpeed = useMemo(()=>{
        const time = (100 - vitSpeed + baseSpeed) / (100 + baseSpeed) * 360;
        const second = parseInt(time % 60);
        const minute = parseInt(time / 60);
        return `${minute}분 ${second}초`;
    }, [vitSpeed, baseSpeed]);

    const futureSpeed = useMemo(()=>{
        const time = (100 - (vitSpeed + addSpeed) + (baseSpeed + addSpeed)) / (100 + baseSpeed + addSpeed) * 360;
        const second = parseInt(time % 60);
        const minute = parseInt(time / 60);
        return `${minute}분 ${second}초`;
    }, [addSpeed, vitSpeed, baseSpeed]);

    return (
        <>
            <div className="row">
                <div className="col">
                    <h1>체력 회복 속도 계산기</h1>
                    <hr/>
                </div>
            </div>

            <div className="row">
                <div className="col-12">
                    <h2>1. 기지 정보를 눌러 값을 확인하고 입력하세요</h2>
                </div>
                <div className="col-12">
                    <img src={VitalInfo} style={{maxWidth:400, width:"100%"}}/>
                </div>
                <div className="col-12">
                    <div className="mt-1">
                        체력 회복 속도 (%)
                        <input type="number" placeholder="(ex) 111.0" className="form-control text-end"
                            defaultValue={vitSpeed} onChange={e=>setVitSpeed(parseInt(e.target.value))}/>
                    </div>
                    <div className="mt-1">
                        기초 체력 회복 속도 (%)
                        <input type="number" placeholder="(ex) 91.0" className="form-control text-end"
                            defaultValue={baseSpeed} onChange={e=>setBaseSpeed(parseInt(e.target.value))}/>
                    </div>
                </div>
                <div className="col-12 mt-2">
                    <h3>현재 <span className="text-success">{currentSpeed}</span> 당 1의 체력이 회복됩니다</h3>
                </div>
            </div>

            <div className="row mt-4">
                <div className="col">
                    <h2>2. 추가할 장식의 정보를 입력하세요</h2>
                </div>
                <div className="col-12">
                    <img src={VitalInfo2} style={{maxWidth:350, width:"100%"}}/>
                </div>
                <div className="col-12">
                    <div className="mt-1">
                        구매할 장식의 기초 체력 회복 속도 (%)
                        <input type="number" className="form-control text-end"
                            defaultValue={addSpeed} onChange={e=>setAddSpeed(parseInt(e.target.value))}/>
                    </div>
                </div>
                <div className="col-12 mt-2">
                    <h3>구매 시 <span className="text-danger">{futureSpeed}</span> 당 1의 체력이 회복됩니다</h3>
                </div>
            </div>
        </>
    );
}

export default VitalCalculator;