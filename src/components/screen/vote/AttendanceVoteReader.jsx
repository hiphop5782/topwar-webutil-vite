import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import ScreenErrorBoundary from "@src/components/error/ScreenErrorBoundary";
import { normalizeVoteDisplay, normalizeVoteUser, voteExpiry } from "./voteSafety";
import { useFirebase } from "@src/hooks/useFirebase";
import useLocalStorage from "@src/hooks/useLocalStorage";
import { FaVoteYea } from "react-icons/fa";
import { FaDownload, FaGlobe, FaMagnifyingGlass, FaUsers, FaXmark } from "react-icons/fa6";
import { toast } from "react-toastify";
import { translateTexts, translationLanguages as languages, voteText } from "./voteTranslation";
import { loadRealPower } from "@src/services/topwarDataRepository";
import { normalizeNicknameForSearch } from "@src/utils/normalizeNicknameForSearch";
import koreanViewer from "@src/locales/ko/viewer.json";
import FlagWithTooltip from "@src/components/template/FlagWithTooltip";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import "flag-icons/css/flag-icons.min.css";
import "./AttendanceVoteReader.css";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

import { choiceColor } from "./voteColors";
import { identityOf, sameVoter } from "./voteHistory";
import { loadVoteHistory, loadArchivedVote } from "@src/services/voteArchiveRepository";
const choicePlayers = choice => Array.isArray(choice?.players) ? choice.players : choice?.players && typeof choice.players === "object" ? Object.values(choice.players) : [];
const playerName = player => String(player?.nickname || player?.username || "").trim();
const playerCp = player => {
    if (player?.score != null || player?.power != null) return Number(player.score ?? player.power) / 1_000_000;
    const value = Number(player?.cp);
    if (!Number.isFinite(value)) return "";
    return player.cpUnit === "raw" ? value / 1_000_000 : player.cpUnit === "million" ? value : cpInMillions(value);
};
const byNickname = (a, b) => playerName(a).localeCompare(playerName(b), undefined, { sensitivity: "base", numeric: true });
const cpInMillions = value => {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return Math.abs(number) >= 1_000_000 ? number / 1_000_000 : number;
};
const byCpDescending = (a, b) => Number(playerCp(b) || 0) - Number(playerCp(a) || 0) || byNickname(a, b);
const formatCp = value => {
    const millions = Number.isFinite(Number(value)) ? Number(value) : null;
    return millions === null ? "-" : `${millions.toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
};

export default function AttendanceVoteReader() {
    const { pathname } = useLocation();
    return <ScreenErrorBoundary key={pathname}><VoteReader /></ScreenErrorBoundary>;
}

function VoteReader() {
    const { t: baseT } = useTranslation("viewer");
    const { voteId, serverId: routeServerId } = useParams();
    const { getVote, getVoteRoster, castVote } = useFirebase();
    const [uuid, setUuid] = useState(voteId || "");
    const [vote, setVote] = useState(null);
    const [translation, setTranslation] = useState(null);
    const [translateLoading, setTranslateLoading] = useState(false);
    const [choiceNo, setChoiceNo] = useState(null);
    const [reload, setReload] = useState(0);
    const [loadError, setLoadError] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const [roster, setRoster] = useState([]);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [rosterError, setRosterError] = useState(false);
    const [manualEntry, setManualEntry] = useState(false);
    const [nicknameQuery, setNicknameQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
    const [listMode, setListMode] = useState("nickname");
    const requestRef = useRef(null);
    const sourceRef = useRef("");
    const nicknamePickerRef = useRef(null);
    const extraText = {
        manage: "이 투표 관리 페이지로 이동", voters: "참여자 목록", people: "명", empty: "아직 투표한 사람이 없습니다.", mine: "내 투표",
        original: "원문 보기", failed: "번역하지 못했습니다. 잠시 후 다시 시도해주세요.", notFound: "투표가 존재하지 않습니다.",
        closed: "관리자에 의해 마감이 완료된 투표입니다.", expired: "투표 기간이 종료되었습니다.", duplicate: "이미 해당 항목에 투표하셨습니다.",
        full: "선택한 항목의 정원이 가득 찼습니다.", voteFailed: "투표 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        translateTitle: "다른 언어로 보기", translateHelp: "언어를 누르면 투표 내용과 화면 안내가 번역됩니다.", searchNickname: "조사된 닉네임 검색",
        searchHelp: "닉네임 일부를 입력하세요.", directInput: "직접 입력", selectFromData: "조사 명단에서 선택", noNickname: "일치하는 닉네임이 없습니다. 직접 입력을 이용해주세요.",
        loadingRoster: "서버 조사 명단을 불러오는 중입니다.", rosterFailed: "조사 명단을 불러오지 못했습니다. 직접 입력해주세요.", cp: "CP (기지 전투력, M)",
        nicknameView: "CP 높은 순", groupView: "선택 항목별", exportSheet: "Google 스프레드시트용 내보내기",
        exported: "CSV 파일을 만들었습니다. Google 스프레드시트에서 열 수 있습니다.",
        allianceOnly: "길드 전용 투표", rosterSnapshot: "생성 당시 대상 명단 기준", unverified: "명단 미확인",
        history: "서버 투표 내역", uid: "UID (게임 내 사용자 ID)", uidRequired: "UID를 입력하거나 조사 명단에서 닉네임을 선택하세요.",
        archivePending: "최종 종료되었습니다. GitHub 보관 작업을 기다리는 중이며 원본은 안전하게 유지됩니다.",
        legacyRoster: "생성 당시 대상 명단이 없는 과거 기록입니다. 정확한 미참여자는 확인할 수 없습니다.",
        eligiblePeople: "전체 대상", notVoted: "미참여",
        copyNames: "닉네임 복사", copiedNames: "닉네임이 복사되었습니다.", copyFailed: "복사하지 못했습니다. 다시 시도해주세요.", noNames: "복사할 닉네임이 없습니다.",
    };
    const t = key => translation?.texts[key] ?? baseT(key);
    const label = key => translation?.texts[`ui.${key}`] ?? extraText[key];
    const source = voteText(vote);
    const serverId = String(routeServerId || vote?.serverId || "").trim();
    const hasVote = Boolean(vote);
    const rosterSource = vote?.rosterSource;
    const archivedRoster = vote?.roster;
    const status = vote?.status;
    const [storedUserInfo, setStoredUserInfo] = useLocalStorage("vote-user-info", { nickname: "", cp: "" });
    const userInfo = useMemo(() => normalizeVoteUser(storedUserInfo), [storedUserInfo]);
    const setUserInfo = useCallback(update => setStoredUserInfo(previous => {
        const safe = normalizeVoteUser(previous);
        return normalizeVoteUser(typeof update === "function" ? update(safe) : update);
    }), [setStoredUserInfo]);

    const shownVote = useMemo(() => {
        if (!vote || translation?.source !== voteText(vote)) return vote;
        return { ...vote, title: translation.texts["vote.title"], choices: vote.choices.map((choice, index) => ({ ...choice, content: translation.texts[`vote.choice.${index}`] })) };
    }, [vote, translation]);

    useEffect(() => {
        let active = true;
        let generation = 0;
        const accept = (data, current) => {
            if (!active || generation !== current) return;
            const safeVote = normalizeVoteDisplay(data);
            if (safeVote && routeServerId && String(safeVote.serverId) !== String(routeServerId)) throw new Error("다른 서버의 투표입니다.");
            const nextSource = voteText(safeVote);
            if (nextSource !== sourceRef.current) { requestRef.current?.abort(); setTranslateLoading(false); setTranslation(null); setChoiceNo(null); sourceRef.current = nextSource; }
            setLoadError(false); setVote(safeVote);
            if (!data) toast.error(baseT("AttendanceVoteReader.message-notfound"));
        };
        const archivedFallback = async current => {
            if (!routeServerId) return false;
            const index = await loadVoteHistory(routeServerId);
            const item = index.find(item => item.uuid === uuid);
            if (!item) return false;
            accept(await loadArchivedVote(item.archivePath, uuid), current);
            return true;
        };
        const onError = error => {
            const current = ++generation;
            console.error("투표 불러오기 실패", error);
            archivedFallback(current).then(found => { if (active && generation === current && !found) { setLoadError(true); setVote(null); } })
                .catch(() => { if (active && generation === current) { setLoadError(true); setVote(null); } });
        };
        requestRef.current?.abort(); setTranslateLoading(false); setTranslation(null); setVote(null); setChoiceNo(null); setLoadError(false); sourceRef.current = "";
        const unsubscribe = uuid ? getVote(uuid, data => {
            if (!active) return;
            const current = ++generation;
            try {
                if (!data && routeServerId) {
                    archivedFallback(current).then(found => { if (!found) accept(null, current); })
                        .catch(() => { if (active && generation === current) { setLoadError(true); setVote(null); } });
                } else accept(data, current);
            } catch (error) { onError(error); }
        }, onError) : undefined;
        return () => { active = false; unsubscribe?.(); requestRef.current?.abort(); };
    }, [uuid, routeServerId, reload, getVote, baseT]);

    useEffect(() => {
        if (!hasVote) { setRoster([]); return; }
        if (status === "archived") { setRoster(archivedRoster || []); setRosterLoading(false); setRosterError(false); return; }
        if (rosterSource === "snapshot") {
            let active = true;
            setRoster([]); setRosterLoading(true); setRosterError(false);
            getVoteRoster(uuid).then(players => { if (active) setRoster(players); })
                .catch(() => { if (active) setRosterError(true); })
                .finally(() => { if (active) setRosterLoading(false); });
            return () => { active = false; };
        }
        if (!serverId) { setRoster([]); return; }
        let active = true; setRosterLoading(true); setRosterError(false);
        loadRealPower(serverId).then(data => {
            if (!active) return;
            const unique = new Map();
            for (const rawPlayer of Array.isArray(data?.players) ? data.players : []) {
                if (!rawPlayer || !(Number(rawPlayer.level) >= 80)) continue;
                const player = { ...rawPlayer, ...normalizeVoteUser(rawPlayer) };
                const name = playerName(player);
                const key = identityOf(player);
                if (name && !unique.has(key)) unique.set(key, player);
            }
            const players = [...unique.values()];
            setRoster((vote?.targetScope === "alliance"
                ? players.filter(player => String(player.allianceId ?? "") === String(vote.allianceId ?? ""))
                : players).sort(byCpDescending));
        }).catch(() => { if (active) { setRoster([]); setRosterError(true); setManualEntry(true); } })
            .finally(() => { if (active) setRosterLoading(false); });
        return () => { active = false; };
    }, [serverId, vote?.targetScope, vote?.allianceId, rosterSource, status, archivedRoster, uuid, getVoteRoster, hasVote]);

    const suggestions = useMemo(() => {
        const query = normalizeNicknameForSearch(nicknameQuery);
        return roster.filter(player => !query || normalizeNicknameForSearch(playerName(player)).includes(query)).slice(0, 20);
    }, [nicknameQuery, roster]);

    useEffect(() => {
        const closeOnOutsideClick = event => {
            if (nicknamePickerRef.current && !nicknamePickerRef.current.contains(event.target)) {
                setShowSuggestions(false);
                setActiveSuggestionIndex(-1);
            }
        };
        document.addEventListener("pointerdown", closeOnOutsideClick);
        return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
    }, []);

    useEffect(() => {
        if (!showSuggestions || activeSuggestionIndex < 0) return;
        document.getElementById(`vote-nickname-option-${activeSuggestionIndex}`)?.scrollIntoView({ block: "nearest" });
    }, [showSuggestions, activeSuggestionIndex]);

    const handleNicknameKeyDown = event => {
        if (event.key === "Escape") {
            event.preventDefault();
            setShowSuggestions(false);
            setActiveSuggestionIndex(-1);
            return;
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter") return;
        if (!showSuggestions) {
            if (event.key === "Enter") return;
            setShowSuggestions(true);
        }
        if (suggestions.length === 0) return;
        event.preventDefault();
        if (event.key === "ArrowDown") setActiveSuggestionIndex(index => index >= suggestions.length - 1 ? 0 : index + 1);
        if (event.key === "ArrowUp") setActiveSuggestionIndex(index => index <= 0 ? suggestions.length - 1 : index - 1);
        if (event.key === "Enter") selectPlayer(suggestions[Math.max(0, activeSuggestionIndex)]);
    };
    const selectPlayer = useCallback(player => {
        const nickname = playerName(player);
        setUserInfo({ nickname, cp: playerCp(player), cpUnit: "million", allianceTag: player.allianceTag || "", allianceName: player.allianceName || "", uid: player.uid || "" });
        setNicknameQuery(nickname); setShowSuggestions(false); setActiveSuggestionIndex(-1);
    }, [setUserInfo]);

    const totalCount = useMemo(() => vote?.choices?.reduce((sum, choice) => sum + Number(choice.currentCount || 0), 0) || 0, [vote]);
    const participants = useMemo(() => (shownVote?.choices || []).flatMap((choice, index) => choicePlayers(choice).map(player => ({ ...player, choiceContent: choice.content, color: choiceColor(choice, index) }))), [shownVote]);
    const rosterKeys = useMemo(() => new Set(roster.map(identityOf)), [roster]);
    const rosterBoard = useMemo(() => {
        const all = new Map(roster.map(player => [identityOf(player), { ...player, voted: false }]));
        participants.forEach(player => {
            const matched = roster.find(member => sameVoter(member, player));
            const key = identityOf(matched || player);
            all.set(key, { ...(all.get(key) || {}), ...player, voted: true });
        });
        return [...all.values()].sort(byCpDescending);
    }, [roster, participants]);
    const isExpired = useMemo(() => vote?.closed || (vote?.expiresAt != null && new Date() > voteExpiry(vote.expiresAt)), [vote]);

    const submitVote = async () => {
        if (vote?.schemaVersion >= 2 && !/^\d+$/.test(userInfo.uid)) return toast.error(label("uidRequired"));
        if (submittingRef.current || loadError || !vote) return;
        if (!userInfo.nickname?.trim() || userInfo.cp === "" || choiceNo === null) return toast.error(t("AttendanceVoteReader.message-require-info"));
        submittingRef.current = true; setSubmitting(true);
        try {
            const success = await castVote(uuid, choiceNo, userInfo, error => {
                const key = Object.keys(extraText).find(item => extraText[item] === error); toast.error(label(key ?? "voteFailed"));
            });
            if (success) toast.success(t("AttendanceVoteReader.message-complete"));
        } catch (error) {
            console.error("투표 제출 실패", error);
            toast.error(label("voteFailed"));
        } finally { submittingRef.current = false; setSubmitting(false); }
    };

    const translateVote = async language => {
        if (!vote) return;
        requestRef.current?.abort(); const controller = new AbortController(); requestRef.current = controller; setTranslateLoading(true);
        const texts = { ...Object.fromEntries(Object.entries(koreanViewer.AttendanceVoteReader).map(([key, value]) => [`AttendanceVoteReader.${key}`, value])),
            ...Object.fromEntries(Object.entries(extraText).map(([key, value]) => [`ui.${key}`, value])), "vote.title": vote.title ?? "",
            ...Object.fromEntries(vote.choices.map((choice, index) => [`vote.choice.${index}`, choice.content ?? ""])) };
        const timeout = setTimeout(() => controller.abort(), 120000);
        try { const translated = await translateTexts(texts, language, controller.signal); if (!controller.signal.aborted && sourceRef.current === source) setTranslation({ source, language: language.code, texts: translated }); }
        catch { if (!controller.signal.aborted) toast.error(label("failed")); }
        finally { clearTimeout(timeout); if (requestRef.current === controller) setTranslateLoading(false); }
    };

    const copyNames = async players => {
        const text = [...players].sort(byCpDescending).map(playerName).filter(Boolean).join(",");
        if (!text) { toast.info(label("noNames")); return; }
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const previousFocus = document.activeElement;
                const input = document.createElement("textarea");
                input.value = text;
                input.style.cssText = "position:fixed;left:-9999px;top:0";
                document.body.appendChild(input);
                try {
                    input.select();
                    if (!document.execCommand("copy")) throw new Error("Clipboard copy failed");
                } finally { input.remove(); previousFocus?.focus(); }
            }
            toast.success(label("copiedNames"));
        } catch { toast.error(label("copyFailed")); }
    };

    const exportForSheets = () => {
        const escape = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
        const rows = [["UID", "닉네임", "CP (M)", "연맹", "참여 여부", "선택 항목"]];
        rosterBoard.forEach(player => rows.push([player.uid || "", playerName(player), playerCp(player) ?? "", player.allianceTag || player.allianceName || "", player.voted ? "참여" : "미참여", player.choiceContent || ""]));
        const blob = new Blob(["\ufeff" + rows.map(row => row.map(escape).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `vote-${serverId || "server"}-${uuid}.csv`; link.click(); URL.revokeObjectURL(link.href); toast.success(label("exported"));
    };

    return <>
        <Helmet><meta name="robots" content="noindex, follow" /></Helmet><h1>{t("AttendanceVoteReader.title")}</h1><hr />
        {serverId && <LanguageRouterLink className="btn btn-outline-primary mb-3" to={`/vote/cast/${serverId}`}>← {label("history")}</LanguageRouterLink>}
        {!voteId && <div className="row mt-4"><label className="col-form-label col-sm-3">{t("AttendanceVoteReader.id-label")}</label><div className="col d-flex"><input className="form-control" value={uuid} onChange={e => setUuid(e.target.value)} /><button className="btn btn-primary ms-2" onClick={() => setReload(value => value + 1)}>{t("AttendanceVoteReader.id-load-btn")}</button></div></div>}
        {loadError && <div className="alert alert-danger mt-3" role="alert">
            <p>투표 정보를 불러오지 못했습니다. 다시 불러온 뒤 참여자 목록에서 투표 반영 여부를 확인해 주세요.</p>
            <button type="button" className="btn btn-outline-danger" onClick={() => setReload(value => value + 1)}>다시 불러오기</button>
        </div>}
        {vote && <>
            {vote.status === "archiving" && <p className="alert alert-info">{label("archivePending")}</p>}
            {vote.status === "archived" && vote.rosterSource === "unavailable" && <p className="alert alert-warning">{label("legacyRoster")}</p>}
            {vote.targetScope === "alliance" && <div className="alert alert-primary d-flex justify-content-between align-items-center gap-2 flex-wrap">
                <strong>{label("allianceOnly")}: [{vote.allianceTag || "-"}] {vote.allianceName || vote.allianceId}</strong>
                <small>{label("rosterSnapshot")} · {roster.length} {label("people")}</small>
            </div>}
            <div className="vote-translation-card mt-3"><div className="vote-translation-heading"><FaGlobe /><div><strong>{label("translateTitle")}</strong><small>{label("translateHelp")}</small></div></div><div className="vote-translation-buttons">
                <button className="btn btn-sm btn-light" onClick={() => setTranslation(null)}>{label("original")}</button>
                {languages.map(language => <button type="button" key={language.code} className={`btn btn-sm ${translation?.language === language.code ? "btn-primary" : "btn-light"}`} disabled={translateLoading} onClick={() => translateVote(language)}><FlagWithTooltip lang={language} selected={translation?.language === language.code} /> <span>{language.name}</span></button>)}
                {translateLoading && <span className="shimmer-text">{t("AttendanceVoteReader.message-translate")}<span className="dots" /></span>}
            </div></div>
            {!isExpired && <section className="vote-profile-card mt-4"><div className="d-flex justify-content-between align-items-center gap-2 flex-wrap"><h3 className="m-0">{t("AttendanceVoteReader.myinfo-title")}</h3><button className="btn btn-sm btn-outline-secondary" onClick={() => setManualEntry(value => !value)}>{manualEntry ? label("selectFromData") : label("directInput")}</button></div>
                {manualEntry ? <><label className="form-label mt-3">{t("AttendanceVoteReader.myinfo-nickname")}</label><input className="form-control" value={userInfo.nickname || ""} onChange={e => setUserInfo(prev => ({ ...prev, nickname: e.target.value, uid: "", allianceTag: "", allianceName: "" }))} /><label className="form-label mt-3">{label("cp")}</label><input inputMode="numeric" className="form-control" value={userInfo.cp ?? ""} onChange={e => setUserInfo(prev => ({ ...prev, cp: e.target.value.replace(/[^0-9.]/g, ""), cpUnit: "million" }))} />{vote.targetScope === "alliance" && <small className="text-warning d-block mt-2">{label("unverified")}</small>}</> :
                <div className="vote-nickname-picker mt-3" ref={nicknamePickerRef}><label className="form-label">{label("searchNickname")}</label><div className="input-group"><span className="input-group-text"><FaMagnifyingGlass /></span><input className="form-control" role="combobox" aria-autocomplete="list" aria-expanded={showSuggestions} aria-controls="vote-nickname-results" aria-activedescendant={activeSuggestionIndex >= 0 ? `vote-nickname-option-${activeSuggestionIndex}` : undefined} placeholder={label("searchHelp")} value={nicknameQuery} onFocus={() => setShowSuggestions(true)} onKeyDown={handleNicknameKeyDown} onChange={e => { setNicknameQuery(e.target.value); setShowSuggestions(true); setActiveSuggestionIndex(-1); }} /></div>
                    {rosterLoading && <p className="text-muted mt-2 mb-0">{label("loadingRoster")}</p>}{rosterError && <p className="text-danger mt-2 mb-0">{label("rosterFailed")}</p>}
                    {showSuggestions && !rosterLoading && <div className="vote-nickname-results" id="vote-nickname-results" role="listbox">{suggestions.length ? suggestions.map((player, index) => <button type="button" role="option" aria-selected={activeSuggestionIndex === index} id={`vote-nickname-option-${index}`} className={activeSuggestionIndex === index ? "is-active" : ""} key={`${player.uid}-${playerName(player)}`} onMouseEnter={() => setActiveSuggestionIndex(index)} onClick={() => selectPlayer(player)}><strong>{playerName(player)}</strong><span>{label("cp")} {formatCp(playerCp(player))}</span><small>{player.allianceTag || player.allianceName || "-"}</small></button>) : <p>{label("noNickname")}</p>}</div>}
                    {userInfo.nickname && <div className="vote-selected-player"><strong>{userInfo.nickname}</strong><span>{label("cp")} {formatCp(playerCp(userInfo))}</span><span>{userInfo.allianceTag || userInfo.allianceName || ""}</span></div>}</div>}
                {manualEntry && <><label className="form-label mt-3">{label("uid")}{vote.schemaVersion >= 2 ? " *" : ""}</label><input className="form-control" inputMode="numeric" value={userInfo.uid} onChange={e => setUserInfo(prev => ({ ...prev, uid: e.target.value.replace(/[^0-9]/g, "") }))} /></>}
            </section>}
            <hr /><h3>{shownVote?.title}</h3>{isExpired ? <h3 className="text-danger">{t("AttendanceVoteReader.message-closed")}</h3> : <>
                <ul className="list-group">{shownVote.choices.map((choice, index) => { const mine = choicePlayers(choice).some(player => sameVoter(player, userInfo)); return <li className="list-group-item" key={choice.no} style={{ borderLeft: `5px solid ${choiceColor(choice, index)}` }}><label><input type="radio" className="form-check-input me-2" checked={choiceNo === choice.no} onChange={() => setChoiceNo(choice.no)} />{choice.content}</label><span className="badge bg-secondary ms-3">{choice.limit ? `${choice.currentCount} / ${choice.count}` : `${choice.currentCount} ${label("people")}`}</span>{mine && <span className="badge bg-danger ms-2"><FaVoteYea className="me-1" />{t("AttendanceVoteReader.message-mychoice")}</span>}</li>; })}</ul>
                <button className={`btn ${choiceNo === null ? "btn-danger" : "btn-primary"} w-100 fs-4 p-3 mt-4`} disabled={choiceNo === null || submitting} aria-busy={submitting} onClick={submitVote}>{submitting ? "투표 처리 중…" : choiceNo === null ? <><FaXmark className="me-2" />{t("AttendanceVoteReader.btn-need-choice")}</> : <><FaVoteYea className="me-2" />{t("AttendanceVoteReader.btn-vote")}</>}</button></>}
            <section className="attendance-voters mt-4"><div className="attendance-voters-toolbar"><h4 className="attendance-voters-title"><FaUsers />{label("voters")} <span className="badge bg-secondary">{totalCount} {label("people")}</span></h4><div className="btn-group btn-group-sm"><button className={`btn ${listMode === "nickname" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setListMode("nickname")}>{label("nicknameView")}</button><button className={`btn ${listMode === "group" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setListMode("group")}>{label("groupView")}</button></div></div>
                <div className="attendance-choice-counts">
                    <div className="attendance-choice-count is-total"><span>{label("eligiblePeople")}</span><strong>{rosterBoard.length} {label("people")}</strong></div>
                    {shownVote.choices.map((choice, index) => <button type="button" className="attendance-choice-count attendance-copy-target" key={choice.no} title={label("copyNames")} onClick={() => copyNames(choicePlayers(choice))} style={{ "--choice-color": choiceColor(choice, index) }}><span>{choice.content}</span><strong>{choice.currentCount || 0} {label("people")}</strong></button>)}
                    <div className="attendance-choice-count is-unvoted"><span>{label("notVoted")}</span><strong>{Math.max(0, rosterBoard.length - totalCount)} {label("people")}</strong></div>
                </div>
                {listMode === "nickname" ? <div className="attendance-roster-board">{rosterBoard.map((player, index) => <div className={`attendance-roster-name ${player.voted ? "has-voted" : ""}`} key={`${playerName(player)}-${index}`} style={player.voted ? { "--choice-color": player.color } : undefined} title={player.voted ? player.choiceContent : label("notVoted")}>
                    {player.voted && <span className="attendance-vote-dot" aria-hidden="true" />}<button type="button" className="attendance-copy-name" title={label("copyNames")} onClick={() => copyNames([player])}>{playerName(player)}</button>
                    {vote.targetScope === "alliance" && !rosterKeys.has(identityOf(player)) && <small>{label("unverified")}</small>}
                </div>)}</div> :
                <div className="attendance-voter-groups">{shownVote.choices.map((choice, index) => { const players = [...choicePlayers(choice)].sort(byCpDescending); return <details className="attendance-voter-group" open key={choice.no}><summary style={{ borderLeft: `5px solid ${choiceColor(choice, index)}` }}><button type="button" className="attendance-copy-name" title={label("copyNames")} onClick={event => { event.preventDefault(); copyNames(players); }}>{choice.content}</button><strong>{players.length} {label("people")}</strong></summary>{players.length ? <ul className="attendance-voter-list">{players.map((player, i) => <li key={`${playerName(player)}-${i}`}><strong><button type="button" className="attendance-copy-name" title={label("copyNames")} onClick={() => copyNames([player])}>{playerName(player)}</button></strong><span>CP {formatCp(playerCp(player))}</span><span>{player.allianceTag || player.allianceName || "-"}</span></li>)}</ul> : <p className="attendance-voter-empty">{label("empty")}</p>}</details>; })}</div>}
                <button className="btn btn-success w-100 mt-3" onClick={exportForSheets}><FaDownload className="me-2" />{label("exportSheet")}</button>
            </section><div className="mt-3 text-end"><LanguageRouterLink className="btn btn-sm btn-outline-secondary" to={routeServerId ? `/vote/${routeServerId}/${uuid}/manage` : `/vote/manage/${uuid}`}>{label("manage")}</LanguageRouterLink></div>
        </>}
    </>;
}
