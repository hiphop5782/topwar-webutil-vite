import { useCallback, useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { userState } from "./recoil/AccountCreateState";

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
            <label className="col-sm-3 col-form-label">육군</label>
            <div className="col-sm-9">
                <select value={user.mastery?.army} onChange={e=>changeMastery('army', e.target.value)} className="form-select">
                    {Array.from({length:20}, (_, i)=>20-i).map(n=>(
                        <option key={n} value={n}>{`${n}레벨`}</option>
                    ))}
                </select>
            </div>
        </div>
        <div className="row mt-4">
            <label className="col-sm-3 col-form-label">해군</label>
            <div className="col-sm-9">
                <select value={user.mastery?.navy} onChange={e=>changeMastery('navy', e.target.value)} className="form-select">
                    {Array.from({length:20}, (_, i)=>20-i).map(n=>(
                        <option key={n} value={n}>{`${n}레벨`}</option>
                    ))}
                </select>
            </div>
        </div>
        <div className="row mt-4">
            <label className="col-sm-3 col-form-label">공군</label>
            <div className="col-sm-9">
                <select value={user.mastery?.airforce} onChange={e=>changeMastery('airforce', e.target.value)} className="form-select">
                    {Array.from({length:20}, (_, i)=>20-i).map(n=>(
                        <option key={n} value={n}>{`${n}레벨`}</option>
                    ))}
                </select>
            </div>
        </div>
    </>);
}