import { useCallback, useEffect, useMemo, useState } from "react"
import { FaEraser, FaPlus, FaXmark } from "react-icons/fa6";
import useLocalStorage from "@src/hooks/useLocalStorage";
import BuildingList from "@src/assets/json/el/buildings.json";
import ColorList from "@src/assets/json/colors.json";

import "./ELScoreCalculator.css";

const initialObject = {
    no : 0 , name : "", currentScore : 0, scorePerMinute:0, scoreTotal : 0
};

const dateOptions = {
    year: 'numeric',
    month: '2-digit', // 월을 두 자리 숫자로 표시 (01, 02, ..., 12)
    day: '2-digit'    // 일을 두 자리 숫자로 표시 (01, 02, ..., 31)
};

export default function ELScoreCalculator() {
    const [no, setNo] = useState(1);
    const [selected, setSelected] = useState(null);
    const [servers, setServers] = useLocalStorage('servers', []);
    const [input, setInput] = useState("");
    const [buildings, setBuildings] = useLocalStorage('buildings', 
        BuildingList.map(building=>({...building, server : null}))
    );
    // const [buildings, setBuildings] = useState(()=>{
    //     return BuildingList.map(building=>({...building, server : null}));
    // });

    const getDayAfter = useCallback(diff=>{
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + diff);
        return nextWeek.toLocaleDateString("sv-SE", dateOptions);
    }, []);

    const [endDate, setEndDate] = useLocalStorage("endDate", getDayAfter(7));
    const [endTime, setEndTime] = useLocalStorage("endTime", "23:00");

    const addServer = useCallback(()=>{
        setServers(prev=>{
            const newNo = no;
            setNo(prev=>prev+1);
            return [
                ...prev, 
                { ...initialObject, no : newNo, name : input }
            ]
        });
        setInput("");
    }, [input]);
    const resetServers = useCallback(()=>{
        setServers([]);
    }, []);
    const removeServer = useCallback(target=>{
        const choice = window.confirm("대상을 삭제하시겠습니까?");
        if(choice === false) return;

        setServers(prev=>prev.filter(server=>server.no !== target.no));
    }, []);

    const changeCurrnetScore = useCallback((e, target)=>{
        const replacement = e.target.value.replace(/[^0-9]+/g, "");
        setServers(prev=>prev.map(server=>{
            if(server.no === target.no)
                return {...server , currentScore : replacement.length === 0 ? 0 : parseInt(replacement)}
            return server;
        }));
    }, []);

    const checkBuilding = useCallback((e, target)=>{
        if(selected === null) return;

        //기존 체크가 같은 서버일 경우만 해제, 나머진 변경
        setBuildings(prev=>prev.map(building=>{
            if(target.name === building.name) {//체크된 건물 발견 시
                const {server, ...buildingWithoutServer} = building;
                if(target.server === null) { //서버가 없으면 설정
                    //서버 정보 변경(점령 유적 추가 혹은 제거)
                    // setServers(before=>before.map(server=>{
                    //     return {...server, conquests : [...server.conquests , buildingWithoutServer] }
                    // }));
                    return {...building, server : selected};
                }
                const sameServer = target.server.no === selected.no;
                // setServers(before=>before.map(server=>{
                //     return {
                //         ...server, 
                //         conquests : sameServer ? 
                //                     server.conquests.filter(c=>c.name !== building.name) 
                //                         : [...server.conquests , buildingWithoutServer]
                //     }
                // }));
                return {...building, server : sameServer ? null : selected};
            }
            return building;
        }));
    }, [selected]);

    //종료까지 남은시간
    const [remainTimeValue, setRemainTimeValue] = useState("남은 시간 없음");
    useEffect(()=>{
        const handle = setInterval(()=>{
            const now = new Date();
            const deadline = new Date(`${endDate} ${endTime}:00`);

            const diff = deadline.getTime() - now.getTime();
            const remain = diff > 0 ? diff : 0;

            const second = Math.floor(remain / 1000 % 60);
            const minute = Math.floor(remain / 1000 / 60 % 60);
            const hour = Math.floor(remain / 1000 / 60 / 60 % 24);
            const day = Math.floor(remain / 1000 / 60 / 60 / 24);

            if(remain > 0) 
                setRemainTimeValue(`종료까지 ${day}일 ${hour}시간 ${minute}분 ${second}초 남음`);
            else
                setRemainTimeValue(`남은 시간 없음`);
        }, 1000);

        return ()=>{
            clearInterval(handle);
        };
    }, [endDate, endTime]);

    //최종 결과 계산
    const sortedServers = useMemo(()=>{
        //시간차 계산
        const now = new Date();
        const deadline = new Date(`${endDate} ${endTime}:00`);
        const seconds = Math.floor((deadline.getTime() - now.getTime()) / 1000);
        const minutes = Math.ceil(seconds / 60);

        //분당 점수 계산
        const conquestObject = {};
        buildings.forEach(building=>{
            if(building.server === null) return true;

            const origin = conquestObject[building.server.name] || 0;
            conquestObject[building.server.name] = origin + building.point;
        });

        const calculated = servers.map(server=>{
            const score = conquestObject[server.name] || 0;
            return {
                ...server,
                scorePerMinute : score,
                scoreTotal : server.currentScore + score * minutes
            };
        });

        return calculated.sort((a,b)=>b.scoreTotal - a.scoreTotal);
    }, [buildings]);

    //진행 단계
    const step = useMemo(()=>{
        if(endDate.length === 0 || endTime.length === 0) 
            return 1;

        const fillCount = servers.reduce((acc, c)=>c.name.length > 0 ? acc + 1 : acc, 0);
        if(fillCount < 1)
            return 2;

        return 9999;
    }, [servers, selected, endDate, endTime]);

    const getColor = useCallback((building)=>{
        if(building.server === null) 
            return "transparent";
        if(selected !== null && building.server.no !== selected.no)
            return "transparent";
        return ColorList[building.server.no % ColorList.length];
    }, [selected]);

    //render
    return (<>
        <div className="row">
            <div className="col">
                <h1>
                    EL 점수 계산기                    
                </h1>
            </div>
        </div>
        <hr/>

        <div className="row mt-5 pt-5">
            <h2>1. 종료 시간 설정</h2>
        </div>
        <div className="row">
            <label className="col-sm-3 col-form-label">일자</label>
            <div className="col-sm-9">
                <input type="date" className="form-control" value={endDate}
                    onChange={e=>setEndDate(e.target.value)}/>
            </div>
        </div>
        <div className="row">
            <label className="col-sm-3 col-form-label">시각</label>
            <div className="col-sm-9">
                <input type="time" className="form-control" value={endTime}
                    onChange={e=>setEndTime(e.target.value)}/>
            </div>
        </div>
        <div className="row">
            <label className="col-sm-3 col-form-label">남은시간</label>
            <div className="col-sm-9 text-danger d-flex align-items-center fs-4">
                {remainTimeValue}
            </div>
        </div>

        {step >= 2 && (<>
        <hr className="mt-5 pt-5"/>
        <div className="row">
            <h2>
                2. 서버 번호 설정
                <button className="btn btn-danger ms-4" onClick={resetServers}>
                    <FaEraser/>
                    <span className="ms-2">서버 초기화</span>
                </button>
            </h2>

            <div className="col-12 d-flex align-items-center">
                <input type="text" className="form-control w-auto flex-grow-1" 
                    placeholder="번호 입력 후 추가 버튼 클릭 혹은 엔터" 
                    value={input} onChange={e=>setInput(e.target.value)}
                    onKeyUp={e=>{
                        if(e.key === "Enter") addServer();
                    }}/>
                <button className="btn btn-success ms-2" onClick={addServer}>
                    <FaPlus/>
                    <span className="ms-2 d-none d-sm-inline-block">추가</span>
                </button>
            </div>

            <div className="col-12 d-flex flex-wrap mt-2">
                {servers.map((server, index)=>(
                <button type="button" className="btn btn-outline-primary d-inline-flex align-items-center me-2 mb-2"
                                onClick={e=>removeServer(server)} key={index}>
                    <span>{server.name}</span>
                    <FaXmark className="ms-2"/>
                </button>
                ))}
            </div>
            <div className="col-12 mt-2">
                총 {servers.length}개 등록중
            </div>
        </div>
        </>)}

        {step >= 3 && (<>
        <hr className="mt-5 pt-5"/>
        <div className="row">
            <h2>3. 현재 점수 입력</h2>
        </div>
        {servers.map((server, index)=>(
        <div className="row mt-2" key={index}>
            <label className="col-sm-3 col-form-label">{server.name}</label>
            <div className="col-sm-9">
                <input type="text" inputMode="numeric" className="form-control" 
                    value={server.currentScore}
                    onChange={e=>changeCurrnetScore(e, server)}/>
            </div>
        </div>
        ))}
        </>)}

        {step >= 4 && (<>
        <hr className="mt-5 pt-5"/>
        <div className="row my-4">
            <h2>4. 서버별 점령 지역 설정 ({selected === null ? "전체 지도" : `${selected.name} 서버 시점`})</h2>
            <div className="col-12 mb-2">
                <button className={`btn w-100 fw-bold ${selected === null ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={e=>setSelected(null)}>전체 서버 상황 보기</button>
            </div>

            {servers.map((server, index)=>(
            <div className="col-md-3 col-sm-4 col-6 mb-2" key={index}>
                <button className={`btn w-100 fw-bold ${selected?.no === server.no ? 'btn-colored' : 'btn-outline-colored'}`} 
                        style={{"--btn-color" : ColorList[server.no % ColorList.length]}}
                        onClick={e=>setSelected(server)}>{server.name}</button>
            </div>
            ))}
            <div className="col-12 mt-4">
                
                <div className="el-map">
                    <div className="el-lines">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* 1구역 */}
                            <line x1={0} y1={0} x2={16} y2={16.5} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={16} y1={16.5} x2={51} y2={16.5} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={51} y1={16.5} x2={51} y2={0} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 2구역 */}
                            <line x1={100} y1={0} x2={86} y2={16.5} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={86} y1={16.5} x2={51} y2={16.5} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* <line x1={51} y1={16.5} x2={51} y2={0} stroke="#0984e3" strokeWidth={0.2}/> */}
                            {/* 3구역 */}
                            <line x1={86} y1={16.5} x2={86} y2={50} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={86} y1={50} x2={100} y2={50} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 4구역 */}
                            <line x1={86} y1={50} x2={86} y2={85} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={86} y1={85} x2={100} y2={100} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 5구역 */}
                            <line x1={86} y1={85} x2={51} y2={85} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={51} y1={85} x2={51} y2={100} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 6구역 */}
                            <line x1={0} y1={100} x2={16} y2={85} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={16} y1={85} x2={51} y2={85} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 7구역 */}
                            <line x1={16} y1={85} x2={16} y2={50} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={0} y1={50} x2={16} y2={50} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 8구역 */}
                            <line x1={16} y1={16.5} x2={16} y2={50} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 9구역 */}
                            <line x1={16} y1={16.5} x2={26} y2={26} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={26} y1={26} x2={76.5} y2={26} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={76.5} y1={26} x2={86} y2={16.5} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 10구역 */}
                            <line x1={76.5} y1={26} x2={76.5} y2={75} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={76.5} y1={75} x2={86} y2={85} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 11구역 */}
                            <line x1={76.5} y1={75} x2={26} y2={75} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={16} y1={85} x2={26} y2={75} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 12구역 */}
                            <line x1={26} y1={26} x2={26} y2={75} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 13구역 */}
                            <line x1={26} y1={26} x2={42} y2={42} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={42} y1={42} x2={58} y2={42} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={58} y1={42} x2={58} y2={58} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={58} y1={58} x2={76.5} y2={75} stroke="#0984e3" strokeWidth={0.2}/>
                            {/* 14구역 */}
                            <line x1={42} y1={42} x2={42} y2={58} stroke="#0984e3" strokeWidth={0.2}/>
                            <line x1={42} y1={58} x2={58} y2={58} stroke="#0984e3" strokeWidth={0.2}/>

                        </svg>
                    </div>
                    {buildings.map((building, index)=>(
                        <label className="el-building" style={{
                            top : `${building.x}%`,
                            left : `${building.y}%`,
                            transform : `translate(-50%, -50%)`
                        }} key={index}>
                            {selected === null ? (
                            <input type="checkbox" 
                                checked={building.server !== null} readOnly/>
                            ) : (
                            <input type="checkbox" 
                                onChange={e=>checkBuilding(e, building)}
                                checked={building.server !== null && building.server?.no === selected?.no} />
                            )}
                            <span style={{backgroundColor : getColor(building)}}></span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
        </>)}

        {step >= 5 && (<>
        <hr className="mt-5 pt-5"/>
        <div className="row mt-4">
            <h2>5. 예상 점수 확인</h2>
            <div className="col-12">
                <div className="text-nowrap table-responsive">
                    <table className="table">
                        <thead>
                            <tr className="text-center">
                                <th>순위</th>
                                <th>서버</th>
                                <th className="text-end">현재 점수</th>
                                <th className="text-end">1분당 점수</th>
                                <th className="text-end">최종 점수</th>
                            </tr>
                        </thead>
                        <tbody className="text-center">
                            {sortedServers.map((server, index)=>(
                            <tr key={server.no} className={`${index === 0 ? 'table-primary' : ''}${index === 1 ? 'table-success' : ''}`}>
                                <td>{index+1}</td>
                                <td>{server.name}</td>
                                <td className="text-end">{server.currentScore?.toLocaleString()}</td>
                                <td className="text-end">{server.scorePerMinute?.toLocaleString()}</td>
                                <td className="text-end">{server.scoreTotal?.toLocaleString()}</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        </>)}

        <div className="row my-5 py-5"></div>
    </>)
}