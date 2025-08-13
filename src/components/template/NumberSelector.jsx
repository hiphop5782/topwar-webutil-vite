import { useCallback, useEffect, useMemo, useState } from "react";
import "./NumberSelector.css";

export default function NumberSelector({value, min=1, max=10, block=5, onChange, className}) {
    const changeNumber = useCallback(n=>{
        if(onChange && typeof onChange === "function") {
            onChange(n);
        }
        setOpen(false);
    }, []);

    const [open, setOpen] = useState(false);
    const openNumberSelectDialog = useCallback(()=>{
        setOpen(prev=>!prev);
    }, []);

    const range = useMemo(()=>max-min+1, [min,max]);
    const subArray = useMemo(()=>{
        const originArray = Array.from({length:range}, (_, i)=>i+1);
        const newArray = [];
        for(let i=0; i < range; i+=block) {
            newArray.push(originArray.slice(i, i+block));
        }
        return newArray;
    }, [range, block]);

    console.log(subArray);

    return (<>
        {/* 숫자가 표시되는 자리 */}
        <div className={`number-select d-flex justify-content-center align-items-center ${className}`}
            onClick={openNumberSelectDialog}>{value}</div>

        {/* 팝업 */}
        <div className={`number-selector-backdrop ${open ? 'active':''}`}>
            <div className="number-selector-wrapper">
                {subArray.map((row, i)=>(
                <div key={i} className="w-100 d-flex">
                    {row.map(n=>(
                        <div key={n} className={`number-selector-unit ${value===n ? 'active':''}`}
                            style={{width:`${100/row.length}%`}}
                                onClick={e=>changeNumber(n)}>{n}</div>
                    ))}
                </div>
                ))}
            </div>
        </div>
    </>)
}