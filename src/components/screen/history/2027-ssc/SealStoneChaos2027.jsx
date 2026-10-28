import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";

import LanguageRouterLink from "@src/components/template/LanguageRouterLink";

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

        <div className="d-flex flex-wrap gap-2" aria-label={t("Ssc2Main.navigation")}>
            <button type="button" className="btn btn-outline-secondary" disabled>
                {t("Ssc2Main.servers")}
                <span className="badge text-bg-secondary ms-2">{t("Ssc2Main.preparing")}</span>
            </button>
            <button type="button" className="btn btn-outline-secondary" disabled>
                {t("Ssc2Main.users")}
                <span className="badge text-bg-secondary ms-2">{t("Ssc2Main.preparing")}</span>
            </button>
            <LanguageRouterLink
                to="/history/ssc-2027/train"
                className={`btn ${routePath === "/history/ssc-2027/train" ? "btn-secondary" : "btn-outline-secondary"}`}
            >
                {t("Ssc2Main.train")}
            </LanguageRouterLink>
        </div>

        <hr />
        <Outlet />
    </>);
}
