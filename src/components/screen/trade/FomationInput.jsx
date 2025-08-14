import { useCallback, useState } from "react";
import { useRecoilState } from "recoil";
import { userState } from "./recoil/AccountCreateState";
import NumberGroup from "../../template/NumberGroup";

const slotNumbers = {0:1, 1:2, 2:3, 3:5, 4:8};

function FormationViewport({title, name, data, onTierChange, onLevelChange, onSlotChange}) {
    return (
        <div className="row mt-4">
            <div className="col-sm-3 col-form-label">{title}</div>
            <div className="col-sm-9">
                <div className="row">
                    <div className="col-4 col-form-label text-center">티어</div>
                    <div className="col-8">
                        <select className="form-select" value={data.tier} name={name} onChange={onTierChange}>
                            {Array.from({length:10}, (_, i)=>10-i).map(n=>(
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-4 col-form-label text-center">레벨</div>
                    <div className="col-8">
                        <select className="form-select" value={data.level} name={name} onChange={onLevelChange}>
                            {Array.from({length:50}, (_, i)=>50-i).map(n=>(
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {data.slot.map((s,i)=>(
                <div className="row" key={i}>
                    <div className="col-2 col-form-label text-center">{i === 0 && "슬롯"}</div>
                    <div className="col-2 col-form-label text-center">{slotNumbers[i]}번</div>
                    <div className="col-8 d-flex">
                        {/* 
                        <select className="form-select" value={s} name={name} onChange={e=>onSlotChange(i, e)}>
                            {Array.from({length:5}, (_, i)=>5-i).map(n=>(
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                        */}
                        <NumberGroup name={name} min={1} max={5} value={s} onChange={e=>onSlotChange(i, e)}/>
                    </div>
                </div>
                ))}
            </div>
        </div>
    )
}

export default function FormationInput() {
    const [user, setUser] = useRecoilState(userState);
    
    const changeTier = useCallback(e=>{
        const type = e.target.name;
        const tier = parseInt(e.target.value);
        setUser(prev=>({
            ...prev,
            formation: {
                ...prev.formation,
                [type]:{
                    ...prev.formation[type],
                    tier:tier
                }
            }
        }));
    }, []);

    const changeSlot = useCallback((i,e)=>{
        const type = e.target.name;
        const slotLevel = parseInt(e.target.value);
        setUser(prev=>({
            ...prev,
            formation: {
                ...prev.formation,
                [type]:{
                    ...prev.formation[type],
                    slot:prev.formation[type].slot.map((cur, pos)=>i===pos ? parseInt(slotLevel) : cur)
                }
            }
        }));
    }, []);

    const changeLevel = useCallback(e=>{
        const type = e.target.name;
        const level = parseInt(e.target.value);
        setUser(prev=>({
            ...prev,
            formation: {
                ...prev.formation,
                [type]:{
                    ...prev.formation[type],
                    level:level
                }
            }
        }));
    }, []);

    return (<>
        <FormationViewport title="샤크 군진" data={user.formation.shark} 
            onTierChange={changeTier} name="shark" onLevelChange={changeLevel} onSlotChange={changeSlot}/>
        <FormationViewport title="스콜피온 군진" data={user.formation.scorpion} 
            onTierChange={changeTier} name="scorpion" onLevelChange={changeLevel} onSlotChange={changeSlot}/>
        <FormationViewport title="이글 군진" data={user.formation.eagle} 
            onTierChange={changeTier} name="eagle" onLevelChange={changeLevel} onSlotChange={changeSlot}/>
    </>);
}