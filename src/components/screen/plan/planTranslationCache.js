const STORAGE_KEY = "battle-plan-translation-cache:v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 50;

async function cacheKey(languageCode, texts) {
    const source = JSON.stringify({ languageCode, texts });
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function readCache(now = Date.now()) {
    if (typeof window === "undefined") return {};
    try {
        const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
        return Object.fromEntries(Object.entries(parsed).filter(([, entry]) => entry?.expiresAt > now && entry?.value));
    } catch {
        return {};
    }
}

function writeCache(entries) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
        // Storage may be unavailable or full. Translation still works without caching.
    }
}

export async function getPlanTranslationCache(languageCode, texts) {
    const entries = readCache();
    writeCache(entries);
    const key = await cacheKey(languageCode, texts);
    return entries[key]?.value || null;
}

export async function setPlanTranslationCache(languageCode, texts, value) {
    const now = Date.now();
    const key = await cacheKey(languageCode, texts);
    const entries = readCache(now);
    entries[key] = { value, createdAt: now, expiresAt: now + TTL_MS };
    const limited = Object.fromEntries(Object.entries(entries)
        .sort(([, left], [, right]) => Number(right.createdAt || 0) - Number(left.createdAt || 0))
        .slice(0, MAX_ENTRIES));
    writeCache(limited);
}

