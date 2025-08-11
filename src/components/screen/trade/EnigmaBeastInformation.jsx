import { useCallback, useState } from "react";
import { FaPlus } from "react-icons/fa";

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

function EnigmaBeastViewer({index, beast, onChange}) {

    return (
        <div className="row mt-4">
            <div className="col">
                <div className="row">
                    <div className="col-sm-4 col-form-label">종류</div>
                    <div className="col-sm-8">
                        <select className="form-select" value={beast.type} name="type" onChange={e=>onChange(index, e)}>
                            {beastList.map(beast=>(
                            <option key={beast}>{beast}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-4 col-form-label">등급</div>
                    <div className="col-sm-8">
                        <select className="form-select" value={beast.grade} name="grade" onChange={e=>onChange(index, e)}>
                            {gradeList.map(grade=>(
                            <option key={grade}>{grade}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-4 col-form-label">성급</div>
                    <div className="col-sm-8">
                        <select className="form-select" value={beast.level} name="level" onChange={e=>onChange(index, e)}>
                            {Array.from({length:5}, (_,i)=>5-i).map(n=>(
                            <option key={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-4 col-form-label">잠재력</div>
                    <div className="col-sm-8">
                        <input className="form-control" type="number" inputMode="numeric" placeholder="16000"
                            min={0} max={16000} name="potential" value={beast.potential} onChange={e=>onChange(index, e)}/>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-4 col-form-label">메인옵션</div>
                    <div className="col-sm-8">
                        <select className="form-select" value={beast.main} onChange={e=>onChange(index, e)}>
                            {beastMainOptions[beast.type].map((opt, i)=>(
                            <option key={i}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-4 col-form-label">서브옵션 1</div>
                    <div className="col-sm-8">
                        <select className="form-select">
                            <option>전체 데미지 증가</option>
                            <option>전체 데미지 감면</option>
                            <option>육군 데미지 증가</option>
                            <option>육군 데미지 감면</option>
                            <option>해군 데미지 증가</option>
                            <option>해군 데미지 감면</option>
                            <option>공군 데미지 증가</option>
                            <option>공군 데미지 감면</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function EnigmaBeastInformation({json, onChange}) {
    const [beasts, setBeasts] = useState(json.enigmaBeast || [
        {
            type:"사슴",
            grade:"에픽",
            level:5,
            potential:16000,
            main:"출정 최대치",
            sub1:"전체 데미지 증가",
            sub2:"전체 데미지 감면",
            sub3:"전체 공격력 증가"
        }
    ]);
    
    const onBeastChange = useCallback((index, e)=>{
        const name = e.target.name;
        let value = e.target.value;
        switch(name) {
            case "level":
                value = parseInt(value);
                break;
            case "potential":
                value = parseInt(value);
                value = Math.max(0, value);
                value = Math.min(16000, value);
        }
        setBeasts(prev=>prev.map((beast, pos)=>{
            if(pos === index) {
                return {
                    ...beast,
                    [name] : value
                }
            }
            return beast;
        }));
    }, []);

    return (<>
        <div className="row mt-4">
            <div className="col text-end">
                <button className="btn btn-success"><FaPlus/><span className="ms-2">추가</span></button>
            </div>
        </div>

        {beasts.map((beast, index)=>(
            <EnigmaBeastViewer key={index} index={index} beast={beast} onChange={onBeastChange}/>
        ))}
        
        
        <div className="row mt-4">
            <div className="col text-end">
                <button className="btn btn-success"><FaPlus/><span className="ms-2">추가</span></button>
            </div>
        </div>
    </>)
}