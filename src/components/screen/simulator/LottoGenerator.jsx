import React, { useState, useCallback } from 'react';
import { FaRotateRight, FaTrashCan, FaTicket } from "react-icons/fa6";
import confetti from 'canvas-confetti';

export default function LottoGenerator() {
    const [isSpinning, setIsSpinning] = useState(false);
    const [history, setHistory] = useState([]);
    const [displayNumbers, setDisplayNumbers] = useState(Array(7).fill("?"));
    const [activeIdx, setActiveIdx] = useState(-1); // 현재 뽑히고 있는 공의 인덱스

    const getBallColor = (num) => {
        if (!num || num === "?") return 'bg-light text-muted opacity-50';
        if (num <= 10) return 'bg-warning text-dark';
        if (num <= 20) return 'bg-primary text-white';
        if (num <= 30) return 'bg-danger text-white';
        if (num <= 40) return 'bg-secondary text-white';
        return 'bg-success text-white';
    };

    const fireConfetti = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    const generateLotto = useCallback(async () => {
        if (isSpinning) return;
        setIsSpinning(true);
        setDisplayNumbers(Array(7).fill("?"));
        setActiveIdx(-1);

        const pickedNumbers = [];
        while (pickedNumbers.length < 7) {
            const num = Math.floor(Math.random() * 45) + 1;
            if (!pickedNumbers.includes(num)) pickedNumbers.push(num);
        }

        // 7개의 공을 하나씩 순차적으로 추첨
        for (let i = 0; i < 7; i++) {
            setActiveIdx(i); // 현재 공 활성화 (애니메이션 트리거)
            
            // 보너스 번호(마지막 번호)는 더 긴장되게 더 오래 돌림
            const rollingDuration = i === 6 ? 2000 : 800 + (i * 200); 
            
            await new Promise((resolve) => {
                const startTime = Date.now();
                const interval = setInterval(() => {
                    setDisplayNumbers(prev => {
                        const next = [...prev];
                        next[i] = Math.floor(Math.random() * 45) + 1;
                        return next;
                    });

                    if (Date.now() - startTime > rollingDuration) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 60); // 숫자가 바뀌는 속도
            });

            // 번호 확정
            setDisplayNumbers(prev => {
                const next = [...prev];
                next[i] = pickedNumbers[i];
                return next;
            });

            // 보너스 번호 전에는 약간의 정적(0.5초)을 주어 긴장감 유발
            if (i === 5) await new Promise(r => setTimeout(r, 800));
        }

        const mainNumbers = pickedNumbers.slice(0, 6).sort((a, b) => a - b);
        const bonusNum = pickedNumbers[6];
        
        setActiveIdx(-1); // 활성화 해제
        setHistory(prev => [[...mainNumbers, bonusNum], ...prev].slice(0, 10));
        setIsSpinning(false);
        fireConfetti();
    }, [isSpinning]);

    return (
        <div className="container py-4 px-2" style={{ maxWidth: '850px' }}>
            <div className="text-center mb-4">
                <h1 className="fw-bold text-primary display-5">PREMIUM LOTTO</h1>
                <p className="text-muted small">이번 주 1등은 바로 나!</p>
            </div>

            <div className={`card shadow-lg mb-5 border-0 bg-dark p-3 p-md-5 main-card ${isSpinning ? 'shaking-card' : ''}`} 
                 style={{ borderRadius: '35px', transition: 'all 0.3s' }}>
                <div className="card-body p-0">
                    <div className="lotto-responsive-container">
                        <div className="main-balls-grid">
                            {displayNumbers.slice(0, 6).map((num, idx) => (
                                <div key={idx} className={`ball-slot ${activeIdx === idx ? 'active-glow' : ''}`}>
                                    <div className={`lotto-ball shadow-lg ${getBallColor(num)} ${num !== "?" ? 'confirmed' : ''}`}>
                                        {num}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={`bonus-plus ${activeIdx === 6 ? 'text-warning' : 'text-white'}`}>+</div>

                        <div className={`bonus-ball-slot ${activeIdx === 6 ? 'active-glow' : ''}`}>
                            <div className={`lotto-ball shadow-lg ${getBallColor(displayNumbers[6])} ${displayNumbers[6] !== "?" ? 'confirmed' : ''}`}>
                                {displayNumbers[6]}
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 text-center px-3">
                        <button 
                            className={`btn ${isSpinning ? 'btn-secondary disabled' : 'btn-warning'} w-100 w-md-auto px-5 py-3 rounded-pill fw-bold fs-3 shadow-lg main-btn`}
                            onClick={generateLotto}
                        >
                            {isSpinning ? "번호 조합 중..." : "행운 섞기 시작"}
                            <FaRotateRight className={`ms-2 ${isSpinning ? 'fa-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {history.length > 0 && (
                <div className="mt-5 px-1">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4 className="fw-bold mb-0 small text-secondary"><FaTicket className="me-2"/>RECENT DRAW HISTORY</h4>
                        <button className="btn btn-sm text-danger p-0 border-0" onClick={() => setHistory([])}>
                            <FaTrashCan className="me-1" /> 비우기
                        </button>
                    </div>
                    
                    <div className="history-receipt shadow-sm rounded-4 overflow-hidden bg-white">
                        {history.map((set, idx) => (
                            <div key={idx} className="receipt-row d-flex align-items-center justify-content-center p-3 border-bottom animate-slide-in">
                                <div className="d-flex gap-1 gap-md-2 align-items-center">
                                    {set.map((n, i) => (
                                        <React.Fragment key={i}>
                                            {i === 6 && <span className="text-muted fw-bold mx-1">+</span>}
                                            <span className={`badge rounded-circle d-flex align-items-center justify-content-center ${getBallColor(n)} shadow-sm`} 
                                                  style={{ width: '34px', height: '34px', fontSize: '12px', fontWeight: 'bold' }}>
                                                {n}
                                            </span>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                /* 레이아웃 제어 */
                .lotto-responsive-container { display: flex; flex-direction: column; align-items: center; gap: 15px; }
                .main-balls-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
                .bonus-plus { font-size: 3rem; font-weight: bold; line-height: 1; transition: color 0.3s; }

                @media (min-width: 992px) {
                    .lotto-responsive-container { flex-direction: row; justify-content: center; gap: 30px; }
                    .main-balls-grid { grid-template-columns: repeat(6, 1fr); gap: 15px; }
                }

                /* 공 스타일 및 애니메이션 */
                .lotto-ball {
                    width: 70px; height: 70px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 900; font-size: 1.8rem;
                    border: 4px solid rgba(255,255,255,0.15);
                    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                /* [긴장감] 번호가 확정될 때 팡! 튀어오르는 효과 */
                .lotto-ball.confirmed {
                    animation: ballPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.5) forwards;
                    border: 4px solid rgba(255,255,255,0.4);
                }

                @keyframes ballPop {
                    0% { transform: scale(0.7); filter: brightness(2); }
                    70% { transform: scale(1.15); filter: brightness(1.2); }
                    100% { transform: scale(1); filter: brightness(1); }
                }

                /* [긴장감] 현재 추첨 중인 슬롯 강조 */
                .active-glow {
                    position: relative;
                }
                .active-glow::after {
                    content: ''; position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px;
                    border-radius: 50%; background: rgba(255, 193, 7, 0.2);
                    animation: pulse 0.6s infinite alternate;
                }

                @keyframes pulse {
                    from { transform: scale(0.9); opacity: 0.5; }
                    to { transform: scale(1.1); opacity: 1; }
                }

                /* [긴장감] 추첨 중 기계가 미세하게 떨리는 효과 */
                .shaking-card {
                    animation: machineShake 0.1s infinite;
                }
                @keyframes machineShake {
                    0% { transform: translate(1px, 1px); }
                    50% { transform: translate(-1px, 0px); }
                    100% { transform: translate(1px, -1px); }
                }

                .main-btn { transition: all 0.2s; }
                .main-btn:hover:not(.disabled) { transform: translateY(-3px) scale(1.05); }

                .animate-slide-in {
                    animation: slideIn 0.4s ease-out forwards;
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @media (max-width: 400px) {
                    .lotto-ball { width: 60px; height: 60px; font-size: 1.5rem; }
                }
            `}</style>
        </div>
    );
}