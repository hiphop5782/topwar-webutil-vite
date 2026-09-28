import { getPlayerNicknameSearchKeys, getPlayerSearchQuery } from "@src/utils/playerSearchIndex";

export async function hashPlanPassword(value) {
    const bytes = new TextEncoder().encode(String(value));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function planAccessStorageKey(serverId) {
    return `battle-plan-access:${serverId}`;
}

export function matchesPlanPlayer(player, rawQuery) {
    const query = String(rawQuery ?? "").trim();
    if (!query) return true;

    const nickname = String(player?.nickname ?? "");
    const keys = getPlayerNicknameSearchKeys(nickname);
    const parsed = getPlayerSearchQuery(query);
    const target = String(keys[parsed.field] ?? "");
    return target.includes(parsed.key);
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
