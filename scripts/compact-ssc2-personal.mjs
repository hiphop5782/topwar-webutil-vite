import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";

const directory = new URL("../src/assets/json/ssc2/personal/", import.meta.url);
const manifestUrl = new URL("index.json", directory);
const snapshotDirectory = new URL("snapshots/", directory);
let manifest;
try { manifest = JSON.parse(await readFile(manifestUrl, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
manifest ??= { schemaVersion: 1, sources: {} };
assert.equal(manifest.schemaVersion, 1);
await mkdir(snapshotDirectory, { recursive: true });
const files = (await readdir(directory)).filter(name => /^cq26-all-server-merit-history-\d{4}-\d{2}-\d{2}\.json$/.test(name));
let inputBytes = 0;
for (const file of files) {
    const input = await readFile(new URL(file, directory), "utf8");
    inputBytes += Buffer.byteLength(input);
    const document = JSON.parse(input);
    const { dates, ...metadata } = document;
    assert.ok(dates && Object.keys(dates).length, `${file}: missing snapshots`);
    const references = {};
    for (const [date, snapshot] of Object.entries(dates)) {
        assert.ok(Array.isArray(snapshot.rankings), `${file}: invalid rankings`);
        const content = JSON.stringify(snapshot);
        const id = createHash("sha256").update(content).digest("hex");
        const target = new URL(`${id}.json`, snapshotDirectory);
        await writeFile(target, content);
        assert.deepEqual(JSON.parse(await readFile(target, "utf8")), snapshot);
        references[date] = { id, date: String(snapshot.date ?? date) };
    }
    manifest.sources[file] = { metadata, dates: references };
}
await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);
const saved = JSON.parse(await readFile(manifestUrl, "utf8"));
// Reconstruct every source, including older embedded rounds, before removing any input.
for (const file of files) {
    const source = saved.sources[file];
    const dates = {};
    for (const [date, reference] of Object.entries(source.dates)) dates[date] = JSON.parse(await readFile(new URL(`${reference.id}.json`, snapshotDirectory), "utf8"));
    assert.deepEqual({ ...source.metadata, dates }, JSON.parse(await readFile(new URL(file, directory), "utf8")), `${file}: lossless round trip`);
}
if (process.argv.includes("--prune")) for (const file of files) await unlink(new URL(file, directory));
let outputBytes = (await readFile(manifestUrl)).length;
for (const file of await readdir(snapshotDirectory)) outputBytes += (await readFile(new URL(file, snapshotDirectory))).length;
console.log(JSON.stringify({ verifiedSources: files.length, inputBytes, outputBytes, originalsRemoved: process.argv.includes("--prune") }));
