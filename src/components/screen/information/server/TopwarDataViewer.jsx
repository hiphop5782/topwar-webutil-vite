import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";

import SupportBanner from "@src/components/template/SupportBanner";
import "./TopwarDataViewer.css";

export default function TopwarDataViewer() {
    const location = useLocation();
    const {t}= useTranslation("viewer");
    const [menuExpanded, setMenuExpanded] = useState(false);
    useEffect(() => { setMenuExpanded(false); }, [location.pathname]);
    
    const currentPath = location.pathname.replace(/\/+$/, "");
    const menus = [
        { path: "/information/data/servers", label: t("serverDirectory.title") },
        { path: "/information/data", label: t("TopwarDataViewer.btn-player-data") },
        { path: "/information/data/overall", label: t("TopwarDataViewer.btn-overall"), color: "danger" },
        { path: "/information/data/troops", label: t("TopwarDataViewer.btn-troops") },
        { path: "/information/data/player-detail", label: t("TopwarDataViewer.btn-player-detail") },
        { path: "/information/data/server", label: t("TopwarDataViewer.btn-server-data") },
        { path: "/information/data/alliance", label: t("TopwarDataViewer.btn-alliance-data") },
        { path: "/information/data/move", label: t("TopwarDataViewer.btn-server-move") },
        { path: "/information/data/nickname", label: t("TopwarDataViewer.btn-nickname-history") },
        { path: "/information/data/realpower", label: t("TopwarDataViewer.btn-realpower") },
    ];

    return (<div className="data-workspace">
        <nav className="data-navigation" aria-label={t("menu:info.sub.data")}>
            <div className="data-navigation__heading"><span className="data-navigation__mark" aria-hidden="true" />{t("menu:info.sub.data")}</div>
            <button type="button" className="data-navigation__toggle" aria-expanded={menuExpanded} aria-controls="data-navigation-links" onClick={() => setMenuExpanded(value => !value)}>
                <span>{menus.find(menu => currentPath.endsWith(menu.path))?.label ?? t("menu:info.sub.data")}</span><span aria-hidden="true">{menuExpanded ? "−" : "+"}</span>
            </button>
            <div id="data-navigation-links" className={`data-navigation__links${menuExpanded ? " is-expanded" : ""}`}>
                {menus.map(({ path, label, color = "primary" }) => {
                    const active = currentPath.endsWith(path);
                    return <LanguageRouterLink key={path} to={path} className={`btn btn-${active ? color : `outline-${color}`} data-navigation__link`} aria-current={active ? "page" : undefined}>{label}</LanguageRouterLink>;
                })}
            </div>
        </nav>

        <Outlet />
        <SupportBanner className="mt-5" />

        <section className="mt-5 pt-4 border-top" aria-labelledby="data-reading-guide">
            <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
                <div>
                    <p className="small fw-bold text-primary mb-1">{t("TopwarDataViewer.guide.eyebrow")}</p>
                    <h2 id="data-reading-guide" className="h3 fw-bold">{t("TopwarDataViewer.guide.title")}</h2>
                    <p className="text-secondary mb-0">{t("TopwarDataViewer.guide.description")}</p>
                </div>
                <LanguageRouterLink to="/about" className="btn btn-outline-secondary align-self-lg-start text-nowrap">
                    {t("TopwarDataViewer.guide.methodButton")}
                </LanguageRouterLink>
            </div>

            <div className="row g-3 mb-4">
                {["sample", "activity", "power", "timing"].map((key) => (
                    <div className="col-12 col-md-6" key={key}>
                        <div className="card h-100 border-0 bg-light">
                            <div className="card-body">
                                <h3 className="h6 fw-bold">{t(`TopwarDataViewer.guide.items.${key}.title`)}</h3>
                                <p className="small text-secondary mb-0">{t(`TopwarDataViewer.guide.items.${key}.body`)}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <h3 className="h5 fw-bold">{t("TopwarDataViewer.guide.analysisTitle")}</h3>
            <div className="list-group">
                <LanguageRouterLink to="/post/2026-06-30-001-Server-Tier" className="list-group-item list-group-item-action">
                    <strong>{t("TopwarDataViewer.guide.serverTierTitle")}</strong>
                    <span className="d-block small text-secondary">{t("TopwarDataViewer.guide.serverTierBody")}</span>
                </LanguageRouterLink>
                <LanguageRouterLink to="/history/ssc-2026" className="list-group-item list-group-item-action">
                    <strong>{t("TopwarDataViewer.guide.sscTitle")}</strong>
                    <span className="d-block small text-secondary">{t("TopwarDataViewer.guide.sscBody")}</span>
                </LanguageRouterLink>
                <LanguageRouterLink to="/post" className="list-group-item list-group-item-action">
                    <strong>{t("TopwarDataViewer.guide.moreTitle")}</strong>
                    <span className="d-block small text-secondary">{t("TopwarDataViewer.guide.moreBody")}</span>
                </LanguageRouterLink>
            </div>
        </section>
    </div>);
}
