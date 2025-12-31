import { useCallback, useMemo, useState } from "react";
import { useFirebase } from "@src/hooks/useFirebase";
import { useParams } from "react-router-dom";

export default function AttendanceVoteManager() {
    const {voteId} = useParams();

    const [uuid, setUuid] = useState(voteId);   
    const [vote, setVote] = useState(null);

    const { getVote } = useFirebase();

    const loadVote = useCallback(()=>{
        const unsubscribe = getVote(uuid, (data)=>{
            setVote(data);
        });
    }, [uuid, getVote]);

    const totalCount = useMemo(()=>{
        if(vote === null) return 0;

        return vote.choices.reduce((acc, cur)=>acc + cur.currentCount, 0);
    }, [vote]);

    return (<>
        <h1>투표 현황 및 관리</h1>
        <hr/>

        <div className="row mt-4">
            <label className="col-form-label col-sm-3">투표ID</label>
            <div className="col d-flex align-items-center">
                <input type="text" className="form-control w-auto flex-grow-1" placeholder="투표 고유 ID 입력" 
                        value={uuid} onChange={e=>setUuid(e.target.value)}/>
                <button className="btn btn-primary ms-2" onClick={loadVote}>불러오기</button>
            </div>
        </div>

        {vote !== null && (<>
        <div className="row mt-4">
            <label className="col-form-label col-sm-3">투표 제목</label>
            <div className="col-sm-9 fs-3">
                {vote.title}
            </div>
        </div>
        <hr/>
        {vote.choices.map((choice, index)=>(
        <div className="row mt-1">
            <label className="col-form-label col-sm-3">{index === 0 && "투표 현황"}</label>
            <div className="col-sm-9">
                <div className="d-flex align-items-center">
                    {choice.content} 
                    {choice.limit ? (
                    <span className="badge rounded-pill bg-danger ms-4">
                        {choice.currentCount} / {choice.count}
                    </span>
                    ) : (
                    <span className="badge rounded-pill bg-secondary ms-4">제한 없음</span>
                    )}
                </div>
                <div className="progress" role="progressbar">
                    <div className="progress-bar" style={{width : choice.currentCount * 100 / totalCount+"%"}}></div>
                </div>
            </div>
        </div>
        ))}
        <hr/>
        <div className="row mt-4">
            <label className="col-form-label col-sm-3">투표 인원</label>
            <div className="col-sm-9">
                {vote.choices.map(choice=>(
                <div className="row mb-2" key={choice.no}>
                    <div className="col mb-2">
                        <h4>{choice.content} ({choice.currentCount}명)</h4>
                        <ul className="list-group">
                            {choice.players.length === 0 && (<li className="list-group-item text-nowrap">투표한 사람 없음</li>)}
                            {choice.players.sort((a,b)=>{
                                if(a.job === b.job) {
                                    return b.cp - a.cp;
                                }
                                return a.job.localeCompare(b.job);
                            }).map(player=>(
                                <li className="list-group-item text-nowrap" key={player.nickname}>
                                    <div className="row">
                                        <div className="col-6">
                                            <span>{player.nickname}</span>
                                        </div>
                                        <div className="col-2">
                                            <span className={`badge rounded-pill ${player.job === "CE" ? "bg-primary" : "bg-success"} me-2`}>{player.job}</span>
                                        </div>
                                        <div className="col-2">
                                            <span className="ms-2">{player.cp}M</span>
                                        </div>
                                        <div className={`col-2 ${player.job === "MM" && player.skill >= 3 ? "text-danger fw-bold" : ""}`}>
                                            {player.job === "CE" ? "기합" : "응시"} {player.skill}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                ))}
            </div>
        </div>
        </>)}
        <hr/>
    </>)
}