import React, { useState, useCallback, useEffect } from 'react';
import { FaRotateRight, FaTrashCan, FaCheck } from "react-icons/fa6";
import { toast } from "react-toastify";

export default function LottoGenerator() {
    const [numbers, setNumbers] = useState([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [history, setHistory] = useState([]);

    // 로또 번호 색상 결정 함수
    const getBallColor = (num) => {
        if (num <= 10) return 'bg-warning text-dark'; // 1~10번 노란색
        if (num <= 20) return 'bg-primary text-white'; // 11~20번 파란색
        if (num <= 30) return 'bg-danger text-white';  // 21~30번 빨간색
        if (num <= 40) return 'bg-secondary text-white'; // 31~40번 회색
        return 'bg-success text-white'; // 41~45번 초록색
    };

    // 번호 생성 로직
    const generateLotto = useCallback(() => {
        setIsSpinning(true);
        setNumbers([]);

        // 애니메이션 효과를 위해 약간의 지연을 줍니다.
        setTimeout(() => {
            const newNumbers = [];
            while (newNumbers.length < 6) {
                const num = Math.floor(Math.random() * 45) + 1;
                if (!newNumbers.includes(num)) {
                    newNumbers.push(num);
                }
            }
            // 오름차순 정렬
            newNumbers.sort((a, b) => a - b);
            
            setNumbers(newNumbers);
            setHistory(prev => [newNumbers, ...prev].slice(0, 10)); // 최근 10개까지만 저장
            setIsSpinning(false);
            toast.success("행운의 번호가 생성되었습니다!");
        }, 800);
    }, []);

    const clearHistory = () => {
        if (window.confirm("생성 내역을 모두 지우시겠습니까?")) {
            setHistory([]);
            setNumbers([]);
        }
    };

    return (
        <div className="container py-4">
            <div className="text-center mb-5">
                <h1 className="fw-bold text-primary">Lotto 6/45</h1>
                <p className="text-muted">버튼을 눌러 행운의 번호를 확인하세요!</p>
            </div>

            {/* 번호 표시 영역 */}
            <div className="card shadow-sm mb-4 border-0 bg-light">
                <div className="card-body py-5 text-center">
                    <div className="d-flex justify-content-center gap-3 mb-4">
                        {numbers.length > 0 ? (
                            numbers.map((num, idx) => (
                                <div 
                                    key={idx}
                                    className={`lotto-ball shadow ${getBallColor(num)} d-flex align-items-center justify-content-center fw-bold fs-2 rounded-circle`}
                                    style={{ width: '60px', height: '60px', transition: 'all 0.3s' }}
                                >
                                    {num}
                                </div>
                            ))
                        ) : (
                            <div className="text-muted fs-4 py-3">
                                {isSpinning ? "추첨 중..." : "준비 완료!"}
                            </div>
                        )}
                    </div>

                    <button 
                        className={`btn btn-lg ${isSpinning ? 'btn-secondary' : 'btn-primary'} px-5 py-3 rounded-pill shadow`}
                        onClick={generateLotto}
                        disabled={isSpinning}
                    >
                        <FaRotateRight className={`me-2 ${isSpinning ? 'fa-spin' : ''}`} />
                        번호 생성하기
                    </button>
                </div>
            </div>

            {/* 최근 내역 영역 */}
            {history.length > 0 && (
                <div className="mt-5">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4 className="mb-0">최근 생성 번호</h4>
                        <button className="btn btn-sm btn-outline-danger border-0" onClick={clearHistory}>
                            <FaTrashCan className="me-1" /> 내역 삭제
                        </button>
                    </div>
                    <div className="list-group shadow-sm">
                        {history.map((set, idx) => (
                            <div key={idx} className="list-group-item d-flex align-items-center justify-content-between p-3">
                                <span className="text-muted small">#{history.length - idx}</span>
                                <div className="d-flex gap-2">
                                    {set.map(n => (
                                        <span key={n} className={`badge rounded-circle d-flex align-items-center justify-content-center ${getBallColor(n)}`} style={{width:'30px', height:'30px'}}>
                                            {n}
                                        </span>
                                    ))}
                                </div>
                                <FaCheck className="text-success" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                .lotto-ball {
                    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes popIn {
                    0% { transform: scale(0); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}