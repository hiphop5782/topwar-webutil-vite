import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useFirebase } from "@src/hooks/useFirebase";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import AttendanceVoteReader from "./AttendanceVoteReader";
import { loadVoteHistory } from "@src/services/voteArchiveRepository";
import { dateMillis, mergeHistory, voteState } from "./voteHistory";

// Numeric segments are server numbers; original UUID/short-code URLs still open the reader.
export default function AttendanceVoteHistory() {
    const { voteId } = useParams();
    return /^\d{1,6}$/.test(voteId || "") ? <ServerHistory serverId={String(Number(voteId))} /> : <AttendanceVoteReader />;
}
function ServerHistory({ serverId }) {
    const { getVoteHistory } = useFirebase();
    const [live, setLive] = useState([]);
    const [archived, setArchived] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState({ live: true, archive: true });
    const [attempt, setAttempt] = useState(0);
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        setLive([]); setArchived([]); setErrors({}); setLoading({ live: true, archive: true });
        const fail = (source, error) => { if (active) { setErrors(old => ({ ...old, [source]: error.message })); setLoading(old => ({ ...old, [source]: false })); } };
        const unsubscribe = getVoteHistory(serverId, votes => {
            if (active) { setLive(votes); setLoading(old => ({ ...old, live: false })); }
        }, error => fail("live", error));
        loadVoteHistory(serverId, controller.signal).then(votes => {
            if (active) { setArchived(votes); setLoading(old => ({ ...old, archive: false })); }
        }).catch(error => fail("archive", error));
        return () => { active = false; unsubscribe?.(); controller.abort(); };
    }, [serverId, getVoteHistory, attempt]);
    const votes = useMemo(() => mergeHistory(live, archived), [live, archived]);
    const labels = { active: "진행 중", paused: "일시정지", expired: "기한 만료", archiving: "최종 종료 · 보관 대기", archived: "종료 · 보관 완료" };
    return <>
        <Helmet><meta name="robots" content="noindex, follow" /></Helmet>
        <div className="d-flex justify-content-between align-items-center gap-2"><h1>{serverId} 서버 투표 내역</h1><button className="btn btn-outline-secondary" onClick={() => setAttempt(n => n + 1)}>새로고침</button></div>
        <p className="text-muted">생성일 최신순 · 서버 전체 및 길드별 투표</p>
        {(loading.live || loading.archive) && <p role="status">투표 내역을 불러오는 중입니다.</p>}
        {Object.keys(errors).length > 0 && <div className="alert alert-warning" role="alert">{errors.live && <p>Firebase 목록을 불러오지 못했습니다.</p>}{errors.archive && <p>GitHub 이전 내역을 불러오지 못했습니다.</p>}현재 확인된 내역만 표시합니다. 새로고침으로 다시 시도해 주세요.</div>}
        {!loading.live && !loading.archive && !Object.keys(errors).length && !votes.length && <p>아직 생성된 투표가 없습니다.</p>}
        <div className="d-grid gap-3">{votes.map(vote => {
            const state = voteState(vote, now);
            const active = state === "active";
            return <LanguageRouterLink key={vote.uuid} to={`/vote/cast/${serverId}/${encodeURIComponent(vote.uuid)}`}
                className={`card p-3 text-decoration-none ${active ? "border-primary border-2 bg-primary-subtle" : "text-body-secondary"}`} style={{ opacity: active ? 1 : 0.65 }}>
                <div className="d-flex justify-content-between gap-2"><h2 className="h5">{vote.title || "제목 없음"}</h2><span className={`badge align-self-start ${active ? "bg-primary" : "bg-secondary"}`}>{labels[state]}</span></div>
                <strong>{vote.targetScope === "alliance" ? `길드 전용 · [${vote.allianceTag || "-"}] ${vote.allianceName || vote.allianceId}` : "서버 전체 투표"}</strong>
                <small className="mt-2">생성: {new Date(dateMillis(vote.createdAt)).toLocaleString()} · {vote.totalCount ?? (vote.choices || []).reduce((n, c) => n + Number(c.currentCount || 0), 0)}명 참여</small>
            </LanguageRouterLink>;
        })}</div>
    </>;
}
