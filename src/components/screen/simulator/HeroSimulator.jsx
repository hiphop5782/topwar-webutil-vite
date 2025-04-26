// import HeroListJson from "@src/assets/json/hero.json";
// import TargetListJson from '@src/assets/json/target.json';
import HeroListJson from "@src/assets/json/hero-skill.json";

import "./HeroSimulator.css";
import { useCallback, useEffect, useMemo, useState } from "react";

function HeroSimulator() {
    const [heroList, setHeroList] = useState(HeroListJson);
    const [firstHero, setFirstHero] = useState(null);
    const [secondHero, setSecondHero] = useState(null);
    const [thirdHero, setThirdHero] = useState(null);
    const [firstHeroSkillLevel, setFirstHeroSkillLevel] = useState(0);
    const [secondHeroSkillLevel, setSecondHeroSkillLevel] = useState(0);
    const [thirdHeroSkillLevel, setThirdHeroSkillLevel] = useState(0);

    //영웅 선택
    const selectFirstHero = e=>{
        setFirstHero(e.target.value === "" ? null : JSON.parse(e.target.value));
    };
    const selectSecondHero = e=>{
        setSecondHero(e.target.value === "" ? null : JSON.parse(e.target.value));
    };
    const selectThirdHero = e=>{
        setThirdHero(e.target.value === "" ? null : JSON.parse(e.target.value));
    };

    const converter = {
        atk:"공격",
        vit:"생명",
        dmg:"데증",
        red:"데감",
        def:"방어"
    };

    const slotBackup = [
        {no:1, type:"army", values:{atk:0, vit:0, dmg:0, red:0, def:0}},
        {no:2, type:"army", values:{atk:0, vit:0, dmg:0, red:0, def:0}},
        {no:3, type:"army", values:{atk:0, vit:0, dmg:0, red:0, def:0}},
        {no:4, type:"army", values:{atk:0, vit:0, dmg:0, red:0, def:0}},
        {no:5, type:"army", values:{atk:0, vit:0, dmg:0, red:0, def:0}},
        {no:6, type:"army", values:{atk:0, vit:0, dmg:0, red:0, def:0}},
        {no:7, type:"army", values:{atk:0, vit:0, dmg:0, red:0, def:0}},
        {no:8, type:"army", values:{atk:0, vit:0, dmg:0, red:0, def:0}},
        {no:9, type:"army", values:{atk:0, vit:0, dmg:0, red:0, def:0}}
    ];
    const skillRate = [3, 6, 10, 15, 21, 27, 34];

    const [slotList, setSlotList] = useState([...slotBackup]);
    const [targetSlotList, setTargetSlotList] = useState([...slotBackup]);

    //효과 계산
    useEffect(()=>{
        clearSlot();
        if(firstHero === null && secondHero === null && thirdHero === null) {
            return;
        }
        calculateAttack();
        calculateHp();
        calculateDmgIncrease();
        calculateDmgDecrease();
        //calculateSkill()
    }, [firstHero, secondHero, thirdHero]);

    //각종 계산
    const clearSlot = ()=>{
        setSlotList(prev=>[...slotBackup]);
    };
    const calculateAttack = ()=>{
        setSlotList(prev=>prev.map((slot, index)=>{
            const atk = calculateHeroAtk(index, [firstHero, secondHero, thirdHero]);
            return {
                ...slot, 
                values:{
                    ...slot.values, 
                    atk:atk
                }
            };
        }));
    };
    const calculateHp = ()=>{
        setSlotList(prev=>prev.map((slot, index)=>{
            const vit = calculateHeroVit(index, [firstHero, secondHero, thirdHero]);
            return {
                ...slot, 
                values:{
                    ...slot.values, 
                    vit:vit
                }
            };
        }));
    };
    const calculateDmgIncrease = ()=>{};
    const calculateDmgDecrease = ()=>{};

    const calculateHeroAtk = (index, heros)=>{
        let atk = 0;
        for(let i=0; i < heros.length; i++) {
            const hero = heros[i];
            if(hero === null) continue;
            
            //전체 공격력
            atk += hero.atk.all || 0;
            atk += hero.atk.allSlot ? hero.atk.allSlot[index] : 0;

            //군종별 공격력
        };
        return atk;
    };
    const calculateHeroVit = (index, heros)=>{
        let vit = 0;
        for(let i=0; i < heros.length; i++) {
            const hero = heros[i];
            if(hero === null) continue;
            
            //전체 생명력
            vit += hero.vit.all || 0;
            vit += hero.vit.allSlot ? hero.vit.allSlot[index] : 0;

            //군종별 생명력
        };
        return vit;
    };
    
    //이펙트 초기화
    const clearEffect = useCallback(()=>{}, []);

    const [allSlotType, setAllSlotType] = useState("army");
    useEffect(()=>{
        setSlotList(prev=>prev.map(slot=>({
            ...slot, type:allSlotType
        })))
    }, [allSlotType]);

    const changeSlotType = (index, slotType)=>{
        setSlotList(prev=>prev.map((slot, i)=>{
            if(index === i) {
                return {
                    ...slot,
                    type: slotType
                };
            }
            return {...slot};
        }));
    };

    return (
        <>
            <div className="row">
                <div className="col-12">
                    <h1>영웅 시뮬레이터</h1>
                    <p>영웅 정보를 슬롯별로 확인</p>
                </div>
            </div>

            <hr />

            <div className="row mt-2 text-left">
                <div className="col-6">
                    <h2>플레이어 정보</h2>
                    <div className="row mt-2">
                        <div className="col-4 pe-1">
                            <select className="form-select" onChange={selectFirstHero}>
                                <option value="">선택하세요</option>
                                {heroList.map((hero, index) => (
                                    <option key={index} value={JSON.stringify(hero)}>{hero.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-8 ps-1 text-start">
                            <div className="btn-group">
                                {skillRate.map((r,n)=>(
                                    <label key={n} className={`btn ${firstHeroSkillLevel === n ?  'btn-secondary' : 'btn-outline-secondary'}`} onClick={e=>setFirstHeroSkillLevel(n)}>{n+1}</label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="row mt-2">
                        <div className="col-4 pe-1">
                            <select className="form-select" onChange={selectSecondHero}>
                                <option value="">선택하세요</option>
                                {heroList.map((hero, index) => (
                                    <option key={index} value={JSON.stringify(hero)}>{hero.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-8 ps-1 text-start">
                            <div className="btn-group">
                                {skillRate.map((r,n)=>(
                                    <label key={n} className={`btn ${secondHeroSkillLevel === n ?  'btn-secondary' : 'btn-outline-secondary'}`} onClick={e=>setSecondHeroSkillLevel(n)}>{n+1}</label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="row mt-2">
                        <div className="col-4 pe-1">
                            <select className="form-select" onChange={selectThirdHero}>
                                <option value="">선택하세요</option>
                                {heroList.map((hero, index) => (
                                    <option key={index} value={JSON.stringify(hero)}>{hero.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-8 ps-1 text-start">
                            <div className="btn-group">
                                {skillRate.map((r,n)=>(
                                    <label key={n} className={`btn ${thirdHeroSkillLevel === n ?  'btn-secondary' : 'btn-outline-secondary'}`} onClick={e=>setThirdHeroSkillLevel(n)}>{n+1}</label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-6">
                    <h2>
                        슬롯 상태
                        <div className="btn-group ms-4">
                            <label className={`btn ${allSlotType === 'army' ?  'btn-success' : 'btn-outline-success'}`}>
                                <input type="radio" className="btn-check" name="slotType" value="army" onChange={e=>setAllSlotType(e.target.value)} checked={allSlotType === 'army'}/>
                                <span>육군</span>
                            </label>
                            <label className={`btn ${allSlotType === 'navy' ?  'btn-info' : 'btn-outline-info'}`}>
                                <input type="radio" className="btn-check" name="slotType" value="navy" onChange={e=>setAllSlotType(e.target.value)} checked={allSlotType === 'navy'}/>
                                <span>해군</span>
                            </label>
                            <label className={`btn ${allSlotType === 'airforce' ?  'btn-danger' : 'btn-outline-danger'}`}>
                                <input type="radio" className="btn-check" name="slotType" value="airforce" onChange={e=>setAllSlotType(e.target.value)} checked={allSlotType === 'airforce'}/>
                                <span>공군</span>
                            </label>
                        </div>
                    </h2>
                    <div className="slot-list-wrapper">
                        {slotList.map((slot, index)=>(
                        <div className="slot-wrapper" key={slot.no}>
                            <div className="row mt-2">
                                <div className="col">
                                    <div className="btn-group">
                                        <label className={`btn ${slot.type === 'army' ?  'btn-success' : 'btn-outline-success'}`} onClick={e=>changeSlotType(index, 'army')}>육</label>
                                        <label className={`btn ${slot.type === 'navy' ?  'btn-info' : 'btn-outline-info'}`} onClick={e=>changeSlotType(index, 'navy')}>해</label>
                                        <label className={`btn ${slot.type === 'airforce' ?  'btn-danger' : 'btn-outline-danger'}`} onClick={e=>changeSlotType(index, 'airforce')}>공</label>
                                    </div>
                                </div>
                            </div>
                            <div className="slot-status">
                                {Object.keys(slot.values).map((key)=>(
                                    <div key={key} className="d-flex">
                                        <div className="col-6">{converter[key]}</div>
                                        <div className="col-6">{slot.values[key].toFixed(1)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
            </div>

        </>
    );
}

export default HeroSimulator;