import { useCallback, useMemo, useState } from "react"
import { FaArrowRotateRight, FaCopy, FaEye, FaEyeSlash, FaFloppyDisk, FaPlus, FaRecycle, FaShare, FaXmark } from "react-icons/fa6";
import { useFirebase } from "@src/hooks/useFirebase";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import VoteTemplates from "@src/assets/json/vote/vote-template.json";
import { Helmet } from "react-helmet-async";
import { loadRealPower } from "@src/services/topwarDataRepository";

export default function AttendanceVoteCreator() {
    const { saveVote } = useFirebase();

    const [vote, setVote] = useState({
        uuid: "",
    });
    const [showPwd, setShowPwd] = useState(false);
    const [serverPlayers, setServerPlayers] = useState([]);
    const [allianceLoading, setAllianceLoading] = useState(false);

    const createShortCode = useCallback(() => {
        const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
        const bytes = crypto.getRandomValues(new Uint8Array(8));
        return Array.from(bytes, value => alphabet[value % alphabet.length]).join("");
    }, []);

    const createVoteByTemplate = useCallback((template)=>{
        setVote({
            ...template.vote, 
            uuid:createShortCode(),
            serverId: "",
            targetScope: "server",
            allianceId: "",
            password: ""
        })
    }, [createShortCode]);

    const addChoice = useCallback(() => {
        setVote(prev => ({
            ...prev,
            choices: [...prev.choices, {
                no: prev.choices[prev.choices.length - 1].no + 1, content: "", limit: false, count: 35
            }]
        }));
    }, []);

    const changeChoiceContent = useCallback((e, target) => {
        setVote(prev => ({
            ...prev,
            choices: prev.choices.map(choice => {
                if (choice.no === target.no) {
                    return { ...choice, content: e.target.value };
                }
                return choice;
            })
        }));
    }, []);

    const changeChoiceLimit = useCallback((e, target) => {
        setVote(prev => ({
            ...prev,
            choices: prev.choices.map(choice => {
                if (choice.no === target.no) {
                    return { ...choice, limit: e.target.checked };
                }
                return choice;
            })
        }));
    }, []);

    const changeChoiceCount = useCallback((e, target) => {
        const replacement = e.target.value.replace(/[^0-9]/g, "");
        const number = replacement.length === 0 ? 0 : parseInt(replacement);
        const number2 = Math.max(0, number);
        setVote(prev => ({
            ...prev,
            choices: prev.choices.map(choice => {
                if (choice.no === target.no) {
                    return { ...choice, count: number2 };
                }
                return choice;
            })
        }));
    }, []);

    const deleteChoice = useCallback((target) => {
        setVote(prev => ({
            ...prev,
            choices: prev.choices.filter(choice => choice.no !== target.no)
        }));
    }, []);

    const loadAlliances = useCallback(async () => {
        if (!/^\d+$/.test(String(vote.serverId ?? "").trim())) return toast.error("서버 번호를 입력하세요");
        setAllianceLoading(true);
        try {
            const data = await loadRealPower(vote.serverId);
            setServerPlayers(Array.isArray(data?.players) ? data.players : []);
        } catch {
            setServerPlayers([]);
            toast.error("서버의 길드 명단을 불러오지 못했습니다");
        } finally {
            setAllianceLoading(false);
        }
    }, [vote.serverId]);

    const alliances = useMemo(() => [...serverPlayers.reduce((map, player) => {
        const id = String(player.allianceId ?? "");
        if (!id || id === "0") return map;
        const current = map.get(id) || { id, tag: player.allianceTag || "", name: player.allianceName || "", count: 0 };
        current.count += 1;
        map.set(id, current);
        return map;
    }, new Map()).values()].sort((a, b) => `${a.tag} ${a.name}`.localeCompare(`${b.tag} ${b.name}`, undefined, { sensitivity: "base", numeric: true })), [serverPlayers]);

    const saveToDatabase = useCallback(async () => {
        if (!vote.title.trim()) return toast.error("투표 제목을 설정하세요");
        if (!/^\d+$/.test(String(vote.serverId ?? "").trim())) return toast.error("서버 번호를 입력하세요");
        if (vote.targetScope === "alliance" && !vote.allianceId) return toast.error("투표 대상 길드를 선택하세요");
        if (vote.choices.some(c => c.content.length === 0)) return toast.error("모든 항목의 내용을 작성하세요");

        try {
            const selectedAlliance = alliances.find(alliance => alliance.id === vote.allianceId);
            const success = await saveVote({ ...vote, allianceTag: selectedAlliance?.tag || "", allianceName: selectedAlliance?.name || "",
                rosterSource: "live" });
            if (success) {
                toast.success("투표가 성공적으로 등록되었습니다");
            }
        }
        catch {
            toast.error("저장 오류가 발생했습니다");
        }
    }, [vote, saveVote, alliances]);

    const { i18n } = useTranslation();

    const copyToClipboard = useCallback((text, message) => {
        if (navigator.clipboard && window.isSecureContext) {
            // 최신 API 사용
            navigator.clipboard.writeText(text).then(() => {
                toast.success(message);
            });
        } else {
            // Fallback: 임시 textarea 생성 방식
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed"; // 화면 바깥으로 보냄
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            toast.success(message);
        }
    }, []);
    const copyUuidToClipboard = useCallback(()=>{
        copyToClipboard(vote.uuid, "투표ID가 복사되었습니다\n원하는 곳에 붙여넣으세요");
    }, [vote.uuid, copyToClipboard]);
    const copyLinkToClipboard = useCallback(()=>{
        if (!vote.serverId) return toast.error("서버 번호를 입력하세요");
        const lang = i18n.language;
        copyToClipboard(`${window.location.origin}/${lang}/vote/${vote.serverId}/${vote.uuid}`, "공유 링크가 복사되었습니다\n원하는 곳에 붙여넣으세요");
    }, [vote.uuid, vote.serverId, i18n.language, copyToClipboard]);

    //render
    return (<>
        {/* 검색대상 제외 */}
        <Helmet>
            <meta name="robots" content="noindex, follow" />
        </Helmet>

        <h1>참여 투표 생성</h1>
        <hr />

        <div className="row mt-4">
            <label className="col-form-label col-sm-3">템플릿</label>
            <div className="col-sm-9">
                {VoteTemplates.map((template, index)=>(
                <button key={index} className="btn me-2 btn-outline-primary text-nowrap" onClick={()=>createVoteByTemplate(template)}>
                    {template.name}
                </button>
                ))}
            </div>
        </div>

        {vote.uuid.length > 0 && (<>
            {/* 투표 ID */}
            <div className="row mt-2">
                <label className="col-form-label col-sm-3">투표 ID</label>
                <div className="col-sm-9 d-flex align-items-center flex-wrap">
                    {vote.uuid}
                    <div className="w-100 mt-1">
                        <button className="btn btn-primary me-2 text-nowrap" onClick={copyUuidToClipboard}>
                            <FaCopy className="me-2" />
                            <span>ID복사하기</span>
                        </button>
                        <button className="btn btn-primary text-nowrap" onClick={copyLinkToClipboard}>
                            <FaShare className="me-2" />
                            <span>투표 페이지 주소 복사</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 투표 비밀번호 */}
            <div className="row mt-4">
                <label className="col-form-label col-sm-3">서버 번호</label>
                <div className="col-sm-9">
                    <input type="text" inputMode="numeric" className="form-control" placeholder="예: 3453"
                        value={vote.serverId} onChange={e => { setServerPlayers([]); setVote(prev => ({ ...prev, serverId: e.target.value.replace(/[^0-9]/g, ""), allianceId: "" })); }} />
                    {vote.serverId && <small className="text-muted">공유 주소: /{i18n.language}/vote/{vote.serverId}/{vote.uuid}</small>}
                </div>
            </div>

            <div className="row mt-4">
                <label className="col-form-label col-sm-3">투표 대상</label>
                <div className="col-sm-9">
                    <div className="btn-group w-100">
                        <button type="button" className={`btn ${vote.targetScope === "server" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setVote(prev => ({ ...prev, targetScope: "server", allianceId: "" }))}>서버 전체</button>
                        <button type="button" className={`btn ${vote.targetScope === "alliance" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setVote(prev => ({ ...prev, targetScope: "alliance" }))}>특정 길드</button>
                    </div>
                    {vote.targetScope === "alliance" && <div className="mt-2">
                        <button type="button" className="btn btn-outline-secondary mb-2" disabled={allianceLoading} onClick={loadAlliances}>
                            {allianceLoading ? "길드 명단 불러오는 중..." : "서버 길드 목록 불러오기"}
                        </button>
                        {alliances.length > 0 && <select className="form-select" value={vote.allianceId}
                            onChange={e => setVote(prev => ({ ...prev, allianceId: e.target.value }))}>
                            <option value="">길드를 선택하세요</option>
                            {alliances.map(alliance => <option key={alliance.id} value={alliance.id}>
                                [{alliance.tag || "-"}] {alliance.name || alliance.id} ({alliance.count}명)
                            </option>)}
                        </select>}
                        <small className="text-muted d-block mt-1">길드원 명단은 투표 화면을 열 때 최신 조사 자료에서 불러옵니다.</small>
                    </div>}
                </div>
            </div>

            {/* 투표 비밀번호 */}
            <div className="row my-5">
                <label className="col-form-label col-sm-3 d-flex align-items-center">
                    관리자 비밀번호
                    {showPwd === true ? (
                        <FaEye className="ms-2 text-info" onClick={()=>setShowPwd(false)}/>
                    ) : (
                        <FaEyeSlash className="ms-2 text-danger" onClick={()=>setShowPwd(true)}/>
                    )}
                </label>
                <div className="col-sm-9">
                    <input type={showPwd ? "text" : "password"} className="form-control" placeholder=""
                        style={{fontFamily : "monospace"}}
                        value={vote.password} onChange={e => setVote(prev => ({ ...prev, password: e.target.value }))} />
                </div>
            </div>

            {/* 투표 제목 */}
            <div className="row my-5">
                <label className="col-form-label col-sm-3">투표 제목</label>
                <div className="col-sm-9">
                    <input type="text" className="form-control" placeholder="투표 제목 입력"
                        value={vote.title} onChange={e => setVote(prev => ({ ...prev, title: e.target.value }))} />
                </div>
            </div>

            {/* 투표 항목 */}
            {vote.choices.map((choice, index) => (
                <div className="row mb-4" key={index}>
                    <label className="col-form-label col-sm-3">
                        <span>항목 {index + 1}</span>
                        {index > 0 && (
                            <span className="badge text-bg-danger ms-4" onClick={() => deleteChoice(choice)}>
                                <FaXmark className="fw-bold me-2"/>
                                <span>제거</span>
                            </span>
                        )}
                    </label>
                    <div className="col-sm-9">
                        <input type="text" className="form-control" placeholder="투표 항목 입력"
                            value={choice.content} onChange={e => changeChoiceContent(e, choice)} />
                        <div className="d-flex align-items-center mt-1">
                            <label className="me-2">
                                <input type="checkbox" className="me-2" inputMode="numeric" checked={choice.limit} onChange={e => changeChoiceLimit(e, choice)} />
                                <span>인원 수 제한 설정</span>
                            </label>
                            {choice.limit && (
                                <div className="ms-4">
                                    <input type="text" className="form-control w-auto d-inline-block me-1" size={5}
                                        value={choice.count} onChange={e => changeChoiceCount(e, choice)} />명
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            <div className="row mb-4">
                <div className="offset-sm-3 col-sm-9">
                    <button className="btn btn-secondary w-100" onClick={addChoice}>
                        <FaPlus className="me-2" />
                        <span>항목 추가</span>
                    </button>
                </div>
            </div>

            <div className="row mb-4">
                <div className="offset-sm-3 col-sm-9">
                    <button className="btn btn-primary w-100" onClick={saveToDatabase}>
                        <FaFloppyDisk className="me-2" />
                        <span>최종 저장</span>
                    </button>
                </div>
            </div>
        </>)}
    </>)
}
