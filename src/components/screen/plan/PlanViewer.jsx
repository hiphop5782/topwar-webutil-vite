import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query, runTransaction } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { FaGlobe } from "react-icons/fa6";
import { Helmet } from "react-helmet-async";
import { db } from "@src/db/firebase";
import { translateTexts, translationLanguages } from "@src/components/screen/vote/voteTranslation";
import FlagWithTooltip from "@src/components/template/FlagWithTooltip";
import { getPlanTranslationCache, setPlanTranslationCache } from "./planTranslationCache";
import "flag-icons/css/flag-icons.min.css";
import {
    assignedItemIds,
    hashPlanPassword,
    hasMultiplePlanSearchQueries,
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
    const { t } = useTranslation("plan");
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
            if (!snapshot.exists()) { setLoadError(t("auth.notFound")); setPlan(null); return; }
            setPlan({ id: snapshot.id, ...snapshot.data() });
        }, error => { console.error(error); setLoadError(t("auth.loadFailed")); });
        const unsubscribeArchives = onSnapshot(query(collection(db, "planArchives", serverId, "entries"), orderBy("archivedAt", "desc")), snapshot => {
            setArchives(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
        }, error => console.error("계획 이전 내역을 불러오지 못했습니다.", error));
        return () => { unsubscribePlan(); unsubscribeArchives(); };
    }, [role, serverId, t]);

    const enter = async event => {
        event.preventDefault();
        if (!password) return;
        setChecking(true);
        try {
            const hash = await hashPlanPassword(password);
            if (!await verifyHash(hash, remember)) return toast.error(t("auth.passwordMismatch"));
            setPassword("");
        } catch (error) {
            console.error(error); toast.error(t("auth.enterFailed"));
        } finally { setChecking(false); }
    };

    const leave = () => {
        const key = planAccessStorageKey(serverId);
        sessionStorage.removeItem(key); localStorage.removeItem(key);
        setRole(""); setPlan(null);
    };

    if (!role) return <PasswordGate serverId={serverId} password={password} setPassword={setPassword} remember={remember} setRemember={setRemember} checking={checking} enter={enter} />;
    if (loadError) return <div className="plan-page"><div className="alert alert-danger">{loadError}</div><button className="btn btn-outline-secondary" onClick={leave}>{t("header.leave")}</button></div>;
    if (!plan) return <div className="plan-page"><div className="plan-loading">{t("auth.loading")}</div></div>;

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
    const [editingPlan, setEditingPlan] = useState(false);
    const [planDraft, setPlanDraft] = useState({ title: "", description: "" });
    const [showHistory, setShowHistory] = useState(false);
    const [contentTranslation, setContentTranslation] = useState(null);
    const [translating, setTranslating] = useState(false);
    const itemElements = useRef(new Map());
    const planRef = useMemo(() => doc(db, "plans", serverId), [serverId]);
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

    const translatePlan = async language => {
        if (!language) return;
        setTranslating(true);
        try {
            const texts = { title: plan.title || "", description: plan.description || "" };
            items.forEach(item => { texts[`item.${item.id}.title`] = item.title || ""; texts[`item.${item.id}.status`] = item.status || ""; texts[`item.${item.id}.memo`] = item.memo || ""; });
            const cached = await getPlanTranslationCache(language.code, texts);
            const translated = cached || await translateTexts(texts, language);
            if (!cached) await setPlanTranslationCache(language.code, texts, translated);
            setContentTranslation({
                revision: plan.contentRevision || 1,
                language: language.code,
                title: translated.title,
                description: translated.description,
                items: Object.fromEntries(items.map(item => [item.id, { title: translated[`item.${item.id}.title`], status: translated[`item.${item.id}.status`], memo: translated[`item.${item.id}.memo`] }])),
            });
        } catch (error) { console.error(error); toast.error(t("translation.failed")); }
        finally { setTranslating(false); }
    };

    const transact = async updater => {
        try {
            await runTransaction(db, async transaction => {
                const snapshot = await transaction.get(planRef);
                if (!snapshot.exists()) throw new Error(t("messages.planMissing"));
                transaction.update(planRef, { ...updater(snapshot.data()), updatedAt: new Date() });
            });
            return true;
        } catch (error) { console.error(error); toast.error(error.message || t("messages.saveFailed")); return false; }
    };

    const voteResults = useMemo(() => {
        const matched = roster.filter(player => matchesPlanPlayer(player, voteSearch));
        return hasMultiplePlanSearchQueries(voteSearch) ? matched : matched.slice(0, 20);
    }, [roster, voteSearch]);
    const castResponse = async status => {
        const manualUid = manualVoter.uid.trim();
        const uid = manualVote ? manualUid : selectedVoter;
        if (plan.status === "paused") return toast.error(t("messages.closedVote"));
        if (!manualVote && !uid) return toast.error(t("messages.selectSelf"));
        if (manualVote && (!/^\d+$/.test(manualUid) || !manualVoter.nickname.trim())) return toast.error(t("messages.manualRequired"));
        const saved = await transact(data => {
            const exists = (data.roster || []).some(player => player.uid === uid);
            return {
                roster: manualVote && !exists ? [...(data.roster || []), { uid, nickname: manualVoter.nickname.trim(), power: 0, allianceId: "", allianceTag: "", allianceName: "", source: "user-manual" }] : (data.roster || []),
                responses: { ...(data.responses || {}), [uid]: { status, updatedAt: Date.now() } },
            };
        });
        if (saved) { toast.success(t("messages.responseSaved")); setSelectedVoter(uid); setManualVote(false); setVoteSearch(manualVoter.nickname || voteSearch); }
    };

    const changePlanState = async nextStatus => {
        const label = t(nextStatus === "paused" ? "messages.endAction" : "messages.resumeAction");
        if (!window.confirm(t("messages.stateConfirm", { action: label }))) return;
        const saved = await transact(data => ({
            status: nextStatus,
            endedAt: nextStatus === "paused" ? new Date() : null,
            history: [...(data.history || []), { action: nextStatus === "paused" ? "paused" : "resumed", at: Date.now() }],
        }));
        if (saved) toast.success(t("messages.stateChanged", { action: label }));
    };

    const startPlanEdit = () => {
        setPlanDraft({ title: plan.title || "", description: plan.description || "" });
        setEditingPlan(true);
    };

    const savePlanDetails = async () => {
        const title = planDraft.title.trim();
        if (!title) return toast.error(t("planEdit.titleRequired"));
        const saved = await transact(data => ({
            title,
            description: planDraft.description.trim(),
            contentRevision: (data.contentRevision || 1) + 1,
        }));
        if (saved) {
            setEditingPlan(false);
            toast.success(t("planEdit.saved"));
        }
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
        const title = window.prompt(t("messages.newItem"));
        if (!title?.trim()) return;
        const item = { id: crypto.randomUUID(), title: title.trim(), status: "", memo: "", color: "#f59e0b", capacity: null, order: items.length };
        await transact(data => ({ contentRevision: (data.contentRevision || 1) + 1, items: [...(data.items || []), item] }));
    };
    const startEditItem = item => {
        setEditingItemId(item.id);
        setItemDraft({ title: item.title || "", status: item.status || "", memo: item.memo || "", color: item.color || "#f59e0b", capacity: item.capacity || "" });
    };
    const saveItem = async item => {
        if (!itemDraft.title.trim()) return toast.error(t("messages.itemNameRequired"));
        const saved = await transact(data => ({ contentRevision: (data.contentRevision || 1) + 1, items: (data.items || []).map(current => current.id === item.id ? {
            ...current,
            title: itemDraft.title.trim(),
            status: itemDraft.status.trim(),
            memo: itemDraft.memo.trim(),
            capacity: cleanCapacity(itemDraft.capacity),
            color: /^#[0-9a-f]{6}$/i.test(itemDraft.color) ? itemDraft.color : current.color,
        } : current) }));
        if (saved) { setEditingItemId(""); toast.success(t("messages.itemSaved")); }
    };
    const moveItem = async (item, direction) => {
        const index = items.findIndex(current => current.id === item.id); const target = index + direction;
        if (target < 0 || target >= items.length) return;
        const reordered = [...items]; [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        await transact(() => ({ items: reordered.map((current, order) => ({ ...current, order })) }));
    };
    const deleteItem = async item => {
        if (!window.confirm(t("messages.itemDeleteConfirm", { title: item.title }))) return;
        await transact(data => { const next = { ...(data.assignments || {}) }; delete next[item.id]; return { contentRevision: (data.contentRevision || 1) + 1, items: (data.items || []).filter(current => current.id !== item.id), assignments: next }; });
    };

    const assignSelected = async () => {
        if (!assignmentTargets.size || !selected.size) return toast.error(t("messages.selectUsersAndItems"));
        const targetIds = [...assignmentTargets];
        await transact(data => {
            const next = { ...(data.assignments || {}) };
            targetIds.forEach(itemId => {
                const current = [...new Set(next[itemId] || [])];
                next[itemId] = [...current, ...[...selected].filter(uid => !current.includes(uid))];
            });
            return { assignments: next };
        });
        toast.success(t("messages.assignedUsers", { users: selected.size, items: targetIds.length }));
        setSelected(new Set());
    };
    const selectAllRoster = () => setSelected(new Set(roster.map(player => player.uid)));
    const selectVisible = () => setSelected(new Set(visibleRoster.map(player => player.uid)));
    const deselectVisible = () => setSelected(current => {
        const next = new Set(current);
        visibleRoster.forEach(player => next.delete(player.uid));
        return next;
    });
    const selectPowerRange = () => {
        const minimum = powerRange.min === "" ? Number.NEGATIVE_INFINITY : Number(powerRange.min);
        const maximum = powerRange.max === "" ? Number.POSITIVE_INFINITY : Number(powerRange.max);
        if (!Number.isFinite(minimum) && minimum !== Number.NEGATIVE_INFINITY) return toast.error(t("messages.minPowerInvalid"));
        if (!Number.isFinite(maximum) && maximum !== Number.POSITIVE_INFINITY) return toast.error(t("messages.maxPowerInvalid"));
        if (minimum > maximum) return toast.error(t("messages.powerOrderInvalid"));
        const matched = visibleRoster.filter(player => {
            const powerInMillions = Number(player.power || 0) / 1_000_000;
            return powerInMillions >= minimum && powerInMillions <= maximum;
        });
        setSelected(current => new Set([...current, ...matched.map(player => player.uid)]));
        toast.info(t("messages.usersSelected", { count: matched.length }));
    };
    const unassign = async (itemId, uid) => transact(data => ({ assignments: { ...(data.assignments || {}), [itemId]: (data.assignments?.[itemId] || []).filter(value => value !== uid) } }));

    const addManualPlayer = async () => {
        const uid = window.prompt(t("messages.uidPrompt")); if (!/^\d+$/.test(uid || "")) return toast.error(t("messages.numericUid"));
        const nickname = window.prompt(t("messages.nicknamePrompt")); if (!nickname?.trim()) return;
        await transact(data => {
            if ((data.roster || []).some(player => player.uid === uid)) throw new Error(t("messages.duplicateUid"));
            return { roster: [...(data.roster || []), { uid, nickname: nickname.trim(), power: 0, allianceId: "", allianceTag: "", allianceName: "", source: "manual" }] };
        });
    };
    const deletePlayer = async player => {
        if (!window.confirm(t("messages.deletePlayerConfirm", { name: player.nickname }))) return;
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
        if (saved) toast.success(t("messages.statusChanged", { name: player.nickname, status: statusLabel(status) }));
    };
    const changeSelectedResponses = async () => {
        if (!selected.size) return toast.error(t("messages.selectStatusUsers"));
        const selectedUids = [...selected];
        const saved = await transact(data => {
            const next = { ...(data.responses || {}) };
            selectedUids.forEach(uid => {
                if (bulkStatus === "unanswered") delete next[uid];
                else next[uid] = { status: bulkStatus, updatedAt: Date.now(), changedByAdmin: true };
            });
            return { responses: next };
        });
        if (saved) toast.success(t("messages.bulkStatusChanged", { count: selectedUids.length, status: statusLabel(bulkStatus) }));
    };

    const powerBalancedAssign = async () => {
        const targetIds = [...autoTargets];
        const candidates = roster.filter(player => responses[player.uid]?.status === "attending" && assignedItemIds(assignments, player.uid).length === 0).sort((a, b) => Number(b.power || 0) - Number(a.power || 0));
        if (!targetIds.length || !candidates.length) return toast.info(t("messages.noAutoTargets"));
        if (!window.confirm(t("messages.powerConfirm", { users: candidates.length, items: targetIds.length }))) return;
        const saved = await transact(data => {
            const next = Object.fromEntries(Object.entries(data.assignments || {}).map(([id, uids]) => [id, [...(uids || [])]]));
            const currentRoster = data.roster || [];
            const playerMap = new Map(currentRoster.map(player => [player.uid, player]));
            const currentAssignments = data.assignments || {};
            const currentCandidates = currentRoster.filter(player => data.responses?.[player.uid]?.status === "attending" && assignedItemIds(currentAssignments, player.uid).length === 0).sort((a, b) => Number(b.power || 0) - Number(a.power || 0));
            const targets = targetIds.map((id, order) => {
                const item = (data.items || []).find(value => value.id === id);
                const users = next[id] || [];
                return { item, users, order, totalPower: users.reduce((sum, uid) => sum + Number(playerMap.get(uid)?.power || 0), 0) };
            }).filter(target => target.item);
            for (const player of currentCandidates) {
                const available = targets.filter(target => !target.item.capacity || target.users.length < target.item.capacity).sort((a, b) => a.totalPower - b.totalPower || a.users.length - b.users.length || a.order - b.order);
                if (!available.length) break;
                available[0].users.push(player.uid);
                available[0].totalPower += Number(player.power || 0);
                next[available[0].item.id] = available[0].users;
            }
            return { assignments: next };
        });
        if (saved) toast.success(t("messages.powerDone", { count: candidates.length }));
    };
    const randomBalancedAssign = async () => {
        const targetIds = [...autoTargets];
        const candidates = roster.filter(player => responses[player.uid]?.status === "attending" && assignedItemIds(assignments, player.uid).length === 0);
        if (!targetIds.length || !candidates.length) return toast.info(t("messages.noAutoTargets"));
        if (!window.confirm(t("messages.randomConfirm", { users: candidates.length, items: targetIds.length }))) return;
        const saved = await transact(data => {
            const next = Object.fromEntries(Object.entries(data.assignments || {}).map(([id, uids]) => [id, [...(uids || [])]]));
            const currentAssignments = data.assignments || {};
            const currentCandidates = shuffled((data.roster || []).filter(player => data.responses?.[player.uid]?.status === "attending" && assignedItemIds(currentAssignments, player.uid).length === 0).map(player => player.uid));
            const targets = targetIds.map((id, order) => ({ item: (data.items || []).find(value => value.id === id), users: next[id] || [], order })).filter(target => target.item);
            for (const uid of currentCandidates) {
                const available = targets.filter(target => !target.item.capacity || target.users.length < target.item.capacity).sort((a, b) => a.users.length - b.users.length || a.order - b.order);
                if (!available.length) break;
                available[0].users.push(uid);
                next[available[0].item.id] = available[0].users;
            }
            return { assignments: next };
        });
        if (saved) toast.success(t("messages.randomDone", { count: candidates.length }));
    };

    const playerByUid = uid => roster.find(player => player.uid === uid) || { uid, nickname: t("messages.deletedUser") };
    const buildPlanExportText = () => {
        const unassignedAttendees = roster.filter(player => responses[player.uid]?.status === "attending" && assignedItemIds(assignments, player.uid).length === 0);
        const lines = [
            `[S${serverId}] ${plan.title || t("export.defaultTitle")}`,
            plan.description?.trim() || "",
            t("export.summary", { all: roster.length, attending: counts.attending, absent: counts.absent, unanswered: counts.unanswered }),
            "",
        ];

        items.forEach((item, index) => {
            const assigned = (assignments[item.id] || []).map(uid => playerByUid(uid).nickname);
            const itemMeta = [item.status?.trim(), t(item.capacity ? "export.capacityCount" : "export.count", { count: assigned.length, capacity: item.capacity })].filter(Boolean).join(" · ");
            lines.push(`${index + 1}. ${item.title}${itemMeta ? ` (${itemMeta})` : ""}`);
            if (item.memo?.trim()) lines.push(`   ${t("export.memo")}: ${item.memo.trim()}`);
            lines.push(`   ${t("export.assignment")}: ${assigned.length ? assigned.join(", ") : t("export.none")}`, "");
        });

        lines.push(t("export.unassigned", { count: unassignedAttendees.length }));
        lines.push(unassignedAttendees.length ? unassignedAttendees.map(player => player.nickname).join(", ") : t("export.none"));
        return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    };
    const copyPlanExport = async () => {
        const exportText = buildPlanExportText();
        try {
            await navigator.clipboard.writeText(exportText);
            toast.success(t("messages.copied"));
        } catch {
            const textarea = document.createElement("textarea");
            textarea.value = exportText;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            const copied = document.execCommand("copy");
            textarea.remove();
            copied ? toast.success(t("messages.copied")) : toast.error(t("messages.copyFailed"));
        }
    };
    const downloadPlanExport = () => {
        const blob = new Blob([`\uFEFF${buildPlanExportText()}`], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `S${serverId}-${(plan.title || "plan").replace(/[\\/:*?"<>|]/g, "-")}.txt`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        toast.success(t("messages.downloaded"));
    };

    return <div className="plan-page" aria-busy={translating}>
        <Helmet><title>{`${plan.title || t("auth.title", { server: serverId })} | Progamer.info`}</title></Helmet>
        <header className="plan-heading">
            <div><span className="plan-kicker">SERVER {serverId}</span><h1>{translating ? <span className="plan-text-skeleton plan-title-skeleton" aria-hidden="true" /> : shownTitle}</h1>{translating ? <p><span className="plan-text-skeleton plan-description-skeleton" aria-hidden="true" /></p> : <p>{shownDescription}</p>}</div>
            <div className="plan-heading-actions"><span className={`badge text-bg-${plan.status === "paused" ? "secondary" : admin ? "warning" : "info"}`}>{plan.status === "paused" ? t("header.ended") : admin ? t("header.admin") : t("header.user")}</span>{admin && plan.status !== "paused" && <button className={`btn btn-sm ${editingPlan ? "btn-secondary" : "btn-outline-primary"}`} onClick={() => editingPlan ? setEditingPlan(false) : startPlanEdit()}>{editingPlan ? t("planEdit.close") : t("planEdit.open")}</button>}<button className="btn btn-sm btn-outline-primary" onClick={() => setShowHistory(true)}>{t("header.history")}</button>{admin && <button className={`btn btn-sm ${plan.status === "paused" ? "btn-success" : "btn-outline-danger"}`} onClick={() => changePlanState(plan.status === "paused" ? "active" : "paused")}>{plan.status === "paused" ? t("header.resume") : t("header.end")}</button>}<button className="btn btn-sm btn-outline-secondary" onClick={leave}>{t("header.leave")}</button></div>
        </header>

        {admin && editingPlan && plan.status !== "paused" && <section className="plan-card plan-details-editor">
            <label>{t("planEdit.title")}<input className="form-control" value={planDraft.title} onChange={event => setPlanDraft(current => ({ ...current, title: event.target.value }))} /></label>
            <label>{t("planEdit.description")}<textarea className="form-control" rows="4" value={planDraft.description} onChange={event => setPlanDraft(current => ({ ...current, description: event.target.value }))} /></label>
            <div><button className="btn btn-primary" onClick={savePlanDetails}>{t("planEdit.save")}</button><button className="btn btn-outline-secondary" onClick={() => setEditingPlan(false)}>{t("planEdit.cancel")}</button></div>
        </section>}

        {!admin && <section className="plan-translation-card">
            <div className="plan-translation-heading"><FaGlobe /><div><strong>{t("translation.title")}</strong><small>{t("translation.help")}</small></div></div>
            <div className="plan-translation-buttons">
                <button type="button" className={`btn btn-sm ${contentTranslation ? "btn-light" : "btn-primary"}`} onClick={() => setContentTranslation(null)}>{t("translation.original")}</button>
                {translationLanguages.map(language => <button type="button" key={language.code} className={`btn btn-sm ${contentTranslation?.language === language.code ? "btn-primary" : "btn-light"}`} disabled={translating} onClick={() => translatePlan(language)}><FlagWithTooltip lang={language} selected={contentTranslation?.language === language.code} /> <span>{language.name}</span></button>)}
                {translating && <span className="plan-translation-loading" role="status" aria-live="polite"><span className="plan-translation-spinner" aria-hidden="true" />{t("translation.loading")}</span>}
            </div>
        </section>}

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

        <section className="plan-section-head"><div><h2>{t("items.title")}</h2><p>{t("items.help")}</p></div>{admin && <div className="plan-export-actions"><button className="btn btn-outline-primary" onClick={copyPlanExport}>{t("export.copy")}</button><button className="btn btn-outline-secondary" onClick={downloadPlanExport}>{t("export.save")}</button>{plan.status !== "paused" && <button className="btn btn-primary" onClick={addItem}>{t("items.add")}</button>}</div>}</section>
        <div className="plan-items">
            {items.length === 0 && <div className="plan-empty">{t("items.empty")}</div>}
            {items.map((item, index) => { const shownItem = translatedItems[item.id] || item; const includesSelectedVoter = !admin && selectedVoter && (assignments[item.id] || []).includes(selectedVoter); return <details ref={element => { if (element) itemElements.current.set(item.id, element); else itemElements.current.delete(item.id); }} className={`plan-item ${includesSelectedVoter ? "plan-item-mine" : ""}`} key={item.id}>
                <summary><span className="plan-color" style={{ background: item.color }} /><span className="plan-item-main"><b>{translating ? <span className="plan-text-skeleton plan-item-title-skeleton" aria-hidden="true" /> : shownItem.title}</b><small>{translating ? <span className="plan-text-skeleton plan-item-detail-skeleton" aria-hidden="true" /> : [shownItem.status, shownItem.memo].filter(Boolean).join(" · ") || t("items.noMemo")}</small></span>{includesSelectedVoter && <span className="plan-mine-badge">✓ {t("vote.assignedHere")}</span>}<span className="plan-count">{item.capacity ? t("export.capacityCount", { count: (assignments[item.id] || []).length, capacity: item.capacity }) : t("export.count", { count: (assignments[item.id] || []).length })}</span></summary>
                <div className="plan-item-body">
                    {(assignments[item.id] || []).length === 0 ? <p className="text-muted">{t("items.none")}</p> : <div className="plan-assigned-list">{(assignments[item.id] || []).map(uid => { const player = playerByUid(uid); const status = responses[uid]?.status || "unanswered"; return <span key={uid} className={`plan-person status-${status} ${uid === selectedVoter && !admin ? "plan-person-me" : ""}`} title={`${player.nickname} · ${statusLabel(status)}`} aria-label={`${player.nickname}, ${statusLabel(status)}`}>{player.nickname}{uid === selectedVoter && !admin && <em>{t("vote.me")}</em>}{admin && <button onClick={() => unassign(item.id, uid)} aria-label={t("items.unassign", { name: player.nickname })}>×</button>}</span>; })}</div>}
                    {admin && plan.status !== "paused" && <>
                        <div className="plan-item-controls"><button onClick={() => moveItem(item, -1)} disabled={index === 0}>↑ {t("itemEdit.moveUp")}</button><button onClick={() => moveItem(item, 1)} disabled={index === items.length - 1}>↓ {t("itemEdit.moveDown")}</button><button onClick={() => editingItemId === item.id ? setEditingItemId("") : startEditItem(item)}>{editingItemId === item.id ? t("itemEdit.close") : t("itemEdit.open")}</button><button className="danger" onClick={() => deleteItem(item)}>{t("itemEdit.delete")}</button></div>
                        {editingItemId === item.id && <div className="plan-item-editor">
                            <label>{t("itemEdit.name")}<input className="form-control" value={itemDraft.title} onChange={event => setItemDraft(current => ({ ...current, title: event.target.value }))} /></label>
                            <label>{t("itemEdit.status")}<input className="form-control" value={itemDraft.status} onChange={event => setItemDraft(current => ({ ...current, status: event.target.value }))} placeholder={t("itemEdit.statusPlaceholder")} /></label>
                            <label className="plan-color-field">{t("itemEdit.color")}<span><input type="color" value={itemDraft.color} onChange={event => setItemDraft(current => ({ ...current, color: event.target.value }))} /><input className="form-control" value={itemDraft.color} onChange={event => setItemDraft(current => ({ ...current, color: event.target.value }))} /></span></label>
                            <label>{t("itemEdit.capacity")}<input className="form-control" type="text" inputMode="numeric" min="1" value={itemDraft.capacity} onChange={event => setItemDraft(current => ({ ...current, capacity: event.target.value }))} placeholder={t("itemEdit.capacityPlaceholder")} /></label>
                            <label className="plan-editor-memo">{t("itemEdit.memo")}<textarea className="form-control" rows="3" value={itemDraft.memo} onChange={event => setItemDraft(current => ({ ...current, memo: event.target.value }))} placeholder={t("itemEdit.memoPlaceholder")} /></label>
                            <div className="plan-editor-actions"><button className="btn btn-primary" onClick={() => saveItem(item)}>{t("itemEdit.save")}</button><button className="btn btn-outline-secondary" onClick={() => setEditingItemId("")}>{t("itemEdit.cancel")}</button></div>
                        </div>}
                    </>}
                </div>
            </details>; })}
        </div>

        {admin && plan.status !== "paused" && <section className="plan-card plan-admin">
            <div className="plan-section-head"><div><h2>{t("admin.assignmentTitle")}</h2><p>{t("admin.assignmentHelp")}</p></div><button className="btn btn-outline-primary" onClick={addManualPlayer}>{t("admin.addPlayer")}</button></div>
            <div className="plan-filters">
                {[["all", `${t("stats.all")} ${roster.length}`], ["attending", `${t("stats.attending")} ${counts.attending}`], ["absent", `${t("stats.absent")} ${counts.absent}`], ["unanswered", `${t("stats.unanswered")} ${counts.unanswered}`], ["unassigned", `${t("stats.unassigned")} ${counts.unassigned}`], ["assigned", t("admin.assigned")], ["conflict", t("admin.conflict")]].map(([key, label]) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{label}</button>)}
            </div>
            <div className="plan-roster-search"><input className="form-control" placeholder={t("admin.search")} value={adminSearch} onPaste={() => { setSelected(new Set()); setBulkMode(""); }} onChange={event => { const value = event.target.value; setAdminSearch(value); if (hasMultiplePlanSearchQueries(value)) setFilter("all"); }} /><button className={`btn ${showAdvancedSelection ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => setShowAdvancedSelection(value => !value)}>{t("admin.advanced")}</button></div>
            <div className="plan-roster-tools"><span>{t("admin.shown", { count: visibleRoster.length })}</span><button onClick={selectVisible}>{t("admin.selectVisible")}</button><button onClick={deselectVisible}>{t("admin.deselectVisible")}</button><button onClick={selectAllRoster}>{t("admin.selectAllRoster")}</button></div>
            {showAdvancedSelection && <div className="plan-select-tools">
                <div className="plan-power-select">
                    <span>{t("admin.powerRange")}</span>
                    <input className="form-control form-control-sm" type="text" inputMode="numeric" min="0" step="1" placeholder={t("admin.minPower")} value={powerRange.min} onChange={event => setPowerRange(current => ({ ...current, min: event.target.value }))} />
                    <span>~</span>
                    <input className="form-control form-control-sm" type="text" inputMode="numeric" min="0" step="1" placeholder={t("admin.maxPower")} value={powerRange.max} onChange={event => setPowerRange(current => ({ ...current, max: event.target.value }))} />
                    <button className="btn btn-sm btn-warning" onClick={selectPowerRange}>{t("admin.selectRange")}</button>
                </div>
                <small>{t("admin.powerHelp")}</small>
            </div>}
            <div className="plan-roster-list">{visibleRoster.map(player => { const status = responses[player.uid]?.status || "unanswered"; const assigned = assignedItemIds(assignments, player.uid); return <div className="plan-roster-row" key={player.uid}><input type="checkbox" aria-label={t("admin.selectPlayer", { name: player.nickname })} checked={selected.has(player.uid)} onChange={event => setSelected(current => { const next = new Set(current); event.target.checked ? next.add(player.uid) : next.delete(player.uid); return next; })} /><span className="plan-roster-name"><b>{player.nickname}</b><small>CP {formatPower(player.power)}</small></span><select className={`form-select form-select-sm plan-status-select plan-status-${status}`} aria-label={t("admin.playerStatus", { name: player.nickname })} value={status} onChange={event => changePlayerResponse(player, event.target.value)}><option value="attending">{t("stats.attending")}</option><option value="absent">{t("stats.absent")}</option><option value="unanswered">{t("stats.unanswered")}</option></select><span className="plan-roster-assignments">{assigned.length ? assigned.map(id => items.find(item => item.id === id)?.title).filter(Boolean).join(", ") : t("admin.unassigned")}{status === "absent" && assigned.length > 0 && <strong>{t("admin.conflict")}</strong>}</span><button type="button" className="plan-delete-player" onClick={() => deletePlayer(player)}>{t("admin.delete")}</button></div>; })}</div>
            {selected.size > 0 && <div className="plan-selection-bar">
                <div className="plan-selection-summary"><b>{t("admin.selected", { count: selected.size })}</b><button className={bulkMode === "status" ? "active" : ""} onClick={() => setBulkMode(mode => mode === "status" ? "" : "status")}>{t("admin.changeStatus")}</button><button className={bulkMode === "assignment" ? "active" : ""} onClick={() => setBulkMode(mode => mode === "assignment" ? "" : "assignment")}>{t("admin.assignItem")}</button><button onClick={() => { setSelected(new Set()); setBulkMode(""); }}>{t("admin.clearSelection")}</button></div>
                {bulkMode === "status" && <div className="plan-selection-panel"><select className="form-select" value={bulkStatus} onChange={event => setBulkStatus(event.target.value)}><option value="attending">{t("stats.attending")}</option><option value="absent">{t("stats.absent")}</option><option value="unanswered">{t("stats.unanswered")}</option></select><button className="btn btn-warning" onClick={changeSelectedResponses}>{t("admin.applyStatus")}</button></div>}
                {bulkMode === "assignment" && <div className="plan-selection-panel plan-bulk-targets"><div className="plan-target-heading"><span>{t("admin.targetItems", { count: assignmentTargets.size })}</span><button onClick={() => setAssignmentTargets(new Set(items.map(item => item.id)))}>{t("admin.selectAll")}</button><button onClick={() => setAssignmentTargets(new Set())}>{t("admin.deselectAll")}</button></div><div className="plan-target-checks">{items.map(item => <label key={item.id}><input type="checkbox" checked={assignmentTargets.has(item.id)} onChange={event => setAssignmentTargets(current => { const next = new Set(current); event.target.checked ? next.add(item.id) : next.delete(item.id); return next; })} /> {item.title}</label>)}</div><button className="btn btn-primary" onClick={assignSelected} disabled={!assignmentTargets.size}>{t("admin.assignAll")}</button></div>}
            </div>}
            <details className="plan-balance-box"><summary>{t("admin.autoTitle")}</summary><div className="plan-balance-content"><p>{t("admin.autoHelp")}</p><div className="plan-target-heading"><span>{t("admin.autoTargets", { count: autoTargets.size })}</span><button onClick={() => setAutoTargets(new Set(items.map(item => item.id)))}>{t("admin.selectAll")}</button><button onClick={() => setAutoTargets(new Set())}>{t("admin.deselectAll")}</button></div><div className="plan-target-checks">{items.map(item => <label key={item.id}><input type="checkbox" checked={autoTargets.has(item.id)} onChange={event => setAutoTargets(current => { const next = new Set(current); event.target.checked ? next.add(item.id) : next.delete(item.id); return next; })} /> {item.title}</label>)}</div><div className="plan-balance-actions"><button className="btn btn-outline-warning" onClick={randomBalancedAssign} disabled={!autoTargets.size}>{t("admin.random")}</button><button className="btn btn-warning" onClick={powerBalancedAssign} disabled={!autoTargets.size}>{t("admin.powerBalanced")}</button></div></div></details>
        </section>}
    </div>;
}

function Stat({ label, value, tone = "" }) {
    return <div className={`plan-stat ${tone}`}><span>{label}</span><b>{value}</b></div>;
}
