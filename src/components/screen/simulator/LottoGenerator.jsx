import React, { useState, useCallback } from 'react';
import { FaRotateRight, FaTrashCan, FaTicket } from "react-icons/fa6";
import confetti from 'canvas-confetti';

export default function LottoGenerator() {
    const [isSpinning, setIsSpinning] = useState(false);
    const [history, setHistory] = useState([]);
    const [displayNumbers, setDisplayNumbers] = useState(Array(7).fill("?"));
    const [activeIdx, setActiveIdx] = useState(-1);

    const getBallStyle = (num) => {
        if (!num || num === "?") return 'ball-empty';
        if (num <= 10) return 'ball-yellow';
        if (num <= 20) return 'ball-blue';
        if (num <= 30) return 'ball-red';
        if (num <= 40) return 'ball-gray';
        return 'ball-green';
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

        for (let i = 0; i < 7; i++) {
            setActiveIdx(i);
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
                }, 60);
            });

            setDisplayNumbers(prev => {
                const next = [...prev];
                next[i] = pickedNumbers[i];
                return next;
            });

            if (i === 5) await new Promise(r => setTimeout(r, 800));
        }

        const mainNumbers = pickedNumbers.slice(0, 6).sort((a, b) => a - b);
        const bonusNum = pickedNumbers[6];
        
        setActiveIdx(-1);
        setHistory(prev => [[...mainNumbers, bonusNum], ...prev].slice(0, 10));
        setIsSpinning(false);
        fireConfetti();
    }, [isSpinning]);

    return (
        <div className="container py-4 px-2" style={{ maxWidth: '850px', fontFamily: 'Pretendard, sans-serif' }}>
            {/* 제목 섹션: 골드 메탈릭 효과 적용 */}
            <div className="text-center mb-4">
                <h1 className="fw-bold display-5 golden-title">PREMIUM LOTTO</h1>
                <p className="text-muted small">황금빛 행운이 당신과 함께하기를!</p>
            </div>

            <div className={`card shadow-lg mb-5 border-0 bg-dark p-3 p-md-5 main-card ${isSpinning ? 'shaking-card' : ''}`} 
                 style={{ borderRadius: '35px', background: 'linear-gradient(145deg, #1a1a1a, #2a2a2a)' }}>
                <div className="card-body p-0">
                    <div className="lotto-responsive-container">
                        <div className="main-balls-grid">
                            {displayNumbers.slice(0, 6).map((num, idx) => (
                                <div key={idx} className={`ball-slot ${activeIdx === idx ? 'active-glow' : ''}`}>
                                    <div className={`lotto-ball ${getBallStyle(num)} ${num !== "?" ? 'confirmed' : ''}`}>
                                        <span className="ball-number">{num}</span>
                                    </div>
                                    <div className="ball-shadow"></div>
                                </div>
                            ))}
                        </div>

                        <div className={`bonus-plus ${activeIdx === 6 ? 'text-warning' : 'text-white'}`}>+</div>

                        <div className={`bonus-ball-slot ${activeIdx === 6 ? 'active-glow' : ''}`}>
                            <div className={`lotto-ball ${getBallStyle(displayNumbers[6])} ${displayNumbers[6] !== "?" ? 'confirmed' : ''}`}>
                                <span className="ball-number">{displayNumbers[6]}</span>
                            </div>
                            <div className="ball-shadow"></div>
                        </div>
                    </div>

                    <div className="mt-5 text-center px-3">
                        <button 
                            className={`btn ${isSpinning ? 'btn-secondary disabled' : 'btn-warning'} w-100 w-md-auto px-5 py-3 rounded-pill fw-bold fs-3 shadow-lg main-btn`}
                            onClick={generateLotto}
                        >
                            {isSpinning ? "추첨 대기 중..." : "황금 번호 뽑기"}
                            <FaRotateRight className={`ms-2 ${isSpinning ? 'fa-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {history.length > 0 && (
                <div className="mt-5 px-1">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4 className="fw-bold mb-0 small text-secondary"><FaTicket className="me-2"/>최근 추첨 내역</h4>
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
                                            <div className={`history-ball ${getBallStyle(n)}`}>
                                                {n}
                                            </div>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                /* 황금색 반짝임 효과 (Golden Shimmer) */
                .golden-title {
                    background: linear-gradient(
                        to right, 
                        #BF953F 0%, 
                        #FCF6BA 20%, 
                        #B38728 40%, 
                        #FBF5B7 60%, 
                        #AA771C 80%,
                        #BF953F 100%
                    );
                    background-size: 200% auto;
                    color: #BF953F;
                    background-clip: text;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: shine 3s linear infinite;
                    display: inline-block;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
                }

                @keyframes shine {
                    to { background-position: 200% center; }
                }

                .lotto-responsive-container { display: flex; flex-direction: column; align-items: center; gap: 20px; }
                .main-balls-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                .bonus-plus { font-size: 3rem; font-weight: bold; line-height: 1; text-shadow: 0 0 10px rgba(255,255,255,0.3); }

                @media (min-width: 992px) {
                    .lotto-responsive-container { flex-direction: row; justify-content: center; gap: 30px; }
                    .main-balls-grid { grid-template-columns: repeat(6, 1fr); gap: 15px; }
                }

                .ball-slot { position: relative; display: flex; flex-direction: column; align-items: center; }

                .lotto-ball {
                    width: 75px; height: 75px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    position: relative; z-index: 2;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: inset -8px -8px 15px rgba(0,0,0,0.3), inset 8px 8px 15px rgba(255,255,255,0.2);
                }

                .ball-number {
                    font-weight: 900; font-size: 1.8rem; z-index: 3;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                }

                .ball-shadow {
                    width: 50px; height: 8px; background: rgba(0,0,0,0.4);
                    border-radius: 50%; margin-top: 8px; filter: blur(4px);
                    transition: all 0.3s; opacity: 0.6;
                }

                .ball-empty { background: radial-gradient(circle at 30% 30%, #ffffff, #d1d1d1); color: #999; }
                .ball-yellow { background: radial-gradient(circle at 30% 30%, #ffeb3b, #fbc02d); color: #000; }
                .ball-blue { background: radial-gradient(circle at 30% 30%, #44a1ff, #1976d2); color: #fff; }
                .ball-red { background: radial-gradient(circle at 30% 30%, #ff6b6b, #d32f2f); color: #fff; }
                .ball-gray { background: radial-gradient(circle at 30% 30%, #adb5bd, #616161); color: #fff; }
                .ball-green { background: radial-gradient(circle at 30% 30%, #69db7c, #388e3c); color: #fff; }

                .lotto-ball.confirmed {
                    animation: ballPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.5) forwards;
                }

                @keyframes ballPop {
                    0% { transform: scale(0.5) translateY(-20px); }
                    70% { transform: scale(1.1) translateY(5px); }
                    100% { transform: scale(1) translateY(0); }
                }

                .history-ball {
                    width: 32px; height: 32px; border-radius: 50%;
                    font-size: 11px; font-weight: bold;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: inset -2px -2px 4px rgba(0,0,0,0.2);
                }

                .active-glow::before {
                    content: ''; position: absolute; top: -5px; width: 85px; height: 85px;
                    border-radius: 50%; background: rgba(255, 193, 7, 0.15);
                    animation: pulse 0.8s infinite alternate; z-index: 1;
                }

                @keyframes pulse {
                    from { transform: scale(0.95); opacity: 0.3; }
                    to { transform: scale(1.15); opacity: 0.7; }
                }

                .shaking-card { animation: machineShake 0.15s infinite; }
                @keyframes machineShake {
                    0% { transform: rotate(0.1deg); }
                    50% { transform: rotate(-0.1deg); }
                    100% { transform: rotate(0.1deg); }
                }

                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                @media (max-width: 400px) {
                    .lotto-ball { width: 60px; height: 60px; }
                    .ball-number { font-size: 1.4rem; }
                }
            `}</style>
        </div>
    );
}