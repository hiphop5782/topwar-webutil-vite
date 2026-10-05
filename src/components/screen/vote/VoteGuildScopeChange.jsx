import { useState } from "react";
import { useFirebase } from "@src/hooks/useFirebase";
import { planGuildChange, snapshotGuilds } from "./voteGuildScope";
import { toast } from "react-toastify";

export default function VoteGuildScopeChange({ uuid, access, disabled, onBusy }) {
    const { getGuildChangePreview, restrictVoteToGuild } = useFirebase();
    const [preview, setPreview] = useState(null);
    const [allianceId, setAllianceId] = useState("");
    const [error, setError] = useState("");
    const load = async () => {
        onBusy(true); setError(""); setPreview(null); setAllianceId("");
        try { setPreview(await getGuildChangePreview(uuid, access.password)); }
        catch (e) { setError(e.message || "스냅샷을 불러오지 못했습니다."); }
        finally { onBusy(false); }
    };
    const plan = preview && allianceId ? planGuildChange(preview.vote, preview.roster, allianceId) : null;
    const apply = async () => {
        if (!plan || disabled) return;
        if (!window.confirm(`${preview.vote.serverId} 서버의 [${plan.guild.tag || "-"}] ${plan.guild.name || plan.guild.id} 길드 전용으로 변경합니다.\n대상자 ${plan.removedPeople}명과 응답 ${plan.removedResponses}건을 제거합니다.\n스냅샷에 없는 직접 입력 응답도 제거되며 되돌릴 수 없습니다. 계속하시겠습니까?`)) return;
        onBusy(true); setError("");
        try {
            await restrictVoteToGuild(uuid, access.password, { serverId: preview.vote.serverId, allianceId, revision: preview.revision });
            setPreview(null); toast.success("길드 전용으로 변경하고 제외 대상의 응답을 삭제했습니다.");
        } catch (e) { setError(e.message || "변경하지 못했습니다."); setPreview(null); }
        finally { onBusy(false); }
    };
    return <div className="mt-3">
        <button type="button" className="btn btn-outline-primary" disabled={disabled} onClick={load}>길드 대상으로 변경</button>
        {error && <p role="alert" className="text-danger mt-2">{error}</p>}
        {preview && <div className="card p-3 mt-2">
            <p>서버 {preview.vote.serverId} 유지 · 생성 당시 스냅샷 기준입니다. 현재 조사 명단은 불러오지 않습니다.</p>
            <label htmlFor="vote-target-guild" className="form-label">남길 길드</label>
            <select id="vote-target-guild" className="form-select" value={allianceId} disabled={disabled} onChange={e => setAllianceId(e.target.value)}>
                <option value="">길드를 선택하세요</option>
                {snapshotGuilds(preview.roster).map(g => <option key={g.id} value={g.id}>[{g.tag || "-"}] {g.name || g.id} ({g.count}명)</option>)}
            </select>
            {!snapshotGuilds(preview.roster).length && <p className="text-warning mt-2">스냅샷에 선택할 수 있는 길드가 없습니다.</p>}
            {plan && <p className="text-danger mt-2">{plan.roster.length}명 유지 · 대상자 {plan.removedPeople}명 / 응답 {plan.removedResponses}건 제거. 명단에 없는 직접 입력 응답도 UID 기준으로 제거합니다.</p>}
            <div className="d-flex gap-2 mt-2">
                <button type="button" className="btn btn-danger" disabled={disabled || !plan} onClick={apply}>확인 후 길드 대상으로 변경</button>
                <button type="button" className="btn btn-outline-secondary" disabled={disabled} onClick={() => setPreview(null)}>취소</button>
            </div>
        </div>}
    </div>;
}
