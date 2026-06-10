import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(utc);
dayjs.extend(relativeTime);

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "flag-icons/sass/flag-icons.scss";
import CountryFlagJson from "@src/assets/json/power/countryFlag.json";
import AiEvaluationCard from "./AiEvaluationCard";
import { useTranslation } from "react-i18next";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { toast } from "react-toastify";

import "./TopwarRealPowerViewer.css";

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

    const [playerList, setPlayerList] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const loadData = useCallback(async ()=>{
        const data = await import("@src/assets/json/power/playerData.json");
        setPlayerList(data.default);
        setDataLoading(false);
    }, []);
    useEffect(()=>{ loadData(); }, []);

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
            toast.error(t("TopwarRealPowerViewer.result-notfound"));
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

    //탑100에 나오는 플레이어 목록 필터링
    const filteredPlayersOnRank = useMemo(()=>{
        if(playerList.length === 0) return [];
        if(json === null) return [];

        return playerList
                    .filter((player, index)=>{
                        const sameServer = player.server === json.serverId;
                        const sameAlliance = selectedAlliance === "all" || player.allianceTag === selectedAlliance;
                        return sameServer && sameAlliance;
                    })
                    .sort((p1, p2) => p2.cp - p1.cp);
    }, [json, selectedAlliance, playerList]);

    const filteredPlayersOnMap = useMemo(()=>{
        if (json === null) return [];

        const selected = selectedAlliance?.toLowerCase();
        return json.players.filter((player,index) => {
            if (selected === "all") return true;
            return player.allianceTag === selectedAlliance;
        }).sort((a, b) => b.power - a.power);
    }, [json, selectedAlliance, playerList]);

    const filteredPlayersOnMapKeyValue = useMemo(()=>{
        return new Map(filteredPlayersOnMap.map(player=>[String(player.uid), player]));
    }, [filteredPlayersOnMap]);

    const filteredPlayers = useMemo(() => {
        const uidSet = new Set();
        const top100list = filteredPlayersOnRank.map(player=>{

            const playerInfoOnMap = filteredPlayersOnMapKeyValue.get(String(player.uid));

            const result = {
                allianceId: player.allianceId,
                allianceName: player.allianceName,
                allianceTag: player.allianceTag,
                nationalflag: player.countryFlag,
                power: player.cp ?? player.score,
                gender: player.gender,
                lastLogin: player.lastLogin,
                lastShowTime: player.lastRequest,
                level: player.level,
                isOnline: player.online,
                serverId: player.server,
                uid: player.uid,
                username: player.nickname
            };
            uidSet.add(result.uid);
            if(playerInfoOnMap === undefined) {
                return {
                    ...result,
                    source: { rank: true, map: false }
                };
            }
            else {
                return {
                    ...result, ...playerInfoOnMap,
                    source: { rank: true, map: true }
                }
            }
        });

        const mapOnlyList = filteredPlayersOnMap
            .filter(player=>!uidSet.has(String(player.uid)))
            .map(player=>({
                ...player,
                source: { ...(player.source ?? {}) , rank:false, map:true }
            }));

        return [...top100list, ...mapOnlyList];
    }, [filteredPlayersOnRank, filteredPlayersOnMap, filteredPlayersOnMapKeyValue]);

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
                    lang: i18n.language,
                    server: serverJson.serverId,
                    time: serverJson.exportedAt
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

    const calculateUserGrade = useCallback((lastLogin, exportedTime)=>{//최종로그인, 조사시각
        if(!lastLogin) return "unknown";
        const diff = Math.abs(dayjs.unix(lastLogin).diff(exportedTime, 'day'));
        if(diff < 3) return "";
        if(diff < 7) return "sleepy";
        if(diff < 14) return "inactive";
        if(diff < 30) return "quit";
        return "unknown";
    }, []);

    const filteredPlayersCountByGrade = useMemo(()=>{
        if(json === null) return {};

        return filteredPlayers.reduce((obj, player)=>{
            const grade = calculateUserGrade(player.lastLogin, json.exportedAt);
            switch(grade){
                default:
                    return {...obj, active: obj.active+1, total: obj.total + 1};
                case "sleepy":
                    return {...obj, sleepy: obj.sleepy+1, total: obj.total + 1};
                case "inactive":
                    return {...obj, inactive: obj.inactive+1, total: obj.total + 1};
                case "quit":
                    return {...obj, quit: obj.quit+1, total: obj.total + 1};
                case "unknown":
                    return {...obj, unknown: obj.unknown+1, total: obj.total + 1};
            };
        }, {active:0, sleepy:0, inactive:0, quit:0, unknown:0, total:0});
    }, [json, filteredPlayers]);

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

            <div className="mt-4">
                <button type="button" className={`btn ${selectedAlliance === "all" ? "btn-secondary" : "btn-outline-secondary"} me-4`}
                    onClick={e => setSelectedAlliance("all")}>{t("TopwarRealPowerViewer.result-player-all-button")}</button>

                {alliances.map((alliance, index) => (
                    <button key={index} type="button" className={`btn ${selectedAlliance === alliance.allianceTag ? "btn-" : "btn-outline-"}${calculateType(index)} me-2`}
                        onClick={e => setSelectedAlliance(alliance.allianceTag)}>
                        {alliance.allianceTag}
                    </button>
                ))}
            </div>

            <div className="d-flex mt-4">
                <span className="fs-4 badge rounded w-100" style={{backgroundColor:"var(--bs-green)"}}>active : {filteredPlayersCountByGrade.active}</span>
                <span className="fs-4 badge rounded w-100 ms-2" style={{backgroundColor:"var(--bs-yellow)"}}>sleepy : {filteredPlayersCountByGrade.sleepy}</span>
                <span className="fs-4 badge rounded w-100 ms-2" style={{backgroundColor:"var(--bs-orange)"}}>inactive : {filteredPlayersCountByGrade.inactive}</span>
            </div>
            <div className="d-flex mt-2">
                <span className="fs-4 badge rounded w-100" style={{backgroundColor:"var(--bs-red)"}}>quit : {filteredPlayersCountByGrade.quit}</span>
                <span className="fs-4 badge rounded w-100 ms-2" style={{backgroundColor:"var(--bs-gray)"}}>unknown : {filteredPlayersCountByGrade.unknown}</span>
                <span className="fs-4 badge rounded w-100 ms-2" style={{backgroundColor:"var(--bs-black)"}}>total : {filteredPlayersCountByGrade.total}</span>
            </div>

            <div className="mt-4">
                <div className="text-nowrap table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t("TopwarRealPowerViewer.result-player-alliance-column")}</th>
                                <th width="30%">{t("TopwarRealPowerViewer.result-player-username-column")}</th>
                                <th>{t("TopwarRealPowerViewer.result-player-cp-column")}</th>
                                <th className="d-none d-md-table-cell">{t("TopwarRealPowerViewer.result-player-unit-column")}</th>
                                <th className="d-none d-md-table-cell">{t("TopwarRealPowerViewer.result-player-score-column")}</th>
                                <th className="d-none d-md-table-cell">{t("TopwarRealPowerViewer.result-player-rank-column")}</th>
                                <th>{t("TopwarRealPowerViewer.result-player-login-column")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPlayers.map((player, index) => {
                                const idx = alliances.findIndex(alliance => alliance.allianceTag === player.allianceTag);
                                const lastLoginTime = dayjs.unix(player.lastLogin).utc();
                                const exportedTime = dayjs.utc(json.exportedAt);
                                const diff = lastLoginTime.from(exportedTime);
                                return (
                                    <tr className={`player-info ${calculateUserGrade(player.lastLogin, json.exportedAt)}`} key={index}>
                                        <td>
                                            {player.allianceTag && (
                                            <span className={`badge bg-${calculateType(idx)}`}>{player.allianceTag}</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`fi fi-sq fi-${CountryFlagJson[player.nationalflag]}`} style={{ aspectRatio: '1 / 1' }}></span>
                                            <span className="ms-2 text-nowrap">{player.username}</span>
                                        </td>
                                        <td className="d-none d-md-table-cell">{formatPower(player.power)}</td>
                                        <td className="d-none d-md-table-cell">{player.armyPowerText}</td>
                                        <td className="d-none d-md-table-cell">{player.activityScore}</td>
                                        <td>
                                            {index + 1}
                                            {selectedAlliance === "all" && player.allianceTag && (<span className="ms-1">({player.powerRankInAlliance})</span>)}
                                        </td>
                                        <td>
                                            {player.lastLogin !== undefined ? (
                                                <span>
                                                    {diff}
                                                </span>
                                            ) : (
                                                <span className="d-inline-block" style={{ color: "#EEE" }}>{t("TopwarRealPowerViewer.result-player-unknown")}</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>)}
    </>);
}