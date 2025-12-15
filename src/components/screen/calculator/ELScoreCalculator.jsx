import { useCallback, useEffect, useMemo, useState } from "react"
import { FaEraser, FaPlus } from "react-icons/fa6";
import useLocalStorage from "@src/hooks/useLocalStorage";
import BuildingList from "@src/assets/json/el/buildings.json";

import "./ELScoreCalculator.css";

const initialValue = [
    {no:1, number: "", currentScore:0, scorePerMinute:0, scoreTotal : 0},
    {no:2, number: "",currentScore:0, scorePerMinute:0, scoreTotal : 0},
    {no:3, number: "", currentScore:0, scorePerMinute:0, scoreTotal : 0},
    {no:4, number: "", currentScore:0, scorePerMinute:0, scoreTotal : 0},
    {no:5, number: "", currentScore:0, scorePerMinute:0, scoreTotal : 0},
    {no:6, number: "", currentScore:0, scorePerMinute:0, scoreTotal : 0},
    {no:7, number: "", currentScore:0, scorePerMinute:0, scoreTotal : 0},
    {no:8, number: "", currentScore:0, scorePerMinute:0, scoreTotal : 0},
];

const dateOptions = {
    year: 'numeric',
    month: '2-digit', // 월을 두 자리 숫자로 표시 (01, 02, ..., 12)
    day: '2-digit'    // 일을 두 자리 숫자로 표시 (01, 02, ..., 31)
};

export default function ELScoreCalculator() {
    const [selected, setSelected] = useState(null);
    const [servers, setServers] = useLocalStorage('servers', initialValue);
    const [buildings, setBuildings] = useState(()=>{
        return BuildingList.map(building=>({...building, server : null}));
    });
    const [endDate, setEndDate] = useState(()=>{
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        return nextWeek.toLocaleDateString("sv-SE", dateOptions);
    });
    const [endTime, setEndTime] = useState("23:00");

    const resetServers = useCallback(()=>{
        setServers(initialValue);
    }, []);
    const changeServerNumber = useCallback((e, target)=>{
        const value = e.target.value;
        const replacement = value.replace(/[^0-9]+/g, "");
        const replacement2 = replacement.replace(/^0+/, "").substring(0, 4);
        setServers(prev=>prev.map((server,idx)=>{
            if(server.no === target.no) {
                return {
                    ...server, 
                    number : replacement2.length === 0 ? "" : replacement2
                };
            }
            return server;
        }));
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

            const origin = conquestObject[building.server.number] || 0;
            conquestObject[building.server.number] = origin + building.point;
        });

        const calculated = servers.map(server=>{
            const score = conquestObject[server.number] || 0;
            return {
                ...server,
                scorePerMinute : score,
                scoreTotal : server.currentScore + score * minutes
            };
        });

        return calculated.sort((a,b)=>b.scoreTotal - a.scoreTotal);
    }, [buildings]);

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

        <div className="row mt-4">
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
        <hr/>

        <div className="row">
            <h2>
                2. 서버 번호 설정
                <button className="btn btn-danger ms-4" onClick={resetServers}>
                    <FaEraser/>
                    <span className="ms-2">서버 초기화</span>
                </button>
            </h2>
            {servers.map((server)=>(
            <div className="col-md-3 col-sm-4 col-6 mb-2" key={server.no}>
                <input type="text" inputMode="numeric" className="form-control"
                    placeholder={`서버 ${server.no} 번호 입력`}
                    value={server.number}
                    onChange={e=>changeServerNumber(e,server)}/>
            </div>
            ))}
        </div>
        <hr/>

        <div className="row mt-4">
            <h2>3. 현재 점수 입력</h2>
        </div>
        {servers.map(server=>(
        <div className="row" key={server.no}>
            <label className="col-sm-3 col-form-label">{server.number}</label>
            <div className="col-sm-9">
                <input type="text" inputMode="numeric" className="form-control" 
                    value={server.currentScore}
                    onChange={e=>changeCurrnetScore(e, server)}/>
            </div>
        </div>
        ))}

        <hr/>

        {/* 제어 버튼 */}
        <div className="row mt-4">
            <h2>4. 서버 선택</h2>
            <div className="col-12 mb-2">
                <button className="btn btn-secondary w-100" onClick={e=>setSelected(null)}>전체 서버 상황 보기</button>
            </div>

            {servers.map((server, index)=>(
            <div className="col-md-3 col-sm-4 col-6 mb-2" key={index}>
                <button className="btn btn-primary w-100" onClick={e=>setSelected(server)}>{server.number} 서버</button>
            </div>
            ))}
        </div>

        <hr/>
        <div className="row my-4">
            <h2>5. 지도 확인 ({selected === null ? "전체" : `${selected.number} 서버`} 상황 확인 중)</h2>
            <div className="col">
                
                <div className="el-map">
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
                                checked={building.server !== null && building.server?.number === selected?.number} />
                            )}
                            <span className={`${building.server !== null ? `check${building.server.no}` : ''}`}></span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
        <hr/>
        <div className="row mt-4">
            <h2>6. 예상 점수 확인</h2>
            <div className="col-12">
                <div className="text-nowrap table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>순위</th>
                                <th>현재 점수</th>
                                <th>시간당 점수</th>
                                <th>최종 점수</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedServers.map((server, index)=>(
                            <tr key={server.no}>
                                <td>{index+1}</td>
                                <td>{server.currentScore}</td>
                                <td>{server.scorePerHour}</td>
                                <td>{server.scoreTotal}</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div className="row my-5 py-5"></div>
    </>)
}