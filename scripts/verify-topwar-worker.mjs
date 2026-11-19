import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker from "../workers/topwar-data/worker.js";

const origin = "https://www.progamer.info";
const endpoint = "https://worker.example";
const sha = "a".repeat(40);
const previous = "b".repeat(40);
const env = { GITHUB_TOKEN: "test-only-token" };
const calls = [];
const entries = new Map();
const pending = [];
let failPath = "";
let redirectLocation = "";
globalThis.caches = { default: {
    match: async key => entries.get(key.url)?.clone(),
    put: async (key, value) => { entries.set(key.url, new Response(await value.arrayBuffer(), value)); }
} };
const ctx = { waitUntil: promise => pending.push(promise) };
const content = { players: [{ uid: "1", level: 100 }], exportedAt: "2026-11-18T00:00:00Z" };
const chunk = JSON.stringify(content);
const directory = { seasons: { one: { servers: [3223, 3224] } } };
globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://api.github.com");
    assert.equal(options.headers.Authorization, `Bearer ${env.GITHUB_TOKEN}`);
    assert.equal(options.redirect, "manual");
    calls.push(url);
    if (redirectLocation && url.pathname.includes("/repos/") && url.pathname.endsWith("/commits/main")) return new Response(null, { status: 301, headers: { Location: redirectLocation } });
    if (failPath && url.pathname.endsWith(failPath)) return new Response("PRIVATE ERROR DETAILS", { status: 403 });
    if (url.pathname.endsWith("/commits/main")) return Response.json({ sha });
    if (url.pathname.endsWith("/commits")) return Response.json([{ sha: previous }]);
    assert.equal(options.headers.Accept, "application/vnd.github.raw+json");
    assert.ok([sha, previous, "main"].includes(url.searchParams.get("ref")));
    if (url.pathname.endsWith("/index.json")) return Response.json({ revision: "original", datasets: { realpower: { serverIds: [3223] } } });
    if (url.pathname.endsWith("/servers/servers-object.json")) return Response.json(url.searchParams.get("ref") === previous ? { seasons: { one: { servers: [3223] } } } : directory);
    if (url.pathname.endsWith("/generated/homeStatistics.json")) return Response.json({ server: {} });
    if (url.pathname.endsWith("/realpower/3223.json")) return Response.json({ _datahubChunked: true, parts: ["realpower/chunks/3223.part"], partCount: 1, originalBytes: new TextEncoder().encode(chunk).length });
    if (url.pathname.endsWith("/realpower/chunks/3223.part")) return new Response(chunk);
    return Response.json({ ok: true });
};

async function request(path, options = {}, bindings = env) {
    const response = await worker.fetch(new Request(endpoint + path, { ...options, headers: { Origin: origin, ...options.headers } }), bindings, ctx);
    await Promise.all(pending.splice(0));
    return response;
}

for (const badOrigin of ["", "null", "https://evil.example", "http://localhost:5173"]) {
    assert.equal((await request("/index.json", { headers: { Origin: badOrigin } })).status, 403);
}
for (const path of ["/.env", "/.github/workflows/deploy.yml", "/unknown/file.json", "/realpower/chunks", "/generated/script.js", "/realpower/%2e%2e%2f.env", "/realpower/%252e%252e/file", "/realpower/%5csecret", "/%zz"]) {
    assert.ok([400, 404].includes((await request(path)).status));
}
assert.equal(calls.length, 0);
assert.equal((await request("/index.json", { method: "POST" })).status, 405);
assert.equal((await request("/index.json", { method: "OPTIONS", headers: { "Access-Control-Request-Method": "GET" } })).status, 204);
assert.equal((await request("/index.json", { method: "OPTIONS", headers: { "Access-Control-Request-Method": "POST" } })).status, 403);
assert.equal((await request("/index.json", {}, {})).status, 503);
assert.equal((await request("/index.json?revision=git:bad")).status, 400);

const indexResponse = await request("/index.json");
assert.equal(indexResponse.headers.get("Cache-Control"), "no-store");
assert.equal(indexResponse.headers.get("Access-Control-Allow-Origin"), origin);
const index = await indexResponse.json();
assert.equal(index.sourceRevision, "original");
assert.equal(index.revision, `git:${sha}`);
assert.equal(calls.length, 2);
assert.deepEqual(await (await request("/data/topwar-json/index.json")).json(), index);
assert.equal((await request("/health", { headers: { Origin: "" } })).status, 200);
assert.equal((await request("/api/servers")).status, 200);
assert.equal((await request("/data/topwar-thief/data/latest.json")).status, 200);
assert.equal((await request("/data/topwar-reward-finder/data/city-rewards.json")).status, 200);
assert.equal((await request("/data/topwar-thief/secrets/token.json")).status, 404);
assert.equal((await request("/data/unknown/data/latest.json")).status, 404);
const afterAliases = calls.length;
await request("/index.json?revision=1234&arbitrary=bust");
assert.equal(calls.length, afterAliases, "Caller timestamps must not bypass the cache");
const other = await request("/index.json", { headers: { Origin: "https://datahub.progamer.info" } });
assert.equal(other.headers.get("Access-Control-Allow-Origin"), "https://datahub.progamer.info");
assert.equal((await request("/index.json", { headers: { Origin: "https://evil.example" } })).status, 403, "Cached data must still check origin");
assert.equal((await request("/index.json", {}, {})).status, 503, "Removing the token must fail closed even on cache hits");
const limited = await request("/index.json", {}, { ...env, DATA_RATE_LIMITER: { limit: async () => ({ success: false }) } });
assert.equal(limited.status, 429);
assert.equal(limited.headers.get("Retry-After"), "60");

