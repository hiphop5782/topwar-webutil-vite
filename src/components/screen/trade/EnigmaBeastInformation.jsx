import { useCallback, useMemo, useState } from "react";
import { FaMinus, FaPlus } from "react-icons/fa";
import { useRecoilState } from "recoil";
import { userState } from "./recoil/AccountCreateState";
import { FaArrowUp } from "react-icons/fa6";

import "./EnigmaBeastInformation.css";

const beastList = ["사슴", "가오리", "독수리", "곰"];
const gradeList = ["에픽", "유니크", "레어", "희귀"];
const beastMainOptions = {
    "사슴":[
        "출정 최대치",
        "전체 데미지 증가", "전체 데미지 감면",
        "육군 데미지 증가", "육군 데미지 감면",
        "해군 데미지 증가", "해군 데미지 감면",
        "공군 데미지 증가", "공군 데미지 감면",
        "공격 시 전체 공격력 증가", "방어 시 전체 공격력 증가",
        "공격 시 육군 공격력 증가", "방어 시 육군 공격력 증가",
        "공격 시 해군 공격력 증가", "방어 시 해군 공격력 증가",
        "공격 시 공군 공격력 증가", "방어 시 공군 공격력 증가",
    ],
    "가오리":[
        "전체 방어도 증가", "육군 방어도 증가", "해군 방어도 증가", "공군 방어도 증가",
        "공격 시 전체 공격력 증가", "방어 시 전체 공격력 증가",
        "공격 시 육군 공격력 증가", "방어 시 육군 공격력 증가",
        "공격 시 해군 공격력 증가", "방어 시 해군 공격력 증가",
        "공격 시 공군 공격력 증가", "방어 시 공군 공격력 증가",
    ],
    "곰":[
        "전체 데미지 감면", "육군 데미지 감면", "해군 데미지 감면", "공군 데미지 감면", 
        "공격 시 전체 공격력 증가", "방어 시 전체 공격력 증가",
        "공격 시 육군 공격력 증가", "방어 시 육군 공격력 증가",
        "공격 시 해군 공격력 증가", "방어 시 해군 공격력 증가",
        "공격 시 공군 공격력 증가", "방어 시 공군 공격력 증가",
        "공격 시 전체 생명력 증가", "방어 시 전체 생명력 증가",
        "공격 시 육군 생명력 증가", "방어 시 육군 생명력 증가",
        "공격 시 해군 생명력 증가", "방어 시 해군 생명력 증가",
        "공격 시 공군 생명력 증가", "방어 시 공군 생명력 증가",
    ],
    "독수리":[
        "전체 데미지 증가", "육군 데미지 증가", "해군 데미지 증가", "공군 데미지 증가", 
        "공격 시 전체 공격력 증가", "방어 시 전체 공격력 증가",
        "공격 시 육군 공격력 증가", "방어 시 육군 공격력 증가",
        "공격 시 해군 공격력 증가", "방어 시 해군 공격력 증가",
        "공격 시 공군 공격력 증가", "방어 시 공군 공격력 증가",
        "공격 시 전체 생명력 증가", "방어 시 전체 생명력 증가",
        "공격 시 육군 생명력 증가", "방어 시 육군 생명력 증가",
        "공격 시 해군 생명력 증가", "방어 시 해군 생명력 증가",
        "공격 시 공군 생명력 증가", "방어 시 공군 생명력 증가",
    ]
};
const beastSubOptions = {
    "사슴":[
        "전체 데미지 증가", "전체 데미지 감면", "전군 방어 상성 증가",
        "전체 공격력 증가", "전체 생명력 증가",
        "육군 공격력 증가", "육군 생명력 증가",
        "해군 공격력 증가", "해군 생명력 증가",
        "공군 공격력 증가", "공군 생명력 증가",
        "전체 원소 향상", "전체 원소 저항",
        "육군 원소 향상", "육군 원소 저항",
        "해군 원소 향상", "해군 원소 저항",
        "공군 원소 향상", "공군 원소 저항",
    ],
    "가오리":[
        "육군 데미지 증가", "육군 데미지 감면",
        "해군 데미지 증가", "해군 데미지 감면",
        "공군 데미지 증가", "공군 데미지 감면",
        "(대육군) 해군 방어도 증가",
        "전체 공격력 증가", "전체 생명력 증가",
        "육군 공격력 증가", "육군 생명력 증가",
        "해군 공격력 증가", "해군 생명력 증가",
        "공군 공격력 증가", "공군 생명력 증가",
        "전체 원소 향상", "전체 원소 저항",
        "육군 원소 향상", "육군 원소 저항",
        "해군 원소 향상", "해군 원소 저항",
        "공군 원소 향상", "공군 원소 저항",
    ],
    "곰":[
        "육군 데미지 증가", "육군 데미지 감면",
        "해군 데미지 증가", "해군 데미지 감면",
        "공군 데미지 증가", "공군 데미지 감면",
        "(대공군) 육군 방어도 증가",
        "전체 공격력 증가", "전체 생명력 증가",
        "육군 공격력 증가", "육군 생명력 증가",
        "해군 공격력 증가", "해군 생명력 증가",
        "공군 공격력 증가", "공군 생명력 증가",
        "전체 원소 향상", "전체 원소 저항",
        "육군 원소 향상", "육군 원소 저항",
        "해군 원소 향상", "해군 원소 저항",
        "공군 원소 향상", "공군 원소 저항",
    ],
    "독수리":[
        "육군 데미지 증가", "육군 데미지 감면",
        "해군 데미지 증가", "해군 데미지 감면",
        "공군 데미지 증가", "공군 데미지 감면",
        "(대해군) 공군 방어도 증가",
        "전체 공격력 증가", "전체 생명력 증가",
        "육군 공격력 증가", "육군 생명력 증가",
        "해군 공격력 증가", "해군 생명력 증가",
        "공군 공격력 증가", "공군 생명력 증가",
        "전체 원소 향상", "전체 원소 저항",
        "육군 원소 향상", "육군 원소 저항",
        "해군 원소 향상", "해군 원소 저항",
        "공군 원소 향상", "공군 원소 저항",
    ]
};
const potentials = {
    "에픽":{min:11200, max:16000}, 
    "유니크":{min:6400, max:8000}, 
    "레어":{min:4800, max:6400}, 
    "희귀":{min:3200, max:4800}, 
    "일반":{min:1600, max:3200}
};

