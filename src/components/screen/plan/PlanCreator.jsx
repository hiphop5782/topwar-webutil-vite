import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "@src/db/firebase";
import { loadRealPower } from "@src/services/topwarDataRepository";
import { buildRoster } from "@src/components/screen/vote/voteHistory";
import { hashPlanPassword } from "./planUtils";
import "./PlanViewer.css";

export default function PlanCreator() {
    const navigate = useNavigate();
    const { i18n, t } = useTranslation("plan");
    const [form, setForm] = useState({ serverId: "", minLevel: "80", title: "", description: "", viewerPassword: "", adminPassword: "" });
    const [players, setPlayers] = useState([]);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [saving, setSaving] = useState(false);
    const validServer = /^\d+$/.test(form.serverId);
    const validMinLevel = /^\d+$/.test(form.minLevel) && Number(form.minLevel) >= 1 && Number(form.minLevel) <= 80;
    const canSave = useMemo(() => validServer && validMinLevel && form.title.trim() && form.viewerPassword && form.adminPassword && players.length, [validServer, validMinLevel, form, players]);

    const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

    const loadRoster = async () => {
        if (!validServer) return toast.error("서버 번호를 입력하세요.");
        if (!validMinLevel) return toast.error("최소 레벨은 1~80 사이로 입력하세요.");
        setLoadingRoster(true);
        try {
            const data = await loadRealPower(String(Number(form.serverId)));
            const roster = buildRoster(data?.players, { serverId: String(Number(form.serverId)), targetScope: "server", minLevel: Number(form.minLevel) });
            setPlayers(roster);
            toast.success(`${roster.length}명의 명단을 불러왔습니다.`);
        } catch (error) {
            toast.error(error.message || "명단을 불러오지 못했습니다.");
        } finally {
            setLoadingRoster(false);
        }
    };

    const save = async event => {
        event.preventDefault();
        if (!canSave) return toast.error("필수 항목과 명단을 확인하세요.");
        if (form.viewerPassword === form.adminPassword) return toast.error("사용자와 관리자 비밀번호는 다르게 설정하세요.");
        setSaving(true);
        try {
            const serverId = String(Number(form.serverId));
            const planRef = doc(db, "plans", serverId);
            const existingPlan = await getDoc(planRef);
            if (existingPlan.exists() && !window.confirm("기존 계획을 이전 내역에 보관하고 새 계획을 시작할까요?")) return;
            const [viewerHash, adminHash] = await Promise.all([
                hashPlanPassword(form.viewerPassword),
                hashPlanPassword(form.adminPassword),
            ]);
            const accessVersion = Date.now();
            const batch = writeBatch(db);
            if (existingPlan.exists()) {
                const archiveId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
                batch.set(doc(db, "planArchives", serverId, "entries", archiveId), {
                    ...existingPlan.data(),
                    archiveId,
                    archivedAt: serverTimestamp(),
                    archiveStatus: "pending",
                });
            }
            batch.set(planRef, {
                schemaVersion: 1,
                serverId,
                sourceLanguage: i18n.language,
                contentRevision: 1,
                minLevel: Number(form.minLevel),
                title: form.title.trim(),
                description: form.description.trim(),
                roster: players,
                responses: {},
                items: [],
                assignments: {},
                status: "active",
                history: [{ action: "created", at: Date.now() }],
                accessVersion,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            batch.set(doc(db, "planAccess", serverId), { accessVersion, updatedAt: serverTimestamp() });
            batch.set(doc(db, "planAccess", serverId, "keys", viewerHash), { role: "viewer", accessVersion, createdAt: serverTimestamp() });
            batch.set(doc(db, "planAccess", serverId, "keys", adminHash), { role: "admin", accessVersion, createdAt: serverTimestamp() });
            await batch.commit();
            toast.success("계획을 생성했습니다.");
            navigate(`/${i18n.language}/plan/${serverId}`);
        } catch (error) {
            console.error(error);
            toast.error(error.message || "계획을 저장하지 못했습니다.");
        } finally {
            setSaving(false);
        }
    };

    return <div className="plan-page">
        <div className="plan-heading">
            <div><span className="plan-kicker">BATTLE PLAN</span><h1>{t("creator.title")}</h1></div>
        </div>
        <form className="plan-card plan-form" onSubmit={save}>
            <label>{t("creator.server")}<input className="form-control" inputMode="numeric" value={form.serverId} onChange={e => { update("serverId", e.target.value.replace(/\D/g, "")); setPlayers([]); }} placeholder="3223" /></label>
            <label>{t("creator.minLevel")}
                <input className="form-control" type="number" inputMode="numeric" min="1" max="80" value={form.minLevel} onChange={e => { update("minLevel", e.target.value.replace(/\D/g, "")); setPlayers([]); }} />
                <small className="text-muted">{t("creator.minLevelHelp")}</small>
            </label>
            <label>{t("creator.planTitle")}<input className="form-control" value={form.title} onChange={e => update("title", e.target.value)} /></label>
            <label>{t("creator.memo")}<textarea className="form-control" rows="3" value={form.description} onChange={e => update("description", e.target.value)} /></label>
            <div className="plan-form-grid">
                <label>{t("creator.viewerPassword")}<input type="password" className="form-control" value={form.viewerPassword} onChange={e => update("viewerPassword", e.target.value)} /></label>
                <label>{t("creator.adminPassword")}<input type="password" className="form-control" value={form.adminPassword} onChange={e => update("adminPassword", e.target.value)} /></label>
            </div>
            <div className="plan-roster-load">
                <button type="button" className="btn btn-outline-primary" onClick={loadRoster} disabled={loadingRoster}>{loadingRoster ? t("creator.loading") : t("creator.loadRoster")}</button>
                <span>{players.length ? `레벨 ${form.minLevel} 이상 ${players.length}명` : "최소 레벨을 확인한 뒤 명단을 불러오세요."}</span>
            </div>
            <button className="btn btn-primary btn-lg" disabled={!canSave || saving}>{saving ? t("creator.saving") : t("creator.create")}</button>
        </form>
    </div>;
}
