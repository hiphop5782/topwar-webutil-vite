import { useCallback, useState } from "react";

const slotNumbers = {0:1, 1:2, 2:3, 3:5, 4:8};

function FormationViewport({title, data, onTierChange, onLevelChange, onSlotChange}) {
    return (
        <div className="row mt-4">
            <div className="col-sm-3 col-form-label">{title}</div>
            <div className="col-sm-9">
                <div className="row">
                    <div className="col-4 col-form-label text-center">티어</div>
                    <div className="col-8">
                        <select className="form-select" value={data.tier} onChange={onTierChange}>
                            {Array.from({length:10}, (_, i)=>10-i).map(n=>(
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <div className="col-4 col-form-label text-center">레벨</div>
                    <div className="col-8">
                        <select className="form-select" value={data.level} onChange={onLevelChange}>
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
                    <div className="col-8">
                        <select className="form-select" value={s} onChange={e=>onSlotChange(i, e.target.value)}>
                            {Array.from({length:5}, (_, i)=>5-i).map(n=>(
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                ))}
            </div>
        </div>
    )
}

export default function FormationInput({json}) {
    const [shark, setShark] = useState(json?.formation?.shark || {
        tier:7,
        slot:[4,4,4,4,4],
        level:50,
    });
    const [scorpion, setScorpion] = useState(json?.formation?.scorpion || {
        tier:7,
        slot:[4,4,4,4,4],
        level:50,
    });
    const [eagle, setEagle] = useState(json?.formation?.eagle || {
        tier:7,
        slot:[4,4,4,4,4],
        level:50,
    });

    const changeSharkTier = useCallback(e=>{
        setShark(prev=>({...prev, tier:parseInt(e.target.value)}));
    }, []);
    const changeSharkLevel = useCallback(e=>{
        setShark(prev=>({...prev, level:parseInt(e.target.value)}));
    }, []);
    const changeSharkSlot = useCallback((slot, value)=>{
        setShark(prev=>({
            ...prev,
            slot:prev.slot.map((s,i)=> i===slot ? parseInt(value) : s)
        }));
    }, []);

    const changeScorpionTier = useCallback(e=>{
        setScorpion(prev=>({...prev, tier:parseInt(e.target.value)}));
    }, []);
    const changeScorpionLevel = useCallback(e=>{
        setScorpion(prev=>({...prev, level:parseInt(e.target.value)}));
    }, []);
    const changeScorpionSlot = useCallback((slot, value)=>{
        setScorpion(prev=>({
            ...prev,
            slot:prev.slot.map((s,i)=> i===slot ? parseInt(value) : s)
        }));
    }, []);

    const changeEagleTier = useCallback(e=>{
        setEagle(prev=>({...prev, tier:parseInt(e.target.value)}));
    }, []);
    const changeEagleLevel = useCallback(e=>{
        setEagle(prev=>({...prev, level:parseInt(e.target.value)}));
    }, []);
    const changeEagleSlot = useCallback((slot, value)=>{
        setEagle(prev=>({
            ...prev,
            slot:prev.slot.map((s,i)=> i===slot ? parseInt(value) : s)
        }));
    }, []);

    return (<>
        <FormationViewport title="샤크 군진" data={shark} 
            onTierChange={changeSharkTier} onLevelChange={changeSharkLevel} onSlotChange={changeSharkSlot}/>
        <FormationViewport title="스콜피온 군진" data={scorpion} 
            onTierChange={changeScorpionTier} onLevelChange={changeScorpionLevel} onSlotChange={changeScorpionSlot}/>
        <FormationViewport title="이글 군진" data={eagle} 
            onTierChange={changeEagleTier} onLevelChange={changeEagleLevel} onSlotChange={changeEagleSlot}/>
    </>);
}