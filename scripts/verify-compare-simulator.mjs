import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { buildComparisonEntities, comparisonDifference, comparisonPathForTargets, guildComparisonId, compareServerPopulation, compareKartzServer, serverComparisonScopes, comparisonAdvantage, kartzAdvantage } from '../src/utils/compareData.js';

assert.equal(comparisonAdvantage('power', 100, 200), 'b');
assert.equal(comparisonAdvantage('kartzBestRank', 10, 20), 'a');
assert.equal(comparisonAdvantage('power', null, 200), 'unknown');
assert.equal(comparisonAdvantage('power', 0, 0), 'tie');
assert.equal(comparisonAdvantage('top5Share', 90, 20), 'neutral');
assert.equal(kartzAdvantage({ kartzTop100: 2, kartzAverageRound: 80, kartzAllianceScore: 100 }, { kartzTop100: 1, kartzAverageRound: 90, kartzAllianceScore: 50 }).winner, 'a');
assert.equal(kartzAdvantage({ kartzTop100: 2 }, { kartzTop100: 1 }).winner, 'unknown');

const fixture = { sourceUpdatedAt: '2026-11-27T00:00:00Z', players: [
    { uid: 'TEST_A', nickname: 'TEST_ALPHA', server: 99001, power: 100, level: 80, allianceId: 'G1', allianceTag: 'TEST_GUILD', observedAt: '2026-11-27T00:00:00Z' },
    { uid: 'TEST_B', nickname: 'TEST_BETA', server: 99002, power: 200, level: 90, allianceId: 'G1', allianceTag: 'TEST_GUILD' },
    { uid: 'TEST_C', nickname: 'TEST_GAMMA', server: 99001, power: null },
    { uid: 'TEST_D', nickname: 'TEST_DELTA', server: 99001, power: 0 },
    { uid: 'TEST_A', nickname: 'DUPLICATE', server: 99001, power: 999 },
] };
const servers = buildComparisonEntities(fixture, 'servers');
const large = { players: Array.from({ length: 110 }, (_, index) => ({ uid: String(index), server: 99001, power: index + 1, level: 100 })) };
for (const scope of serverComparisonScopes) {
    const count = scope === 'all' ? 110 : Number(scope);
    const result = compareServerPopulation(large, 99001, scope);
    assert.equal(result.metrics.players, count);
    assert.equal(result.metrics.totalPower, count * (221 - count) / 2);
    assert.equal(result.metrics.level100, count);
}
assert.equal(compareServerPopulation(fixture, 99001, '5').metrics.players, 2);
assert.equal(compareServerPopulation(fixture, 99001, 'all').metrics.medianPower, 50);
assert.equal(compareServerPopulation({ players: [{ uid: 'unknown', server: 1 }] }, 1, '5'), null);
const kartzFixture = { playerRankList: [{ server: 99001, rank: 10, round: 80 }, { server: 99001, rank: 200, round: 60 }, { server: 99002, rank: 20, round: 75 }], allianceRankList: [{ server: 99001, rank: 1, score: 500 }] };
assert.equal(compareKartzServer(kartzFixture, 99001).kartzAverageRound, 70);
assert.equal(compareKartzServer(kartzFixture, 99001).kartzTop100, 1);
assert.equal(compareKartzServer(kartzFixture, 99002).kartzAllianceScore, null);
assert.equal(compareKartzServer({}, 99001).kartzPlayers, null);
assert.deepEqual(servers.get('99001').metrics, { players: 3, knownPower: 2, totalPower: 100, averagePower: 50, maxPower: 100, guilds: 1 });
assert.equal(buildComparisonEntities(fixture, 'guilds').size, 2);
assert.deepEqual(comparisonDifference(100, 200), { value: -100, percent: -50 });
assert.deepEqual(comparisonDifference(100, 0), { value: 100, percent: null });
assert.deepEqual(comparisonDifference(null, 0), { value: null, percent: null });
const path = comparisonPathForTargets('guild_compare', [{ server: 99001, uid: 'G1' }, { server: 99002, uid: 'G1' }]);
assert.equal(new URL(path, 'http://localhost').searchParams.get('left'), guildComparisonId(99001, 'G1'));

