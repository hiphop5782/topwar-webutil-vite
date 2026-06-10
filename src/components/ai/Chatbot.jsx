import { useChatActions } from "@src/ai/useChatActions";
import { useCallback, useEffect, useRef, useState } from "react";

import "./Chatbot.css";
import { FaPaperPlane, FaRobot, FaSpinner, FaXmark } from "react-icons/fa6";
import { allowedPaths } from "../../ai/actionRegistry";
import { useTranslation } from "react-i18next";

export default function Chatbot() {
    const { runAction } = useChatActions();

    const { i18n } = useTranslation();

    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([
        { role: "assistant", text: "안녕하세요. 어떤 기능을 원하세요?" }
    ]);

    const [loading, setLoading] = useState(false);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text) return;

        setMessages((prev) => [...prev, { role: "user", text }]);
        setInput("");

        //목업으로 입력값 파싱(향후 백엔드 요청으로 교체)
        //const result = mockParseUserMessage(text);

        //백엔드 요청 (샘플)
        // {
        //     "message": "공지사항으로 이동해줘",
        //         "actions": [
        //             {
        //                 "name": "navigate",
        //                 "description": "허용된 페이지로 이동한다.",
        //                 "requiredParams": ["path"],
        //                 "allowedValues": {
        //                     "path": [
        //                         { "path": "/", "label": "홈" },
        //                         { "path": "/ranking", "label": "랭킹" },
        //                         { "path": "/server/analyze", "label": "서버 분석" },
        //                         { "path": "/players", "label": "플레이어 검색" },
        //                         { "path": "/notice", "label": "공지사항" }
        //                     ]
        //                 }
        //             }
        //         ]
        // }
        try {
            const data = {
                message: text,
                lang: i18n.language,
                actions: [
                    {
                        name: "navigate",
                        description: "허용된 페이지로 이동한다",
                        requiredParams: ["path"],
                        allowedValues: { path: allowedPaths }
                    }
                ]
            };

            console.log('request', data);

            setLoading(true);
            const response = await fetch(`${import.meta.env.VITE_AI_CHATBOT_URL}/api/chatbot/action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            setLoading(false);

            if (!response.ok) {
                throw new Error("서버 요청에 실패했습니다");
            }

            //메세지 표시
            const result = await response.json();
            console.log('response', result);
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    text: result.reply || "요청을 처리했습니다"
                }
            ]);

            //action인 경우 이동 처리
            if (result.type === "action") {
                const actionResult = runAction(result.action, result.params || {});
                if (actionResult.success !== true) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            text: actionResult.message
                        }
                    ]);
                }
            }
        }
        catch (e) {
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    text: e.message || "요청 처리 중 오류가 발생했습니다"
                }
            ])
        }

    }, [input, runAction]);

    const handleKeyDown = useCallback(e => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            handleSend();
        }
    }, [handleSend]);

    //스크롤 최하단으로 이동
    const chatBodyRef = useRef(null);
    useEffect(()=>{
        const el = chatBodyRef.current;
        if(!el) return;

        el.scrollTop = el.scrollHeight;
    }, [messages]);

    //render
    return (<>
        <button type="button" onClick={() => setIsOpen(prev => !prev)} className={`btn btn-${isOpen ? "danger" : "primary"} chatbot-floating-btn`}>
            <FaRobot />
        </button>

        {isOpen && (
            <div className="chatbot-wrapper">
                <div className="chatbot-header">
                    <strong>AI 에이전트</strong>
                    <button type="button" onClick={() => setIsOpen(false)} className="btn btn-danger">
                        <FaXmark />
                    </button>
                </div>
                <div className="chatbot-body" ref={chatBodyRef}>
                    {messages.map((message, index) => (
                        <div key={index} className={`chatbot-message ${message.role === "user" ? "user" : "assistant"}`}>
                            <div className="chatbot-message-box">{message.text}</div>
                        </div>
                    ))}
                    {loading && (
                    <div className="chatbot-message assistant">
                        <div className="chatbot-message-box">
                            <FaSpinner className="fa-spin"></FaSpinner>
                            <span className="ms-2">AI가 요청을 분석중입니다...</span>
                        </div>
                    </div>
                    )}
                </div>
                <div className="chatbot-footer d-flex">
                    <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                        placeholder="원하는 작업을 입력하세요" className="form-control" />
                    <button type="button" onClick={handleSend} className="btn btn-success ms-2">
                        <FaPaperPlane />
                    </button>
                </div>
            </div>
        )}
    </>);
}

/*
    임시 테스트용
*/
function mockParseUserMessage(text) {
    if (text.includes("메인") || text.includes("홈")) {
        return {
            type: "action",
            action: "home",
            params: {},
            reply: "메인 페이지로 이동합니다"
        }
    }
    if (text.includes("기지")) {
        return {
            type: "action",
            action: "baseInfo",
            params: {},
            reply: "기지 정보 페이지로 이동합니다"
        }
    }
    if (text.includes("직업")) {
        return {
            type: "action",
            action: "jobInfo",
            params: {},
            reply: "직업 정보 페이지로 이동합니다"
        }
    }

    return {
        type: "message",
        action: null,
        params: {},
        reply: "처리가 불가능한 요청입니다"
    }
}