import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import SscDashboard from "@src/components/screen/history/2026-ssc/SscDashboard";

import "./Ssc2ServerRank.css";

const SERVER_RANK_MODULES = import.meta.glob(
    "/src/assets/json/ssc2/server/*.json",
    { eager: true, import: "default" },
);

const STAGES = [
    { key: "preview", totalRounds: 4 },
    { key: "final", totalRounds: 16 },
];

const getSourceInfo = (sourcePath, document) => {
    const fileName = sourcePath.split("/").at(-1) ?? "";
    const match = fileName.match(
        /ssc2-(preview|preliminary|qualifier|main|regular|finals?|tournament)-round(\d+)\.json$/i,
    );
    const fileStage = match?.[1]?.toLowerCase();
    const documentTotal = Number(document?.round?.total);
    const stage = fileStage
        ? ["preview", "preliminary", "qualifier"].includes(fileStage)
            ? "preview"
            : "final"
        : documentTotal === 4
            ? "preview"
            : documentTotal === 16
                ? "final"
                : null;
    const round = Number(match?.[2] ?? document?.round?.current);

    if (!stage || !Number.isInteger(round) || round < 1) {
        return null;
    }

    return { stage, round };
};

const SERVER_RANK_DATA = Object.entries(SERVER_RANK_MODULES)
    .flatMap(([sourcePath, document]) => {
        const sourceInfo = getSourceInfo(sourcePath, document);

        if (!sourceInfo || !Array.isArray(document?.rankings)) {
            return [];
        }

        return document.rankings.map(item => ({
            round: sourceInfo.round,
            rank: Number(item.rank),
            score: Number(item.totalPoints ?? 0),
            score2: Number(item.honor ?? 0),
            sid: Number(item.serverId),
            serverFlag: Number(item.serverFlag ?? 0),
            stage: sourceInfo.stage,
        }));
    });

export default function Ssc2ServerRank() {
    const { t } = useTranslation("viewer");
    const [searchParams, setSearchParams] = useSearchParams();

    const stageData = useMemo(() => Object.fromEntries(
        STAGES.map(stage => [
            stage.key,
            SERVER_RANK_DATA.filter(item => item.stage === stage.key),
        ]),
    ), []);

    const availableStages = useMemo(
        () => STAGES.filter(stage => stageData[stage.key].length > 0),
        [stageData],
    );
    const requestedStage = searchParams.get("stage");
    const selectedStage = availableStages.some(stage => stage.key === requestedStage)
        ? requestedStage
        : availableStages[0]?.key ?? null;
    const selectedData = selectedStage ? stageData[selectedStage] : [];

    const roundCounts = useMemo(() => Object.fromEntries(
        STAGES.map(stage => [
            stage.key,
            new Set(stageData[stage.key].map(item => item.round)).size,
        ]),
    ), [stageData]);

    const selectStage = stage => {
        if (stageData[stage].length === 0) return;

        setSearchParams(previous => {
            const next = new URLSearchParams(previous);
            next.set("stage", stage);
            next.delete("round");
            return next;
        }, { replace: true });
    };

    return (
        <section className="ssc2-server-rank">
            <div className="ssc2-server-stage-card">
                <div>
                    <h2 className="h6 fw-bold mb-1">
                        {t("Ssc2ServerRank.stageTitle")}
                    </h2>
                    <p className="small text-secondary mb-0">
                        {t("Ssc2ServerRank.stageDescription")}
                    </p>
                </div>

                <div
                    className="ssc2-server-stage-switch"
                    role="group"
                    aria-label={t("Ssc2ServerRank.stageTitle")}
                >
                    {STAGES.map(stage => {
                        const isAvailable = stageData[stage.key].length > 0;
                        const isActive = selectedStage === stage.key;

                        return (
                            <button
                                key={stage.key}
                                type="button"
                                className={`btn ${isActive ? "btn-primary" : "btn-outline-primary"}`}
                                disabled={!isAvailable}
                                aria-pressed={isActive}
                                onClick={() => selectStage(stage.key)}
                            >
                                <span className="fw-bold">
                                    {t(`Ssc2ServerRank.stages.${stage.key}`)}
                                </span>
                                <span className="small ms-2">
                                    {t("Ssc2ServerRank.roundProgress", {
                                        current: roundCounts[stage.key],
                                        total: stage.totalRounds,
                                    })}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {selectedStage ? (
                <SscDashboard
                    key={selectedStage}
                    data={selectedData}
                    eyebrow={t("Ssc2ServerRank.eyebrow", {
                        stage: t(`Ssc2ServerRank.stages.${selectedStage}`),
                    })}
                    titleKey="Ssc2ServerRank.title"
                    descriptionKey="Ssc2ServerRank.description"
                />
            ) : (
                <div className="alert alert-secondary mt-3 mb-0" role="status">
                    {t("Ssc2ServerRank.noData")}
                </div>
            )}
        </section>
    );
}
