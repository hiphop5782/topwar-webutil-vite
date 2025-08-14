import { useCallback, useMemo, useState } from "react";
import NumberSelector from "../../template/NumberSelector";
import { useRecoilState } from "recoil";
import { userState } from "./recoil/AccountCreateState";

export default function EnigmaFieldInformation() {
    const [user, setUser] = useRecoilState(userState);

    const changeArea = useCallback((name,value)=>{
        const type = name.split("-")[0];
        const index = parseInt(name.split("-")[1]);
        const level = value;

        setUser(prev=>({
            ...prev,
            enigmaField: {
                ...prev.enigmaField,
                [type]: prev.enigmaField[type].map((lv,idx)=>idx === index ? level : lv)
            }
        }));
    }, []);

    const firstArea = useMemo(()=>user.enigmaField.first, [user.enigmaField]);
    const secondArea = useMemo(()=>user.enigmaField.second, [user.enigmaField]);
    const thirdArea = useMemo(()=>user.enigmaField.third, [user.enigmaField]);

    return (<>
        <div className="row mt-4">
            <div className="col-sm-4 col-form-label">1번 영역<br/>(5개 슬롯)</div>
            <div className="col-sm-8 d-flex">
                {firstArea.map((n,i)=>(
                <div className="w-100 d-flex justify-content-center align-items-center" key={i}>
                    <NumberSelector min={1} max={20} value={n} name={`first-${i}`} onChange={changeArea}/>
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
                    <NumberSelector min={1} max={20} value={n} name={`second-${i}`} onChange={changeArea}/>
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
                    <NumberSelector min={1} max={20} value={n} name={`third-${i}`} onChange={changeArea}/>
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