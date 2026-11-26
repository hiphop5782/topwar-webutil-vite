import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (await readFile(new URL('../src/services/topwarDataRepository.js', import.meta.url), 'utf8')).replaceAll('import.meta.env', '({ VITE_TOPWAR_DATA_WORKER_URL: "https://data.example" })');
const originalFetch = globalThis.fetch;
const originalError = console.error;
let active = 0;
let maximum = 0;
let calls = 0;
let failHistory = false;
let failPart = false;
let wrongSize = false;
const parts = ['{"players":', '[{"name":"한글"}', ',{"name":"second"}', ']}'];
const directory = { seasons: { a: { servers: [3223, 3224] } } };

globalThis.fetch = async url => {
    const path = new URL(url).pathname.slice(1);
    calls++;
    active++;
    maximum = Math.max(maximum, active);
    try {
        // 첫 조각을 늦게 반환하여 완료 순서가 달라도 원문 순서로 결합하는지 확인한다.
        await new Promise(resolve => setTimeout(resolve, path.endsWith('0.txt') ? 30 : 5));
        if (path === 'index.json') return Response.json({ revision: 'test', datasets: {} });
        if (path === 'generated/homeStatistics.json') return Response.json({ server: { marker: true } });
        if (path === 'servers/servers-object.json') return Response.json(directory);
        if (path === '_history/servers-7d.json') return failHistory ? new Response('', { status: 503 }) : Response.json({ seasons: { a: { servers: [3223] } } });
        if (path === 'overall/latest.json') return Response.json({ _datahubChunked: true, parts: parts.map((_, i) => `overall/${i}.txt`), originalBytes: Buffer.byteLength(parts.join('')) + Number(wrongSize) });
        const match = path.match(/^overall\/(\d).txt$/);
        if (match) return failPart && match[1] === '0' ? new Response('', { status: 503 }) : new Response(parts[Number(match[1])]);
        throw new Error(`Unexpected request: ${path}`);
    } finally {
        active--;
    }
};

const loadRepository = id => import(`data:text/javascript;base64,${Buffer.from(source + `\n// ${id}`).toString('base64')}`);
try {
    const repository = await loadRepository('normal');
    const home = await repository.loadHomeStatistics();
    assert.equal(maximum, 3);
    assert.deepEqual(home.server, { marker: true, count: 2, change7d: 1 });
    maximum = 0;
    const overall = await repository.loadOverallLatest();
    assert.equal(maximum, 2);
    assert.deepEqual(overall, { players: [{ name: '한글' }, { name: 'second' }] });
    const before = calls;
    assert.equal(await repository.loadOverallLatest(), overall);
    assert.equal(calls, before);
    failHistory = true;
    console.error = () => {};
    assert.equal((await repository.loadHomeStatistics()).server.change7d, null);
    failPart = true;
    const retryRepository = await loadRepository('retry');
    await assert.rejects(retryRepository.loadOverallLatest(), /HTTP 503/);
    failPart = false;
    assert.deepEqual(await retryRepository.loadOverallLatest(), overall);
    wrongSize = true;
    await assert.rejects((await loadRepository('size')).loadOverallLatest(), /size mismatch/);
    console.log('PASS home parallel loading, optional history failure, chunk concurrency/order/UTF-8 size, cache and retry');
} finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
}
