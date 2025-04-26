import { useCallback, useEffect, useState } from "react";

function SkillCalculator() {
    const [skillPrice, setSkillPrice] = useState(25);
    const [dstSkillLevel, setDstSkillLevel] = useState(7);
    const [hasSkill, setHasSkill] = useState(false);
    const [hasSkillCount, setHasSkillCount] = useState([]);
    const [hasShard, setHasShard] = useState(false);
    const [hasShardCount, setHasShardCount] = useState(0);

    const changeHasSkillCount = useCallback((index, count)=>{
        const copy = [...hasSkillCount];
        copy[index] = count;
        setHasSkillCount(copy);
    }, [hasSkillCount]);

    const requiredShardCount = useCallback(()=>{
        return Math.pow(3, dstSkillLevel-1) * skillPrice;
    }, [dstSkillLevel]);

    const calculateShardCount = useCallback(()=>{
        const copy = [...hasSkillCount];
        
        return copy.map((c, i)=>c * parseInt(Math.pow(3, i))).reduce((p, n)=> p + n, 0) * skillPrice + hasShardCount;
    }, [hasSkillCount, hasShardCount]);

    const numberWithCommas = useCallback((x)=>{
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }, []);

    useEffect(()=>{
        setHasSkillCount(Array(dstSkillLevel-1).fill(0));
    }, [hasSkill, dstSkillLevel]);

    return (
        <>
            <div className="row">
                <div className="col">
                    <h1>전속 스킬 계산기</h1>
                    <hr/>
                    <p>전속 스킬 구매 시 필요한 수량을 확인하세요!</p>
                </div>
            </div>
            
            <div className="row mt-4">
                <div className="col-12">
                    <h2>1. 원하시는 스킬의 개당 판매 가격은?</h2>
                </div>
                <div className="col-12 text-end">
                    <select className="form-select" onChange={e=>setSkillPrice(parseInt(e.target.value))} defaultValue={skillPrice}>
                        <option value="15">15개 - 다이애나/크루조 등</option>
                        <option value="20">20개 - 츠루/베셀 등</option>
                        <option value="23">23개 - 바이올렛</option>
                        <option value="25">25개 - 대부분의 전투영웅</option>
                        <option value="30">30개 - 빌리어스/사일런스/아말리아</option>
                    </select>
                </div>
            </div>

            <div className="row mt-4">
                <div className="col-12">
                    <h2>2. 원하시는 전속 스킬 레벨은?</h2>
                </div>
                <div className="col-12 text-end">
                    <select className="form-select" onChange={e=>setDstSkillLevel(parseInt(e.target.value))} defaultValue={7}>
                        {[1,2,3,4,5,6,7,8,9].map(n=><option key={n}>{n}</option>)}
                    </select>
                    <h3 className="mt-2">
                        (조각 {numberWithCommas(requiredShardCount())}개) 
                    </h3>
                </div>
            </div>

            <div className="row mt-5">
                <div className="col-12">
                    <h2>3. 현재 보유중인 전속 조각이 있습니까?</h2>
                </div>
                <div className="col-12 text-end">
                    <input type="checkbox" checked={hasShard} onChange={e=>setHasShard(e.target.checked)}></input>
                    &nbsp;
                    예
                </div>
                
                {hasShard ? (
                    <div className="col-12 text-end mt-2">
                        <div>
                            보유한 전속 조각 개수 &nbsp;
                            <input type="number" defaultValue={hasShardCount || 0} 
                                className="text-end" onChange={e=>setHasShardCount(parseInt(e.target.value))} min="0"></input>
                        </div>
                    </div>
                ) : false}
                
            </div>

            <div className="row mt-5">
                <div className="col-12">
                    <h2>4. 현재 보유중인 스킬이 있습니까?</h2>
                </div>
                <div className="col-12 text-end">
                    <input type="checkbox" checked={hasSkill} onChange={e=>setHasSkill(e.target.checked)}></input>
                    &nbsp;
                    예
                </div>
                <div className="col-12 text-end mt-2">
                    {hasSkill ? (
                        <>
                            {hasSkillCount.map((c, i)=>(
                                <div key={i}>
                                    보유한 <span className="text-danger">{i+1}</span> 레벨 전속 스킬 개수 &nbsp;
                                    <input type="number" defaultValue={c} 
                                        className="text-end" onChange={e=>changeHasSkillCount(i, e.target.value)}></input>
                                </div>
                            ))}
                            <h4 className="mt-2">
                                (조각 {numberWithCommas(calculateShardCount())}개)
                            </h4>
                        </>
                    ) : false}
                </div>
            </div>

            <hr className="mt-4"></hr>
            <div className="row">
                <div className="col text-end">
                    {
                        (requiredShardCount() > calculateShardCount()) ? 
                        (
                            <>
                                <h3 className="text-danger">전속 조각 총 {numberWithCommas((requiredShardCount() - calculateShardCount()))}개 필요</h3>
                            </>
                        ) : (
                            <>
                                <h3>구매 가능합니다</h3>
                                <h3 className="text-success">전속 조각 {numberWithCommas((calculateShardCount() - requiredShardCount()))}개 남음</h3>
                            </>
                        )
                    }
                    
                </div>
            </div>
        </>
    );
}

export default SkillCalculator;