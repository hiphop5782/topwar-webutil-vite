import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { supportedLngs, defaultLng } from "@src/config/languages";
import { createSiteUrl } from "@src/utils/siteUrl";
import SEO from "./SEO";

const routeSeo = [
    [/^\/$/, "home"],
    [/^\/post$/, "post.list"],
    [/^\/post\/[^/]+$/, "post.detail"],
    [/^\/information\/base$/, "information.base"],
    [/^\/information\/job$/, "information.job"],
    [/^\/information\/kartz-statistics$/, "information.kartzStatistics"],
    [/^\/information\/el$/, "information.el.home"],
    [/^\/information\/el\/darkforce$/, "information.el.darkforce"],
    [/^\/information\/el\/score$/, "information.el.score"],
    [/^\/information\/data$/, "information.data.player"],
    [/^\/information\/data\/server$/, "information.data.server"],
    [/^\/information\/data\/alliance$/, "information.data.alliance"],
    [/^\/information\/data\/move$/, "information.data.move"],
    [/^\/information\/data\/nickname$/, "information.data.nickname"],
    [/^\/information\/data\/player-detail$/, "information.data.playerDetail"],
    [/^\/information\/data\/realpower$/, "information.data.realpower"],
    [/^\/information\/kartz$/, "information.kartz.home"],
    [/^\/information\/kartz\/rank$/, "information.kartz.rank"],
    [/^\/information\/kartz\/user$/, "information.kartz.user"],
    [/^\/information\/kartz\/server$/, "information.kartz.server"],
    [/^\/calculator\/vital$/, "calculator.vital"],
    [/^\/calculator\/skill$/, "calculator.skill"],
    [/^\/calculator\/value-pack$/, "calculator.valuePack"],
    [/^\/calculator\/cost$/, "calculator.cost"],
    [/^\/simulator\/random$/, "simulator.random"],
    [/^\/simulator\/formation-perk$/, "simulator.formationPerk"],
    [/^\/simulator\/titan-research$/, "simulator.titanResearch"],
    [/^\/simulator\/titan-refine$/, "simulator.titanRefine"],
    [/^\/simulator\/slot$/, "simulator.slot"],
    [/^\/simulator\/luckybox$/, "simulator.luckyBox"],
    [/^\/simulator\/lotto$/, "simulator.lotto"],
    [/^\/developer$/, "developer"],
    [/^\/emoji\/create$/, "emoji.create"],
    [/^\/emoji\/list$/, "emoji.list"],
    [/^\/account\/viewer$/, "account.viewer", true],
    [/^\/account\/profile$/, "account.profile", true],
    [/^\/account\/creator$/, "account.creator", true],
    [/^\/vote\/create$/, "vote.create", true],
    [/^\/vote\/cast(?:\/[^/]+)?$/, "vote.cast", true],
    [/^\/vote\/manage(?:\/[^/]+)?$/, "vote.manage", true],
    [/^\/history\/ssc-2026$/, "history.ssc2026.home"],
    [/^\/history\/ssc-2026\/users$/, "history.ssc2026.users"],
    [/^\/history\/liondance$/, "history.liondance"],
    [/^\/event\/city-reward$/, "event.cityReward"],
    [/^\/vip\/[^/]+$/, "vip.thiefFinder", true],
    [/^\/privacy$/, "privacy"],
    [/^\/contact$/, "contact"],
    [/^\/disclaimer$/, "disclaimer"],
];

export default function RouteSEO() {
    const { pathname } = useLocation();
    const { t, i18n } = useTranslation("seo");
    const parts = pathname.split("/").filter(Boolean);
    const language = supportedLngs.includes(parts[0])
        ? parts.shift()
        : (i18n.resolvedLanguage || defaultLng);
    const routePath = `/${parts.join("/")}`.replace(/\/$/, "") || "/";
    const matched = routeSeo.find(([pattern]) => pattern.test(routePath));
    const key = matched?.[1] || "notFound";
    const noindex = matched?.[2] ?? !matched;
    const serverId = routePath.match(/^\/vip\/([^/]+)$/)?.[1];
    const title = t(`${key}.title`, { serverId });
    const description = t("default.description", { title });
    const canonical = createSiteUrl(`/${language}${routePath === "/" ? "" : routePath}`);

    const alternates = useMemo(() => [
        ...supportedLngs.map((alternateLanguage) => ({
            language: alternateLanguage,
            href: createSiteUrl(`/${alternateLanguage}${routePath === "/" ? "" : routePath}`),
        })),
        {
            language: "x-default",
            href: createSiteUrl(routePath === "/" ? "/" : `/${defaultLng}${routePath}`),
        },
    ], [routePath]);

    return (
        <SEO
            title={title}
            description={description}
            canonical={canonical}
            alternates={alternates}
            noindex={noindex}
        />
    );
}
