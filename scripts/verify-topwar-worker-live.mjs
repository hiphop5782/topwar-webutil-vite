import assert from "node:assert/strict";
const base = "https://api.progamer.info/data/topwar-json";
const origin = "https://www.progamer.info";
async function load(path, revision, text = false) {
    const response = await fetch(`${base}/${path}${revision ? `?revision=${encodeURIComponent(revision)}` : ""}`, { headers: { Origin: origin }, signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, `${path}: HTTP ${response.status} ${response.status === 200 ? "" : await response.text()}`);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    return text ? response.text() : response.json();
}
const index = await load("index.json");
assert.match(index.revision, /^git:[a-f0-9]{40}$/);
const d = index.datasets;
const paths = new Set(["servers/servers-object.json", "generated/homeStatistics.json", "generated/player-search/manifest.json", "cross-pvp/top100.json", "_history/servers-7d.json"]);
Object.values(d.power?.files || {}).forEach(path => paths.add(path));
for (const [name, descriptor] of Object.entries(d)) {
    if (descriptor.pattern && descriptor.serverIds?.length) paths.add(descriptor.pattern.replace("{serverId}", descriptor.serverIds.includes(3223) ? "3223" : descriptor.serverIds[0]));
    if (descriptor.pattern && descriptor.dates?.length) paths.add(descriptor.pattern.replace("{date}", descriptor.dates.at(-1)));
    if (descriptor.latest) paths.add(descriptor.latest);
    if (name === "liondance") descriptor.files?.forEach(path => paths.add(path));
    if (descriptor.enemy) paths.add(descriptor.enemy);
    if (descriptor.historyPattern && descriptor.historyMonths?.length) paths.add(descriptor.historyPattern.replace("{month}", descriptor.historyMonths.at(-1)));
    for (const kind of ["movement", "nickname"]) {
        const history = descriptor[kind];
        if (history?.pattern && history.dates?.length) paths.add(history.pattern.replace("{date}", history.dates.at(-1)));
    }
}
let count = 0;
for (const path of paths) {
    const value = await load(path, index.revision);
    if (value?._datahubChunked) {
        const parts = [];
        for (const part of value.parts) parts.push(await load(part, index.revision, true));
        const json = parts.join("");
        if (value.originalBytes != null) assert.equal(Buffer.byteLength(json), Number(value.originalBytes));
        JSON.parse(json);
    }
    if (path.endsWith("player-search/manifest.json")) {
        assert.equal(value.shardCount, 256);
        await load(value.nicknamePattern.replace("{shard}", "00"), index.revision);
        await load(value.uidPattern.replace("{shard}", "00"), index.revision);
        console.log("PASS nickname and UID search shards");
    }
    console.log(`PASS ${path}${value?._datahubChunked ? ` (${value.parts.length} chunks assembled)` : ""}`);
    count++;
}
const forbidden = await fetch(`${base}/index.json`, { headers: { Origin: "https://evil.example" } });
assert.equal(forbidden.status, 403);
console.log(`PASS ${count} live datasets, revision pinning, CORS and origin rejection`);
