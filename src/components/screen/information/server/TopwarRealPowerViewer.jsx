import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/ko";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "flag-icons/sass/flag-icons.scss";
import CountryFlagJson from "@src/assets/json/power/countryFlag.json";
import AiEvaluationCard from "./AiEvaluationCard";
import { useTranslation } from "react-i18next";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { toast } from "react-toastify";

const jsonModules = import.meta.glob('@src/assets/json/realpower/*.json');

export default function TopwarRealPowerViewer() {

    const { t, i18n } = useTranslation(["viewer", "commons"]);

    const fileNames = useMemo(() => {
        return Object.keys(jsonModules).map(path => {
            const fileName = path.split('/').pop().replace(".json", "");
            return { path, fileName };
        })
        //.sort((a,b)=>b.fileName.localeCompare(a.fileName));
        sort((a, b) => parseInt(a.fileName) - parseInt(b.fileName));
    }, []);

    // const [selectedServer, setSelectedServer] = useState(() => {
    //     return fileNames?.length > 0 ? fileNames[0].path : null
    // });
    const [selectedServer, setSelectedServer] = useState("");

    const [json, setJson] = useState(null);

    const [loading, setLoading] = useState(false);
    const handiveFileSelect = useCallback(async () => {
        const path = fileNames.filter(file=>file.fileName == selectedServer)[0].path;
        if (!jsonModules[path]) {
            setJson(null);
            return;
        }

        setLoading(true);

        try {
            const module = await jsonModules[path]();
            setJson(module.default);
        } catch (error) {
            console.error("데이터 로드 실패", error);
            setJson(null);
        } finally {
            setLoading(false);
        }
    }, [selectedServer]);
    // useEffect(() => {
    //     if (!selectedServer) {
    //         setJson(null);
    //         return;
    //     }

    //     handiveFileSelect();
    // }, [selectedServer, handiveFileSelect]);
    const search = useCallback(()=>{
        if(selectedServer.length === 0) return;
        if(fileNames === null) return;
        if(!fileNames.some(file=>file.fileName == selectedServer)) {
            toast.error(t("TopwarRealPowerViewer.result-noutfound"));
            return;
        }

        handiveFileSelect();
    }, [selectedServer, handiveFileSelect]);

    const formatPower = useCallback((value, options = {}) => {
        if (value == null) return null;

        const n = Number(String(value).replace(/,/g, ""));
        if (!Number.isFinite(n)) return String(value);

        const suffixes = options.suffixes ?? [
            "",
            "K",
            "M",
            "BB",
            "T",
            "aa",
            "bb",
            "cc",
            "dd",
            "ee",
            "ff",
            "gg",
            "hh"
        ];

        let num = Math.abs(n);
        let group = 0;

        while (num >= 1000 && group < suffixes.length - 1) {
            num /= 1000;
            group++;
        }

        const sign = n < 0 ? "-" : "";

        let text;

        if (num >= 100) {
            text = num.toFixed(0);
        } else if (num >= 10) {
            text = num.toFixed(1);
        } else {
            text = num.toFixed(2);
        }

        // 핵심 수정: 소수점이 있을 때만 trailing zero 제거
        if (text.includes(".")) {
            text = text.replace(/\.?0+$/, "");
        }

        return sign + text + suffixes[group];
    }, []);

    const alliances = useMemo(() => {
        if (json === null) return [];

        return json.alliances.filter((alliance, index) => {
            if (alliance.allianceLevel < 3) return false;
            if (!alliance.allianceLeader) return false;
            if (!alliance.allianceName) return false;
            if (index >= 5) return false;
            return true;
        });
    }, [json]);

    const [selectedAlliance, setSelectedAlliance] = useState("all");
    useEffect(() => {
        setSelectedAlliance("all");
    }, [json]);

    const filteredPlayers = useMemo(() => {
        if (json === null) return [];

        const selected = selectedAlliance?.toLowerCase();
        return json.players.filter(player => {
            if (selected === "all") return true;
            return player.allianceTag?.toLowerCase() === selected;
        }).sort((a, b) => b.power - a.power);
    }, [json, alliances, selectedAlliance]);


    const calculateType = useCallback((index) => {
        switch (index % 5) {
            case 0: return "danger";
            case 1: return "warning";
            case 2: return "success";
            case 3: return "info";
            case 4: return "secondary";
        }
    }, []);

    const [agentLoading, setAgentLoading] = useState(false);
    const [streamingText, setStreamingText] = useState("");
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const requestSeqRef = useRef(0);
    const abortRef = useRef(null);

    const cleanJson = useCallback(text => {
        let cleaned = text
            .trim()
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```$/i, "")
            .trim();

        const first = cleaned.indexOf("{");
        const last = cleaned.lastIndexOf("}");

        if (first !== -1 && last !== -1 && last > first) {
            cleaned = cleaned.slice(first, last + 1);
        }

        return cleaned;
    }, []);

    const requestToAgent = useCallback(async (serverJson) => {
        if (!serverJson) return;

        // 이전 요청 중단
        if (abortRef.current) {
            abortRef.current.abort();
        }

        const controller = new AbortController();
        abortRef.current = controller;

        const requestSeq = ++requestSeqRef.current;

        setAgentLoading(true);
        setError(null);
        setResult(null);
        setStreamingText("");

        const jsonStr = JSON.stringify(serverJson);
        let fullText = "";

        try {
            const response = await fetch(`${import.meta.env.VITE_AI_ANALYZE_URL}/api/server/analyze`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // "Content-Type": "text/plain",
                },
                body: JSON.stringify({
                    json: jsonStr,
                    lang: i18n.language
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(t("TopwarRealPowerViewer.error-analyze-fail"));
            }

            if (!response.body) {
                throw new Error(t("TopwarRealPowerViewer.error-streaming-fail"));
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            while (true) {
                const { value, done } = await reader.read();

                if (done) break;

                // 이미 더 최신 요청이 시작되었으면 현재 응답은 버림
                if (requestSeq !== requestSeqRef.current) {
                    return;
                }

                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;

                setStreamingText(fullText);
            }

            // 완료 시점에도 최신 요청인지 재확인
            if (requestSeq !== requestSeqRef.current) {
                return;
            }

            const cleaned = cleanJson(fullText);
            const parsed = JSON.parse(cleaned);

            setResult(parsed);
        } catch (e) {
            if (e.name === "AbortError") {
                return;
            }

            if (requestSeq !== requestSeqRef.current) {
                return;
            }

            console.error(e);
            setError(e.message || t("TopwarRealPowerViewer.error-unknown"));
        } finally {
            if (requestSeq === requestSeqRef.current) {
                setAgentLoading(false);
            }
        }
    }, [cleanJson]);

    useEffect(() => {
        if (json === null) return;

        requestToAgent(json);

        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
    }, [json, requestToAgent]);

    const coreAllianceCount = useMemo(()=>{
        return alliances.reduce((s, c)=>c.activeAllianceGrade === 'CORE' ? s + 1 : s , 0);
    }, [alliances]);

    return (<>
        <h1>{t("TopwarRealPowerViewer.title")}</h1>

        <div className="d-flex">
            <span className="d-flex align-items-center">{t("TopwarRealPowerViewer.server-label")}</span>
            {/* <select className="form-select w-auto ms-4" onChange={e => setSelectedServer(e.target.value)}>
                <option value="">{t("TopwarRealPowerViewer.select-default-label")}</option>
                {fileNames.map((file, index) => (
                    <option key={index} value={file.path}>{file.fileName}</option>
                ))}
            </select> */}
            <input type="text" className="form-control w-auto ms-2" value={selectedServer}
                    placeholder="e.g., 3223"
                    onChange={e=>{
                        setSelectedServer(e.target.value.replace(/[^0-9]/g, ''))
                    }}
                    onKeyUp={e=>{
                        if(e.key === 'Enter') search();
                    }}
                    />
            <button className="btn btn-success ms-2" onClick={search}>
                <FaMagnifyingGlass/>
            </button>
        </div>

        {json !== null && (<>
            {agentLoading && (
                <div className="alert alert-light border rounded-4 my-3">
                    <div className="d-flex align-items-center gap-2">
                        <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                        />
                        <strong>{t("TopwarRealPowerViewer.ai-on-progress")}</strong>
                    </div>

                    {/* <p className="text-secondary small mt-2 mb-0">
                        원본 JSON을 요약한 뒤 활동성, 전쟁 가능성, 위험 요소를 평가하는 중입니다.
                    </p> */}
                    {/* 개발 중 디버그용. 운영에서는 제거 또는 접기 처리 추천 */}
                    {streamingText && !result && (
                        <div className="my-3">
                            <div className="bg-light border rounded-4 p-3 small">
                                {streamingText}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="alert alert-danger rounded-4 my-3">
                    {error}
                </div>
            )}

            {result && (
                <div className="my-3">
                    <AiEvaluationCard evaluation={result}></AiEvaluationCard>
                </div>
            )}

            <hr />
            <h3>{json.serverId}&nbsp;&nbsp;{t("TopwarRealPowerViewer.result-server-label")}</h3>
            <div className="d-flex mt-4">
                <dt className="w-25 text-primary">{t("TopwarRealPowerViewer.result-time-label")}</dt>
                <dd className="w-75">{dayjs(json.exportedAt).format()}</dd>
            </div>
            <div className="d-flex">
                <dt className="w-25 text-primary">{t("TopwarRealPowerViewer.result-player-label")}</dt>
                <dd className="w-75">
                    {json.summary.allianceMemberMergedPlayers} / {json.summary.players}
                </dd>
            </div>
            <div className="d-flex">
                <dt className="w-25 text-primary">{t("TopwarRealPowerViewer.result-alliance-label")}</dt>
                <dd className="w-75">
                    {coreAllianceCount} / {json.summary.alliances}
                </dd>
            </div>
            <div className="d-flex align-items-start">
                <dt className="w-25 text-primary">{t("TopwarRealPowerViewer.result-active-score-label")}</dt>
                <dd className="w-75">
                    <div className="fs-4">{json.summary.activity.activeTotalCount}</div>
                    <div className="text-muted">
                        = core&nbsp;
                        <span className="text-danger">{json.summary.activity.coreCount}</span>
                        &nbsp;+&nbsp;active&nbsp;
                        <span className="text-danger">{json.summary.activity.activeCount}</span>
                        &nbsp;+&nbsp;watch&nbsp;
                        <span className="text-danger">{json.summary.activity.watchCount}</span>
                        &nbsp;+&nbsp;low&nbsp;
                        <span className="text-danger">{json.summary.activity.lowCount}</span>
                    </div>
                </dd>
            </div>
            <hr />

            <h3>{t("TopwarRealPowerViewer.result-alliance-list-label")}</h3>

            {alliances.map((alliance, index) => (
                <div className="py-2 mb-3" key={index}>
                    <div className="shadow rounded p-4">
                        <h4>[{alliance.allianceTag}] {alliance.allianceName ?? <s className="text-muted">Unknown(Search Error)</s>}</h4>
                        <div className="d-flex mt-4">
                            <dt className="w-25 text-primary">{t("TopwarRealPowerViewer.result-alliance-leader-label")}</dt>
                            <dd className="w-75">{alliance.allianceLeader}</dd>
                        </div>
                        <div className="d-flex">
                            <dt className="w-25 text-primary">{t("TopwarRealPowerViewer.result-alliance-power-label")}</dt>
                            <dd className="w-75">
                                <span className="text-info fw-bold">{formatPower(alliance.activitySummary.corePowerSum)}</span>
                                &nbsp;/&nbsp;
                                <span className="text-success fw-bold">{formatPower(alliance.activitySummary.activePowerSum)}</span>
                                &nbsp;/&nbsp;
                                <span className="text-dark fw-bold">{formatPower(alliance.activitySummary.totalPower)}</span>
                            </dd>
                        </div>
                        <div className="d-flex">
                            <dt className="w-25 text-primary">{t("TopwarRealPowerViewer.result-alliance-user-label")}</dt>
                            <dd className="w-75">
                                <span className="text-info fw-bold">{alliance.activitySummary.coreCount}</span>
                                &nbsp;/&nbsp;
                                <span className="text-success fw-bold">{alliance.activitySummary.coreCount + alliance.activitySummary.activeCount}</span>
                                &nbsp;/&nbsp;
                                <span className="text-danger fw-bold">{alliance.activitySummary.coreCount + alliance.activitySummary.activeCount + alliance.activitySummary.lowCount}</span>
                                &nbsp;/&nbsp;
                                <span className="text-dark fw-bold">{alliance.activitySummary.collectedMapMemberCount}</span>
                                {alliance.activitySummary.shownMemberCount && (
                                    <span className="text-muted fw-bold">&nbsp;/&nbsp;{alliance.activitySummary.shownMemberCount}</span>
                                )}
                            </dd>
                        </div>
                        <div className="d-flex">
                            <dt className="w-25 text-primary">{t("TopwarRealPowerViewer.result-alliance-top20-label")}</dt>
                            <dd className="w-75">{alliance.activitySummary.top20PowerCount}%</dd>
                        </div>
                        <div className="d-flex">
                            <dt className="w-25 text-primary">{t("TopwarRealPowerViewer.result-alliance-top80count-label")}</dt>
                            <dd className="w-75">{alliance.activitySummary.cumulative80PowerCount}</dd>
                        </div>
                        <div className="d-flex">
                            <dt className="w-25 text-primary">{t("TopwarRealPowerViewer.result-alliance-grade-label")}</dt>
                            <dd className="w-75">
                                {alliance.activeAllianceGrade} 
                                ({t("TopwarRealPowerViewer.result-alliance-score-label")} : {alliance.activeAllianceScore})
                                </dd>
                        </div>
                    </div>
                </div>
            ))}

            <hr />

            <h3>{t("TopwarRealPowerViewer.result-player-list-label")}</h3>

            <div className="mt-2">
                <button type="button" className={`btn ${selectedAlliance === "all" ? "btn-secondary" : "btn-outline-secondary"} me-4`}
                    onClick={e => setSelectedAlliance("all")}>{t("TopwarRealPowerViewer.result-player-all-button")}</button>

                {alliances.map((alliance, index) => (
                    <button key={index} type="button" className={`btn ${selectedAlliance === alliance.allianceTag ? "btn-" : "btn-outline-"}${calculateType(index)} me-2`}
                        onClick={e => setSelectedAlliance(alliance.allianceTag)}>
                        {alliance.allianceTag}
                    </button>
                ))}
            </div>

            <div className="mt-4">
                <div className="d-flex mt-2">
                    <dt style={{ width: "35%" }}>
                        <span className="d-inline-block" style={{ width: 60 }}>{t("TopwarRealPowerViewer.result-player-alliance-column")}</span>
                        <span className="ms-4">Username</span>
                    </dt>
                    <dd className="flex-grow-1s">
                        <span className="d-inline-block" style={{ width: 100 }}>{t("TopwarRealPowerViewer.result-player-cp-column")}</span>
                        <span className="d-inline-block" style={{ width: 100 }}>{t("TopwarRealPowerViewer.result-player-unit-column")}</span>
                        <span className="d-inline-block" style={{ width: 100 }}>{t("TopwarRealPowerViewer.result-player-score-column")}</span>
                        <span className="d-inline-block" style={{ width: 100 }}>{t("TopwarRealPowerViewer.result-player-rank-column")}</span>
                    </dd>
                </div>
                {filteredPlayers.map((player, index) => {
                    const idx = alliances.findIndex(alliance => alliance.allianceTag === player.allianceTag);
                    return (
                        <div className="d-flex mt-2" key={index}>
                            <dt style={{ width: "35%" }}>
                                {player.allianceTag ? (
                                    <span className={`d-inline-block badge bg-${calculateType(idx)}`} style={{ width: 60 }}>{player.allianceTag}</span>
                                ) : (
                                    <span className="d-inline-block" style={{ width: 60 }}></span>
                                )}
                                <span className={`ms-4 fi fi-sq fi-${CountryFlagJson[player.nationalflag]}`} style={{ aspectRatio: '1 / 1' }}></span>
                                <span className="ms-2">{player.username}</span>
                            </dt>
                            <dd className="flex-grow-1s">
                                <span className="d-inline-block" style={{ width: 100 }}>{formatPower(player.power)}</span>
                                <span className="d-inline-block" style={{ width: 100 }}>{player.armyPowerText}</span>
                                <span className="d-inline-block" style={{ width: 100 }}>{player.activityScore}</span>
                                <span className="d-inline-block" style={{ width: 100 }}>
                                    {index + 1}
                                    {selectedAlliance === "all" && player.allianceTag && (<span className="ms-1">({player.powerRankInAlliance})</span>)}
                                </span>
                                {player.lastLogin !== undefined ? (
                                    <span className="d-inline-block">
                                        {dayjs.unix(player.lastLogin).from(json.exportedAt)}
                                    </span>
                                ) : (
                                    <span className="d-inline-block" style={{ color: "#EEE" }}>{t("TopwarRealPowerViewer.result-player-unknown")}</span>
                                )}
                            </dd>
                        </div>
                    )
                })}
            </div>
        </>)}
    </>);
}