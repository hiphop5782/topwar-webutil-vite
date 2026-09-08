import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";

import SupportBanner from "@src/components/template/SupportBanner";

export default function TopwarDataViewer() {
    const location = useLocation();
    const {t}= useTranslation("viewer");
    
    // 현재 경로가 링크의 경로와 일치하는지 확인하는 함수
    const getBtnClass = useCallback((path) => {
        // 정확히 일치하거나, 하위 경로를 포함하는지 조건에 따라 설정
        const isActive = location.pathname.endsWith(path);
        return isActive 
            ? "btn btn-primary w-100 text-nowrap"  // 활성화 시 (Fill)
            : "btn btn-outline-primary w-100 text-nowrap"; // 비활성화 시 (Outline)
    }, [location]);

    return (<>
        <div className="row mb-4">
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/data`} className={getBtnClass("/information/data")}>{t(`TopwarDataViewer.btn-player-data`)}</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink
                    to={`/information/data/overall`}
                    className={`btn btn-danger w-100 text-nowrap fw-bold shadow-sm${location.pathname.endsWith("/information/data/overall") ? " active" : ""}`}
                    aria-current={location.pathname.endsWith("/information/data/overall") ? "page" : undefined}
                >
                    {t(`TopwarDataViewer.btn-overall`)}
                </LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/data/player-detail`} className={getBtnClass("/information/data/player-detail")}>플레이어 통합 조회</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/data/server`} className={getBtnClass("/information/data/server")}>{t(`TopwarDataViewer.btn-server-data`)}</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/data/alliance`} className={getBtnClass("/information/data/alliance")}>{t(`TopwarDataViewer.btn-alliance-data`)}</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/data/move`} className={getBtnClass("/information/data/move")}>{t(`TopwarDataViewer.btn-server-move`)}</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/data/nickname`} className={getBtnClass("/information/data/nickname")}>{t(`TopwarDataViewer.btn-nickname-history`)}</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/data/realpower`} className={getBtnClass("/information/data/realpower")}>{t(`TopwarDataViewer.btn-realpower`)}</LanguageRouterLink>
            </div>
        </div>

        <SupportBanner className="mb-4"></SupportBanner>

        <hr/>

        <Outlet/>

        <section className="mt-5 pt-4 border-top" aria-labelledby="data-reading-guide">
            <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
                <div>
                    <p className="small fw-bold text-primary mb-1">{t("TopwarDataViewer.guide.eyebrow")}</p>
                    <h2 id="data-reading-guide" className="h3 fw-bold">{t("TopwarDataViewer.guide.title")}</h2>
                    <p className="text-secondary mb-0">{t("TopwarDataViewer.guide.description")}</p>
                </div>
                <LanguageRouterLink to="/about" className="btn btn-outline-secondary align-self-lg-start text-nowrap">
                    {t("TopwarDataViewer.guide.methodButton")}
                </LanguageRouterLink>
            </div>

            <div className="row g-3 mb-4">
                {["sample", "activity", "power", "timing"].map((key) => (
                    <div className="col-12 col-md-6" key={key}>
                        <div className="card h-100 border-0 bg-light">
                            <div className="card-body">
                                <h3 className="h6 fw-bold">{t(`TopwarDataViewer.guide.items.${key}.title`)}</h3>
                                <p className="small text-secondary mb-0">{t(`TopwarDataViewer.guide.items.${key}.body`)}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <h3 className="h5 fw-bold">{t("TopwarDataViewer.guide.analysisTitle")}</h3>
            <div className="list-group">
                <LanguageRouterLink to="/post/2026-06-30-001-Server-Tier" className="list-group-item list-group-item-action">
                    <strong>{t("TopwarDataViewer.guide.serverTierTitle")}</strong>
                    <span className="d-block small text-secondary">{t("TopwarDataViewer.guide.serverTierBody")}</span>
                </LanguageRouterLink>
                <LanguageRouterLink to="/history/ssc-2026" className="list-group-item list-group-item-action">
                    <strong>{t("TopwarDataViewer.guide.sscTitle")}</strong>
                    <span className="d-block small text-secondary">{t("TopwarDataViewer.guide.sscBody")}</span>
                </LanguageRouterLink>
                <LanguageRouterLink to="/post" className="list-group-item list-group-item-action">
                    <strong>{t("TopwarDataViewer.guide.moreTitle")}</strong>
                    <span className="d-block small text-secondary">{t("TopwarDataViewer.guide.moreBody")}</span>
                </LanguageRouterLink>
            </div>
        </section>
    </>);
}
