import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";

export default function SealStoneChaos() {
    const path = useLocation();
    const { t, i18n } = useTranslation("viewer");
    const url = useMemo(()=>{
        return path.pathname.replace(`/${i18n.language}`, ``);
    }, [path, i18n]);

    return (<>
        <h1>{t("SscMain.title")}</h1>
        <p>{t("SscMain.detail")}</p>

        <LanguageRouterLink to={`/history/ssc-2026`} className={`btn ${url === "/history/ssc-2026" ? "btn-secondary" : "btn-outline-secondary"}`}>{t("SscMain.servers")}</LanguageRouterLink>
        <LanguageRouterLink to={`/history/ssc-2026/users`} className={`btn ${url === "/history/ssc-2026/users" ? "btn-secondary" : "btn-outline-secondary"} ms-2`}>{t("SscMain.users")}</LanguageRouterLink>

        <hr/>

        <Outlet/>
    </>)
}