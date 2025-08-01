import baseTypeJson from "@src/assets/json/base-type.json";
import baseListJson from "@src/assets/json/base.json";
import "./BaseInformation.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

function BaseInformation() {
    const [baseTypes, setBaseTypes] = useState(baseTypeJson);
    const [baseList, setBaseList] = useState([...baseListJson].reverse());
    const [selectedTypes, setSelectedTypes] = useState([]);
    //파라미터 처리
    const [params, setParams] = useSearchParams();
    useEffect(()=>{
        if (selectedTypes.length === 0) {
            setParams({});
        }
        else {
            setParams({ type: selectedTypes.join(",") });
        }
    }, [selectedTypes]);
    useEffect(() => {
        if (params.size > 0 && selectedTypes.length === 0) {
            const value = String(params.get("type"));
            const decoded = decodeURIComponent(value);
            const typeList = decoded.split(",");
            //baseType 체크(active) 처리
            setBaseTypes(prev=>prev.map(type=>{
                if(typeList.includes(type.value)) {
                    return {...type, active:true};
                }
                return type;
            }));
            //파라미터대로 검색되도록 처리
            typeList.forEach(type=>{
                if(baseTypes.some(t=>t.value === type)) {
                    setSelectedTypes(prev=>[...prev, type]);
                }
            });
        }
    }, []);
    
    const clickBadge = useCallback((index, active) => {
        const copy = [...baseTypes];
        copy[index].active = !active;
        setBaseTypes([...copy]);
        setSelectedTypes(baseTypes.filter(bt=>bt.active).map(bt=>bt.value));
    }, []);

    const getBadgeStyle = useCallback((baseTypes) => {
        if (baseTypes.active) {
            return `badge border border-${baseTypes.color} bg-${baseTypes.color} me-1`;
        }
        else {
            return `badge border border-${baseTypes.color} text-${baseTypes.color} me-1`
        }
    }, []);

    const filterList = useMemo(()=>{
        if(selectedTypes.length === 0) {
            return [...baseList];
        }

        return baseList.filter(base=>{
            //버프 기지 검색
            if(selectedTypes.includes("스킬")) {
                if(typeof base["skill"] === "string") {
                    return true;
                }
            }

            //사용 옵션 검색
            if(base.options1 && base.options1.length > 0) {
                const mapArray = base.options1.map(opt=>opt.name);
                const result = selectedTypes.some(st=>{
                    return mapArray.some(m=>m.indexOf(st) >= 0);
                });
                if(result) return true;
            }

            //보유 옵션 검색
            if(base.options2 && base.options2.length > 0) {
                const mapArray = base.options2.map(opt=>opt.name);
                const result = selectedTypes.some(st=>{
                    return mapArray.some(m=>m.indexOf(st) >= 0);
                });
                if(result) return true;
            }

            return false;
        });
    }, [selectedTypes, baseList]);

    return (
        <>
            <div className="row">
                <div className="col">
                    <h1>기지 정보</h1>
                </div>
            </div>
            
            <hr></hr>

            <div className="row">
                <div className="col">
                    {
                        baseTypes.map((t, i) => (
                            <span className={getBadgeStyle(t)} key={t.no}
                                onClick={e => clickBadge(i, t.active)}>{t.value}</span>
                        ))
                    }
                </div>
            </div>
            <hr />
            <div className="row mb-4">
                <div className="col">
                    총 <span className="text-info">{filterList.length}</span>개의 기지가 {selectedTypes.length > 0 ? '검색되었습니다':'등록되어 있습니다'}
                </div>
            </div>
            <div className="row">
                {filterList.map(b => (
                    <div key={b.no} style={{width:250}}>
                        <div className="card mb-3">
                            <h5 className="card-header text-truncate">
                                {b.name}
                                {/* soldout : true일 경우 구매 불가 메세지 추가 */}
                                {b?.soldout === true && (<>
                                    <span className="text-danger fw-bold ms-2">(구매 불가)</span>
                                </>)}
                            </h5>
                            <img src={`${import.meta.env.VITE_PUBLIC_URL}/images/base/${b.no}.png`} height={200}/>
                            <div className="card-body">
                                <div className="card-text">
                                    <span className="badge bg-secondary">사용 시 효과</span>
                                    {b.options1.map((opt, idx)=>(
                                        <div key={idx}>
                                        {selectedTypes.length > 0 ? (<>
                                            {selectedTypes.some(st=>opt.name.indexOf(st) >= 0) ? (
                                            <div><small className="highlight">{opt.name}&nbsp;<span className="text-danger"><b>{opt.value}</b></span></small></div>    
                                            ) : (
                                            <div><small>{opt.name}&nbsp;<span className="text-danger"><b>{opt.value}</b></span></small></div>
                                            )}
                                        </>) : (
                                        <div><small>{opt.name}</small> <small className="text-danger"><b>{opt.value}</b></small></div>
                                        )}
                                        </div>
                                    ))}
                                    
                                    <hr/>
                                    <span className="badge bg-secondary">보유 시 효과</span>
                                    {b.options2.map((opt,idx)=>(
                                    <div key={idx}>
                                        {selectedTypes.length > 0 ? (<>
                                            {selectedTypes.some(st=>opt.name.indexOf(st) >= 0) ? (
                                            <div><small className="highlight">{opt.name}&nbsp;<span className="text-danger"><b>{opt.value}</b></span></small></div> 
                                            ) : (
                                            <div><small>{opt.name}&nbsp;<span className="text-danger"><b>{opt.value}</b></span></small></div>
                                            )}
                                        </>) : (
                                        <div><small>{opt.name}&nbsp;<span className="text-danger"><b>{opt.value}</b></span></small></div>
                                        )}
                                    </div>
                                    ))}

                                    {/* 스킬 보유 시 */}
                                    {b["skill"] !== undefined && (<>
                                    
                                    <hr/>
                                    <span className="badge bg-info">기지 스킬</span>
                                    <div className="mt-2">{b.skill}</div>

                                    </>)}

                                    {/* 메모 보유 시 */}
                                    {b["memo"] !== undefined && (<>
                                    
                                    <hr/>
                                    <div className="mt-2 fw-bold text-danger">{b.memo}</div>

                                    </>)}

                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

export default BaseInformation;