failPath = "/power/failure.json";
for (let i = 0; i < 2; i++) {
    const failure = await request("/power/failure.json");
    assert.equal(failure.status, 502);
    assert.deepEqual(await failure.json(), { error: "github_forbidden", stage: "file", upstreamStatus: 403 });
}
assert.equal(calls.filter(url => url.pathname.endsWith(failPath)).length, 2, "Failures must not be cached");
failPath = "";

// Exercise the actual FE repository against the Worker, including chunk reconstruction and history.
const upstreamFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    if (String(input).startsWith(endpoint)) return request(String(input).slice(endpoint.length), options);
    return upstreamFetch(input, options);
};
const source = await readFile(new URL("../src/services/topwarDataRepository.js", import.meta.url), "utf8");
const configured = source.replaceAll("import.meta.env", JSON.stringify({ VITE_TOPWAR_DATA_WORKER_URL: `${endpoint}/data/topwar-json` }));
const repository = await import(`data:text/javascript;base64,${Buffer.from(configured).toString("base64")}`);
assert.deepEqual(await repository.loadRealPower(3223), content);
assert.deepEqual(await repository.loadServerDirectory(), directory);
const statistics = await repository.loadHomeStatistics();
assert.equal(statistics.server.count, 2);
assert.equal(statistics.server.change7d, 1);
const historyRequest = calls.find(url => url.pathname.endsWith("/commits"));
assert.equal(historyRequest.searchParams.get("path"), "servers/servers-object.json");
assert.equal(historyRequest.searchParams.get("per_page"), "1");
assert.ok(calls.some(url => url.pathname.endsWith(".part") && url.searchParams.get("ref") === sha));
for (const path of ["power/playerData.json", "power/serverData.json", "power/allianceData.json", "power/movement/2026-11-19.json", "power/nickname/2026-11-19.json", "overall/latest.json", "overall/movement/2026-11-19.json", "overall/nickname/2026-11-19.json", "cross-pvp/top100.json", "generated/player-search/manifest.json", "generated/player-search/nickname/ab.json", "generated/player-search/uid/12.json", "liondance/2026-11-19.json", "kartz/enemy.json", "kartz/history/2026-11.json", "allianceDefense/2026-11-19.json", "chunks/overall/0001.part", "realpower/chunks/3223.json.part0001", "realpower/chunks/3223.chunk-001"]) {
    const response = await request(`/data/topwar-json/${path}?revision=git:${sha}`);
    assert.equal(response.status, 200, path);
    await response.arrayBuffer();
    assert.ok(calls.some(url => url.pathname.endsWith(`/contents/${path}`) && url.searchParams.get("ref") === sha), path);
}
const head = await request(`/data/topwar-json/index.json?revision=git:${sha}`, { method: "HEAD" });
assert.equal(head.status, 200);
assert.equal(await head.text(), "");
const legacy = source.replaceAll("import.meta.env", JSON.stringify({ VITE_TOPWAR_DATA_WORKER_URL: "", VITE_TOPWAR_DATA_BASE_URL: "https://legacy.example/main" }));
const rollback = await import(`data:text/javascript;base64,${Buffer.from(legacy).toString("base64")}`);
assert.equal(rollback.topwarDataBaseUrl, "https://legacy.example/main");
const disabled = source.replaceAll("import.meta.env", JSON.stringify({ VITE_TOPWAR_DATA_WORKER_URL: "off", VITE_TOPWAR_DATA_BASE_URL: "https://legacy.example/main" }));
const explicitlyDisabled = await import(`data:text/javascript;base64,${Buffer.from(disabled).toString("base64")}`);
assert.equal(explicitlyDisabled.topwarDataBaseUrl, "https://legacy.example/main");
entries.clear();
redirectLocation = "https://api.github.com/repositories/123/commits/main";
assert.equal((await request("/index.json")).status, 200, "GitHub API repository redirects must work");
assert.ok(calls.some(url => url.pathname === "/repositories/123/commits/main"));
entries.clear();
redirectLocation = "https://evil.example/steal-token";
const blockedRedirect = await request("/index.json");
assert.equal(blockedRedirect.status, 502);
assert.deepEqual(await blockedRedirect.json(), { error: "github_redirect_blocked", stage: "head" });
console.log("PASS: Origin/path restrictions, preflight, cache, snapshots, secret isolation, errors, rate limit, FE chunks/history and rollback configuration");
