import JobDataJson from "@src/assets/json/job.json";
import "./JobInformation.css"
import { useCallback, useEffect, useState } from "react";

function JobInformation() {
    const [job, setJob] = useState("CL");
    const [jobData, setJobData] = useState(JobDataJson);
    const [display, setDisplay] = useState([]);
    const numberFormat = useCallback(n=>{
        return Intl.NumberFormat('en-US', {
            notation: "compact",
            maximumFractionDigits: 3
        }).format(n);
    }, []);

    const clearSelectedItem = ()=>{
        //console.log(window);
        setDisplay([]);
        setJobData(JobDataJson);
    };

    useEffect(clearSelectedItem, [job]);

    //항목 체크 이벤트
    const checkItem = (r, c) => {
        /* 디자인 이슈로 하나만 표시하기 위해 코드 추가 */
        setDisplay(prev=>[{...c, row:r.row}]);
        setJobData(prev=>prev.map(rowItem=>{
            if(rowItem.row === r.row) {
                return {
                    ...rowItem, 
                    items:rowItem.items.map(colItem=>{
                        if(colItem.col === c.col) {
                            return {...colItem, choice:true};
                        }
                        return {...colItem, choice:false};
                    })
                };
            }
            else {
                return {
                    ...rowItem, 
                    items:rowItem.items.map(colItem=>{
                        return {...colItem, choice:false};
                    })
                };
            }
        }));
        /* 디자인 이슈로 하나만 표시하기 위해 코드 추가 */

        // setDisplay(prev=> c.choice ? 
        //     prev.filter(p=>p.col !== c.col) : prev.concat({...c, row:r.row})
        // );
        // setJobData(prev=>prev.map(rowItem=>{
        //     if(rowItem.row === r.row) {
        //         return {
        //             ...rowItem, 
        //             items:rowItem.items.map(colItem=>{
        //                 if(colItem.col === c.col) {
        //                     return {...colItem, choice:!c.choice};
        //                 }
        //                 return colItem;
        //             })
        //         };
        //     }
        //     return rowItem;
        // }));
    };

    //시간 더하기
    const plusTime = (a, b)=>{
        const arr = a.match(/\d+/g);
        const brr = b.match(/\d+/g);
        const crr = arr.map((a,i)=>parseInt(a)+parseInt(brr[i]));
        const size = [0, 24, 60, 60];
        for(let i=crr.length-1; i > 0; i--) {
            const div = parseInt(crr[i] / size[i]);
            const mod = parseInt(crr[i] % size[i]);
            crr[i] = mod;
            crr[i-1] += div;
        }
        return `${crr[0]}일 ${crr[1]}시간 ${crr[2]}분 ${crr[3]}초`;
    };

    //업그레이드 체크 이벤트
    const checkUpgrades = (dis, upgrade, checked)=>{
        setDisplay(prev=>prev.map(p=>{
            if(p.row === dis.row && p.col === dis.col) {
                return {
                    ...p, 
                    upgrades:p.upgrades.map(u=>{
                        if(u.level == upgrade.level) {
                            return {
                                ...u, 
                                choice:checked,
                            };
                        }
                        return {...u};
                    })
                };
            }
            return p;
        }));
        
        setDisplay(prev=>prev.map(p=>{
            if(p.row === dis.row && p.col === dis.col) {
                return {
                    ...p, 
                    allCheck:p.upgrades.reduce((sum,n) => {
                        return sum && (n.level ===upgrade.level ? checked : n.choice);
                    }, true),
                    subtotal:p.upgrades.reduce((sum, cur)=>{
                        if(cur.choice) {
                            return {
                                oil:sum.oil + cur.oil,
                                food:sum.food + cur.food,
                                item:sum.item + cur.item,
                                core:sum.core + (cur.core || 0),
                                time:plusTime(sum.time, cur.time)
                            };
                        }
                        return {...sum};
                    }, {
                        oil:0, food:0, item:0, core:0, time:"0일 0시간 0분 0초"
                    })
                };
            }
            return p;
        }));
    };

    //전체선택
    const allCheck = (d, checked)=>{
        setDisplay(prev=>prev.map(display=>{
            if(display.row === d.row && display.col === d.col) {
                return {
                    ...display, 
                    allCheck: checked,
                    upgrades:display.upgrades.map(u=>{
                        return {...u, choice:checked};
                    })
                };
            }
            return display;
        }));
        setDisplay(prev=>prev.map(p=>{
            if(p.row === d.row && p.col === d.col) {
                return {
                    ...p, 
                    subtotal:p.upgrades.reduce((sum, cur)=>{
                        if(cur.choice) {
                            return {
                                oil:sum.oil + cur.oil,
                                food:sum.food + cur.food,
                                item:sum.item + cur.item,
                                core:sum.core + (cur.core || 0),
                                time:plusTime(sum.time, cur.time)
                            };
                        }
                        return {...sum};
                    }, {
                        oil:0, food:0, item:0, core:0, time:"0일 0시간 0분 0초"
                    })
                };
            }
            return p;
        }));
    };

    const numberWithCommas = useCallback((x)=>{
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }, []);

    return (
        <>
            <div className="row">
                <div className="col-12">
                    <h1>전문 직업 강화</h1>
                </div>
            </div>
            <hr />
            <div className="row mt-4">
                <div className="col-12">
                직업을 선택하세요
                </div>
                <div className="col-12 mt-2">
                    <div className="form-check">
                        <input className="form-check-input" type="radio" name="job" id="radio1" value="CL" defaultChecked onChange={e=>setJob(e.target.value)}/>
                        <label className="form-check-label" htmlFor="radio1">
                            전투 정예 <span className="text-muted">(Combat Elite)</span>
                        </label>
                    </div>
                    <div className="form-check">
                        <input className="form-check-input" type="radio" name="job" id="radio2" value="MM" onChange={e=>setJob(e.target.value)}/>
                        <label className="form-check-label" htmlFor="radio2">
                            기계 전문가 <span className="text-muted">(Mechanic Master)</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="row mt-4">
                
                {/* 스킬트리 */}
                <div className="col-sm-4 skill-tree">
                    <div className="row">
                        {jobData.map(r=>(
                            <div className="col-12" key={r.row}>
                                <div className="row-inner">
                                    <span className="title">{r.row} 행</span>
                                    {r.items.map(c=>(
                                        <div key={c.col} className="col-4">
                                            <label className={`col-inner ${c.choice ? 'active' : false}`} onClick={e=>checkItem(r, c)}>
                                                {/* <span className="title">{c.col} 열</span> */}
                                                <div className="content">
                                                    <img src={`${import.meta.env.VITE_PUBLIC_URL}/images/job/${job}-${r.row}-${c.col}.png`}/>
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 스킬상세 */}
                {display.length > 0 ? 
                <div className={`col-sm-8 skill-detail ${display.length > 0 ? 'active' : ''}`} onClick={clearSelectedItem}>
                    <span className="advice"></span>
                    {display.length > 0 ? 
                        display.map((d, i)=>
                        <div className="box p-3 mb-2" key={i} onClick={e=>e.stopPropagation()}>
                            
                            <h3>
                                <img src={`${import.meta.env.VITE_PUBLIC_URL}/images/job/${job}-${d.row}-${d.col}.png`} width={50} height={50}/>
                                &nbsp;&nbsp;
                                {d.name[job]}
                            </h3>
                            
                            <p className="ps-5"><span className="text-muted ms-4">{d.explain[job]}</span></p>

                            <table className="table table-striped">
                                <thead className="text-end">
                                    <tr>
                                        <th className="text-center pc-only"><input type="checkbox" checked={d.allCheck} onChange={e=>allCheck(d, e.target.checked)}/></th>
                                        <th className="text-center">레벨</th>
                                        <th>석유</th>
                                        <th>식량</th>
                                        <th>직상</th>
                                        {d.upgrades[0]["core"] !== undefined ? 
                                        <th>코어</th>
                                        : false}
                                        <th className="pc-only">시간</th>
                                    </tr>
                                </thead>
                                <tbody className="text-end">
                                    {d.upgrades.map((item, index)=>(
                                        <tr key={index}  onClick={e=>checkUpgrades(d, item, !item.choice)} className={`${item.choice ? 'table-dark text-light' : ''}`}>
                                            <td className="text-center pc-only">
                                                <input type="checkbox" checked={item.choice} onChange={e=>checkUpgrades(d, item, e.target.checked)}/>
                                            </td>
                                            <td className="text-center">{item.level}</td>
                                            <td>{numberFormat(item.oil)}</td>
                                            <td>{numberFormat(item.food)}</td>
                                            <td>{numberWithCommas(item.item)}</td>
                                            {item["core"] !== undefined ? 
                                            <td>{numberWithCommas(item.core)}</td>
                                            : false}
                                            <td className="pc-only">{item.time}</td>
                                        </tr>
                                    ))}
                                    {!d.subtotal === false && d.subtotal.oil > 0? 
                                        <tr>
                                            <td className="pc-only"></td>
                                            <td className="text-center">합계</td>
                                            <td>{numberFormat(d.subtotal.oil)}</td>
                                            <td>{numberFormat(d.subtotal.food)}</td>
                                            <td>{numberWithCommas(d.subtotal.item)}</td>
                                            {d.subtotal["core"] !== undefined && d.subtotal.core > 0 ? 
                                            <td>{numberWithCommas(d.subtotal.core)}</td>
                                            : false}
                                            <td className="pc-only">{d.subtotal.time}</td>
                                        </tr>
                                    : false}
                                </tbody>
                            </table>
                        </div> )
                    : false}
                </div>
                : false}
            </div>
        </>

    );
}

export default JobInformation;