const dummyBeast = {
    type:"사슴",
    grade:"에픽",
    level:5,
    potential:16000,
    main:"출정 최대치",
    sub1:"전체 데미지 증가",
    sub2:"전체 데미지 감면",
    sub3:"전체 공격력 증가"
};

function EnigmaBeastViewer({index, beast, onChange}) {

    const onBeastPotentialChange = useCallback((beast, index, e)=>{
        const potential = parseInt(e.target.value);
        if(potential < potentials[beast.grade.min]) return;
        if(potential > potentials[beast.grade.max]) return;

        if(onChange && typeof onChange === "function") {
            onChange(index, "potential", potential);
        }
    }, []);

    const onMainOptionChange = useCallback((beast, index, e)=>{
        if(onChange && typeof onChange === "function") {
            onChange(index, "main", e.target.value);
        }
    }, []);

    const onSubOptionChange = useCallback((beast, index, e)=>{
        //기존에 사용중인 옵션을 선택하려고 할 경우 처리할 내용을 작성


        if(onChange && typeof onChange === "function") {
            onChange(index, e.target.name, e.target.value);
        }
    }, []);

    return (
        <div className="row mt-4">
            <div className="col">
                <div className="row">
                    <div className="col-sm-4 col-form-label">종류</div>
                    <div className="col-sm-8">
                        <select className="form-select" value={beast.type} name="type" onChange={e=>onChange(index, e.target.name, e.target.value)}>
                            {beastList.map(beast=>(
                            <option key={beast}>{beast}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-4 col-form-label">등급</div>
                    <div className="col-sm-8">
                        <select className="form-select" value={beast.grade} name="grade" onChange={e=>onChange(index, e.target.name, e.target.value)}>
                            {gradeList.map(grade=>(
                            <option key={grade}>{grade}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-4 col-form-label">성급</div>
                    <div className="col-sm-8">
                        <select className="form-select" value={beast.level} name="level" onChange={e=>onChange(index, e.target.name, e.target.value)}>
                            {Array.from({length:5}, (_,i)=>5-i).map(n=>(
                            <option key={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-4 col-form-label">잠재력</div>
                    <div className="col-sm-8">
                        <input className="form-control" type="text" inputMode="numeric" placeholder="16000"
                            min={potentials[beast.grade.min]} max={potentials[beast.grade.max]} name="potential" 
                            value={beast.potential} onChange={e=>onBeastPotentialChange(beast, index, e)}/>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-4 col-form-label">메인옵션</div>
                    <div className="col-sm-8">
                        <select className="form-select" name="main" value={beast.main} onChange={e=>onMainOptionChange(beast, index, e)}>
                            {beastMainOptions[beast.type].map((opt, i)=>(
                            <option key={i}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-4 col-form-label">서브옵션 1</div>
                    <div className="col-sm-8">
                        <select className="form-select" name="sub1" value={beast.sub1} onChange={e=>onSubOptionChange(beast, index, e)}> 
                            {beastSubOptions[beast.type].map((opt, i)=>(
                            <option key={i}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-4 col-form-label">서브옵션 2</div>
                    <div className="col-sm-8">
                        <select className="form-select" name="sub2" value={beast.sub2} onChange={e=>onSubOptionChange(beast, index, e)}>
                            {beastSubOptions[beast.type].map((opt, i)=>(
                            <option key={i}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-4 col-form-label">서브옵션 3</div>
                    <div className="col-sm-8">
                        <select className="form-select" name="sub3" value={beast.sub3} onChange={e=>onSubOptionChange(beast, index, e)}>
                            {beastSubOptions[beast.type].map((opt, i)=>(
                            <option key={i}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function EnigmaBeastInformation() {
    const [user, setUser] = useRecoilState(userState);

    const beasts = useMemo(()=>{
        return user.enigmaBeast;
    }, [user.enigmaBeast]);

    const adjustPotential = useCallback((grade, value)=>{
        if(value < potentials[grade].min) 
            value = potentials[grade].min;
        else if(value > potentials[grade].max)
            value = potentials[grade].max;
        return value;
    }, []);
    
    const onBeastChange = useCallback((index, name, value)=>{
        switch(name) {
            case "level":
                value = parseInt(value);
                break;
            case "potential":
                value = parseInt(value) || 0;
                break;
        }

        //console.log(index, name, value);

        setUser(prev=>({
            ...prev,
            enigmaBeast:prev.enigmaBeast.map((beast,pos)=>{
                if(pos === index) {
                    if(name === "grade") {
                        return {
                            ...beast,
                            potential:adjustPotential(value, beast.potential),
                            grade:value
                        }
                    }
                    else {
                        return {
                            ...beast,
                            [name]:value
                        }
                    }
                }
                return beast;
            })
        }));
    }, []);

    const addBeast = useCallback(()=>{
        setUser(prev=>({
            ...prev,
            enigmaBeast:[...prev.enigmaBeast, {...dummyBeast}],
        }));
    }, []);
    const removeBeast = useCallback(index=>{
        setUser(prev=>({
            ...prev,
            enigmaBeast:prev.enigmaBeast.filter((b,i)=> index !== i)
        }));
    }, []);

    return (<>
        <div className="row mt-4">
            <div className="col text-end">
                <button className="btn btn-success" onClick={addBeast}><FaPlus/><span className="ms-2">추가</span></button>
            </div>
        </div>

        {beasts.map((beast, index)=>(
            <div key={index} className="beast mt-4 p-4">
                <EnigmaBeastViewer index={index} beast={beast} onChange={onBeastChange}/>
                <button className="btn btn-danger mt-2" onClick={e=>removeBeast(index)}>
                    <FaMinus/>
                    <span className="mx-2">이 항목 삭제</span>
                </button>
            </div>
        ))}
        
        
        <div className="row mt-4">
            <div className="col text-end">
                <button className="btn btn-success" onClick={addBeast}><FaPlus/><span className="ms-2">추가</span></button>
            </div>
        </div>
    </>)
}