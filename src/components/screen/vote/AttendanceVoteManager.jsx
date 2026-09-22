import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFirebase } from "@src/hooks/useFirebase";
import { useParams } from "react-router-dom";
import { FaPlay, FaStop, FaUpload, FaXmark } from "react-icons/fa6";
import { toast } from "react-toastify";
import { Helmet } from "react-helmet-async";
import { loadRealPower } from "@src/services/topwarDataRepository";
import { choiceColor } from "./voteColors";
import { finalVote, sameVoter } from "./voteHistory";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";

const cpInMillions = value => Math.abs(Number(value ?? 0)) >= 1_000_000 ? Number(value) / 1_000_000 : Number(value ?? 0);


export default function AttendanceVoteManager() {
    const {voteId} = useParams();
    const { getVoteManager, getVoteRoster, closeVoteManually, openVoteManually, endVote, deletePlayerFromVote } = useFirebase();

    const [uuid, setUuid] = useState(voteId || "");
    const [password, setPassword] = useState("");
    const [loadedAccess, setLoadedAccess] = useState(null);
    const [view, setView] = useState("all");
    const [deleting, setDeleting] = useState(false);
    const [changing, setChanging] = useState(false);
    const [vote, setVote] = useState(null);
    const unsubscribeRef = useRef(null);
    const [roster, setRoster] = useState([]);
    const [rosterStatus, setRosterStatus] = useState("loading");
    const [rosterAttempt, setRosterAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        setRoster([]);
        if (vote?.status === "archived") { setRoster(vote.roster || []); setRosterStatus(vote.rosterSource === "unavailable" ? "missing" : "ready"); return; }
        if (vote?.rosterSource === "snapshot") {
            setRosterStatus("loading");
            getVoteRoster(loadedAccess.uuid).then(players => { if (active) { setRoster(players); setRosterStatus("ready"); } })
                .catch(() => { if (active) setRosterStatus("error"); });
            return () => { active = false; };
        }
        if (!vote?.serverId) { setRosterStatus("missing"); return; }
        setRosterStatus("loading");
        loadRealPower(vote.serverId).then(data => {
            if (!Array.isArray(data?.players)) throw new Error("Invalid roster");
            if (!active) return;
            setRoster(data.players.filter(player => Number(player.level) >= 80 &&
                (vote.targetScope !== "alliance" || String(player.allianceId) === String(vote.allianceId)))
                .sort((a, b) => Number(b.score ?? b.power ?? 0) - Number(a.score ?? a.power ?? 0)));
            setRosterStatus("ready");
        }).catch(() => { if (active) setRosterStatus("error"); });
        return () => { active = false; };
    }, [vote?.serverId, vote?.targetScope, vote?.allianceId, vote?.status, vote?.rosterSource, vote?.roster, loadedAccess?.uuid, getVoteRoster, rosterAttempt]);
    const nonVoters = useMemo(() => {
        const voters = (vote?.choices || []).flatMap(choice => Object.values(choice.players || {}));
        return roster.filter(player => !voters.some(voter => sameVoter(player, voter)));
    }, [vote, roster]);


    const loadVote = useCallback(()=>{
            unsubscribeRef.current?.();
            setVote(null);
            unsubscribeRef.current = getVoteManager(uuid, password, (data)=>{
                if(data === null) {
                    toast.error("투표가 존재하지 않습니다");
                    setVote(null);
                }
                else if(data.error) {
                    toast.error(data.message);
                    setVote(null);
                }
                else {
                    setLoadedAccess({ uuid, password });
                    setVote(data);
                }
            });
    }, [uuid, password, getVoteManager]);

    useEffect(() => () => unsubscribeRef.current?.(), []);

    const totalCount = useMemo(()=>{
        if(vote === null) return 0;
        return vote.choices.reduce((acc, cur)=>acc + cur.currentCount, 0);
    }, [vote]);

    const closeVote = useCallback(async ()=>{
        if(window.confirm("이 투표를 중지하시겠습니까?")) {
            setChanging(true);
            const success = await closeVoteManually(loadedAccess.uuid, loadedAccess.password);
            setChanging(false);
            if(success) {
                toast.error("투표가 중지되었습니다");
            }
        }
    }, [closeVoteManually, loadedAccess]);

    const openVote = useCallback(async ()=>{
        if(window.confirm("이 투표를 다시 시작하시겠습니까?")) {
            setChanging(true);
            const success = await openVoteManually(loadedAccess.uuid, loadedAccess.password);
            setChanging(false);
            if(success) {
                toast.success("투표가 다시 시작되었습니다");
            }
        }
    }, [openVoteManually, loadedAccess]);

    const finishVote = async () => {
        if (!window.confirm("투표를 최종 종료하시겠습니까? 재개하거나 응답을 삭제할 수 없습니다. 대상자의 UID·닉네임·CP와 개인별 투표 결과가 공개 GitHub 저장소에 보관됩니다.")) return;
        setChanging(true);
        try { if (await endVote(loadedAccess.uuid, loadedAccess.password)) toast.success("최종 종료되었습니다. 자동 보관 작업이 완료될 때까지 원본을 유지합니다."); }
        finally { setChanging(false); }
    };

    const handleDeletePlayer = useCallback(async (choiceNo, player) => {
        // 1차 확인창
        if (window.confirm(`[${player.nickname}] 님의 투표 기록을 삭제하시겠습니까? 삭제 후 미참여 상태로 돌아가며, 이 작업은 되돌릴 수 없습니다.`)) {
            
            // 훅에서 수정한 함수 호출 (uuid, 항목번호, 닉네임, 현재입력된 비밀번호)
            setDeleting(true);
            let success;
            try { success = await deletePlayerFromVote(loadedAccess.uuid, choiceNo, player.nickname, loadedAccess.password, player.uid); } finally { setDeleting(false); }
            
            if (success) {
                toast.success(`${player.nickname} 님의 투표 기록을 삭제했습니다.`);
            }
            // 에러 발생 시(비밀번호 틀림 등)는 useFirebase 내부의 alert가 띄워집니다.
        }
    }, [loadedAccess, deletePlayerFromVote]); // password 의존성 추가


    const nameOf = player => player.nickname || player.username || "";
    const voters = (vote?.choices || []).flatMap((choice, index) => Object.values(choice.players || {}).map(player => ({
        ...player, choiceNo: choice.no, choiceTitle: choice.content, color: choiceColor(choice, index),
    })));
    const cpOf = player => player.power != null || player.score != null
        ? Number(player.score ?? player.power) / 1000000 : player.cpUnit === "million" ? Number(player.cp) : player.cpUnit === "raw" ? Number(player.cp) / 1000000 : cpInMillions(player.cp);
    const sortPlayers = players => [...players].sort((a, b) => cpOf(b) - cpOf(a) || nameOf(a).localeCompare(nameOf(b)));
    const allPlayers = [...voters, ...nonVoters];
    const copyPlayers = async players => {
        const text = sortPlayers(players).map(nameOf).filter(Boolean).join(",");
        if (!text) return toast.info("복사할 닉네임이 없습니다.");
        try {
            if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
            else {
                const focus = document.activeElement;
                const input = document.createElement("textarea");
                input.value = text; input.style.cssText = "position:fixed;left:-9999px";
                document.body.appendChild(input);
                try { input.select(); if (!document.execCommand("copy")) throw new Error("Copy failed"); }
                finally { input.remove(); focus?.focus(); }
            }
            toast.success("닉네임이 복사되었습니다.");
        } catch { toast.error("복사하지 못했습니다. 다시 시도해주세요."); }
    };
    const renderGroup = (title, players, key = title) => <section key={key} className="card p-3 mb-3">
        <div className="d-flex justify-content-between gap-2 align-items-center mb-2">
            <h3 className="h5 mb-0">{title} ({players.length}명)</h3>
            <button className="btn btn-sm btn-outline-primary" disabled={!players.length} onClick={() => copyPlayers(players)}>닉네임 전체 복사</button>
        </div>
        {!players.length && <p className="mb-0 text-muted">해당 인원이 없습니다.</p>}
        <ul className="list-group">{sortPlayers(players).map((player, index) => <li key={`${player.uid || nameOf(player)}-${index}`}
            className="list-group-item d-flex align-items-center flex-wrap gap-2" style={{
                borderLeft: `6px solid ${player.color || "#adb5bd"}`,
                backgroundColor: player.choiceNo != null ? `color-mix(in srgb, ${player.color} 18%, var(--bs-body-bg))` : undefined,
            }}>
            <button type="button" className={`btn btn-link p-0 text-start ${player.choiceNo != null ? "fw-bold" : ""}`} style={{ color: "var(--bs-body-color)", overflowWrap: "anywhere" }}
                title="닉네임 복사" onClick={() => copyPlayers([player])}>{nameOf(player)}</button>
            {player.choiceNo != null && <span className="badge rounded-pill bg-success">✓ 투표 완료</span>}
            <span className="small">{player.choiceTitle || "미참여"} · CP {cpOf(player).toLocaleString(undefined, { maximumFractionDigits: 2 })}M</span>
            {player.choiceNo != null && !finalVote(vote) && <button type="button" disabled={deleting || changing} className="btn btn-sm btn-outline-danger ms-auto"
                aria-label={`${nameOf(player)} 투표 삭제`} onClick={() => handleDeletePlayer(player.choiceNo, player)}><FaXmark /> 삭제</button>}
        </li>)}</ul>
    </section>;

    return (<>
        {/* 검색대상 제외 */}
        <Helmet>
            <meta name="robots" content="noindex, follow" />
        </Helmet>

        <h1>투표 현황 및 관리</h1>
        <hr/>

        <div className="row mt-4">
            <label className="col-form-label col-sm-3">투표ID</label>
            <div className="col-sm-9">
                <input type="text" className="form-control" placeholder="투표 고유 ID 입력" 
                        value={uuid} onChange={e=>setUuid(e.target.value)}/>             
            </div>
        </div>
        <div className="row mt-2">
            <label className="col-form-label col-sm-3">관리자 비밀번호</label>
            <div className="col-sm-9">
                <input type="password" className="form-control" placeholder="관리자 비밀번호 입력"
                        value={password} onChange={e=>setPassword(e.target.value)}/>
            </div>
        </div>
        <div className="row mt-2">
            <div className="offset-sm-3 col-sm-9">
                <button className="btn btn-primary w-100" onClick={loadVote}>
                    <FaUpload/>    
                    <span className="ms-2">불러오기</span>
                </button>
            </div>
        </div>

        {vote !== null && (<>
        <div className="d-flex gap-2 mt-3">
            {vote.serverId && <LanguageRouterLink className="btn btn-outline-primary" to={`/vote/cast/${vote.serverId}`}>서버 투표 내역</LanguageRouterLink>}
            <LanguageRouterLink className="btn btn-outline-secondary" to={vote.serverId ? `/vote/cast/${vote.serverId}/${loadedAccess.uuid}` : `/vote/cast/${loadedAccess.uuid}`}>투표 화면</LanguageRouterLink>
        </div>
        <div className="row mt-4">
            <label className="col-form-label col-sm-3">투표 상태</label>
            <div className="col-sm-9 fs-4">
                {finalVote(vote) ? <div className="alert alert-secondary fs-6">{vote.status === "archived" ? "최종 종료 · GitHub 보관 완료" : "최종 종료 · GitHub 보관 대기 (자동 작업은 지연될 수 있습니다. 원본 유지 중)"}</div> : vote.closed === true ? (<>
                    <span className="text-warning">일시정지</span>
                    <button disabled={changing} className="btn btn-primary ms-2 d-inline-flex justify-content-center align-items-center" onClick={openVote}>
                        <FaPlay/>
                        <span className="ms-2">재개</span>
                    </button>
                </>) : (<>
                    <span className="text-primary">투표 진행중</span>
                    <button disabled={changing} className="btn btn-warning ms-2 d-inline-flex justify-content-center align-items-center" onClick={closeVote}>
                        <FaStop/>
                        <span className="ms-2">일시정지</span>
                    </button>
                </>)}
                {!finalVote(vote) && <button disabled={changing || deleting} className="btn btn-danger ms-2" onClick={finishVote}>투표 최종 종료 · GitHub 보관</button>}
            </div>
        </div>

        <div className="row mt-4">
            <label className="col-form-label col-sm-3">투표 제목</label>
            <div className="col-sm-9 fs-3">
                {vote.title}
            </div>
        </div>

        <div className="row mt-2">
            <label className="col-form-label col-sm-3">투표 대상</label>
            <div className="col-sm-9">
                {vote.targetScope === "alliance"
                    ? `${vote.serverId} 서버 · [${vote.allianceTag || "-"}] ${vote.allianceName || vote.allianceId} · ${vote.rosterSource === "snapshot" ? "생성 당시 명단" : "기존 기록"}`
                    : `${vote.serverId || "-"} 서버 전체`}
            </div>
        </div>
        <hr/>
        {vote.choices.map((choice, index)=>(
        <div className="row mt-1" key={choice.no}>
            <label className="col-form-label col-sm-3">{index === 0 && "투표 현황"}</label>
            <div className="col-sm-9">
                <div className="d-flex align-items-center">
                    {choice.content} 
                    {choice.limit ? (
                    <span className="badge rounded-pill bg-danger ms-4">
                        {choice.currentCount} / {choice.count}
                    </span>
                    ) : (<>
                    <span className="badge rounded-pill bg-secondary ms-4">제한 없음</span>
                    <span className="ms-4 text-primary fw-bold">{choice.currentCount}명 참여중  (총 {totalCount}명 중 {(totalCount ? choice.currentCount * 100 / totalCount : 0).toFixed(2)+"%"})</span>
                    </>)}
                </div>
                <div className="progress" role="progressbar">
                    <div className="progress-bar" style={{width : (totalCount ? choice.currentCount * 100 / totalCount : 0)+"%", backgroundColor: choiceColor(choice, index)}}></div>
                </div>
            </div>
        </div>
        ))}
        <hr/>
        <section className="mt-4">
            <div className="d-flex flex-wrap gap-2 mb-3" aria-label="명단 보기">
                {[["all", "전체보기"], ["choice", "항목별보기"], ["status", "참여/미참여 보기"]].map(([key, title]) =>
                    <button key={key} className={`btn ${view === key ? "btn-primary" : "btn-outline-primary"}`} aria-pressed={view === key} onClick={() => setView(key)}>{title}</button>)}
            </div>
            <p className="text-muted">CP 높은 순 · 닉네임을 누르면 개별 복사, 그룹 복사는 닉네임만 쉼표로 구분합니다. 불참 항목에 투표한 사람도 투표 참여자로 집계됩니다.</p>
            {rosterStatus === "missing" && <p>당시 대상 명단이 없어 기존 투표자만 표시합니다. 미참여 명단은 확인할 수 없습니다.</p>}
            {rosterStatus === "loading" && <p>대상자 명단을 불러오는 중입니다.</p>}
            {rosterStatus === "error" && <p>대상자 명단을 불러오지 못했습니다. <button className="btn btn-outline-secondary" onClick={() => setRosterAttempt(n => n + 1)}>다시 시도</button></p>}
            {view === "all" && renderGroup(rosterStatus === "ready" ? "전체 대상" : "확인된 투표자", allPlayers)}
            {view === "choice" && vote.choices.map(choice => renderGroup(choice.content, voters.filter(player => player.choiceNo === choice.no), choice.no))}
            {view === "status" && <>
                {renderGroup("참여자 (투표 완료)", voters)}
                {rosterStatus === "ready" && renderGroup("미참여자 (무응답)", nonVoters)}
            </>}
        </section>
        </>)}
        <hr/>
    </>)
}
