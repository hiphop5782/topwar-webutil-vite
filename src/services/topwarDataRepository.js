const DEFAULT_BASE_URL =
    "https://raw.githubusercontent.com/hiphop5782/topwar-json/main";

const BASE_URL = String(
    import.meta.env.VITE_TOPWAR_DATA_BASE_URL || DEFAULT_BASE_URL,
).replace(/\/+$/, "");

const dataPromiseCache = new Map();
const chunkedJsonPromiseCache = new Map();

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

function createDataUrl(path, revision) {
    const normalizedPath = normalizePath(path);

    const revisionQuery = revision
        ? `?revision=${encodeURIComponent(revision)}`
        : "";

    return {
        normalizedPath,
        url: `${BASE_URL}/${normalizedPath}${revisionQuery}`,
    };
}

async function requestJson(
    path,
    { revision, noStore = false } = {},
) {
    const { normalizedPath, url } =
        createDataUrl(path, revision);

    if (!noStore && dataPromiseCache.has(url)) {
        return dataPromiseCache.get(url);
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
        dataPromiseCache.set(url, request);

        request.catch(() => {
            dataPromiseCache.delete(url);
        });
    }

    return request;
}

async function requestText(
    path,
    { revision, noStore = false } = {},
) {
    const { normalizedPath, url } =
        createDataUrl(path, revision);

    if (!noStore && dataPromiseCache.has(url)) {
        return dataPromiseCache.get(url);
    }

    const request = fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: noStore ? "no-store" : "default",
        headers: {
            Accept: "text/plain",
        },
    }).then(async (response) => {
        if (!response.ok) {
            throw new Error(
                `TopWar data HTTP ${response.status}: ${normalizedPath}`,
            );
        }

        return response.text();
    });

    if (!noStore) {
        dataPromiseCache.set(url, request);

        request.catch(() => {
            dataPromiseCache.delete(url);
        });
    }

    return request;
}

function validateChunkManifest(manifest, manifestPath) {
    if (!manifest || manifest._datahubChunked !== true) {
        throw new Error(
            `Invalid TopWar chunk manifest: ${manifestPath}`,
        );
    }

    if (!Array.isArray(manifest.parts)
        || manifest.parts.length === 0) {
        throw new Error(
            `TopWar chunk manifest has no parts: ${manifestPath}`,
        );
    }

    if (manifest.partCount != null
        && Number(manifest.partCount) !== manifest.parts.length) {
        throw new Error(
            `TopWar chunk count mismatch: ${manifestPath}`,
        );
    }

    for (const partPath of manifest.parts) {
        normalizePath(partPath);
    }
}

async function assembleChunkedJson(
    manifest,
    manifestPath,
    revision,
) {
    validateChunkManifest(manifest, manifestPath);

    /*
     * 대형 파일의 모든 조각을 동시에 요청하면 브라우저 메모리 사용량이
     * 급격하게 증가할 수 있으므로 순서대로 다운로드한다.
     */
    const chunks = [];

    for (const partPath of manifest.parts) {
        const text = await requestText(partPath, {
            revision,
        });

        chunks.push(text);
    }

    const combinedJson = chunks.join("");

    if (manifest.originalBytes != null) {
        const actualBytes =
            new TextEncoder().encode(combinedJson).byteLength;

        if (actualBytes !== Number(manifest.originalBytes)) {
            throw new Error(
                `TopWar chunk size mismatch: `
                + `${manifestPath} `
                + `(expected=${manifest.originalBytes}, `
                + `actual=${actualBytes})`,
            );
        }
    }

    try {
        return JSON.parse(combinedJson);
    } catch (error) {
        throw new Error(
            `Failed to parse chunked TopWar JSON: ${manifestPath}`,
            {
                cause: error,
            },
        );
    }
}

async function requestPossiblyChunkedJson(
    path,
    { revision } = {},
) {
    const normalizedPath = normalizePath(path);

    const cacheKey = [
        normalizedPath,
        revision ?? "",
    ].join("@");

    if (chunkedJsonPromiseCache.has(cacheKey)) {
        return chunkedJsonPromiseCache.get(cacheKey);
    }

    const request = requestJson(normalizedPath, {
        revision,
    }).then(async (data) => {
        if (!data || data._datahubChunked !== true) {
            return data;
        }

        return assembleChunkedJson(
            data,
            normalizedPath,
            revision,
        );
    });

    chunkedJsonPromiseCache.set(cacheKey, request);

    request.catch(() => {
        chunkedJsonPromiseCache.delete(cacheKey);
    });

    return request;
}

