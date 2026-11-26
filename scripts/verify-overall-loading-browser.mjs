import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
try {
    const page = await browser.newPage();
    const errors = [];
    const historyRequests = [];
    const pendingHistory = [];
    let snapshotDelivered = false;
    let releaseSnapshot;
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
        const url = new URL(request.url());
        if (!url.pathname.includes('/data/topwar-json/')) return void request.continue();
        const path = url.pathname.split('/data/topwar-json/')[1];
        const respond = data => request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
        if (path === 'index.json') return void respond({ revision: 'test', datasets: { overall: { movement: { dates: ['2026-11-26'] }, nickname: { dates: ['2026-11-26'] } }, kartz: { historyMonths: ['2026-11'] } } });
        if (path === 'overall/latest.json') {
            releaseSnapshot = async () => {
                snapshotDelivered = true;
                await respond({ players: [{ uid: '1', nickname: 'CurrentName', server: 3223, power: 200, source: 'both', level: 80 }] });
            };
            return;
        }
        if (path.startsWith('overall/') || path.startsWith('kartz/history/')) {
            historyRequests.push({ path, snapshotDelivered });
            pendingHistory.push(() => respond(path.includes('nickname') ? { rows: [{ uid: '1', fromNickname: 'PreviousName', toNickname: 'CurrentName' }] } : path.includes('movement') ? { rows: [{ uid: '1', fromServer: 3224, toServer: 3223 }] } : { playerRankList: [], allianceRankList: [] }));
            return;
        }
        return void respond([]);
    });
    await page.goto('http://localhost:5656/ko/information/data/overall/', { waitUntil: 'domcontentloaded' });
    const deadline = Date.now() + 30000;
    while (!releaseSnapshot && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
    assert.ok(releaseSnapshot, 'snapshot request starts');
    assert.equal(historyRequests.length, 0, 'no auxiliary downloads compete with snapshot');
    await releaseSnapshot();
    await page.waitForFunction(() => document.querySelector('.overall-viewer')?.innerText.includes('CurrentName'));
    while (historyRequests.length < 3 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(historyRequests.length, 3);
    assert.ok(historyRequests.every(request => request.snapshotDelivered));
    console.log('PASS primary list visible while all auxiliary histories remain pending');
    await Promise.all(pendingHistory.map(respond => respond()));
    await page.locator('input[aria-label="플레이어 닉네임 검색"]').fill('MissingName');
    await page.waitForFunction(() => !document.querySelector('.overall-viewer')?.innerText.includes('CurrentName'));
    await page.locator('input[aria-label="플레이어 닉네임 검색"]').fill('PreviousName');
    await page.waitForFunction(() => document.querySelector('.overall-viewer')?.innerText.includes('CurrentName'));
    assert.deepEqual(errors, []);
    console.log('PASS previous nickname search after background loading; no browser errors');
} finally {
    await browser.close();
}
