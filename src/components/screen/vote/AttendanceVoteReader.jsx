import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useFirebase } from "@src/hooks/useFirebase";
import useLocalStorage from "@src/hooks/useLocalStorage";
import { FaVoteYea } from "react-icons/fa";
import { FaGear, FaUsers, FaXmark } from "react-icons/fa6";
import { toast } from "react-toastify";
import { translateTexts, translationLanguages as languages, voteText } from "./voteTranslation";
import koreanViewer from "@src/locales/ko/viewer.json";
import FlagWithTooltip from "@src/components/template/FlagWithTooltip";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";

import "flag-icons/css/flag-icons.min.css";
import "./AttendanceVoteReader.css";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

function getChoicePlayers(choice) {
    if (Array.isArray(choice?.players)) return choice.players;
    if (choice?.players && typeof choice.players === "object") {
        return Object.values(choice.players);
    }
    return [];
}

export default function AttendanceVoteReader() {
    const { t: baseT } = useTranslation("viewer");
    const [translation, setTranslation] = useState(null);
    const t = (key) => translation?.texts[key] ?? baseT(key);
    const extraText = {
        manage: "이 투표 관리 페이지로 이동", voters: "투표한 사람 명단", people: "명",
        empty: "아직 투표한 사람이 없습니다.", mine: "내 투표", morale: "기합", urgent: "응시",
        original: "원문 보기", failed: "번역하지 못했습니다. 잠시 후 다시 시도해주세요.",
        notFound: "투표가 존재하지 않습니다.", closed: "관리자에 의해 마감이 완료된 투표입니다.",
        expired: "투표 기간이 종료되었습니다.", duplicate: "이미 해당 항목에 투표하셨습니다.",
        full: "선택한 항목의 정원이 가득 찼습니다.", voteFailed: "투표 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
    };
    const label = (key) => translation?.texts[`ui.${key}`] ?? extraText[key];
    const { voteId } = useParams();

    const [uuid, setUuid] = useState(voteId);
    const [vote, setVote] = useState(null);
    const requestRef = useRef(null);
    const sourceRef = useRef("");
    const [reload, setReload] = useState(0);
    const source = voteText(vote);
    const voteTranslated = useMemo(() => {
        if (!vote) return null;
        if (translation?.source !== voteText(vote)) return vote;
        return { ...vote, title: translation.texts["vote.title"], choices: vote.choices.map((choice, index) => ({
            ...choice, content: translation.texts[`vote.choice.${index}`],
        })) };
    }, [vote, translation]);

    const { getVote, castVote } = useFirebase();

    const [translateLoading, setTranslateLoading] = useState(false);

    useEffect(() => {
        requestRef.current?.abort();
        requestRef.current = null;
        setTranslateLoading(false);
        setTranslation(null);
        setVote(null);
        setChoiceNo(null);
        sourceRef.current = "";
        const unsubscribe = uuid ? getVote(uuid, (data) => {
            const nextSource = voteText(data);
            if (nextSource !== sourceRef.current) {
                requestRef.current?.abort();
                requestRef.current = null;
                setTranslateLoading(false);
                setTranslation(null);
                setChoiceNo(null);
                sourceRef.current = nextSource;
            }
            setVote(data);
            if (!data) toast.error(baseT("AttendanceVoteReader.message-notfound"));
        }) : undefined;
        return () => {
            unsubscribe?.();
            requestRef.current?.abort();
            requestRef.current = null;
        };
    }, [uuid, reload, getVote, baseT]);
    const loadVote = () => setReload(value => value + 1);

    const [choiceNo, setChoiceNo] = useState(null);

    const [userInfo, setUserInfo] = useLocalStorage("vote-user-info", {
        nickname: "",
        cp: 0,
        job: "CE",
        skill: 10
    });

    const changeUserStrInfo = useCallback(e => {
        const { name, value } = e.target;
        setUserInfo(prev => ({
            ...prev,
            [name]: value,
            ...(name === "job" ? {
                skill: Math.min(
                    Number(prev.skill ?? 0),
                    value === "CE" ? 10 : 5
                )
            } : {})
        }))
    }, [setUserInfo]);
    const changeUserNumberInfo = useCallback(e => {
        const { name, value } = e.target;
        const replacement = value.replace(/[^0-9]/g, "");
        const number = replacement.length === 0 ? "" : parseInt(replacement);
        setUserInfo(prev => ({ ...prev, [name]: number }))
    }, [setUserInfo]);

    const writeUserInfoComplete = useMemo(() => {
        if (userInfo.nickname.trim().length === 0) return false;
        if (userInfo.cp === "") return false;
        return true;
    }, [userInfo]);

    const submitVote = async () => {
        if (writeUserInfoComplete === false) return toast.error(t("AttendanceVoteReader.message-require-info"));

        const success = await castVote(uuid, choiceNo, userInfo, (error) => {
            const key = Object.keys(extraText).find(key => extraText[key] === error);
            toast.error(label(key ?? "voteFailed"));
        });
        if (success) {
            toast.success(t("AttendanceVoteReader.message-complete"));
        }
    };

    // 투표 마감 상태 계산
    const isVoteExpired = useMemo(() => {
        if (!vote) return false;
        if (vote.closed) return true; // 수동 마감
        if (vote.expiresAt) {
            return new Date() > vote.expiresAt.toDate(); // 시간 만료
        }
        return false;
    }, [vote]);

    const translateVote = async (language) => {
        if (!vote) return;
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setTranslateLoading(true);
        const texts = {
            ...Object.fromEntries(Object.entries(koreanViewer.AttendanceVoteReader).map(([key, value]) => [`AttendanceVoteReader.${key}`, value])),
            ...Object.fromEntries(Object.entries(extraText).map(([key, value]) => [`ui.${key}`, value])),
            "vote.title": vote.title ?? "",
            ...Object.fromEntries(vote.choices.map((choice, index) => [`vote.choice.${index}`, choice.content ?? ""])),
        };
        const timeout = setTimeout(() => controller.abort(), 120000);
        try {
            const translated = await translateTexts(texts, language, controller.signal);
            if (!controller.signal.aborted && sourceRef.current === source) {
                setTranslation({ source, language: language.code, texts: translated });
            }
        } catch {
            if (requestRef.current === controller && sourceRef.current === source) toast.error(label("failed"));
        } finally {
            clearTimeout(timeout);
            if (requestRef.current === controller) setTranslateLoading(false);
        }
    };

    const totalCount = useMemo(()=>{
        if(vote === null) return 0;
        return vote.choices.reduce((acc, cur)=>acc + cur.currentCount, 0);
    }, [vote]);

    return (<>
        {/* 검색대상 제외 */}
        <Helmet>
            <meta name="robots" content="noindex, follow" />
        </Helmet>


        <h1>{t(`AttendanceVoteReader.title`)}</h1>

        <hr />

        <div className="row mt-4">
            <label className="col-form-label col-sm-3">{t(`AttendanceVoteReader.id-label`)}</label>
            <div className="col d-flex align-items-center">
                <input type="text" className="form-control w-auto flex-grow-1" placeholder={t(`AttendanceVoteReader.id-placeholder`)}
                    value={uuid} onChange={e => setUuid(e.target.value)} />
                <button className="btn btn-primary ms-2" onClick={loadVote}>{t(`AttendanceVoteReader.id-load-btn`)}</button>
            </div>
        </div>
        {String(uuid ?? "").trim() !== "" && (
            <div className="row mt-2">
                <div className="offset-sm-3 col-sm-9">
                    <LanguageRouterLink
                        className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
                        to={`/vote/manage/${encodeURIComponent(String(uuid).trim())}`}
                    >
                        <FaGear />
                        <span>{label("manage")}</span>
                    </LanguageRouterLink>
                </div>
            </div>
        )}
        <hr />
        <div className="row mt-4">
            <div className="col">
                <h3>{t("AttendanceVoteReader.myinfo-title")}</h3>
            </div>
        </div>
        <div className="row mt-1">
            <label className="col-form-label col-sm-3">{t("AttendanceVoteReader.myinfo-nickname")}</label>
            <div className="col-sm-9">
                <input type="text" className="form-control" placeholder={t("AttendanceVoteReader.myinfo-nickname-placeholder")}
                    name="nickname" value={userInfo.nickname} onChange={changeUserStrInfo} />
            </div>
        </div>
        <div className="row mt-1">
            <label className="col-form-label col-sm-3">{t("AttendanceVoteReader.myinfo-cp")}</label>
            <div className="col-sm-9">
                <input type="text" className="form-control" placeholder={t("AttendanceVoteReader.myinfo-cp-placeholder")}
                    name="cp" value={userInfo.cp} onChange={changeUserNumberInfo} />
            </div>
        </div>
        <div className="row mt-1">
            <label className="col-form-label col-sm-3">{t("AttendanceVoteReader.myinfo-job")}</label>
            <div className="col-sm-9">
                <select className="form-select" name="job" value={userInfo.job} onChange={changeUserStrInfo}>
                    <option value="CE">{t("AttendanceVoteReader.myinfo-job-ce")}</option>
                    <option value="MM">{t("AttendanceVoteReader.myinfo-job-mm")}</option>
                </select>
            </div>
        </div>
        <div className="row mt-1">
            <label className="col-form-label col-sm-3">{userInfo.job === "CE" ? t("AttendanceVoteReader.myinfo-morale") : t("AttendanceVoteReader.myinfo-urgent")}</label>
            <div className="col-sm-9">
                <select className="form-select" name="skill" value={userInfo.skill} onChange={changeUserNumberInfo}>
                    {Array.from({ length: userInfo.job === "CE" ? 11 : 6 }, (_, i) => userInfo.job === "CE" ? 10 - i : 5 - i).map(n => (
                        <option key={n} value={n}>{n}{t("AttendanceVoteReader.level")}</option>
                    ))}
                </select>
            </div>
        </div>

        {vote && (<>
                <div className="row mt-4">
                    <div className="col d-flex flex-wrap align-items-center gap-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => {
                            requestRef.current?.abort();
                            requestRef.current = null;
                            setTranslateLoading(false);
                            setTranslation(null);
                        }}>{label("original")}</button>
                        {languages.length === 0 ? (
                            <span className="shimmer-text">{t("AttendanceVoteReader.message-language-search")}<span className="dots"></span></span>
                        ) : (<>
                            {languages.map(language => (
                                <button type="button" key={language.code} className="btn btn-sm btn-outline-secondary"
                                    title={language.name} aria-label={language.name} aria-pressed={translation?.language === language.code}
                                    disabled={translateLoading} onClick={() => translateVote(language)}>
                                    <FlagWithTooltip lang={language} selected={translation?.language === language.code} />
                                    <span className="ms-1">{language.name}</span>
                                </button>
                            ))}
                        </>)}
                    </div>
                </div>
        </>)}

        {isVoteExpired ? (<>
            <hr />
            <div className="row mt-4">
                <div className="col">
                    <h3 className="text-danger">{t("AttendanceVoteReader.message-closed")}</h3>
                </div>
            </div>
        </>) : (<>
            {voteTranslated !== null && (<>
                <hr />
                <div className="row mt-4">
                    <div className="col">
                        <h3>
                            {translateLoading ? (
                                <span className="shimmer-text">{t("AttendanceVoteReader.message-translate")}<span className="dots"></span></span>
                            ) : (
                                <span>{voteTranslated.title}</span>
                            )}
                        </h3>
                    </div>
                </div>

                <ul className="list-group">
                    {voteTranslated.choices.map((choice, index) => {
                            // 현재 사용자가 이 항목에 투표했는지 확인
                            const isMyChoice = choice.players && Object.values(choice.players).some(
                                player => player.nickname === userInfo.nickname
                            );
                            return (
                                <li className="list-group-item position-relative" key={index}>
                                    <div className="d-flex align-items-center">
                                        <label>
                                            <input type="radio" name="choice" className="form-check-input me-2"
                                                checked={choiceNo === choice.no} onChange={() => setChoiceNo(choice.no)} />
                                            {translateLoading ? (
                                                <span className="shimmer-text">{t("AttendanceVoteReader.message-translate")}<span className="dots"></span></span>
                                            ) : (
                                                <span>{choice.content}</span>
                                            )}
                                        </label>

                                        {choice.limit === true ? (
                                            <span className="badge rounded-pill bg-danger ms-4">
                                                {choice.currentCount} / {choice.count}
                                            </span>
                                        ) : (<>
                                            <span className="badge rounded-pill bg-secondary ms-4">
                                                {t("AttendanceVoteReader.message-nolimit")}
                                            </span>
                                            {choice.currentCount > 0 && (
                                                <span className="ms-4 text-danger fw-bold">{choice.currentCount} {t("AttendanceVoteReader.message-countview")}</span>
                                            )}
                                        </>)}

                                        {isMyChoice && (
                                        <span className="badge bg-danger text-light ms-4 glow-effect">
                                            <FaVoteYea className="me-2" />
                                            <span>{t("AttendanceVoteReader.message-mychoice")}</span>
                                        </span>
                                        )}
                                    </div>
                                    <div className="position-absolute" style={
                                        {
                                            top:"90%", left:0, bottom:0, right:0, zIndex:0,
                                            background: "linear-gradient(90deg,rgba(131, 58, 180, 1) 0%, rgba(253, 29, 29, 1) 50%, rgba(252, 176, 69, 1) 100%)",
                                            width:`${totalCount ? choice.currentCount * 100 / totalCount : 0}%`
                                        }
                                    }></div>
                                </li>
                            )
                        })
                    }
                </ul>

                <div className="row mt-4">
                    <div className="col">
                        <button className={`btn ${choiceNo === null ? "btn-danger" : "btn-primary"} w-100 d-flex align-items-center justify-content-center fs-4 p-3`}
                            disabled={choiceNo === null} onClick={submitVote}>
                            {choiceNo === null ? (<>
                                <FaXmark className="me-2" />
                                <span>{t("AttendanceVoteReader.btn-need-choice")}</span>
                            </>) : (<>
                                <FaVoteYea className="me-2" />
                                <span>{t("AttendanceVoteReader.btn-vote")}</span>
                            </>)}
                        </button>
                    </div>
                </div>

                <section className="attendance-voters mt-3" aria-labelledby="attendance-voters-title">
                    <h4 id="attendance-voters-title" className="attendance-voters-title">
                        <FaUsers />
                        <span>{label("voters")}</span>
                        <span className="badge rounded-pill bg-secondary">{totalCount} {label("people")}</span>
                    </h4>
                    <div className="attendance-voter-groups">
                        {voteTranslated.choices.map((choice) => {
                            const players = [...getChoicePlayers(choice)].sort((a, b) => {
                                if (a.job === b.job) return Number(b.cp ?? 0) - Number(a.cp ?? 0);
                                return String(a.job ?? "").localeCompare(String(b.job ?? ""));
                            });

                            return (
                                <details className="attendance-voter-group" key={choice.no}>
                                    <summary>
                                        <span>{choice.content}</span>
                                        <strong>{players.length} {label("people")}</strong>
                                    </summary>
                                    {players.length === 0 ? (
                                        <p className="attendance-voter-empty">{label("empty")}</p>
                                    ) : (
                                        <ul className="attendance-voter-list">
                                            {players.map((player, playerIndex) => (
                                                <li
                                                    key={`${player.nickname}-${playerIndex}`}
                                                    className={
                                                        String(player.nickname ?? "").trim()
                                                        === String(userInfo.nickname ?? "").trim()
                                                            ? "is-current-user"
                                                            : ""
                                                    }
                                                >
                                                    <strong className="attendance-voter-name">
                                                        <span>{player.nickname}</span>
                                                        {String(player.nickname ?? "").trim()
                                                            === String(userInfo.nickname ?? "").trim() && (
                                                            <span className="badge rounded-pill bg-danger">{label("mine")}</span>
                                                        )}
                                                    </strong>
                                                    <span className={`badge rounded-pill ${player.job === "CE" ? "bg-primary" : "bg-success"}`}>
                                                        {player.job || "-"}
                                                    </span>
                                                    <span>{Number(player.cp ?? 0).toLocaleString()}M</span>
                                                    <span>{player.job === "CE" ? label("morale") : label("urgent")} {player.skill ?? "-"}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </details>
                            );
                        })}
                    </div>
                </section>

            </>)}
        </>)}

    </>)
}
