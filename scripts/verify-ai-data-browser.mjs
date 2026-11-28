import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

// Only synthetic identities/data are used, including when exercising the real model.
const cases = [
    ['99001 서버 요약해줘', '수집 표본을 요약'],
    ['99001이랑 99002 서버 비교해줘', '표본을 비교'],
    ['99001 서버의 TEST_USER_A와 99002 서버의 TEST_USER_B 유저 비교해줘', '유저별 최신'],
    ['99001 서버 TEST_GUILD_A 길드와 99002 서버 TEST_GUILD_B 길드 비교해줘', '표본을 비교'],
    ['99001 서버 최근 한달 이동 이력 알려줘', '유입 1건, 유출 0건'],
    ['99001 서버 TEST_USER_A 유저 요약해줘', '유저의 최신'],
    ['그 유저 다시 요약해줘', '유저의 최신'],
];
const fixture = { sourceUpdatedAt: '2026-11-27T00:00:00Z', players: [
    { uid: 'TEST_UID_A', nickname: 'TEST_USER_A', server: 99001, power: 100, level: 80, allianceId: 'TEST_GUILD_ID_A', allianceTag: 'TEST_GUILD_A', allianceName: 'TEST_GUILD_A' },
    { uid: 'TEST_UID_B', nickname: 'TEST_USER_B', server: 99002, power: 200, level: 90, allianceId: 'TEST_GUILD_ID_B', allianceTag: 'TEST_GUILD_B', allianceName: 'TEST_GUILD_B' },
] };
const browser = await puppeteer.launch({ headless: true });
try {
    const page = await browser.newPage();
    const errors = [];
    let snapshotRequests = 0;
    let aiRequests = 0;
    let lastModelReply = '';
    page.on('response', async response => { if (response.url().includes('ax.progamer.info/api/chat') && response.request().method() === 'POST') lastModelReply = (await response.json()).message?.content || ''; });
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
        const url = request.url();
        if (url.includes('ax.progamer.info/api/chat') && request.method() === 'POST') {
            aiRequests++;
            assert(!request.postData().includes('"players":'), 'full snapshot must not be sent to AI');
        }
        if (!url.includes('/data/topwar-json/')) return void request.continue();
        const path = new URL(url).pathname;
        let data = [];
        if (path.endsWith('index.json')) data = { revision: 'test', datasets: { overall: { movement: { dates: ['2026-11-27'] } } } };
        if (path.endsWith('overall/latest.json')) { snapshotRequests++; data = fixture; }
        if (path.includes('overall/movement/')) data = { updatedAt: '2026-11-27T00:00:00Z', rows: [{ uid: 'TEST_UID_A', nickname: 'TEST_USER_A', fromServer: 99002, toServer: 99001, detectedAt: '2026-11-26T00:00:00Z' }] };
        void request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
    });
    await page.goto('http://localhost:5656/ko/privacy/', { waitUntil: 'domcontentloaded' });
    await page.locator('.chatbot-floating-btn').click();
    for (const [question, expected] of cases) {
        const count = await page.evaluate(() => document.querySelectorAll('.chatbot-message.assistant:not(:has(.chatbot-loading-message))').length);
        await page.locator('.chatbot-footer input').fill(question);
        await page.keyboard.press('Enter');
        await page.waitForFunction(previous => !document.querySelector('.chatbot-loading-message') && document.querySelectorAll('.chatbot-message.assistant').length > previous, { timeout: 90000 }, count);
        const reply = await page.evaluate(() => [...document.querySelectorAll('.chatbot-message.assistant')].at(-1).innerText);
        assert(reply.includes(expected), `${question}: ${reply}\nModel: ${lastModelReply}`);
        assert(new URL(page.url()).pathname.includes('/privacy'), 'data questions must not navigate');
        console.log(`PASS ${question}`);
    }
    assert.equal(snapshotRequests, 1, 'reuse shared snapshot');
    assert.equal(aiRequests, cases.length);
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log('PASS direct model, all data results, cached snapshot, no auto-navigation and mobile layout');
} finally {
    await browser.close();
}
