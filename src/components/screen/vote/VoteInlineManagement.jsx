import { useEffect, useRef, useState } from "react";
import { useFirebase } from "@src/hooks/useFirebase";
import { finalVote } from "./voteHistory";
import { toast } from "react-toastify";

export default function VoteInlineManagement({ uuid, vote, access, onAccess, deleting }) {
    const { getVoteManager, closeVoteManually, openVoteManually, endVote } = useFirebase();
    const dialog = useRef(null);
    const unsubscribe = useRef(null);
    const generation = useRef(0);
    const busy = useRef(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [checking, setChecking] = useState(false);
    const [changing, setChanging] = useState(false);
    useEffect(() => () => { generation.current++; unsubscribe.current?.(); onAccess(null); }, [onAccess]);
    const cancel = () => {
        generation.current++;
        unsubscribe.current?.(); unsubscribe.current = null;
        setChecking(false); setPassword(""); setError("");
        dialog.current?.close();
    };
    const login = event => {
        event.preventDefault();
        if (checking) return;
        const request = ++generation.current;
        unsubscribe.current?.();
        setChecking(true); setError("");
        try {
            unsubscribe.current = getVoteManager(uuid, password, data => {
                if (request !== generation.current) return;
                setChecking(false);
                if (!data || data.error) {
                    onAccess(null);
                    setError(data?.message || "투표를 불러올 수 없습니다.");
                    return;
                }
                onAccess({ uuid, password });
                setPassword("");
                dialog.current?.close();
            });
        } catch {
            setChecking(false); setError("관리 권한을 확인하지 못했습니다. 다시 시도해 주세요.");
        }
    };
    const changeState = async action => {
        if (!access || busy.current || deleting || finalVote(vote)) return;
        const message = action === "end"
            ? "최종 종료하면 재개하거나 응답을 삭제할 수 없습니다. UID·닉네임·CP와 투표 결과가 공개 GitHub에 보관됩니다. 종료하시겠습니까?"
            : action === "pause" ? "투표를 일시정지하시겠습니까?" : "투표를 재개하시겠습니까?";
        if (!window.confirm(message)) return;
        busy.current = true; setChanging(true);
        try {
            const handler = action === "end" ? endVote : action === "pause" ? closeVoteManually : openVoteManually;
            if (await handler(uuid, access.password)) toast.success(action === "end" ? "최종 종료되었습니다. 보관 작업을 기다려 주세요." : "투표 상태를 변경했습니다.");
        } catch { toast.error("상태를 변경하지 못했습니다."); }
        finally { busy.current = false; setChanging(false); }
    };
    return <section className="mb-3" aria-label="투표 관리">
        <div className="d-flex flex-wrap align-items-center gap-2">
            {access ? <>
                <strong className="badge bg-warning text-dark p-2">관리모드</strong>
                <button type="button" className="btn btn-outline-secondary" disabled={changing || deleting} onClick={() => { cancel(); onAccess(null); }}>관리모드 종료</button>
                {!finalVote(vote) && <>
                    <button type="button" className="btn btn-outline-warning" disabled={changing || deleting} onClick={() => changeState(vote.closed ? "resume" : "pause")}>{vote.closed ? "투표 재개" : "일시정지"}</button>
                    <button type="button" className="btn btn-outline-danger" disabled={changing || deleting} onClick={() => changeState("end")}>투표 최종 종료</button>
                </>}
            </> : <button type="button" className="btn btn-primary" onClick={() => { setError(""); dialog.current.showModal(); }}>투표 관리</button>}
        </div>
        {access && <p className="small text-muted mt-2 mb-0">{finalVote(vote) ? "최종 종료된 투표는 조회만 가능합니다." : "하단 명단에서 ×를 누르면 해당 사용자의 투표 내역만 삭제됩니다. 대상자 명단은 유지됩니다."}</p>}
        <dialog className="vote-admin-dialog" ref={dialog} aria-labelledby="vote-admin-title" onCancel={event => { event.preventDefault(); cancel(); }} onClick={event => { if (event.target === dialog.current) { const box = dialog.current.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) cancel(); } }}>
            <form onSubmit={login}>
                <h2 id="vote-admin-title" className="h5">관리모드로 전환</h2>
                <label className="form-label mt-2" htmlFor="vote-admin-password">관리자 비밀번호</label>
                <input autoFocus id="vote-admin-password" type="password" autoComplete="current-password" className="form-control" value={password} onChange={event => setPassword(event.target.value)} disabled={checking} />
                {error && <p className="text-danger mt-2" role="alert">{error}</p>}
                <div className="d-flex justify-content-end gap-2 mt-3">
                    <button type="button" className="btn btn-outline-secondary" onClick={cancel}>취소</button>
                    <button type="submit" className="btn btn-primary" disabled={checking}>{checking ? "확인 중…" : "관리모드 시작"}</button>
                </div>
            </form>
        </dialog>
    </section>;
}
