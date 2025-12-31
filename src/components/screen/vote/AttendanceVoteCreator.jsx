import { useCallback, useState } from "react"
import { FaArrowRotateRight, FaCopy, FaFloppyDisk, FaPlus, FaRecycle, FaShare, FaXmark } from "react-icons/fa6";
import { useParams } from "react-router-dom"
import { v4 as uuidv4 } from "uuid";
import { useFirebase } from "@src/hooks/useFirebase";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

export default function AttendanceVoteCreator() {
    const { saveVote } = useFirebase();

    const [vote, setVote] = useState({
        uuid: "",
    });

    const createVote = useCallback(() => {
        setVote(prev => ({
            uuid: uuidv4(),
            title: "",
            choices: [
                { no: 1, content: "", limit: false, count: 35 }
            ],
        }));
    }, []);

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

    const saveToDatabase = useCallback(async () => {
        if (!vote.title.trim()) return toast.error("투표 제목을 설정하세요");
        if (vote.choices.some(c => c.content.length === 0)) return toast.error("모든 항목의 내용을 작성하세요");

        try {
            const success = await saveVote(vote);
            if (success) {
                toast.success("투표가 성공적으로 등록되었습니다");
            }
        }
        catch (e) {
            toast.error("저장 오류가 발생했습니다");
        }
    }, [vote]);

    const { i18n } = useTranslation();

    const copyUuidToClipboard = useCallback(()=>{
        copyToClipboard(vote.uuid, "투표ID가 복사되었습니다\n원하는 곳에 붙여넣으세요");
    }, [vote.uuid]);
    const copyLinkToClipboard = useCallback(()=>{
        const lang = i18n.language;
        copyToClipboard(`${window.location.origin}/${lang}/vote/cast/${vote.uuid}`, "공유 링크가 복사되었습니다\n원하는 곳에 붙여넣으세요");
    }, [vote.uuid, i18n]);
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

    //render
    return (<>
        <h1>참여 투표 생성</h1>
        <hr />

        <div className="row mt-4">
            <label className="col-form-label col-sm-3">투표 ID</label>
            <div className="col-sm-9 d-flex align-items-center flex-wrap">
                <span className="">{vote.uuid}</span>
                <div className="w-100 mt-1">
                {vote.uuid.length === 0 ? (
                    <button className="btn btn-success me-2 text-nowrap" onClick={createVote}>
                        <FaPlus className="me-2" />
                        <span>생성</span>
                    </button>
                ) : (<>
                    <button className="btn btn-danger me-2 text-nowrap" onClick={createVote}>
                        <FaArrowRotateRight className="me-2" />
                        <span>재생성</span>
                    </button>
                    <button className="btn btn-primary me-2 text-nowrap" onClick={copyUuidToClipboard}>
                        <FaCopy className="me-2" />
                        <span>ID복사</span>
                    </button>
                    <button className="btn btn-primary text-nowrap" onClick={copyLinkToClipboard}>
                        <FaShare className="me-2" />
                        <span>공유주소복사</span>
                    </button>
                </>)}
                </div>
            </div>
        </div>

        {vote.uuid.length > 0 && (<>
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
                            <span className="badge text-bg-danger ms-4">
                                <FaXmark className="fw-bold me-2" onClick={e => deleteChoice(choice)} />
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