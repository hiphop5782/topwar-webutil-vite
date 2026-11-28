import { useChatActions } from "@src/ai/useChatActions";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    FaPaperPlane,
    FaRobot,
    FaSpinner,
    FaXmark,
} from "react-icons/fa6";

import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { requestChat } from "@src/ai/chatClient";
import { executeDataQuery } from "@src/ai/dataQuery";
import * as dataRepository from "@src/services/topwarDataRepository";
import ChatDataResult from "./ChatDataResult";

import "./Chatbot.css";
import SupportBanner from "@src/components/template/SupportBanner";

export default function Chatbot() {
    const { runAction } = useChatActions();
    const { i18n } = useTranslation();
    const location = useLocation();

    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    useEffect(() => { setIsOpen(false); }, [location.key]);

    const [messages, setMessages] = useState([
        {
            role: "assistant",
            text: "유저·길드·서버 비교, 유저·서버 요약과 서버 이동 이력을 조회할 수 있습니다. 예: ‘3223과 3224 서버 비교해줘’",
        },
    ]);

    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState("");

    const chatBodyRef = useRef(null);
    const inputRef = useRef(null);
    const requestPendingRef = useRef(false);

    /**
     * 챗봇 닫기
     */
    const closeChatbot = useCallback(() => {
        setIsOpen(false);
    }, []);

    /**
     * 챗봇 열기/닫기 전환
     */
    const toggleChatbot = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    /**
     * 메시지 전송
     */
    const handleSend = useCallback(async () => {
        const text = input.trim();

        if (!text || loading || requestPendingRef.current) {
            return;
        }
        requestPendingRef.current = true;

        setMessages((prev) => [
            ...prev,
            {
                role: "user",
                text,
            },
        ]);

        setInput("");
        setLoading(true);
        setProgress("질문을 해석하고 있습니다…");

        try {
            const result = await requestChat({ message: text, language: i18n.language, history: messages });
            if (result.type === "data") {
                const answer = await executeDataQuery(result.plan, dataRepository, setProgress);
                setMessages(prev => [...prev, { role: "assistant", text: answer.text, result: answer }]);
                return;
            }

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text:
                        result.reply ||
                        "요청을 처리했습니다.",
                },
            ]);

            if (result.type === "action") {
                const actionResult = runAction(
                    result.action,
                    result.params || {}
                );

                if (actionResult?.success !== true) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            text:
                                actionResult?.message ||
                                "요청한 작업을 실행하지 못했습니다.",
                        },
                    ]);
                }
            }
        } catch (error) {
            console.error("chatbot error", error);

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    error: true,
                    text:
                        error instanceof Error
                            ? error.message
                            : "요청 처리 중 오류가 발생했습니다.",
                },
            ]);
        } finally {
            requestPendingRef.current = false;
            setLoading(false);
        }
    }, [
        input,
        loading,
        messages,
        i18n.language,
        runAction,
    ]);

    /**
     * 입력창 키 처리
     */
    const handleInputKeyDown = useCallback(
        (event) => {
            if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
            ) {
                event.preventDefault();
                handleSend();
            }
        },
        [handleSend]
    );

    /**
     * F1, Escape 전역 단축키
     */
    useEffect(() => {
        const handleGlobalKeyDown = (event) => {
            if (event.key === "F1") {
                // 브라우저 도움말 실행 방지
                event.preventDefault();

                setIsOpen((prev) => !prev);
                return;
            }

            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        window.addEventListener(
            "keydown",
            handleGlobalKeyDown
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleGlobalKeyDown
            );
        };
    }, []);

    /**
     * 챗봇을 열면 입력창에 자동 포커스
     */
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const timer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 100);

        return () => {
            window.clearTimeout(timer);
        };
    }, [isOpen]);

    /**
     * 메시지 추가 또는 로딩 상태 변경 시
     * 스크롤을 가장 아래로 이동
     */
    useEffect(() => {
        const chatBody = chatBodyRef.current;

        if (!chatBody) {
            return;
        }

        chatBody.scrollTo({
            top: chatBody.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, loading]);

    /**
     * 배경 클릭 시 닫기
     */
    const handleOverlayMouseDown = useCallback(
        (event) => {
            if (event.target === event.currentTarget) {
                closeChatbot();
            }
        },
        [closeChatbot]
    );

    return (
        <>
            {/* 기존 우측 하단 실행 버튼 */}
            <button
                type="button"
                onClick={toggleChatbot}
                className={`btn btn-${
                    isOpen ? "danger" : "primary"
                } chatbot-floating-btn`}
                aria-label={
                    isOpen
                        ? "AI 에이전트 닫기"
                        : "AI 에이전트 열기"
                }
                title="AI 에이전트 열기 (F1)"
            >
                {isOpen ? <FaXmark /> : <FaRobot />}
            </button>

            {isOpen && (
                <div
                    className="chatbot-overlay"
                    onMouseDown={
                        handleOverlayMouseDown
                    }
                    role="presentation"
                >
                    <section
                        className="chatbot-wrapper"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="chatbot-title"
                    >
                        <header className="chatbot-header">
                            <div className="chatbot-header-title">
                                <FaRobot />

                                <strong id="chatbot-title">
                                    AI 에이전트
                                </strong>

                                <span className="chatbot-shortcut">
                                    F1
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={closeChatbot}
                                className="btn chatbot-close-btn"
                                aria-label="AI 에이전트 닫기"
                                title="닫기 (Esc)"
                            >
                                <FaXmark />
                            </button>

                                
                        </header>
                        <div className="p-2">
                            <SupportBanner/>
                        </div>

                        <div
                            className="chatbot-body"
                            ref={chatBodyRef}
                        >
                            {messages.map(
                                (message, index) => (
                                    <div
                                        key={`${message.role}-${index}`}
                                        className={`chatbot-message ${
                                            message.role ===
                                            "user"
                                                ? "user"
                                                : "assistant"
                                        }`}
                                    >
                                        <div className="chatbot-message-box">
                                            {message.text}
                                            {message.result && <ChatDataResult result={message.result} />}
                                        </div>
                                    </div>
                                )
                            )}

                            {loading && (
                                <div className="chatbot-message assistant">
                                    <div className="chatbot-message-box chatbot-loading-message">
                                        <FaSpinner className="fa-spin" />

                                        <span className="ms-2">
                                            {progress}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <footer className="chatbot-footer">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(event) =>
                                    setInput(
                                        event.target.value
                                    )
                                }
                                onKeyDown={
                                    handleInputKeyDown
                                }
                                placeholder="원하는 작업을 입력하세요"
                                className="form-control"
                                disabled={loading}
                                autoComplete="off"
                                aria-label="AI 에이전트 요청 입력"
                            />

                            <button
                                type="button"
                                onClick={handleSend}
                                className="btn btn-primary chatbot-send-btn"
                                disabled={
                                    loading ||
                                    !input.trim()
                                }
                                aria-label="메시지 전송"
                            >
                                {loading ? (
                                    <FaSpinner className="fa-spin" />
                                ) : (
                                    <FaPaperPlane />
                                )}
                            </button>
                        </footer>

                        <div className="chatbot-help">
                            <span>
                                <kbd>Enter</kbd>
                                전송
                            </span>

                            <span>
                                <kbd>Esc</kbd>
                                닫기
                            </span>

                            <span>
                                <kbd>F1</kbd>
                                열기/닫기
                            </span>
                        </div>
                        
                    </section>
                </div>
            )}
        </>
    );
}
