import { Link, Outlet } from "react-router-dom";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";

export default function EternalLand() {

    //render
    return (<>
        <h1>영원의 땅(EL)</h1>
        <p className="text-muted">8개의 서버가 모여 영역 전쟁을 벌이고 왕중왕을 가린다!</p>
        <div className="row mb-4">
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink className="btn btn-secondary w-100 text-nowrap" to={"/information/el"}>지도 및 점수</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink className="btn btn-success w-100 text-nowrap" to={"/information/el/howto"}>진행 방법(작성중)</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink className="btn btn-info w-100 text-nowrap" to={"/information/el/tip"}>각종 Tip(작성중)</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink className="btn btn-info w-100 text-nowrap" to={"/information/el/reward"}>획득 보상(작성중)</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink className="btn btn-warning w-100 text-nowrap" to={"/information/el/darkforce"}>암흑 점수 계산</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink className="btn btn-danger w-100 text-nowrap" to={"/information/el/score"}>점령 점수 계산</LanguageRouterLink>
            </div>
        </div>
        <hr/>

        <Outlet/>
    </>)
}