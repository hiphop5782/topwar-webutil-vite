import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
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
    const { t, i18n } = useTranslation("viewer");
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
    const labels = {
        active: t("AttendanceVoteHistory.status.active"),
        paused: t("AttendanceVoteHistory.status.paused"),
        expired: t("AttendanceVoteHistory.status.expired"),
        archiving: t("AttendanceVoteHistory.status.archiving"),
        archived: t("AttendanceVoteHistory.status.archived"),
    };
    return <>
        <Helmet><meta name="robots" content="noindex, follow" /></Helmet>
        <div className="d-flex justify-content-between align-items-center gap-2"><h1>{t("AttendanceVoteHistory.title", { serverId })}</h1><button className="btn btn-outline-secondary" onClick={() => setAttempt(n => n + 1)}>{t("AttendanceVoteHistory.refresh")}</button></div>
        <p className="text-muted">{t("AttendanceVoteHistory.description")}</p>
        {(loading.live || loading.archive) && <p role="status">{t("AttendanceVoteHistory.loading")}</p>}
        {Object.keys(errors).length > 0 && <div className="alert alert-warning" role="alert">{errors.live && <p>{t("AttendanceVoteHistory.error.live")}</p>}{errors.archive && <p>{t("AttendanceVoteHistory.error.archive")}</p>}{t("AttendanceVoteHistory.error.summary")}</div>}
        {!loading.live && !loading.archive && !Object.keys(errors).length && !votes.length && <p>{t("AttendanceVoteHistory.empty")}</p>}
        <div className="d-grid gap-3">{votes.map(vote => {
            const state = voteState(vote, now);
            const active = state === "active";
            const participantCount = vote.totalCount ?? (vote.choices || []).reduce((n, c) => n + Number(c.currentCount || 0), 0);
            return <LanguageRouterLink key={vote.uuid} to={`/vote/cast/${serverId}/${encodeURIComponent(vote.uuid)}`}
                className={`card p-3 text-decoration-none ${active ? "border-primary border-2 bg-primary-subtle" : "text-body-secondary"}`} style={{ opacity: active ? 1 : 0.65 }}>
                <div className="d-flex justify-content-between gap-2"><h2 className="h5">{vote.title || t("AttendanceVoteHistory.untitled")}</h2><span className={`badge align-self-start ${active ? "bg-primary" : "bg-secondary"}`}>{labels[state]}</span></div>
                <strong>{vote.targetScope === "alliance"
                    ? t("AttendanceVoteHistory.scope.alliance", { allianceTag: vote.allianceTag || "-", allianceName: vote.allianceName || vote.allianceId })
                    : t("AttendanceVoteHistory.scope.server")}</strong>
                <small className="mt-2">{t("AttendanceVoteHistory.created", { date: new Date(dateMillis(vote.createdAt)).toLocaleString(i18n.resolvedLanguage || i18n.language) })} · {t("AttendanceVoteHistory.participants", { count: participantCount })}</small>
            </LanguageRouterLink>;
        })}</div>
    </>;
}
