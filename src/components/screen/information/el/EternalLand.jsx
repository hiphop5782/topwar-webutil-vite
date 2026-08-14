import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import SEO from "../../../template/SEO";

export default function EternalLand() {
    const { t } = useTranslation("viewer");

    return (
        <>
            <SEO title={t("seo:information.el.home.title")}/>

            <nav
                className="row mb-4"
                aria-label={t(
                    "eternalLand.navigationAria"
                )}
            >
                <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                    <LanguageRouterLink
                        className="btn btn-secondary w-100"
                        to="/information/el"
                    >
                        {t(
                            "eternalLand.menu.mapAndScore"
                        )}
                    </LanguageRouterLink>
                </div>

                <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                    <LanguageRouterLink
                        className="btn btn-warning w-100"
                        to="/information/el/darkforce"
                    >
                        {t(
                            "eternalLand.menu.darkforceScore"
                        )}
                    </LanguageRouterLink>
                </div>

                <div className="col-sm-6 col-md-4 col-lg-3 mb-2">
                    <LanguageRouterLink
                        className="btn btn-danger w-100"
                        to="/information/el/score"
                    >
                        {t(
                            "eternalLand.menu.occupationScore"
                        )}
                    </LanguageRouterLink>
                </div>
            </nav>

            <hr />

            <Outlet />
        </>
    );
}