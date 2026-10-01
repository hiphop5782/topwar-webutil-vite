import { normalizeNicknameForSearch } from "./normalizeNicknameForSearch.js";

export function normalizeOverallSearch(value) {
    // Use the shared visual-character mappings while preserving the overall
    // search's decomposed Hangul, accent-insensitive and sharp-S matching.
    return normalizeNicknameForSearch(value)
        .normalize("NFKD")
        .replace(/\p{M}+/gu, "")
        .replaceAll("ß", "ss")
        .replaceAll("ς", "σ");
}
