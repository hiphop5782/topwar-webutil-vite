import { supportedLngs, defaultLng } from './languages.js';

// Search eligibility is independent of ad eligibility.
export const routePolicies = [
    { pattern: /^\/information\/appearance$/, key: "information.appearance", category: 'data', index: false, languages: supportedLngs },
    { pattern: /^\/$/, key: "home", category: 'content', index: true, languages: supportedLngs },
    { pattern: /^\/post$/, key: "post.list", category: 'content', index: true, languages: ['ko'] },
    { pattern: /^\/post\/[^/]+$/, key: "post.detail", category: 'content', index: true, languages: ['ko'] },
    { pattern: /^\/information\/job$/, key: "information.job", category: 'tool', index: true, languages: ['ko'] },
    { pattern: /^\/information\/kartz-statistics$/, key: "information.kartzStatistics", category: 'data', index: false, languages: supportedLngs },
    { pattern: /^\/information\/el$/, key: "information.el.home", category: 'tool', index: true, languages: supportedLngs },
    { pattern: /^\/information\/el\/darkforce$/, key: "information.el.darkforce", category: 'tool', index: true, languages: supportedLngs },
    { pattern: /^\/information\/el\/score$/, key: "information.el.score", category: 'tool', index: true, languages: supportedLngs },
    { pattern: /^\/information\/data$/, key: "information.data.player", category: 'search', index: false, languages: supportedLngs },
    { pattern: /^\/information\/data\/servers$/, key: "information.data.servers", category: 'search', index: false, languages: supportedLngs },
    { pattern: /^\/information\/data\/server$/, key: "information.data.server", category: 'search', index: false, languages: supportedLngs },
    { pattern: /^\/information\/data\/alliance$/, key: "information.data.alliance", category: 'search', index: false, languages: supportedLngs },
    { pattern: /^\/information\/data\/move$/, key: "information.data.move", category: 'search', index: false, languages: supportedLngs },
    { pattern: /^\/information\/data\/nickname$/, key: "information.data.nickname", category: 'search', index: false, languages: supportedLngs },
    { pattern: /^\/information\/data\/player-detail$/, key: "information.data.playerDetail", category: 'search', index: false, languages: supportedLngs },
    { pattern: /^\/information\/data\/realpower$/, key: "information.data.realpower", category: 'data', index: false, languages: supportedLngs },
    { pattern: /^\/information\/data\/overall$/, key: "information.data.overall", category: 'data', index: false, languages: supportedLngs },
    { pattern: /^\/information\/kartz$/, key: "information.kartz.home", category: 'data', index: false, languages: supportedLngs },
    { pattern: /^\/information\/kartz\/rank$/, key: "information.kartz.rank", category: 'data', index: false, languages: supportedLngs },
    { pattern: /^\/information\/kartz\/server$/, key: "information.kartz.server", category: 'data', index: false, languages: supportedLngs },
    { pattern: /^\/calculator\/vital$/, key: "calculator.vital", category: 'tool', index: true, languages: supportedLngs },
    { pattern: /^\/calculator\/skill$/, key: "calculator.skill", category: 'tool', index: true, languages: supportedLngs },
    { pattern: /^\/calculator\/value-pack$/, key: "calculator.valuePack", category: 'tool', index: true, languages: supportedLngs },
    { pattern: /^\/calculator\/cost$/, key: "calculator.cost", category: 'tool', index: true, languages: supportedLngs },
    { pattern: /^\/simulator\/formation-perk$/, key: "simulator.formationPerk", category: 'tool', index: false, languages: supportedLngs },
    { pattern: /^\/simulator\/titan-research$/, key: "simulator.titanResearch", category: 'tool', index: true, languages: supportedLngs },
    { pattern: /^\/simulator\/titan-refine$/, key: "simulator.titanRefine", category: 'tool', index: true, languages: supportedLngs },
    { pattern: /^\/developer$/, key: "developer", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/about$/, key: "about", category: 'system', index: true, languages: supportedLngs },
    { pattern: /^\/emoji\/create$/, key: "emoji.create", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/emoji\/list$/, key: "emoji.list", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/account\/viewer$/, key: "account.viewer", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/account\/profile$/, key: "account.profile", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/account\/creator$/, key: "account.creator", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/vote\/create$/, key: "vote.create", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/vote\/cast\/[^/]+\/[^/]+$/, key: "vote.cast", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/vote\/cast(?:\/[^/]+)?$/, key: "vote.cast", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/vote\/manage(?:\/[^/]+)?$/, key: "vote.manage", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/vote\/[^/]+\/[^/]+$/, key: "vote.cast", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/vote\/[^/]+\/[^/]+\/manage$/, key: "vote.manage", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/history\/ssc-2026$/, key: "history.ssc2026.home", category: 'data', index: false, languages: supportedLngs },
    { pattern: /^\/history\/ssc-2026\/users$/, key: "history.ssc2026.users", category: 'data', index: false, languages: supportedLngs },
    { pattern: /^\/history\/liondance$/, key: "history.liondance", category: 'data', index: false, languages: supportedLngs },
    { pattern: /^\/event\/city-reward$/, key: "event.cityReward", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/vip\/[^/]+$/, key: "vip.thiefFinder", category: 'system', index: false, languages: supportedLngs },
    { pattern: /^\/privacy$/, key: "privacy", category: 'system', index: true, languages: supportedLngs },
    { pattern: /^\/contact$/, key: "contact", category: 'system', index: true, languages: supportedLngs },
    { pattern: /^\/disclaimer$/, key: "disclaimer", category: 'system', index: true, languages: supportedLngs },
];

export function getRoutePolicy(pathname, search = '') {
    const parts = pathname.split('/').filter(Boolean);
    const language = supportedLngs.includes(parts[0]) ? parts.shift() : defaultLng;
    const routePath = '/' + parts.join('/');
    const matched = routePolicies.find(item => item.pattern.test(routePath));
    const policy = matched || { key: 'notFound', category: 'system', index: false, languages: [] };
    const canonicalLanguage = policy.languages.includes(language) ? language : (policy.languages[0] || language);
    const stateQuery = [...new URLSearchParams(search).keys()].some(key => !/^(utm_.+|gclid|fbclid|msclkid)$/i.test(key));
    // Tool inputs are variants of the same explanatory page; filters are not landing pages.
    const noindex = !policy.index || (stateQuery && policy.category !== 'tool');
    const canonicalPath = '/' + canonicalLanguage + (routePath === '/' ? '/' : routePath + '/');
    const alternates = !noindex && policy.languages.length > 1 ? [
        ...policy.languages.map(language => ({ language, path: '/' + language + (routePath === '/' ? '/' : routePath + '/') })),
        { language: 'x-default', path: '/' + defaultLng + (routePath === '/' ? '/' : routePath + '/') },
    ] : [];
    return { ...policy, language, routePath, canonicalPath, alternates, noindex,
        sitemap: !noindex && canonicalLanguage === language && !!matched };
}
