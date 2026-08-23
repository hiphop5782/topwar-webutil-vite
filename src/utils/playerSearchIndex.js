import { normalizeNicknameForSearch } from "./normalizeNicknameForSearch.js";

const INITIAL_CANONICAL = "ᄀᄁᄂᄃᄄᄅᄆᄇᄈᄉᄊᄋᄌᄍᄎᄏᄐᄑᄒ";
const INITIAL_COMPATIBILITY = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const MEDIAL_CANONICAL = "ᅡᅢᅣᅤᅥᅦᅧᅨᅩᅪᅫᅬᅭᅮᅯᅰᅱᅲᅳᅴᅵ";
const MEDIAL_COMPATIBILITY = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const HANGUL_INITIALS = Array.from(INITIAL_COMPATIBILITY);
const HANGUL_MEDIALS = Array.from(MEDIAL_COMPATIBILITY);
const HANGUL_FINALS = [
    "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
    "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
    "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

function toCompatibilityJamo(value) {
    return Array.from(String(value ?? ""), character => {
        const initialIndex = INITIAL_CANONICAL.indexOf(character);
        if (initialIndex >= 0) return INITIAL_COMPATIBILITY[initialIndex];
        const medialIndex = MEDIAL_CANONICAL.indexOf(character);
        if (medialIndex >= 0) return MEDIAL_COMPATIBILITY[medialIndex];
        return character;
    }).join("");
}

function decomposeHangulSyllables(value) {
    return Array.from(String(value ?? ""), character => {
        const codePoint = character.codePointAt(0);
        if (codePoint < 0xAC00 || codePoint > 0xD7A3) return character;

        const offset = codePoint - 0xAC00;
        const initial = HANGUL_INITIALS[Math.floor(offset / 588)];
        const medial = HANGUL_MEDIALS[Math.floor((offset % 588) / 28)];
        const final = HANGUL_FINALS[offset % 28];
        return `${initial}${medial}${final}`;
    }).join("");
}

function extractHangulInitials(value) {
    return Array.from(String(value ?? ""), character => {
        const codePoint = character.codePointAt(0);
        if (codePoint < 0xAC00 || codePoint > 0xD7A3) return "";
        return HANGUL_INITIALS[Math.floor((codePoint - 0xAC00) / 588)];
    }).join("");
}

export function getPlayerNicknameSearchKeys(value) {
    const k = normalizeNicknameForSearch(value);
    return {
        k,
        j: /[가-힣]/u.test(k) ? decomposeHangulSyllables(k) : "",
        i: /[가-힣]/u.test(k) ? extractHangulInitials(k) : "",
    };
}

export function getPlayerSearchQuery(value) {
    const raw = toCompatibilityJamo(String(value ?? "").trim());
    const isJamoQuery = /^[ㄱ-ㅎㅏ-ㅣ]+$/u.test(raw);

    if (isJamoQuery && /[ㅏ-ㅣ]/u.test(raw)) {
        return { field: "j", key: raw };
    }

    if (isJamoQuery) {
        return { field: "i", key: raw };
    }

    const normalized = normalizeNicknameForSearch(raw);

    // 완성형 입력도 자모 흐름으로 비교한다. 예: 아지(ㅇㅏㅈㅣ)는
    // 아(ㅇㅏ), 앚(ㅇㅏㅈ), 아지(ㅇㅏㅈㅣ)로 모두 찾을 수 있다.
    if (/[가-힣]/u.test(normalized)) {
        return {
            field: "j",
            key: decomposeHangulSyllables(normalized),
        };
    }

    return {
        field: "k",
        key: normalized,
    };
}

export function getPlayerSearchShard(value) {
    let hash = 0x811c9dc5;
    for (const character of String(value ?? "")) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return (hash % 256).toString(16).padStart(2, "0");
}

export function getNicknameShardForQuery(query) {
    return getPlayerSearchShard(Array.from(query.key)[0] ?? "");
}

export function filterPlayerSearchRecords(records, query, limit = 20) {
    const candidates = records
        .filter((record) =>
            String(record?.[query.field] ?? "").startsWith(query.key)
        )
        .sort((left, right) =>
            Number(right.p ?? 0) - Number(left.p ?? 0)
            || Number(Boolean(left.x)) - Number(Boolean(right.x))
            || Number(left[query.field] !== query.key) - Number(right[query.field] !== query.key)
            || String(left.n).localeCompare(String(right.n))
        );

    const matched = [];
    const seenUids = new Set();

    for (const record of candidates) {
        if (seenUids.has(record.u)) continue;
        seenUids.add(record.u);
        matched.push(record);
        if (matched.length >= limit) break;
    }

    return matched;
}