export function loadDataIndex({ force = false } = {}) {
    if (force || !indexPromise) {
        indexPromise = requestJson("index.json", {
            noStore: true,
        });

        indexPromise.catch(() => {
            indexPromise = null;
        });
    }

    return indexPromise;
}

export async function loadDataFile(path) {
    const index = await loadDataIndex();

    return requestJson(path, {
        revision: index.revision,
    });
}

export async function loadPowerFile(name) {
    const index = await loadDataIndex();

    const path =
        index?.datasets?.power?.files?.[name]
        || `power/${name}.json`;

    return requestJson(path, {
        revision: index.revision,
    });
}

export async function loadRealPower(serverId) {
    const index = await loadDataIndex();
    const numericServerId = Number(serverId);

    const serverIds =
        index?.datasets?.realpower?.serverIds ?? [];

    if (!Number.isInteger(numericServerId)
        || !serverIds.includes(numericServerId)) {
        throw new Error(
            `RealPower server not found: ${serverId}`,
        );
    }

    const pattern =
        index.datasets.realpower.pattern
        || "realpower/{serverId}.json";

    const path = pattern.replace(
        "{serverId}",
        numericServerId,
    );

    /*
     * 일반 JSON이면 기존 데이터를 그대로 반환한다.
     *
     * _datahubChunked=true인 manifest이면 parts를 다운로드하여
     * 하나의 JSON 데이터로 복원한다.
     */
    return requestPossiblyChunkedJson(path, {
        revision: index.revision,
    });
}

export async function listRealPowerServers() {
    const index = await loadDataIndex();

    return [
        ...(index?.datasets?.realpower?.serverIds ?? []),
    ]
        .map(Number)
        .filter(Number.isInteger)
        .sort((a, b) => a - b);
}

export async function listHistoryFiles(type) {
    if (type !== "movement" && type !== "nickname") {
        throw new Error(
            `Unsupported TopWar history type: ${type}`,
        );
    }

    const index = await loadDataIndex();
    const descriptor = index?.datasets?.power?.[type];

    const pattern =
        descriptor?.pattern
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

    return [
        ...(index?.datasets?.liondance?.files ?? []),
    ];
}

export async function listKartzHistoryFiles() {
    const index = await loadDataIndex();
    const descriptor = index?.datasets?.kartz;

    const pattern =
        descriptor?.historyPattern
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

    const path =
        index?.datasets?.kartz?.enemy
        || "kartz/enemy.json";

    return requestJson(path, {
        revision: index.revision,
    });
}

export async function loadHomeStatistics() {
    const index = await loadDataIndex();

    const path =
        index?.datasets?.generated?.homeStatistics
        || "generated/homeStatistics.json";

    return requestJson(path, {
        revision: index.revision,
    });
}

export async function loadPlayerSearchManifest() {
    const index = await loadDataIndex();

    const path =
        index?.datasets?.generated?.playerSearch
        || "generated/player-search/manifest.json";

    return requestJson(path, {
        revision: index.revision,
    });
}

export async function loadPlayerNicknameShard(shard) {
    const index = await loadDataIndex();
    const manifest = await loadPlayerSearchManifest();

    const pattern =
        manifest.nicknamePattern
        || "generated/player-search/nickname/{shard}.json";

    const path = pattern.replace(
        "{shard}",
        String(shard),
    );

    return requestJson(path, {
        revision: index.revision,
    });
}

export async function loadPlayerUidShard(shard) {
    const index = await loadDataIndex();
    const manifest = await loadPlayerSearchManifest();

    const pattern =
        manifest.uidPattern
        || "generated/player-search/uid/{shard}.json";

    const path = pattern.replace(
        "{shard}",
        String(shard),
    );

    return requestJson(path, {
        revision: index.revision,
    });
}

export async function listAllianceDefenseFiles() {
    const index = await loadDataIndex();
    const descriptor =
        index?.datasets?.allianceDefense;

    const pattern =
        descriptor?.pattern
        || "allianceDefense/{date}.json";

    return [...(descriptor?.dates ?? [])]
        .sort((a, b) => a.localeCompare(b))
        .map((date) => ({
            date,
            path: pattern.replace("{date}", date),
        }));
}

export function clearTopwarDataCache() {
    dataPromiseCache.clear();
    chunkedJsonPromiseCache.clear();
    indexPromise = null;
}

export const topwarDataBaseUrl = BASE_URL;