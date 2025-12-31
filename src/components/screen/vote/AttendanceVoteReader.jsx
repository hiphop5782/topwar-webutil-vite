import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useFirebase } from "@src/hooks/useFirebase";
import useLocalStorage from "@src/hooks/useLocalStorage";
import { FaVoteYea } from "react-icons/fa";
import { FaXmark } from "react-icons/fa6";
import { toast } from "react-toastify";

export default function AttendanceVoteReader() {
    const {voteId} = useParams();

    const [uuid, setUuid] = useState(voteId);
    const [vote, setVote] = useState(null);

    const { getVote, castVote } = useFirebase();

    const loadVote = useCallback(()=>{
            const unsubscribe = getVote(uuid, (data)=>{
                if(data === null) {
                    toast.error("투표가 존재하지 않습니다");
                }
                setVote(data);
            });
    }, [uuid, getVote]);

    const [choiceNo, setChoiceNo] = useState(null);

    const [userInfo, setUserInfo] = useLocalStorage("vote-user-info", {
        nickname : "",
        cp : 0,
        job : "CE",
        skill : 10
    });

    const changeUserStrInfo = useCallback(e=>{
        const {name, value} = e.target;
        setUserInfo(prev=>({...prev, [name]:value}))
    }, []);
    const changeUserNumberInfo = useCallback(e=>{
        const {name, value} = e.target;
        const replacement = value.replace(/[^0-9]/g, "");
        const number = replacement.length === 0 ? "" : parseInt(replacement);
        setUserInfo(prev=>({...prev, [name]:number}))
    }, []);

    const skillRef = useRef();
    useEffect(()=>{
        setUserInfo(prev=>({...prev, skill: parseInt(skillRef.current.value)}));
    }, [userInfo.job]);

    const writeUserInfoComplete = useMemo(()=>{
        if(userInfo.nickname.trim().length === 0) return false;
        if(userInfo.cp === "") return false;
        return true;
    }, [userInfo]);

    const submitVote = useCallback(async ()=>{
        if(writeUserInfoComplete === false) return toast.error("내 정보를 모두 작성해야 투표가 가능합니다!");

        const success = await castVote(uuid, choiceNo, userInfo);
        if (success) {
            toast.success("투표가 완료되었습니다!");
        }
    }, [uuid, userInfo, writeUserInfoComplete, choiceNo]);

    // 투표 마감 상태 계산
    const isVoteExpired = useMemo(() => {
        if (!vote) return false;
        if (vote.closed) return true; // 수동 마감
        if (vote.expiresAt) {
            return new Date() > vote.expiresAt.toDate(); // 시간 만료
        }
        return false;
    }, [vote]);

    return (<>
        <h1>참여 투표</h1>

        <hr/>
        
        <div className="row mt-4">
            <label className="col-form-label col-sm-3">투표ID</label>
            <div className="col d-flex align-items-center">
                <input type="text" className="form-control w-auto flex-grow-1" placeholder="투표 고유 ID 입력" 
                        value={uuid} onChange={e=>setUuid(e.target.value)}/>
                <button className="btn btn-primary ms-2" onClick={loadVote}>불러오기</button>
            </div>
        </div>
        <hr/>
        <div className="row mt-4">
            <div className="col">
                <h3>내 정보</h3>
            </div>
        </div>
        <div className="row mt-1">
            <label className="col-form-label col-sm-3">닉네임(Nickname)</label>
            <div className="col-sm-9">
                <input type="text" className="form-control" placeholder="게임에서 사용하는 닉네임 입력"
                        name="nickname" value={userInfo.nickname} onChange={changeUserStrInfo}/>
            </div>
        </div>
        <div className="row mt-1">
            <label className="col-form-label col-sm-3">전투력(CP)</label>
            <div className="col-sm-9">
                <input type="text" className="form-control" placeholder="M 제외하고 소수점 없이 입력 (ex : 65)"
                        name="cp" value={userInfo.cp} onChange={changeUserNumberInfo}/>
            </div>
        </div>
        <div className="row mt-1">
            <label className="col-form-label col-sm-3">직업(CE/MM)</label>
            <div className="col-sm-9">
                <select className="form-select" name="job" onChange={changeUserStrInfo}>
                    <option value="CE">전투(CE)</option>
                    <option value="MM">기계(MM)</option>
                </select>
            </div>
        </div>
        <div className="row mt-1">
            <label className="col-form-label col-sm-3">{userInfo.job === "CE" ? "기합(Morale)" : "응급시설(Urgent)"}</label>
            <div className="col-sm-9">
                <select className="form-select" name="skill" onChange={changeUserNumberInfo} ref={skillRef}>
                    {Array.from({length : userInfo.job === "CE" ? 11 : 6}, (_, i)=>userInfo.job === "CE" ? 10-i : 5 - i).map(n=>(
                    <option key={n} value={n}>{n}레벨</option>
                    ))}
                </select>
            </div>
        </div>

        {isVoteExpired ? (<>
        <hr/>
        <div className="row mt-4">
            <div className="col">
                <h3 className="text-danger">종료된 투표입니다</h3>
            </div>
        </div>
        </>) : (<>
        {vote !== null && (<>
        <hr/>
        <div className="row mt-4">
            <div className="col">
                <h3>{vote.title}</h3>
            </div>
        </div>

        <ul className="list-group">
            {vote.choices.map((choice, index)=>(
            <li className="list-group-item d-flex align-items-center" key={index}>
                <label>
                    <input type="radio" name="choice" className="form-check-input me-2"
                            checked={choiceNo === choice.no} onChange={e=>setChoiceNo(choice.no)}/>
                    <span>{choice.content}</span>
                </label>

                {choice.limit === true ? (
                <span className="badge rounded-pill bg-danger ms-4">
                    {choice.currentCount} / {choice.count}
                </span>
                ) : (
                <span className="badge rounded-pill bg-secondary ms-4">
                    제한 없음
                </span>
                )}
            </li>
            ))}
        </ul>

        <div className="row mt-4">
            <div className="col">
                <button className={`btn ${choiceNo === null ? "btn-danger" : "btn-primary"} w-100 d-flex align-items-center justify-content-center fs-4 p-3`} 
                        disabled={choiceNo === null} onClick={submitVote}>
                    {choiceNo === null ? (<>
                    <FaXmark className="me-2"/>
                    <span>항목 선택 후 투표가 가능합니다</span>
                    </>) : (<>
                    <FaVoteYea className="me-2"/>
                    <span>투표하기</span>
                    </>)}
                </button>
            </div>
        </div>        
        </>)}
        </>)}

    </>)
}