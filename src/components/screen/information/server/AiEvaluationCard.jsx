import "./AiEvaluationCard.css";

export default function AiEvaluationCard({ evaluation }) {
    if (!evaluation) return null;

    const activityScore = Number(evaluation.activityScore ?? 0);
    const riskScore = Number(evaluation.riskScore ?? 0);

    const getActivityLabel = (score) => {
        if (score >= 80) return "매우 활발";
        if (score >= 60) return "활발";
        if (score >= 40) return "보통";
        if (score >= 20) return "저활동";
        return "비활성";
    };

    const getRiskLabel = (score) => {
        if (score >= 80) return "위험 높음";
        if (score >= 60) return "주의 필요";
        if (score >= 40) return "보통";
        if (score >= 20) return "낮음";
        return "안정";
    };

    return (
        <section className="ai-evaluation-card">
            <div className="ai-evaluation-header">
                <div>
                    <p className="eyebrow">AI SERVER REPORT</p>
                    <h2>서버 활동성 평가</h2>
                </div>

                <div className="score-badges">
                    <div className="score-badge activity">
                        <span>활동 점수</span>
                        <strong>{activityScore}</strong>
                        <em>{getActivityLabel(activityScore)}</em>
                    </div>

                    <div className="score-badge risk">
                        <span>위험 점수</span>
                        <strong>{riskScore}</strong>
                        <em>{getRiskLabel(riskScore)}</em>
                    </div>
                </div>
            </div>

            <div className="summary-box">
                <h3>한줄 요약</h3>
                <p>{evaluation.summary}</p>
            </div>

            <div className="evaluation-grid">
                <div className="evaluation-section">
                    <h3>강점</h3>
                    <ul>
                        {(evaluation.strengths ?? []).map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="evaluation-section warning">
                    <h3>약점 / 위험 신호</h3>
                    <ul>
                        {(evaluation.weaknesses ?? []).map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="recommendation-box">
                <h3>운영 추천</h3>
                <p>{evaluation.recommendation}</p>
            </div>
        </section>
    );
}