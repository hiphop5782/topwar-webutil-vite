import { useCallback, useEffect, useState } from "react";

export default function BasicInformationInput({json, onChange}) {
    const [vip, setVip] = useState(json?.vip || 16);
    const [cp, setCp] = useState(json?.cp || 100);

    const changeVip = useCallback((e)=>{
        setVip(parseInt(e.target.value));
    }, []);
    const changeCp = useCallback(e=>{
        const cp = e.target.value;
        setUser(cp === "" ? 0 : parseFloat(cp));
    }, []);

    useEffect(()=>{
        if(!onChange || typeof onChange !== "function") return;
        onChange({
            vip:vip,
            cp:cp
        })
    }, [vip, cp]);

    return (<>
        <div className="row mt-4">
            <label className="col-sm-3 col-form-label">VIP</label>
            <div className="col-sm-9">
                <select value={vip} onChange={changeVip} className="form-select">
                    {Array.from({length:16}, (_, i)=>16-i).map(n=>(
                        <option key={n} value={n}>{`VIP ${n}`}</option>
                    ))}
                </select>
            </div>
        </div>
        <div className="row mt-4">
            <label className="col-sm-3 col-form-label">CP</label>
            <div className="col-sm-9 d-flex">
                <input className="form-control" value={cp} onChange={changeCp}/>
                <div className="fs-4 ms-4">M</div>
            </div>
        </div>
    </>);
}