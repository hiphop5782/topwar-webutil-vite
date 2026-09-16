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

export async function loadOverallLatest() {
    const index = await loadDataIndex();

    const path =
        index?.datasets?.overall?.latest
        || "overall/latest.json";

    return requestPossiblyChunkedJson(path, {
        revision: index.revision,
    });
}

export async function listOverallHistoryFiles(type) {
    if (type !== "movement" && type !== "nickname") {
        throw new Error(
            `Unsupported overall history type: ${type}`,
        );
    }

    const index = await loadDataIndex();
    const descriptor = index?.datasets?.overall?.[type];
    const pattern = descriptor?.pattern
        || `overall/${type}/{date}.json`;

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

    const statistics = await requestJson(path, {
        revision: index.revision,
    });

    const latest = await loadServerDirectory();
    const count = countSeasonServers(latest);
    const change7d = await loadHistoricalSeasonServerCount()
        .then(previousCount => previousCount === null ? null : count - previousCount)
        .catch(error => {
            console.error("Failed to load historical season server directory", error);
            return null;
        });

    return {
        ...statistics,
        server: { ...statistics.server, count, change7d },
        // 시즌별 실제 조사 결과가 도착하기 전에는 기존 Top 100 통계를 노출하지 않는다.
        player: {},
        power: {},
        realPower: {},
    };
}

function getSeasonServerIds(directory) {
    const seasons = directory?.seasons;
    if (!seasons || directory.ok === false
        || !Object.values(seasons).every(season => Array.isArray(season.servers))) {
        throw new Error("Invalid season server directory");
    }
    return [...new Set(Object.values(seasons)
        .flatMap(season => season.servers.map(Number))
        .filter(Number.isInteger))];
}

function countSeasonServers(directory) {
    return getSeasonServerIds(directory).length;
}

async function loadHistoricalSeasonServerCount() {
    const until = new Date(Date.now() - 7 * 86400000).toISOString();
    const commitsUrl = new URL(
        "https://api.github.com/repos/hiphop5782/topwar-json/commits",
    );
    commitsUrl.searchParams.set("path", "servers/servers-object.json");
    commitsUrl.searchParams.set("until", until);
    commitsUrl.searchParams.set("per_page", "1");
    const response = await fetch(commitsUrl, {
        headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) throw new Error(`GitHub history HTTP ${response.status}`);
    const commits = await response.json();
    const sha = commits?.[0]?.sha;
    if (!/^[a-f0-9]{40}$/.test(sha || "")) return null;
    const historical = await fetch(
        `https://raw.githubusercontent.com/hiphop5782/topwar-json/${sha}/servers/servers-object.json`,
        { headers: { Accept: "application/json" } },
    );
    if (!historical.ok) throw new Error(`Season history HTTP ${historical.status}`);
    return countSeasonServers(await historical.json());
}

export async function loadInvestigatedHomeStatistics() {
    const [index, directory] = await Promise.all([
        loadDataIndex(),
        loadServerDirectory(),
    ]);
    const availableIds = new Set(index?.datasets?.realpower?.serverIds ?? []);
    const ids = getSeasonServerIds(directory).filter(id => availableIds.has(id));
    if (ids.length === 0) {
        throw new Error("No investigated servers in TopWar index");
    }
    const pattern = index?.datasets?.realpower?.pattern
        || "realpower/{serverId}.json";
    let next = 0;
    let snapshotAt = null;
    let tracked = 0;
    let online = 0;
    let level100 = 0;
    let allianceJoined = 0;
    const uids = new Set();
    const powers = [];
    const activityObservations = [];
    const activityGrades = {
        VERY_ACTIVE: 0,
        ACTIVE: 0,
        NORMAL: 0,
        QUIET: 0,
        DEAD: 0,
        UNKNOWN: 0,
    };

    async function worker() {
        while (next < ids.length) {
            const id = ids[next++];
            const data = await requestPossiblyChunkedJson(
                pattern.replace("{serverId}", String(id)),
                { revision: index.revision },
            );
            const players = data?.players;
            if (!Array.isArray(players)) {
                throw new Error(`Invalid investigated players: ${id}`);
            }
            const exportedAt = Date.parse(data.exportedAt);
            if (Number.isFinite(exportedAt)
                && (!snapshotAt || exportedAt > snapshotAt)) snapshotAt = exportedAt;
            const grade = data?.summary?.serverActivity?.grade || "UNKNOWN";
            activityGrades[grade in activityGrades ? grade : "UNKNOWN"] += 1;
            const eligiblePlayers = players.filter(player => Number(player.level) >= 80);
            tracked += eligiblePlayers.length;
            for (const player of eligiblePlayers) {
                if (player.uid != null) uids.add(String(player.uid));
                const isOnline = player.isOnline === true || Number(player.isOnline) === 1;
                if (isOnline) online += 1;
                if (Number(player.level) === 100) level100 += 1;
                if (player.allianceId != null && String(player.allianceId) !== "0") allianceJoined += 1;
                const power = Number(player.power);
                if (Number.isFinite(power) && power >= 0) {
                    powers.push(power);
                }
                const login = Number(player.lastLogin ?? player.lastShowTime);
                activityObservations.push({
                    isOnline,
                    login: Number.isFinite(login) && login > 0 ? login * 1000 : null,
                });
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(8, ids.length) }, worker));
    powers.sort((a, b) => a - b);
    const referenceTime = snapshotAt || Date.now();
    const within = days => activityObservations.filter(({ isOnline, login }) =>
        isOnline || (login !== null
            && login <= referenceTime
            && referenceTime - login <= days * 86400000)
    ).length;
    const rate = value => tracked ? value / tracked * 100 : 0;
    const percentile = percent => powers.length
        ? powers[Math.ceil(powers.length * percent) - 1]
        : null;
    const activity = Object.fromEntries([1, 3, 7, 14, 30].flatMap(days => {
        const value = within(days);
        return [[`within${days}d`, value], [`within${days}dRate`, rate(value)]];
    }));
    const average = powers.length
        ? powers.reduce((sum, value) => sum + value, 0) / powers.length
        : null;

    return {
        snapshotAt: snapshotAt ? new Date(snapshotAt).toISOString() : null,
        player: {
            tracked,
            unique: uids.size,
            online,
            onlineRate: rate(online),
            level100,
            level100Rate: rate(level100),
            allianceJoined,
            allianceJoinedRate: rate(allianceJoined),
            activity,
        },
        power: {
            average,
            median: percentile(0.5),
            top25Threshold: percentile(0.75),
            top10Threshold: percentile(0.9),
            top5Threshold: percentile(0.95),
            top1Threshold: percentile(0.99),
            max: powers.at(-1) ?? null,
        },
        realPower: {
            analyzedServers: ids.length,
            activityGrades,
        },
    };
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

export function loadServerDirectory() {
    return requestJson("servers/servers-object.json", {
        revision: Date.now(),
        noStore: true,
    });
}
