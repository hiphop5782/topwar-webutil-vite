import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { Outlet } from "react-router-dom";

export default function TopwarDataViewer() {

    return (<>
        <h1>탑워 데이터 뷰어</h1>
        <div className="row mb-4">
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/data`} className="btn btn-primary w-100 text-nowrap">유저 데이터</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/data/server`} className="btn btn-primary w-100 text-nowrap">서버 데이터</LanguageRouterLink>
            </div>
            <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                <LanguageRouterLink to={`/information/data/alliance`} className="btn btn-primary w-100 text-nowrap">동맹 데이터</LanguageRouterLink>
            </div>
        </div>

        <hr/>

        <Outlet/>
    </>);
}