const browser = await puppeteer.launch({ headless: true });
try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
        if (!request.url().includes('/data/topwar-json/')) return void request.continue();
        const data = request.url().includes('overall/latest.json') ? fixture : request.url().includes('kartz/history/') ? kartzFixture : { revision: 'test', datasets: { kartz: { historyMonths: ['2026-11', '2026-10'] } } };
        void request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
    });
    await page.goto('http://localhost:5656/ko/simulation/compare/?type=players&left=TEST_A&right=TEST_B');
    await page.waitForSelector('.compare-results');
    assert(await page.$('[data-verdict="power"].compare-verdict--b'));
    assert(await page.$('[data-metric="power"] .compare-value--b.compare-value--winner'));
    assert((await page.$eval('.compare-results', el => el.innerText)).includes('-50%'));
    await page.click('.compare-swap');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('left') === 'TEST_B');
    await page.reload();
    await page.waitForSelector('.compare-results');
    assert((await page.$eval('.compare-picker--a', el => el.innerText)).includes('TEST_BETA'));
    await page.click('.compare-tabs button:nth-child(2)');
    for (const [side, query] of [['a', '99001'], ['b', '99002']]) {
        await page.waitForSelector(`#compare-search-${side}`);
        await page.locator(`#compare-search-${side}`).fill(query);
        await page.waitForSelector(`.compare-picker--${side} .compare-search-results button`);
        await page.locator(`.compare-picker--${side} .compare-search-results button`).click();
    }
    await page.waitForSelector('.compare-results');
    assert.equal(new URL(page.url()).searchParams.get('right'), '99002');
    await page.waitForSelector('[data-metric="kartzAverageRound"]');
    assert(await page.$('[data-metric="kartzBestRank"] .compare-value--a.compare-value--winner'));
    assert.equal(await page.$('[data-metric="top5Share"] .compare-value--winner'), null);
    await page.setViewport({ width: 1280, height: 1000 });
    await page.evaluate(() => document.querySelector('.compare-verdicts').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.screenshot({ path: 'C:/Users/PC/.codex/visualizations/2026/11/26/01a2164a-c9f1-70d1-99e9-0acf90e36d85/compare-advantage.png' });
    assert((await page.$eval('[data-metric="kartzAverageRound"]', el => el.innerText)).includes('70'));
    await page.evaluate(() => document.querySelector('.compare-scope').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.click('.compare-scope button:first-child');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('scope') === '5');
    await page.waitForFunction(() => document.querySelector('[data-metric="players"] td strong')?.innerText === '2');
    await page.select('#compare-kartz-month', '2026-10');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('month') === '2026-10');
    await page.reload();
    await page.waitForSelector('[data-metric="kartzAverageRound"]');
    assert.equal(await page.$eval('#compare-kartz-month', el => el.value), '2026-10');
    assert.equal(await page.$eval('.compare-scope button[aria-pressed="true"]', el => el.innerText), 'Top5');
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.goto(`http://localhost:5656/ko${path}`);
    await page.waitForSelector('.compare-results');
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.click('.chatbot-floating-btn');
    await page.waitForSelector('.chatbot-overlay');
    await page.goBack();
    await page.waitForFunction(() => !document.querySelector('.chatbot-overlay'));
    await page.goto('http://localhost:5656/en/simulation/compare/?type=players&left=missing&right=TEST_B');
    await page.waitForSelector('.compare-picker');
    assert.equal(await page.$('.compare-results'), null);
    assert(await page.$('#compare-search-a'));
    assert.deepEqual(errors, []);
    console.log('PASS aggregation, missing/zero values, guild IDs, URL restoration, swap, search selection, mobile layout and route rendering');
} finally { await browser.close(); }



