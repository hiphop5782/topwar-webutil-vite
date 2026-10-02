import { getPlayerNicknameSearchKeys, getPlayerSearchQuery } from "../../../utils/playerSearchIndex.js";

export async function hashPlanPassword(value) {
    const bytes = new TextEncoder().encode(String(value));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function planAccessStorageKey(serverId) {
    return `battle-plan-access:${serverId}`;
}

export function matchesPlanPlayer(player, rawQuery) {
    const queries = String(rawQuery ?? "")
        .split(/[,，;；\n]+/)
        .map(value => value.trim())
        .filter(Boolean);
    if (!queries.length) return true;

    const nickname = String(player?.nickname ?? "");
    const keys = getPlayerNicknameSearchKeys(nickname);
    const exact = queries.length > 1;
    return queries.some(query => {
        const parsed = getPlayerSearchQuery(query);
        const target = String(keys[parsed.field] ?? "");
        return exact ? target === parsed.key : target.includes(parsed.key);
    });
}

export function hasMultiplePlanSearchQueries(rawQuery) {
    return /[,，;；\n]/.test(String(rawQuery ?? ""));
}

export function responseLabel(value) {
    if (value === "attending") return "참여";
    if (value === "absent") return "불참";
    return "미응답";
}

export function responseClass(value) {
    if (value === "attending") return "success";
    if (value === "absent") return "danger";
    return "secondary";
}

export function assignedItemIds(assignments, uid) {
    return Object.entries(assignments || {})
        .filter(([, uids]) => Array.isArray(uids) && uids.includes(String(uid)))
        .map(([itemId]) => itemId);
}

export function shuffled(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const bytes = crypto.getRandomValues(new Uint32Array(1));
        const target = bytes[0] % (index + 1);
        [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
}
