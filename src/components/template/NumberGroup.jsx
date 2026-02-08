import { useCallback, useMemo } from "react";
import "./NumberGroup.css";

export default function({name, min=1, max=10, value=1, step=1, onChange, className}) {

    const range = useMemo(()=>max-min+1, [min, max]);

    const onNumberClick = useCallback((n)=>{
        if(onChange && typeof onChange === "function") {
            onChange({target:{name:name, value:n}});
        }
    }, []);

    return (
    <div className={`d-flex w-100 justify-content-center align-items-center ${className}`}>
        {Array.from({length:range}, (_, i)=>i+1).map(i=>(
        <div className="w-100 d-flex justify-content-center align-items-center" key={i}>
            <span className={`number ${value === i ? 'active':''}`} onClick={e=>onNumberClick(i)}>{i}</span>
        </div>
        ))}
    </div>    
    );
}