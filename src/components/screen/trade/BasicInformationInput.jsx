import { useCallback, useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { userState } from "./recoil/AccountCreateState";

export default function BasicInformationInput() {

    const [user, setUser] = useRecoilState(userState);

    const changeVip = useCallback((e)=>{
        setUser(prev=>({...prev, vip:e.target.value}));
    }, []);
    const changeCp = useCallback(e=>{
        const cp = e.target.value === "" ? 0 : parseFloat(e.target.value);
        setUser(prev=>({...prev, cp:cp}));
    }, []);

    return (<>
        <div className="row mt-4">
            <label className="col-sm-3 col-form-label">VIP</label>
            <div className="col-sm-9">
                <select value={user.vip} onChange={changeVip} className="form-select">
                    {Array.from({length:16}, (_, i)=>16-i).map(n=>(
                        <option key={n} value={n}>{`VIP ${n}`}</option>
                    ))}
                </select>
            </div>
        </div>
        <div className="row mt-4">
            <label className="col-sm-3 col-form-label">CP</label>
            <div className="col-sm-9 d-flex">
                <input className="form-control" value={user.cp} onChange={changeCp}/>
                <div className="fs-4 ms-4">M</div>
            </div>
        </div>
    </>);
}