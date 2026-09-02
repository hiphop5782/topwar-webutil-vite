export const ACCOUNT_TRADE_STORAGE_KEY = "topwar-account-trade-library-v1";

export const DETAIL_SECTIONS = [
    ["baseSkins", "보유 기지"], ["baseDecor", "기지 장식"], ["baseTiles", "기지 타일"],
    ["baseEffects", "기지 효과"], ["queues", "대열"], ["formations", "군진"],
    ["formationPerks", "군진 특성"], ["decorations", "장식"], ["beasts", "초능력 동물"],
    ["enigmaFields", "초능력 영역"], ["remolds", "무기 개조"],
    ["specialization", "전문 강화 및 파츠"], ["items", "주요 아이템"], ["notes", "기타 및 거래 조건"],
];

export function createEmptyAccount() {
    return {
        version: 1, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt: new Date().toISOString(), originalText: "",
        basic: { title: "", server: "", totalPower: "", vip: "", morale: "", price: "" },
        marches: [], details: Object.fromEntries(DETAIL_SECTIONS.map(([key]) => [key, []])),
        visibility: { basic: true, marches: true, ...Object.fromEntries(DETAIL_SECTIONS.map(([key]) => [key, true])) },
    };
}

const valueAfter = (line, pattern) => line.match(pattern)?.[1]?.trim() || "";
const normalizeBranch = (value) => /air|공군/i.test(value) ? "air" : /navy|해군/i.test(value) ? "navy" : /army|육군/i.test(value) ? "army" : "other";
const isMarchHeading = (line) => /^(?:(?:1st|2nd|3rd|\d+(?:st|nd|rd|th))\s+)?(?:air\s*force|army|navy|공군|육군|해군)(?:\s*[🦅🪖⚓])?$/iu.test(line);

function parseMarch(lines, start, end) {
    const name = lines[start].replace(/[🦅🪖⚓]/gu, "").trim();
    const result = { id: `${Date.now()}-${start}`, name, branch: normalizeBranch(name), power: "", heroes: [], mastery: "", remold: "", suppression: "", marchSize: "", skill: "", awakening: "", titan: "", stats: {}, notes: [] };
    lines.slice(start + 1, end).forEach((line) => {
        if (!result.power && /^\d[\d,.]*\s*[mkb]?\s*cp$/i.test(line)) result.power = line;
        else if (/^mastery\s*[:=-]/i.test(line)) result.mastery = valueAfter(line, /^mastery\s*[:=-]\s*(.+)$/i);
        else if (/equipment\s+remou?ld|무기\s*개조/i.test(line)) result.remold = valueAfter(line, /(?:equipment\s+remou?ld|무기\s*개조)\s*[:=-]?\s*(.+)$/i) || line;
        else if (/^suppression\s*[:=-]/i.test(line)) result.suppression = valueAfter(line, /^suppression\s*[:=-]\s*(.+)$/i);
        else if (/^(?:march\s*size|출정(?:수|\s*크기))/i.test(line)) result.marchSize = valueAfter(line, /^(?:march\s*size|출정(?:수|\s*크기))\s*[:=-]?\s*(.+)$/i);
        else if (/^skill\s*tiers?/i.test(line)) result.skill = valueAfter(line, /^skill\s*tiers?\s*[:=-]\s*(.+)$/i);
        else if (/^awakening/i.test(line)) result.awakening = line;
        else if (/titan|타이탄/i.test(line)) result.titan = line;
        else {
            const stat = line.match(/^(HP|ATK|DMG\+|DMG-|DEF)\s*[:=-]?\s*([\d,.]+%)/i);
            const heroes = [...line.matchAll(/([\p{L}][\p{L}' .-]*?)\s*\((\d+)\)/gu)];
            if (stat) result.stats[stat[1].toUpperCase()] = stat[2];
            else if (heroes.length >= 2) heroes.slice(0, 3).forEach((match) => result.heroes.push({ name: match[1].trim(), stars: match[2] }));
            else result.notes.push(line);
        }
    });
    return result;
}

const SECTION_PATTERNS = [
    ["beasts", /^(pets?|beasts?|초능력\s*동물)/i], ["formations", /^(formations?|군진)/i],
    ["enigmaFields", /^(enigma\s*field|초능력\s*영역)/i], ["specialization", /^(heavy\s*trooper|전문\s*강화|파츠)/i],
    ["items", /^(inventory|items?|주요\s*아이템)/i], ["baseSkins", /^(base\s*skins?|bases?|기지)/i],
    ["decorations", /^(decorations?|decors?|장식)/i],
];

export function parseTradeText(text) {
    const account = createEmptyAccount();
    account.originalText = String(text || "");
    const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const marchIndexes = lines.map((line, index) => isMarchHeading(line) ? index : -1).filter((index) => index >= 0);
    marchIndexes.forEach((start, index) => {
        const nextMarch = marchIndexes[index + 1] ?? lines.length;
        const nextSection = lines.findIndex((line, lineIndex) => lineIndex > start && SECTION_PATTERNS.some(([, pattern]) => pattern.test(line)));
        account.marches.push(parseMarch(lines, start, nextSection > start && nextSection < nextMarch ? nextSection : nextMarch));
    });
    const intro = lines.slice(0, marchIndexes[0] ?? lines.length);
    account.basic.title = intro.find((line) => !/morale|march|account|payment/i.test(line)) || "Top War 계정 정보";
    account.basic.morale = valueAfter(lines.find((line) => /morale|사기/i.test(line)) || "", /(?:morale|사기)\s*[:=-]?\s*(\d+)/i);
    account.basic.server = valueAfter(lines.find((line) => /^(?:server|서버)/i.test(line)) || "", /^(?:server|서버)\s*[:=-]?\s*(.+)$/i);
    account.basic.totalPower = valueAfter(lines.find((line) => /^(?:total\s*)?(?:power|cp|총\s*전투력)\s*[:=-]/i.test(line)) || "", /^(?:total\s*)?(?:power|cp|총\s*전투력)\s*[:=-]\s*(.+)$/i);
    SECTION_PATTERNS.forEach(([key, pattern]) => {
        const index = lines.findIndex((line) => pattern.test(line));
        if (index < 0) return;
        const end = lines.findIndex((line, candidate) => candidate > index && SECTION_PATTERNS.some(([, other]) => other.test(line)));
        account.details[key] = lines.slice(index + 1, end < 0 ? lines.length : end).filter((line) => !isMarchHeading(line));
    });
    if (/payment\s*plan/i.test(text)) account.details.notes.push("Payment plan available");
    return account;
}

export function createPublicAccount(account) {
    const output = { version: 1, id: account.id, createdAt: account.createdAt, details: {} };
    if (account.visibility.basic) output.basic = account.basic;
    if (account.visibility.marches) output.marches = account.marches;
    DETAIL_SECTIONS.forEach(([key]) => { if (account.visibility[key] && account.details[key]?.length) output.details[key] = account.details[key]; });
    return output;
}

export function readAccountLibrary() {
    try {
        const value = JSON.parse(localStorage.getItem(ACCOUNT_TRADE_STORAGE_KEY) || "{}");
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch { return {}; }
}

export function savePublicAccount(account) {
    const library = readAccountLibrary();
    library[account.id] = account;
    localStorage.setItem(ACCOUNT_TRADE_STORAGE_KEY, JSON.stringify(library));
}
