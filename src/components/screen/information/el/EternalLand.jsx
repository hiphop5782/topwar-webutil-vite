import { Link, Outlet } from "react-router-dom";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";

export default function EternalLand() {

    //render
    return (<>
        <h1>영원의 땅(EL)</h1>
        <p className="text-muted">8개의 서버가 모여 영역 전쟁을 벌이고 왕중왕을 가린다!</p>
        <div className="row mb-4">
            <div className="col">
                <LanguageRouterLink className="btn btn-secondary" to={"/information/el"}>지도 및 점수</LanguageRouterLink>
                <LanguageRouterLink className="btn btn-success ms-2" to={"/information/el/howto"}>진행 방법(작성중)</LanguageRouterLink>
                <LanguageRouterLink className="btn btn-info ms-2" to={"/information/el/tip"}>각종 Tip(작성중)</LanguageRouterLink>
                <LanguageRouterLink className="btn btn-info ms-2" to={"/information/el/reward"}>획득 보상(작성중)</LanguageRouterLink>
                <LanguageRouterLink className="btn btn-secondary ms-2" to={"/information/el/darkforce"}>암흑 점수</LanguageRouterLink>
            </div>
        </div>
        <hr/>

        <Outlet/>
    </>)
}