const DEFAULT_BASE_URL =
    "https://raw.githubusercontent.com/hiphop5782/topwar-json/main";

const BASE_URL = String(
    import.meta.env.VITE_TOPWAR_DATA_BASE_URL || DEFAULT_BASE_URL,
).replace(/\/+$/, "");

const jsonPromiseCache = new Map();
let indexPromise = null;

function normalizePath(path) {
    const value = String(path ?? "")
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");

    if (!value || value.includes("../")) {
        throw new Error(`Invalid TopWar data path: ${path}`);
    }

    return value;
}

async function requestJson(path, { revision, noStore = false } = {}) {
    const normalizedPath = normalizePath(path);
    const revisionQuery = revision
        ? `?revision=${encodeURIComponent(revision)}`
        : "";
    const url = `${BASE_URL}/${normalizedPath}${revisionQuery}`;

    if (!noStore && jsonPromiseCache.has(url)) {
        return jsonPromiseCache.get(url);
    }

    const request = fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: noStore ? "no-store" : "default",
        headers: {
            Accept: "application/json",
        },
    }).then(async (response) => {
        if (!response.ok) {
            throw new Error(
                `TopWar data HTTP ${response.status}: ${normalizedPath}`,
            );
        }

        return response.json();
    });

    if (!noStore) {
        jsonPromiseCache.set(url, request);
        request.catch(() => jsonPromiseCache.delete(url));
    }

    return request;
}

export function loadDataIndex({ force = false } = {}) {
    if (force || !indexPromise) {
        indexPromise = requestJson("index.json", { noStore: true });
        indexPromise.catch(() => {
            indexPromise = null;
        });
    }

    return indexPromise;
}

export async function loadDataFile(path) {
    const index = await loadDataIndex();
    return requestJson(path, { revision: index.revision });
}

export async function loadPowerFile(name) {
    const index = await loadDataIndex();
    const path = index?.datasets?.power?.files?.[name]
        || `power/${name}.json`;

    return requestJson(path, { revision: index.revision });
}

export async function loadRealPower(serverId) {
    const index = await loadDataIndex();
    const numericServerId = Number(serverId);
    const serverIds = index?.datasets?.realpower?.serverIds ?? [];

    if (!Number.isInteger(numericServerId)
        || !serverIds.includes(numericServerId)) {
        throw new Error(`RealPower server not found: ${serverId}`);
    }

    const pattern = index.datasets.realpower.pattern
        || "realpower/{serverId}.json";
    const path = pattern.replace("{serverId}", numericServerId);
    return requestJson(path, { revision: index.revision });
}

export async function listRealPowerServers() {
    const index = await loadDataIndex();
    return [...(index?.datasets?.realpower?.serverIds ?? [])]
        .map(Number)
        .filter(Number.isInteger)
        .sort((a, b) => a - b);
}

export async function listHistoryFiles(type) {
    if (type !== "movement" && type !== "nickname") {
        throw new Error(`Unsupported TopWar history type: ${type}`);
    }

    const index = await loadDataIndex();
    const descriptor = index?.datasets?.power?.[type];
    const pattern = descriptor?.pattern
        || `power/${type}/{date}.json`;

    return [...(descriptor?.dates ?? [])]
        .sort((a, b) => a.localeCompare(b))
        .map((date) => ({
            date,
            path: pattern.replace("{date}", date),
        }));
}

export async function listLionDanceFiles() {
    const index = await loadDataIndex();
    return [...(index?.datasets?.liondance?.files ?? [])];
}

export async function listKartzHistoryFiles() {
    const index = await loadDataIndex();
    const descriptor = index?.datasets?.kartz;
    const pattern = descriptor?.historyPattern
        || "kartz/history/{month}.json";

    return [...(descriptor?.historyMonths ?? [])]
        .sort((a, b) => b.localeCompare(a))
        .map((month) => ({
            fileName: month,
            path: pattern.replace("{month}", month),
        }));
}

export async function loadKartzEnemy() {
    const index = await loadDataIndex();
    const path = index?.datasets?.kartz?.enemy || "kartz/enemy.json";
    return requestJson(path, { revision: index.revision });
}

export async function loadHomeStatistics() {
    const index = await loadDataIndex();
    const path = index?.datasets?.generated?.homeStatistics
        || "generated/homeStatistics.json";
    return requestJson(path, { revision: index.revision });
}

export async function loadPlayerSearchManifest() {
    const index = await loadDataIndex();
    const path = index?.datasets?.generated?.playerSearch
        || "generated/player-search/manifest.json";

    return requestJson(path, { revision: index.revision });
}

export async function loadPlayerNicknameShard(shard) {
    const index = await loadDataIndex();
    const manifest = await loadPlayerSearchManifest();
    const pattern = manifest.nicknamePattern
        || "generated/player-search/nickname/{shard}.json";
    const path = pattern.replace("{shard}", String(shard));

    return requestJson(path, { revision: index.revision });
}

export async function loadPlayerUidShard(shard) {
    const index = await loadDataIndex();
    const manifest = await loadPlayerSearchManifest();
    const pattern = manifest.uidPattern
        || "generated/player-search/uid/{shard}.json";
    const path = pattern.replace("{shard}", String(shard));

    return requestJson(path, { revision: index.revision });
}

export async function listAllianceDefenseFiles() {
    const index = await loadDataIndex();
    const descriptor = index?.datasets?.allianceDefense;
    const pattern = descriptor?.pattern
        || "allianceDefense/{date}.json";

    return [...(descriptor?.dates ?? [])]
        .sort((a, b) => a.localeCompare(b))
        .map((date) => ({
            date,
            path: pattern.replace("{date}", date),
        }));
}

export function clearTopwarDataCache() {
    jsonPromiseCache.clear();
    indexPromise = null;
}

export const topwarDataBaseUrl = BASE_URL;
