import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaServer, FaTruckFast, FaUsers } from "react-icons/fa6";
import { Outlet, useLocation } from "react-router-dom";

import LanguageRouterLink from "@src/components/template/LanguageRouterLink";

import "./SealStoneChaos2027.css";

export default function SealStoneChaos2027() {
    const location = useLocation();
    const { t, i18n } = useTranslation("viewer");
    const routePath = useMemo(
        () => location.pathname.replace(`/${i18n.language}`, ""),
        [i18n.language, location.pathname],
    );

    return (<>
        <h1>{t("Ssc2Main.title")}</h1>
        <p>{t("Ssc2Main.detail")}</p>

        <nav className="ssc2-section-navigation" aria-label={t("Ssc2Main.navigation")}>
            <LanguageRouterLink
                to="/history/ssc-2027"
                aria-current={routePath === "/history/ssc-2027" ? "page" : undefined}
                className={`ssc2-section-tab ${routePath === "/history/ssc-2027" ? "is-active" : ""}`}
            >
                <FaServer className="ssc2-section-tab-icon" aria-hidden="true" />
                <span className="ssc2-section-tab-label">{t("Ssc2Main.servers")}</span>
            </LanguageRouterLink>
            <LanguageRouterLink
                to="/history/ssc-2027/users"
                aria-current={routePath === "/history/ssc-2027/users" ? "page" : undefined}
                className={`ssc2-section-tab ${routePath === "/history/ssc-2027/users" ? "is-active" : ""}`}
            >
                <FaUsers className="ssc2-section-tab-icon" aria-hidden="true" />
                <span className="ssc2-section-tab-label">{t("Ssc2Main.users")}</span>
            </LanguageRouterLink>
            <LanguageRouterLink
                to="/history/ssc-2027/train"
                aria-current={routePath === "/history/ssc-2027/train" ? "page" : undefined}
                className={`ssc2-section-tab ${routePath === "/history/ssc-2027/train" ? "is-active" : ""}`}
            >
                <FaTruckFast className="ssc2-section-tab-icon" aria-hidden="true" />
                <span className="ssc2-section-tab-label">{t("Ssc2Main.train")}</span>
            </LanguageRouterLink>
        </nav>

        <hr className="ssc2-section-divider" />
        <Outlet />
    </>);
}
