import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query, runTransaction } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { db } from "@src/db/firebase";
import { translateTexts, translationLanguages } from "@src/components/screen/vote/voteTranslation";
import { getPlanTranslationCache, setPlanTranslationCache } from "./planTranslationCache";
import {
    assignedItemIds,
    hashPlanPassword,
    matchesPlanPlayer,
    planAccessStorageKey,
    shuffled,
} from "./planUtils";
import "./PlanViewer.css";

const cleanCapacity = value => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};
const formatPower = value => `${(Number(value || 0) / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;

export default function PlanViewer() {
    const { serverId: routeServerId } = useParams();
    const serverId = /^\d+$/.test(routeServerId || "") ? String(Number(routeServerId)) : "";
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [checking, setChecking] = useState(true);
    const [role, setRole] = useState("");
    const [plan, setPlan] = useState(null);
    const [archives, setArchives] = useState([]);
    const [loadError, setLoadError] = useState("");

    const verifyHash = useCallback(async (hash, persist = false) => {
        const [meta, access] = await Promise.all([
            getDoc(doc(db, "planAccess", serverId)),
            getDoc(doc(db, "planAccess", serverId, "keys", hash)),
        ]);
        if (!meta.exists() || !access.exists()
            || access.data().accessVersion !== meta.data().accessVersion
            || !["viewer", "admin"].includes(access.data().role)) return false;
        const nextRole = access.data().role;
        setRole(nextRole);
        const storage = persist ? localStorage : sessionStorage;
        storage.setItem(planAccessStorageKey(serverId), JSON.stringify({ hash }));
        return true;
    }, [serverId]);

    useEffect(() => {
        let active = true;
        const restore = async () => {
            if (!serverId) { setChecking(false); return; }
            const key = planAccessStorageKey(serverId);
            const saved = sessionStorage.getItem(key) || localStorage.getItem(key);
            if (!saved) { setChecking(false); return; }
            try {
                const { hash } = JSON.parse(saved);
                if (active && hash) await verifyHash(hash, Boolean(localStorage.getItem(key)));
            } catch { sessionStorage.removeItem(key); localStorage.removeItem(key); }
            if (active) setChecking(false);
        };
        restore();
        return () => { active = false; };
    }, [serverId, verifyHash]);

    useEffect(() => {
        if (!role || !serverId) return undefined;
        setLoadError("");
        const unsubscribePlan = onSnapshot(doc(db, "plans", serverId), snapshot => {
            if (!snapshot.exists()) { setLoadError("등록된 계획이 없습니다."); setPlan(null); return; }
            setPlan({ id: snapshot.id, ...snapshot.data() });
        }, error => { console.error(error); setLoadError("계획을 불러오지 못했습니다."); });
        const unsubscribeArchives = onSnapshot(query(collection(db, "planArchives", serverId, "entries"), orderBy("archivedAt", "desc")), snapshot => {
            setArchives(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
        }, error => console.error("계획 이전 내역을 불러오지 못했습니다.", error));
        return () => { unsubscribePlan(); unsubscribeArchives(); };
    }, [role, serverId]);

    const enter = async event => {
        event.preventDefault();
        if (!password) return;
        setChecking(true);
        try {
            const hash = await hashPlanPassword(password);
            if (!await verifyHash(hash, remember)) return toast.error("비밀번호가 일치하지 않습니다.");
            setPassword("");
        } catch (error) {
            console.error(error); toast.error("입장 정보를 확인하지 못했습니다.");
        } finally { setChecking(false); }
    };

    const leave = () => {
        const key = planAccessStorageKey(serverId);
        sessionStorage.removeItem(key); localStorage.removeItem(key);
        setRole(""); setPlan(null);
    };

    if (!role) return <PasswordGate serverId={serverId} password={password} setPassword={setPassword} remember={remember} setRemember={setRemember} checking={checking} enter={enter} />;
    if (loadError) return <div className="plan-page"><div className="alert alert-danger">{loadError}</div><button className="btn btn-outline-secondary" onClick={leave}>나가기</button></div>;
    if (!plan) return <div className="plan-page"><div className="plan-loading">계획을 불러오는 중...</div></div>;

    return <PlanBoard plan={plan} archives={archives} serverId={serverId} role={role} leave={leave} />;
}

function PasswordGate({ serverId, password, setPassword, remember, setRemember, checking, enter }) {
    const { t } = useTranslation("plan");
    return <div className="plan-page plan-gate">
        <form className="plan-card plan-gate-card" onSubmit={enter}>
            <span className="plan-kicker">PRIVATE BATTLE PLAN</span>
            <h1>{t("auth.title", { server: serverId || "-" })}</h1>
            <p>{t("auth.help")}</p>
            <input autoFocus type="password" className="form-control form-control-lg" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" />
            <label className="plan-check"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> {t("auth.remember")}</label>
            <button className="btn btn-primary btn-lg w-100" disabled={checking || !password}>{checking ? t("auth.checking") : t("auth.enter")}</button>
        </form>
    </div>;
}

function PlanBoard({ plan, archives, serverId, role, leave }) {
    const { t, i18n } = useTranslation("plan");
    const admin = role === "admin";
    const roster = useMemo(() => Array.isArray(plan.roster) ? plan.roster : [], [plan.roster]);
    const items = useMemo(() => [...(plan.items || [])].sort((a, b) => Number(a.order) - Number(b.order)), [plan.items]);
    const responses = useMemo(() => plan.responses || {}, [plan.responses]);
    const assignments = useMemo(() => plan.assignments || {}, [plan.assignments]);
    const [voteSearch, setVoteSearch] = useState("");
    const [selectedVoter, setSelectedVoter] = useState("");
    const [manualVote, setManualVote] = useState(false);
    const [manualVoter, setManualVoter] = useState({ uid: "", nickname: "" });
    const [adminSearch, setAdminSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [selected, setSelected] = useState(() => new Set());
    const [assignmentTargets, setAssignmentTargets] = useState(() => new Set());
    const [bulkStatus, setBulkStatus] = useState("attending");
    const [autoTargets, setAutoTargets] = useState(() => new Set());
    const [powerRange, setPowerRange] = useState({ min: "", max: "" });
    const [showAdvancedSelection, setShowAdvancedSelection] = useState(false);
    const [bulkMode, setBulkMode] = useState("");
    const [editingItemId, setEditingItemId] = useState("");
    const [itemDraft, setItemDraft] = useState({ title: "", status: "", memo: "", color: "#f59e0b", capacity: "" });
    const [showHistory, setShowHistory] = useState(false);
    const [contentTranslation, setContentTranslation] = useState(null);
    const [translating, setTranslating] = useState(false);
    const itemElements = useRef(new Map());
    const planRef = useMemo(() => doc(db, "plans", serverId), [serverId]);
    const targetLanguage = translationLanguages.find(language => language.code === i18n.language);
    const translatedItems = contentTranslation?.items || {};
    const shownTitle = contentTranslation?.title || plan.title;
    const shownDescription = contentTranslation?.description || plan.description;
    const statusLabel = status => t(`stats.${status === "attending" ? "attending" : status === "absent" ? "absent" : "unanswered"}`);
    const myAssignedItems = useMemo(() => selectedVoter ? items.filter(item => (assignments[item.id] || []).includes(selectedVoter)) : [], [assignments, items, selectedVoter]);

    useEffect(() => {
        setContentTranslation(current => current?.revision === (plan.contentRevision || 1) ? current : null);
    }, [plan.contentRevision]);

    useEffect(() => { setContentTranslation(null); }, [i18n.language]);

    useEffect(() => {
        if (admin || !selectedVoter || !myAssignedItems.length) return;
        myAssignedItems.forEach(item => { const element = itemElements.current.get(item.id); if (element) element.open = true; });
        const first = itemElements.current.get(myAssignedItems[0].id);
        window.requestAnimationFrame(() => first?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }, [admin, myAssignedItems, selectedVoter]);

    const translatePlan = async () => {
        if (!targetLanguage) return;
        setTranslating(true);
        try {
            const texts = { title: plan.title || "", description: plan.description || "" };
            items.forEach(item => { texts[`item.${item.id}.title`] = item.title || ""; texts[`item.${item.id}.status`] = item.status || ""; texts[`item.${item.id}.memo`] = item.memo || ""; });
            const cached = await getPlanTranslationCache(targetLanguage.code, texts);
            const translated = cached || await translateTexts(texts, targetLanguage);
            if (!cached) await setPlanTranslationCache(targetLanguage.code, texts, translated);
            setContentTranslation({
                revision: plan.contentRevision || 1,
                title: translated.title,
                description: translated.description,
                items: Object.fromEntries(items.map(item => [item.id, { title: translated[`item.${item.id}.title`], status: translated[`item.${item.id}.status`], memo: translated[`item.${item.id}.memo`] }])),
            });
        } catch (error) { console.error(error); toast.error("번역하지 못했습니다."); }
        finally { setTranslating(false); }
    };

    const transact = async updater => {
        try {
            await runTransaction(db, async transaction => {
                const snapshot = await transaction.get(planRef);
                if (!snapshot.exists()) throw new Error("계획이 없습니다.");
                transaction.update(planRef, { ...updater(snapshot.data()), updatedAt: new Date() });
            });
            return true;
        } catch (error) { console.error(error); toast.error(error.message || "저장하지 못했습니다."); return false; }
    };

    const voteResults = useMemo(() => roster.filter(player => matchesPlanPlayer(player, voteSearch)).slice(0, 20), [roster, voteSearch]);
    const castResponse = async status => {
        const manualUid = manualVoter.uid.trim();
        const uid = manualVote ? manualUid : selectedVoter;
        if (plan.status === "paused") return toast.error("종료된 계획에는 응답할 수 없습니다.");
        if (!manualVote && !uid) return toast.error("명단에서 본인을 선택하세요.");
        if (manualVote && (!/^\d+$/.test(manualUid) || !manualVoter.nickname.trim())) return toast.error("UID와 닉네임을 입력하세요.");
        const saved = await transact(data => {
            const exists = (data.roster || []).some(player => player.uid === uid);
            return {
                roster: manualVote && !exists ? [...(data.roster || []), { uid, nickname: manualVoter.nickname.trim(), power: 0, allianceId: "", allianceTag: "", allianceName: "", source: "user-manual" }] : (data.roster || []),
                responses: { ...(data.responses || {}), [uid]: { status, updatedAt: Date.now() } },
            };
        });
        if (saved) { toast.success("응답을 저장했습니다."); setSelectedVoter(uid); setManualVote(false); setVoteSearch(manualVoter.nickname || voteSearch); }
    };

    const changePlanState = async nextStatus => {
        const label = nextStatus === "paused" ? "종료" : "재개";
        if (!window.confirm(`이 계획을 ${label}할까요?`)) return;
        const saved = await transact(data => ({
            status: nextStatus,
            endedAt: nextStatus === "paused" ? new Date() : null,
            history: [...(data.history || []), { action: nextStatus === "paused" ? "paused" : "resumed", at: Date.now() }],
        }));
        if (saved) toast.success(`계획을 ${label}했습니다.`);
    };

    const counts = useMemo(() => roster.reduce((result, player) => {
        const status = responses[player.uid]?.status || "unanswered";
        result[status] += 1;
        if (status === "attending" && assignedItemIds(assignments, player.uid).length === 0) result.unassigned += 1;
        return result;
    }, { attending: 0, absent: 0, unanswered: 0, unassigned: 0 }), [roster, responses, assignments]);

    const visibleRoster = useMemo(() => roster.filter(player => {
        if (!matchesPlanPlayer(player, adminSearch)) return false;
        const status = responses[player.uid]?.status || "unanswered";
        const assigned = assignedItemIds(assignments, player.uid).length > 0;
        if (filter === "unassigned") return status === "attending" && !assigned;
        if (filter === "assigned") return assigned;
        if (filter === "conflict") return status === "absent" && assigned;
        return filter === "all" || status === filter;
    }).sort((a, b) => Number(b.power || 0) - Number(a.power || 0)), [roster, responses, assignments, adminSearch, filter]);

    const addItem = async () => {
        const title = window.prompt("새 항목 이름");
        if (!title?.trim()) return;
        const item = { id: crypto.randomUUID(), title: title.trim(), status: "", memo: "", color: "#f59e0b", capacity: null, order: items.length };
        await transact(data => ({ contentRevision: (data.contentRevision || 1) + 1, items: [...(data.items || []), item] }));
    };
    const startEditItem = item => {
        setEditingItemId(item.id);
        setItemDraft({ title: item.title || "", status: item.status || "", memo: item.memo || "", color: item.color || "#f59e0b", capacity: item.capacity || "" });
    };
    const saveItem = async item => {
        if (!itemDraft.title.trim()) return toast.error("항목 이름을 입력하세요.");
        const saved = await transact(data => ({ contentRevision: (data.contentRevision || 1) + 1, items: (data.items || []).map(current => current.id === item.id ? {
            ...current,
            title: itemDraft.title.trim(),
            status: itemDraft.status.trim(),
            memo: itemDraft.memo.trim(),
            capacity: cleanCapacity(itemDraft.capacity),
            color: /^#[0-9a-f]{6}$/i.test(itemDraft.color) ? itemDraft.color : current.color,
        } : current) }));
        if (saved) { setEditingItemId(""); toast.success("항목을 수정했습니다."); }
    };
    const moveItem = async (item, direction) => {
        const index = items.findIndex(current => current.id === item.id); const target = index + direction;
        if (target < 0 || target >= items.length) return;
        const reordered = [...items]; [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        await transact(() => ({ items: reordered.map((current, order) => ({ ...current, order })) }));
    };
    const deleteItem = async item => {
        if (!window.confirm(`'${item.title}' 항목과 배정을 삭제할까요?`)) return;
        await transact(data => { const next = { ...(data.assignments || {}) }; delete next[item.id]; return { contentRevision: (data.contentRevision || 1) + 1, items: (data.items || []).filter(current => current.id !== item.id), assignments: next }; });
    };

    const assignSelected = async () => {
        if (!assignmentTargets.size || !selected.size) return toast.error("사용자와 배정 항목을 선택하세요.");
        const targetIds = [...assignmentTargets];
        await transact(data => {
            const next = { ...(data.assignments || {}) };
            targetIds.forEach(itemId => {
                const current = [...new Set(next[itemId] || [])];
                next[itemId] = [...current, ...[...selected].filter(uid => !current.includes(uid))];
            });
            return { assignments: next };
        });
        toast.success(`${selected.size}명을 ${targetIds.length}개 항목에 배정했습니다.`);
        setSelected(new Set());
    };
    const selectAllRoster = () => setSelected(new Set(roster.map(player => player.uid)));
    const selectVisible = () => setSelected(current => new Set([...current, ...visibleRoster.map(player => player.uid)]));
    const deselectVisible = () => setSelected(current => {
        const next = new Set(current);
        visibleRoster.forEach(player => next.delete(player.uid));
        return next;
    });
    const selectPowerRange = () => {
        const minimum = powerRange.min === "" ? Number.NEGATIVE_INFINITY : Number(powerRange.min);
        const maximum = powerRange.max === "" ? Number.POSITIVE_INFINITY : Number(powerRange.max);
        if (!Number.isFinite(minimum) && minimum !== Number.NEGATIVE_INFINITY) return toast.error("최소 전투력을 확인하세요.");
        if (!Number.isFinite(maximum) && maximum !== Number.POSITIVE_INFINITY) return toast.error("최대 전투력을 확인하세요.");
        if (minimum > maximum) return toast.error("최소 전투력이 최대 전투력보다 큽니다.");
        const matched = visibleRoster.filter(player => {
            const powerInMillions = Number(player.power || 0) / 1_000_000;
            return powerInMillions >= minimum && powerInMillions <= maximum;
        });
        setSelected(current => new Set([...current, ...matched.map(player => player.uid)]));
        toast.info(`${matched.length}명을 선택했습니다.`);
    };
    const unassign = async (itemId, uid) => transact(data => ({ assignments: { ...(data.assignments || {}), [itemId]: (data.assignments?.[itemId] || []).filter(value => value !== uid) } }));

    const addManualPlayer = async () => {
        const uid = window.prompt("UID"); if (!/^\d+$/.test(uid || "")) return toast.error("숫자 UID를 입력하세요.");
        const nickname = window.prompt("닉네임"); if (!nickname?.trim()) return;
        await transact(data => {
            if ((data.roster || []).some(player => player.uid === uid)) throw new Error("이미 있는 UID입니다.");
            return { roster: [...(data.roster || []), { uid, nickname: nickname.trim(), power: 0, allianceId: "", allianceTag: "", allianceName: "", source: "manual" }] };
        });
    };
    const deletePlayer = async player => {
        if (!window.confirm(`${player.nickname}님을 명단에서 삭제할까요? 투표 결과는 유지됩니다.`)) return;
        await transact(data => ({
            roster: (data.roster || []).filter(current => current.uid !== player.uid),
            assignments: Object.fromEntries(Object.entries(data.assignments || {}).map(([id, uids]) => [id, (uids || []).filter(uid => uid !== player.uid)])),
        }));
    };
    const changePlayerResponse = async (player, status) => {
        const saved = await transact(data => {
            const next = { ...(data.responses || {}) };
            if (status === "unanswered") delete next[player.uid];
            else next[player.uid] = { status, updatedAt: Date.now(), changedByAdmin: true };
            return { responses: next };
        });
        if (saved) toast.success(`${player.nickname}님의 상태를 ${statusLabel(status)}으로 변경했습니다.`);
    };
    const changeSelectedResponses = async () => {
        if (!selected.size) return toast.error("상태를 변경할 인원을 선택하세요.");
        const selectedUids = [...selected];
        const saved = await transact(data => {
            const next = { ...(data.responses || {}) };
            selectedUids.forEach(uid => {
                if (bulkStatus === "unanswered") delete next[uid];
                else next[uid] = { status: bulkStatus, updatedAt: Date.now(), changedByAdmin: true };
            });
            return { responses: next };
        });
        if (saved) toast.success(`${selectedUids.length}명의 상태를 ${statusLabel(bulkStatus)}으로 변경했습니다.`);
    };

    const randomAssign = async () => {
        const targetIds = [...autoTargets];
        const candidates = shuffled(roster.filter(player => responses[player.uid]?.status === "attending" && assignedItemIds(assignments, player.uid).length === 0).map(player => player.uid));
        if (!targetIds.length || !candidates.length) return toast.info("배치할 항목 또는 참여·미배정 인원이 없습니다.");
        if (!window.confirm(`${candidates.length}명을 ${targetIds.length}개 항목에 균등 배치할까요?`)) return;
        await transact(data => {
            const next = Object.fromEntries(Object.entries(data.assignments || {}).map(([id, uids]) => [id, [...(uids || [])]]));
            const targets = targetIds.map(id => ({ item: (data.items || []).find(value => value.id === id), users: next[id] || [] })).filter(target => target.item);
            for (const uid of candidates) {
                const available = targets.filter(target => !target.item.capacity || target.users.length < target.item.capacity).sort((a, b) => a.users.length - b.users.length);
                if (!available.length) break;
                available[0].users.push(uid); next[available[0].item.id] = available[0].users;
            }
            return { assignments: next };
        });
    };

    const playerByUid = uid => roster.find(player => player.uid === uid) || { uid, nickname: "삭제된 사용자" };

    return <div className="plan-page">
        <header className="plan-heading">
            <div><span className="plan-kicker">SERVER {serverId}</span><h1>{shownTitle}</h1><p>{shownDescription}</p></div>
            <div className="plan-heading-actions"><span className={`badge text-bg-${plan.status === "paused" ? "secondary" : admin ? "warning" : "info"}`}>{plan.status === "paused" ? t("header.ended") : admin ? t("header.admin") : t("header.user")}</span>{(plan.sourceLanguage || "ko") !== i18n.language && (contentTranslation ? <button className="btn btn-sm btn-outline-primary" onClick={() => setContentTranslation(null)}>{t("header.original")}</button> : <button className="btn btn-sm btn-outline-primary" disabled={translating} onClick={translatePlan}>{translating ? t("header.translating") : t("header.translate", { language: targetLanguage?.name || i18n.language })}</button>)}<button className="btn btn-sm btn-outline-primary" onClick={() => setShowHistory(true)}>{t("header.history")}</button>{admin && <button className={`btn btn-sm ${plan.status === "paused" ? "btn-success" : "btn-outline-danger"}`} onClick={() => changePlanState(plan.status === "paused" ? "active" : "paused")}>{plan.status === "paused" ? t("header.resume") : t("header.end")}</button>}<button className="btn btn-sm btn-outline-secondary" onClick={leave}>{t("header.leave")}</button></div>
        </header>

        <section className="plan-stats">
            <Stat label={t("stats.all")} value={roster.length} /><Stat label={t("stats.attending")} value={counts.attending} tone="green" /><Stat label={t("stats.absent")} value={counts.absent} tone="red" /><Stat label={t("stats.unanswered")} value={counts.unanswered} /><Stat label={t("stats.unassigned")} value={counts.unassigned} tone="orange" />
        </section>

        {!admin && <section className="plan-card plan-vote">
            <div><h2>{t("vote.title")}</h2><p>{plan.status === "paused" ? t("vote.closed") : t("vote.help")}</p></div>
            <>
                {!manualVote && <><input className="form-control" placeholder={t("vote.search")} value={voteSearch} onChange={event => { setVoteSearch(event.target.value); setSelectedVoter(""); }} /><div className="plan-voter-buttons">{voteSearch && voteResults.map(player => <button key={player.uid} className={selectedVoter === player.uid ? "selected" : ""} onClick={() => { setSelectedVoter(player.uid); setVoteSearch(player.nickname); }}><b>{player.nickname}</b><span>{statusLabel(responses[player.uid]?.status)}</span></button>)}{plan.status !== "paused" && <button className="manual" onClick={() => { setManualVote(true); setSelectedVoter(""); }}>{t("vote.manual")}</button>}</div></>}
                {manualVote && <div className="plan-manual-voter"><input className="form-control" inputMode="numeric" placeholder={t("vote.uid")} value={manualVoter.uid} onChange={event => setManualVoter(current => ({ ...current, uid: event.target.value.replace(/\D/g, "") }))} /><input className="form-control" placeholder={t("vote.nickname")} value={manualVoter.nickname} onChange={event => setManualVoter(current => ({ ...current, nickname: event.target.value }))} /><button className="btn btn-outline-secondary" onClick={() => setManualVote(false)}>{t("vote.back")}</button></div>}
                {(selectedVoter || manualVote) && <div className="plan-vote-actions"><strong>{manualVote ? manualVoter.nickname || t("vote.manual") : playerByUid(selectedVoter).nickname}</strong>{plan.status !== "paused" && <><button className="btn btn-success" onClick={() => castResponse("attending")}>{t("vote.yes")}</button><button className="btn btn-outline-danger" onClick={() => castResponse("absent")}>{t("vote.no")}</button></>}</div>}
                {selectedVoter && <aside className={`plan-my-assignment ${myAssignedItems.length ? "assigned" : "unassigned"}`}><b>{myAssignedItems.length ? t("vote.myAssignment", { count: myAssignedItems.length }) : t("vote.notAssigned")}</b>{myAssignedItems.length > 0 && <div>{myAssignedItems.map(item => <button key={item.id} onClick={() => { const element = itemElements.current.get(item.id); if (element) { element.open = true; element.scrollIntoView({ behavior: "smooth", block: "center" }); } }}><span style={{ background: item.color }} />{translatedItems[item.id]?.title || item.title}</button>)}</div>}</aside>}
            </>
        </section>}

        {showHistory && <div className="plan-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowHistory(false); }}><section className="plan-history-modal" role="dialog" aria-modal="true" aria-labelledby="plan-history-title"><header><div><h2 id="plan-history-title">{t("history.title")}</h2><p>{t("history.help")}</p></div><button onClick={() => setShowHistory(false)} aria-label={t("history.close")}>×</button></header><div className="plan-history-scroll"><article className="plan-archive-row current"><span><b>{plan.title || t("history.untitled")}</b><small>{t("history.summary", { type: t("history.current"), attending: counts.attending, items: items.length })}</small></span><em>{plan.status === "paused" ? t("history.ended") : t("history.active")}</em></article>{archives.map(archive => <article className="plan-archive-row" key={archive.id}><span><b>{archive.title || t("history.untitled")}</b><small>{t("history.summary", { type: t("history.previous"), attending: Object.values(archive.responses || {}).filter(response => response.status === "attending").length, items: (archive.items || []).length })}</small></span><time>{archive.archivedAt?.toDate?.().toLocaleString(i18n.language) || t("history.archiving")}</time></article>)}{!archives.length && <p className="plan-history-empty">{t("history.empty")}</p>}{!!(plan.history || []).length && <details className="plan-lifecycle"><summary>{t("history.changes", { count: (plan.history || []).length })}</summary><div>{[...(plan.history || [])].reverse().map((entry, index) => <p key={`${entry.at}-${index}`}><b>{t(`history.actions.${entry.action === "created" ? "created" : entry.action === "paused" ? "paused" : "resumed"}`)}</b><time>{new Date(entry.at).toLocaleString(i18n.language)}</time></p>)}</div></details>}</div></section></div>}

        <section className="plan-section-head"><div><h2>{t("items.title")}</h2><p>{t("items.help")}</p></div>{admin && plan.status !== "paused" && <button className="btn btn-primary" onClick={addItem}>{t("items.add")}</button>}</section>
        <div className="plan-items">
            {items.length === 0 && <div className="plan-empty">{t("items.empty")}</div>}
            {items.map((item, index) => { const shownItem = translatedItems[item.id] || item; const includesSelectedVoter = !admin && selectedVoter && (assignments[item.id] || []).includes(selectedVoter); return <details ref={element => { if (element) itemElements.current.set(item.id, element); else itemElements.current.delete(item.id); }} className={`plan-item ${includesSelectedVoter ? "plan-item-mine" : ""}`} key={item.id}>
                <summary><span className="plan-color" style={{ background: item.color }} /><span className="plan-item-main"><b>{shownItem.title}</b><small>{[shownItem.status, shownItem.memo].filter(Boolean).join(" · ") || t("items.noMemo")}</small></span><span className="plan-count">{(assignments[item.id] || []).length}{item.capacity ? ` / ${item.capacity}` : "명"}</span></summary>
                <div className="plan-item-body">
                    {(assignments[item.id] || []).length === 0 ? <p className="text-muted">{t("items.none")}</p> : <div className="plan-assigned-list">{(assignments[item.id] || []).map(uid => { const player = playerByUid(uid); const status = responses[uid]?.status || "unanswered"; return <span key={uid} className={`plan-person status-${status} ${uid === selectedVoter && !admin ? "plan-person-me" : ""}`} title={`${player.nickname} · ${statusLabel(status)}`} aria-label={`${player.nickname}, ${statusLabel(status)}`}>{player.nickname}{uid === selectedVoter && !admin && <em>{t("vote.me")}</em>}{admin && <button onClick={() => unassign(item.id, uid)} aria-label={t("items.unassign", { name: player.nickname })}>×</button>}</span>; })}</div>}
                    {admin && plan.status !== "paused" && <>
                        <div className="plan-item-controls"><button onClick={() => moveItem(item, -1)} disabled={index === 0}>↑ 위로</button><button onClick={() => moveItem(item, 1)} disabled={index === items.length - 1}>↓ 아래로</button><button onClick={() => editingItemId === item.id ? setEditingItemId("") : startEditItem(item)}>{editingItemId === item.id ? "편집 닫기" : "상태·색상·메모 편집"}</button><button className="danger" onClick={() => deleteItem(item)}>삭제</button></div>
                        {editingItemId === item.id && <div className="plan-item-editor">
                            <label>항목 이름<input className="form-control" value={itemDraft.title} onChange={event => setItemDraft(current => ({ ...current, title: event.target.value }))} /></label>
                            <label>상태<input className="form-control" value={itemDraft.status} onChange={event => setItemDraft(current => ({ ...current, status: event.target.value }))} placeholder="예: 중요, 협상 완료, 협상 결렬" /></label>
                            <label className="plan-color-field">색상<span><input type="color" value={itemDraft.color} onChange={event => setItemDraft(current => ({ ...current, color: event.target.value }))} /><input className="form-control" value={itemDraft.color} onChange={event => setItemDraft(current => ({ ...current, color: event.target.value }))} /></span></label>
                            <label>정원<input className="form-control" type="number" min="1" value={itemDraft.capacity} onChange={event => setItemDraft(current => ({ ...current, capacity: event.target.value }))} placeholder="비워두면 제한 없음" /></label>
                            <label className="plan-editor-memo">메모<textarea className="form-control" rows="3" value={itemDraft.memo} onChange={event => setItemDraft(current => ({ ...current, memo: event.target.value }))} placeholder="구성원에게 표시할 작전 메모" /></label>
                            <div className="plan-editor-actions"><button className="btn btn-primary" onClick={() => saveItem(item)}>변경 저장</button><button className="btn btn-outline-secondary" onClick={() => setEditingItemId("")}>취소</button></div>
                        </div>}
                    </>}
                </div>
            </details>; })}
        </div>

        {admin && plan.status !== "paused" && <section className="plan-card plan-admin">
            <div className="plan-section-head"><div><h2>인원 배정</h2><p>검색과 상태 필터를 함께 사용할 수 있습니다.</p></div><button className="btn btn-outline-primary" onClick={addManualPlayer}>인원 직접 추가</button></div>
            <div className="plan-filters">
                {[["all", `전체 ${roster.length}`], ["attending", `참여 ${counts.attending}`], ["absent", `불참 ${counts.absent}`], ["unanswered", `미응답 ${counts.unanswered}`], ["unassigned", `참여·미배정 ${counts.unassigned}`], ["assigned", "배정됨"], ["conflict", "상태 충돌"]].map(([key, label]) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{label}</button>)}
            </div>
            <div className="plan-roster-search"><input className="form-control" placeholder="닉네임·초성·자모 검색 (여러 명은 쉼표로 구분)" value={adminSearch} onChange={event => setAdminSearch(event.target.value)} /><button className={`btn ${showAdvancedSelection ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => setShowAdvancedSelection(value => !value)}>고급 선택</button></div>
            <div className="plan-roster-tools"><span>{visibleRoster.length}명 표시</span><button onClick={selectVisible}>현재 결과 전체 선택</button><button onClick={deselectVisible}>현재 결과 선택 해제</button><button onClick={selectAllRoster}>전체 명단 선택</button></div>
            {showAdvancedSelection && <div className="plan-select-tools">
                <div className="plan-power-select">
                    <span>전투력 구간</span>
                    <input className="form-control form-control-sm" type="number" min="0" step="1" placeholder="최소 M" value={powerRange.min} onChange={event => setPowerRange(current => ({ ...current, min: event.target.value }))} />
                    <span>~</span>
                    <input className="form-control form-control-sm" type="number" min="0" step="1" placeholder="최대 M" value={powerRange.max} onChange={event => setPowerRange(current => ({ ...current, max: event.target.value }))} />
                    <button className="btn btn-sm btn-warning" onClick={selectPowerRange}>구간 선택</button>
                </div>
                <small>전투력 구간 선택은 현재 검색·상태 필터 결과에 적용되며 기존 선택은 유지됩니다.</small>
            </div>}
            <div className="plan-roster-list">{visibleRoster.map(player => { const status = responses[player.uid]?.status || "unanswered"; const assigned = assignedItemIds(assignments, player.uid); return <div className="plan-roster-row" key={player.uid}><input type="checkbox" aria-label={`${player.nickname} 선택`} checked={selected.has(player.uid)} onChange={event => setSelected(current => { const next = new Set(current); event.target.checked ? next.add(player.uid) : next.delete(player.uid); return next; })} /><span className="plan-roster-name"><b>{player.nickname}</b><small>CP {formatPower(player.power)}</small></span><select className={`form-select form-select-sm plan-status-select plan-status-${status}`} aria-label={`${player.nickname} 참여 상태`} value={status} onChange={event => changePlayerResponse(player, event.target.value)}><option value="attending">참여</option><option value="absent">불참</option><option value="unanswered">미응답</option></select><span className="plan-roster-assignments">{assigned.length ? assigned.map(id => items.find(item => item.id === id)?.title).filter(Boolean).join(", ") : "미배정"}{status === "absent" && assigned.length > 0 && <strong>상태 충돌</strong>}</span><button type="button" className="plan-delete-player" onClick={() => deletePlayer(player)}>삭제</button></div>; })}</div>
            {selected.size > 0 && <div className="plan-selection-bar">
                <div className="plan-selection-summary"><b>{selected.size}명 선택</b><button className={bulkMode === "status" ? "active" : ""} onClick={() => setBulkMode(mode => mode === "status" ? "" : "status")}>상태 변경</button><button className={bulkMode === "assignment" ? "active" : ""} onClick={() => setBulkMode(mode => mode === "assignment" ? "" : "assignment")}>항목 배정</button><button onClick={() => { setSelected(new Set()); setBulkMode(""); }}>선택 해제</button></div>
                {bulkMode === "status" && <div className="plan-selection-panel"><select className="form-select" value={bulkStatus} onChange={event => setBulkStatus(event.target.value)}><option value="attending">참여</option><option value="absent">불참</option><option value="unanswered">미응답</option></select><button className="btn btn-warning" onClick={changeSelectedResponses}>선택 인원 상태 변경</button></div>}
                {bulkMode === "assignment" && <div className="plan-selection-panel plan-bulk-targets"><div className="plan-target-heading"><span>배정할 항목 {assignmentTargets.size}개</span><button onClick={() => setAssignmentTargets(new Set(items.map(item => item.id)))}>전체 선택</button><button onClick={() => setAssignmentTargets(new Set())}>전체 해제</button></div><div className="plan-target-checks">{items.map(item => <label key={item.id}><input type="checkbox" checked={assignmentTargets.has(item.id)} onChange={event => setAssignmentTargets(current => { const next = new Set(current); event.target.checked ? next.add(item.id) : next.delete(item.id); return next; })} /> {item.title}</label>)}</div><button className="btn btn-primary" onClick={assignSelected} disabled={!assignmentTargets.size}>선택된 모든 항목에 배정</button></div>}
            </div>}
            <details className="plan-random-box"><summary>랜덤 균등 배치</summary><div className="plan-random-content"><p>참여로 응답하고 아직 배정되지 않은 인원을 선택 항목에 고르게 배치합니다.</p><div className="plan-target-heading"><span>배치할 항목 {autoTargets.size}개</span><button onClick={() => setAutoTargets(new Set(items.map(item => item.id)))}>전체 선택</button><button onClick={() => setAutoTargets(new Set())}>전체 해제</button></div><div className="plan-target-checks">{items.map(item => <label key={item.id}><input type="checkbox" checked={autoTargets.has(item.id)} onChange={event => setAutoTargets(current => { const next = new Set(current); event.target.checked ? next.add(item.id) : next.delete(item.id); return next; })} /> {item.title}</label>)}</div><button className="btn btn-warning" onClick={randomAssign} disabled={!autoTargets.size}>랜덤 균등 배치</button></div></details>
        </section>}
    </div>;
}

function Stat({ label, value, tone = "" }) {
    return <div className={`plan-stat ${tone}`}><span>{label}</span><b>{value}</b></div>;
}
