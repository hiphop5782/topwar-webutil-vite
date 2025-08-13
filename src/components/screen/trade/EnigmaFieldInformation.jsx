import { useCallback, useState } from "react";
import NumberSelector from "../../template/NumberSelector";

export default function EnigmaFieldInformation({json, onChange}) {
    const [firstArea, setFirstArea] = useState(json?.enigmaField?.firstArea || [5,10,10,10,10]);
    const [secondArea, setSecondArea] = useState(json?.enigmaField?.secondArea || [10,5,5,5,5,5,5]);
    const [thirdArea, setThirdArea] = useState(json?.enigmaField?.thirdArea || [5,3,3,3,3,3]);

    const changeFirstArea = useCallback((index, level)=>{
        setFirstArea(prev=>prev.map((lv,idx)=>{
            if(idx === index) return level;
            return lv;
        }));
    }, []);
    const changeSecondArea = useCallback((index, level)=>{
        setSecondArea(prev=>prev.map((lv,idx)=>{
            if(idx === index) return level;
            return lv;
        }));
    }, []);
    const changeThirdArea = useCallback((index, level)=>{
        setThirdArea(prev=>prev.map((lv,idx)=>{
            if(idx === index) return level;
            return lv;
        }));
    }, []);

    return (<>
        <div className="row mt-4">
            <div className="col-sm-4 col-form-label">1번 영역<br/>(5개 슬롯)</div>
            <div className="col-sm-8 d-flex">
                {firstArea.map((n,i)=>(
                <div className="w-100 d-flex justify-content-center align-items-center" key={i}>
                    <NumberSelector min={1} max={20} value={n} onChange={lv=>changeFirstArea(i,lv)}/>
                </div>
                ))}
                {7-firstArea.length > 0 && (<>
                    {Array.from({length:7-firstArea.length}, (_,i)=>i).map(n=>(
                        <div className="w-100 d-flex justify-content-center align-items-center" key={n}></div>
                    ))}
                </>)}
            </div>
        </div>
        <div className="row mt-4">
            <div className="col-sm-4 col-form-label">2번 영역<br/>(7개 슬롯)</div>
            <div className="col-sm-8 d-flex">
                {secondArea.map((n,i)=>(
                <div className="w-100 d-flex justify-content-center align-items-center" key={i}>
                    <NumberSelector min={1} max={20} value={n} onChange={lv=>changeSecondArea(i,lv)}/>
                </div>
                ))}
                {7-secondArea.length > 0 && (<>
                    {Array.from({length:7-secondArea.length}, (_,i)=>i).map(n=>(
                        <div className="w-100 d-flex justify-content-center align-items-center" key={n}></div>
                    ))}
                </>)}
            </div>
        </div>
        <div className="row mt-4">
            <div className="col-sm-4 col-form-label">3번 영역<br/>(6개 슬롯)</div>
            <div className="col-sm-8 d-flex">
                {thirdArea.map((n,i)=>(
                <div className="w-100 d-flex justify-content-center align-items-center" key={i}>
                    <NumberSelector min={1} max={20} value={n} onChange={lv=>changeThirdArea(i,lv)}/>
                </div>
                ))}
                {7-thirdArea.length > 0 && (<>
                    {Array.from({length:7-thirdArea.length}, (_,i)=>i).map(n=>(
                        <div className="w-100 d-flex justify-content-center align-items-center" key={n}></div>
                    ))}
                </>)}
            </div>
        </div>
    </>)
}