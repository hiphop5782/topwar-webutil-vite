import { useCallback, useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { userState } from "../recoil/AccountCreateState";

export default function EtcInformation() {
    const [user, setUser] = useRecoilState(userState);
    
    const changeMemo = useCallback(e=>{
        setUser(prev=>({
            ...prev,
            memo:e.target.value
        }));
    }, []);

    return (<>
        <div className="row mt-4">
            <div className="col">
                <textarea className="form-control" style={{minHeight:300}} placeholder="기타 보유 아이템이나 코멘트를 작성하세요"
                    name="memo" value={user.memo} onChange={changeMemo}></textarea>
            </div>
        </div>
    </>);
}