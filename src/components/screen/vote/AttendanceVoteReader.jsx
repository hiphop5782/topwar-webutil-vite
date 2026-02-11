import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useFirebase } from "@src/hooks/useFirebase";
import useLocalStorage from "@src/hooks/useLocalStorage";
import { FaVoteYea } from "react-icons/fa";
import { FaXmark } from "react-icons/fa6";
import { toast } from "react-toastify";
import axios from "axios";
import FlagWithTooltip from "@src/components/template/FlagWithTooltip";

import "flag-icons/css/flag-icons.min.css";
import "./AttendanceVoteReader.css";
import { useTranslation } from "react-i18next";

export default function AttendanceVoteReader() {
    const { t } = useTranslation("viewer"); 
    const { voteId } = useParams();

    const [uuid, setUuid] = useState(voteId);
    const [vote, setVote] = useState(null);
    const [voteTranslated, setVoteTranslated] = useState(null);

    const { getVote, castVote } = useFirebase();

    const [translateLoading, setTranslateLoading] = useState(false);

    useEffect(()=>{
        if(uuid) {
            loadVote();
        }
    }, [uuid]);

    const loadVote = useCallback(() => {
        const unsubscribe = getVote(uuid, (data) => {
            if (data === null) {
                toast.error(t("AttendanceVoteReader.title"));
            }
            // 1. 원본 데이터는 항상 최신으로 유지
            setVote(data);

            // 2. 번역된 상태(voteTranslated) 업데이트 로직
            setVoteTranslated(prev => {
                // 만약 처음 불러오는 거라면(null) 그냥 원본 데이터를 넣음
                if (!prev) return data;

                // 이미 번역된 데이터가 있다면? 
                // 텍스트(title, content)는 유지하고 숫자(currentCount, players)만 업데이트함
                return {
                    ...prev, // 이전 상태(번역된 텍스트 포함) 유지
                    closed: data.closed, // 마감 여부는 최신화
                    choices: prev.choices.map((choice, index) => {
                        // Firebase에서 온 같은 순서의 최신 선택지 데이터 찾기
                        const latestChoice = data.choices[index];
                        return {
                            ...choice, // 번역된 텍스트(content) 유지
                            currentCount: latestChoice.currentCount, // 최신 투표수 업데이트
                            players: latestChoice.players, // 실시간 참여자 목록 업데이트
                        };
                    })
                };
            });
        });
    }, [uuid, getVote]);

    const [choiceNo, setChoiceNo] = useState(null);

    const [userInfo, setUserInfo] = useLocalStorage("vote-user-info", {
        nickname: "",
        cp: 0,
        job: "CE",
        skill: 10
    });

    const changeUserStrInfo = useCallback(e => {
        const { name, value } = e.target;
        setUserInfo(prev => ({ ...prev, [name]: value }))
    }, []);
    const changeUserNumberInfo = useCallback(e => {
        const { name, value } = e.target;
        const replacement = value.replace(/[^0-9]/g, "");
        const number = replacement.length === 0 ? "" : parseInt(replacement);
        setUserInfo(prev => ({ ...prev, [name]: number }))
    }, []);

    const skillRef = useRef();
    useEffect(() => {
        setUserInfo(prev => ({ ...prev, skill: parseInt(skillRef.current.value) }));
    }, [userInfo.job]);

    const writeUserInfoComplete = useMemo(() => {
        if (userInfo.nickname.trim().length === 0) return false;
        if (userInfo.cp === "") return false;
        return true;
    }, [userInfo]);

    const submitVote = useCallback(async () => {
        if (writeUserInfoComplete === false) return toast.error("내 정보를 모두 작성해야 투표가 가능합니다!");

        const success = await castVote(uuid, choiceNo, userInfo);
        if (success) {
            toast.success("투표가 완료되었습니다!");
        }
    }, [uuid, userInfo, writeUserInfoComplete, choiceNo]);

    // 투표 마감 상태 계산
    const isVoteExpired = useMemo(() => {
        if (!vote) return false;
        if (vote.closed) return true; // 수동 마감
        if (vote.expiresAt) {
            return new Date() > vote.expiresAt.toDate(); // 시간 만료
        }
        return false;
    }, [vote]);

    const [languages, setLanguages] = useState([]);
    useEffect(() => {
        if (vote == null) return;
        loadTranslationLanguages();
    }, [vote]);
    const loadTranslationLanguages = useCallback(async () => {
        const { data } = await axios.get("https://script.google.com/macros/s/AKfycbwXtgjDeK8fKh9z8FhnCglgyKU_5rJuxaC5vTAKklfOdLVd9_KOhYWuD4eCnop2vAPgfg/exec?action=languages");
        setLanguages(data);
    }, []);

    const translateVote = useCallback(async (language) => {
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwXtgjDeK8fKh9z8FhnCglgyKU_5rJuxaC5vTAKklfOdLVd9_KOhYWuD4eCnop2vAPgfg/exec";
        setTranslateLoading(true);
        try {
            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                // CORS 에러 방지를 위해 헤더 생략 혹은 단순 텍스트 전송 방식을 선호함
                body: JSON.stringify({
                    action: "translate_all",
                    target: language.code,
                    data: vote
                })
            });

            const result = await response.json();

            if (result.error) {
                console.error("서버 에러:", result.error);
                return;
            }

            // 결과 데이터를 투표 상태값에 반영
            setVoteTranslated(result);
            //console.log("번역 완료:", result);

        } catch (error) {
            console.error("네트워크/CORS 에러:", error);
        }
        finally {
            setTranslateLoading(false);
        }
    }, [vote]);

    const totalCount = useMemo(()=>{
        if(vote === null) return 0;
        return vote.choices.reduce((acc, cur)=>acc + cur.currentCount, 0);
    }, [vote]);

    return (<>
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
                <select className="form-select" name="job" onChange={changeUserStrInfo}>
                    <option value="CE">{t("AttendanceVoteReader.myinfo-job-ce")}</option>
                    <option value="MM">{t("AttendanceVoteReader.myinfo-job-mm")}</option>
                </select>
            </div>
        </div>
        <div className="row mt-1">
            <label className="col-form-label col-sm-3">{userInfo.job === "CE" ? t("AttendanceVoteReader.myinfo-morale") : t("AttendanceVoteReader.myinfo-urgent")}</label>
            <div className="col-sm-9">
                <select className="form-select" name="skill" onChange={changeUserNumberInfo} ref={skillRef}>
                    {Array.from({ length: userInfo.job === "CE" ? 11 : 6 }, (_, i) => userInfo.job === "CE" ? 10 - i : 5 - i).map(n => (
                        <option key={n} value={n}>{n}{t("AttendanceVoteReader.level")}</option>
                    ))}
                </select>
            </div>
        </div>

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
                    <div className="col d-flex gap-1">
                        {languages.length === 0 ? (
                            <span className="shimmer-text">{t("AttendanceVoteReader.message-language-search")}<span className="dots"></span></span>
                        ) : (<>
                            {languages.map(language => (
                                <FlagWithTooltip key={language.name} lang={language} onClick={e => translateVote(language)} />
                            ))}
                        </>)}
                    </div>
                </div>
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
                                                checked={choiceNo === choice.no} onChange={e => setChoiceNo(choice.no)} />
                                            {translateLoading ? (
                                                <span className="shimmer-text">{t("AttendanceVoteReader.message-translate")}<span className="dots"></span></span>
                                            ) : (
                                                <span>
                                                    {choice.content}
                                                    {isMyChoice && (<>
                                                        <FaVoteYea className="ms-2" title={t("AttendanceVoteReader.message-mychoice")}/>
                                                        <span className="text-danger">{t("AttendanceVoteReader.message-mychoice")}</span>
                                                    </>)}
                                                </span>
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
                                    </div>
                                    <div className="position-absolute" style={
                                        {
                                            top:"90%", left:0, bottom:0, right:0, zIndex:0, 
                                            background: "linear-gradient(90deg,rgba(131, 58, 180, 1) 0%, rgba(253, 29, 29, 1) 50%, rgba(252, 176, 69, 1) 100%)",
                                            width:`${choice.currentCount * 100 / totalCount}%`
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
            </>)}
        </>)}

    </>)
}