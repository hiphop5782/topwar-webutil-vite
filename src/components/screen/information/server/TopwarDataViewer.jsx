import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";

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
                <LanguageRouterLink to={`/information/data/server`} className={getBtnClass("/information/data/server")}>{t(`TopwarDataViewer.btn-server-data`)}</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/data/alliance`} className={getBtnClass("/information/data/alliance")}>{t(`TopwarDataViewer.btn-alliance-data`)}</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/data/compare`} className={getBtnClass("/information/data/compare")}>{t(`TopwarDataViewer.btn-server-compare`)}</LanguageRouterLink>
            </div>
        </div>

        <hr/>

        <Outlet/>
    </>);
}