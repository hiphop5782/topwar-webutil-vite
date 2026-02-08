import baseListJson from "@src/assets/json/base.json";
import { useCallback, useEffect, useMemo, useState } from "react";

import "./BaseSkinSelector.css";
import { useRecoilState } from "recoil";
import { userState } from "../recoil/AccountCreateState";

export default function BaseSkinSelector() {
    const [user, setUser] = useRecoilState(userState);
    const [baseSkins, setBaseSkins] = useState([]);
    useEffect(()=>{
        setBaseSkins(baseListJson
        .filter(base=>{
            if(base.name === "기본") return false;
            if(base.name === "영광의 성채") return false;
            if(base.name === "리더의 품격") return false;
            if(base.name === "1호 기지") return false;
            return true;
        })
        .sort((a,b)=>{
            return a.name.localeCompare(b.name);
        })
        .map(base=>{
            return {...base, selected:user.baseSkins.includes(base.no)};
        }))
    }, [user.baseSkins]);

    useEffect(()=>{
        if(!user.baseSkins || user.baseSkins.length === 0) return;
        setBaseSkins(prev=>prev.map(base=>{
            if(user.baseSkins.includes(base.no)) {
                return {...base, selected:true};
            }
            return base;
        }));
    }, [user.baseSkins]);

    const clickAllBaseSkin = useCallback((selected)=>{
        const newSkins = selected ? baseSkins.map(base=>base.no) : [];
        setUser(prev=>({...prev, baseSkins:newSkins}));
    }, [baseSkins]);
    const clickBaseSkin = useCallback((target)=>{
        const current = user.baseSkins.includes(target.no);
        const future = !current;
        const newSkins = future ? user.baseSkins.concat(target.no) : user.baseSkins.filter(no => no !== target.no);
        setUser(prev=>({
            ...prev, 
            baseSkins:newSkins
        }));
    }, [user.baseSkins]);

    return (<>
        <div className="row">
            <div className="col-6">
                선택된 기지 수 : {user.baseSkins.length}개
            </div>
            <div className="col-6 text-end">
                <button className="btn btn-sm btn-success" onClick={e=>clickAllBaseSkin(true)}>전체 선택</button>
                <button className="btn btn-sm btn-danger ms-2" onClick={e=>clickAllBaseSkin(false)}>전체 해제</button>
            </div>
        </div>
        <div className="row">
            {baseSkins.map(base=>(
            <div className={`col-sm-2 col-3 base-wrapper ${base.selected ? 'active':''}`} key={base.no}>
                <img className="w-100" src={`${import.meta.env.VITE_PUBLIC_URL}/images/base/${base.no}.png`}
                        onClick={e=>clickBaseSkin(base)}/>
                <p className="text-center fs-6">{base.name}</p>
            </div>
            ))}
        </div>
    </>);
}