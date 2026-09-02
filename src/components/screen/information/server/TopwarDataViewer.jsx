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
    </>);
}
