import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";

export default function KartzDataViewer() {

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
                <LanguageRouterLink to={`/information/kartz/`} className={getBtnClass("/")}>몬스터 정보</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/kartz/rank`} className={getBtnClass("/information/kartz/rank")}>회차별 순위</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/kartz/server`} className={getBtnClass("/information/kartz/server")}>서버 히스토리</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/kartz/user`} className={getBtnClass("/information/kartz/user")}>유저 히스토리</LanguageRouterLink>
            </div>
        </div>

        <hr/>

        <Outlet/>
    </>)
}