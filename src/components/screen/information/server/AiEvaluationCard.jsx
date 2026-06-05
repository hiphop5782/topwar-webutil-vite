import { useTranslation } from "react-i18next";
import "./AiEvaluationCard.css";

export default function AiEvaluationCard({ evaluation }) {
    if (!evaluation) return null;

    const { t } = useTranslation("viewer", "commons");

    const activityScore = Number(evaluation.activityScore ?? 0);
    const riskScore = Number(evaluation.riskScore ?? 0);

    const getActivityLabel = (score) => {
        if (score >= 80) return t("AiEvaluationCard.activity-veryhigh");
        if (score >= 60) return t("AiEvaluationCard.activity-high");
        if (score >= 40) return t("AiEvaluationCard.activity-normal");
        if (score >= 20) return t("AiEvaluationCard.activity-low");
        return t("AiEvaluationCard.activity-disabled");
    };

    const getRiskLabel = (score) => {
        if (score >= 80) return t("AiEvaluationCard.risk-veryhigh");
        if (score >= 60) return t("AiEvaluationCard.risk-high");
        if (score >= 40) return t("AiEvaluationCard.risk-normal");
        if (score >= 20) return t("AiEvaluationCard.risk-low");
        return t("AiEvaluationCard.risk-disabled");
    };

    return (
        <section className="ai-evaluation-card">
            <div className="ai-evaluation-header">
                <div>
                    <p className="eyebrow">AI SERVER REPORT</p>
                    <h2>{t("AiEvaluationCard.card-title")}</h2>
                </div>

                <div className="score-badges">
                    <div className="score-badge activity">
                        <span>{t("AiEvaluationCard.card-activity")}</span>
                        <strong>{activityScore}</strong>
                        <em>{getActivityLabel(activityScore)}</em>
                    </div>

                    <div className="score-badge risk">
                        <span>{t("AiEvaluationCard.card-risk")}</span>
                        <strong>{riskScore}</strong>
                        <em>{getRiskLabel(riskScore)}</em>
                    </div>
                </div>
            </div>

            <div className="summary-box">
                <h3>{t("AiEvaluationCard.card-summary")}</h3>
                <p>{evaluation.summary}</p>
            </div>

            <div className="evaluation-grid">
                <div className="evaluation-section">
                    <h3>{t("AiEvaluationCard.card-strength")}</h3>
                    <ul>
                        {(evaluation.strengths ?? []).map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="evaluation-section warning">
                    <h3>{t("AiEvaluationCard.card-weakness")}</h3>
                    <ul>
                        {(evaluation.weaknesses ?? []).map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="recommendation-box">
                <h3>{t("AiEvaluationCard.card-recommand")}</h3>
                <p>{evaluation.recommendation}</p>
            </div>
        </section>
    );
}