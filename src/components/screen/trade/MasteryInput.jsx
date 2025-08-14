import { useCallback, useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { userState } from "./recoil/AccountCreateState";
import NumberSelector from "../../template/NumberSelector";

//전문강화 선택화면
export default function MasteryInput() {
    const [user, setUser] = useRecoilState(userState);

    const changeMastery = useCallback((type, value)=>{
        const level = parseInt(value);
        setUser(prev=>({
            ...prev,
            mastery: {
                ...prev.mastery,
                [type]:level
            }
        }));
    }, []);

    return (<>
        <div className="row mt-4">
            <label className="col-sm-3 col-form-label d-flex align-items-center justify-content-center fs-3">육군</label>
            <div className="col-sm-9">
                {/* <select value={user.mastery?.army} onChange={e=>changeMastery('army', e.target.value)} className="form-select">
                    {Array.from({length:20}, (_, i)=>20-i).map(n=>(
                        <option key={n} value={n}>{`${n}레벨`}</option>
                    ))}
                </select> */}
                <NumberSelector min={1} max={20} value={user.mastery?.army} onChange={(name,value)=>changeMastery('army', value)} suffix=" 레벨"/>
            </div>
        </div>
        <div className="row mt-4">
            <label className="col-sm-3 col-form-label d-flex align-items-center justify-content-center fs-3">해군</label>
            {/* 
                <select value={user.mastery?.navy} onChange={e=>changeMastery('navy', e.target.value)} className="form-select">
                    {Array.from({length:20}, (_, i)=>20-i).map(n=>(
                        <option key={n} value={n}>{`${n}레벨`}</option>
                    ))}
                </select>
            */}
            <div className="col-sm-9">
                <NumberSelector min={1} max={20} value={user.mastery?.navy} onChange={(name,value)=>changeMastery('navy', value)} suffix=" 레벨"/>
            </div>
        </div>
        <div className="row mt-4">
            <label className="col-sm-3 col-form-label d-flex align-items-center justify-content-center fs-3">공군</label>
            {/* 
                <select value={user.mastery?.airforce} onChange={e=>changeMastery('airforce', e.target.value)} className="form-select">
                    {Array.from({length:20}, (_, i)=>20-i).map(n=>(
                        <option key={n} value={n}>{`${n}레벨`}</option>
                    ))}
                </select>
            */}
            <div className="col-sm-9">
                <NumberSelector min={1} max={20} value={user.mastery?.airforce} onChange={(name,value)=>changeMastery('airforce', value)} suffix=" 레벨"/>
            </div>
        </div>
    </>);
}