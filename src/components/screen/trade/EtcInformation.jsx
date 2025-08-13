import { useEffect, useState } from "react";

export default function EtcInformation({json, onChange}) {
    const [memo, setMemo] = useState(json.memo || "");
    useEffect(()=>{
        if(onChange && typeof onChange === "function") {
            onChange(memo);
        }
    }, [memo]);

    return (<>
        <div className="row mt-4">
            <div className="col">
                <textarea className="form-control" style={{minHeight:300}} placeholder="기타 보유 아이템이나 코멘트를 작성하세요"
                    value={memo} onChange={e=>setMemo(e.target.value)}></textarea>
            </div>
        </div>
    </>);
}