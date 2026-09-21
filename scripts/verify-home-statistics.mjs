import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

// Run against a local Vite development server or production preview.
// Small deterministic API fixtures exercise the real repository and Home lifecycle.
const origin = process.env.HOME_TEST_ORIGIN || 'http://127.0.0.1:5656';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const browser = await puppeteer.launch({ headless: true, pipe: true, args: ['--no-sandbox'] });
const base = {
    generatedAt: '2026-09-21T00:00:00Z', snapshotAt: '2026-09-21T00:00:00Z',
    server: { count: 1, change1d: 0, change30d: 0 },
    changes: { movement: { count: 0, date: '2026-09-21' }, nickname: { count: 0, date: '2026-09-21' } },
};
const realpower = {
    exportedAt: '2026-09-21T00:00:00Z', summary: { serverActivity: { grade: 'NORMAL' } },
    players: [
        { uid: '1', level: 100, power: 1000000, isOnline: false, allianceId: '1', lastLogin: 1789948800 },
        { uid: '2', level: 80, power: 3000000, isOnline: false, allianceId: '0', lastLogin: 1789948800 },
        { uid: '3', level: 79, power: 9000000, isOnline: true },
    ],
};

async function openCase(mode, language = 'ko') {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (mode === 'deferred') await page.evaluateOnNewDocument(() => {
        window.__PRERENDER_INJECTED = { building: true };
    });
    await page.setRequestInterception(true);
    page.on('request', async request => {
        const url = new URL(request.url());
        if (url.origin === origin || url.protocol === 'data:') return request.continue();
        let body;
        let status = 200;
        if (url.hostname === 'api.github.com') body = [];
        else if (url.hostname === 'raw.githubusercontent.com') {
            if (url.pathname.endsWith('/index.json')) body = { revision: 'fixture', datasets: { realpower: { serverIds: [3223] } } };
            else if (url.pathname.endsWith('/servers/servers-object.json')) body = { seasons: { one: { servers: [3223] } } };
            else if (url.pathname.endsWith('/generated/homeStatistics.json')) {
                body = base;
                if (mode === 'base-failure') status = 503;
            } else if (url.pathname.endsWith('/realpower/3223.json')) {
                if (mode === 'delayed') await new Promise(resolve => setTimeout(resolve, 17000));
                body = realpower;
                if (mode === 'failure') status = 503;
            } else body = {};
        } else return request.abort();
        if (!page.isClosed()) await request.respond({ status, contentType: 'application/json',
            headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
    });
    await page.goto(`${origin}/${language}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.home-dashboard');
    return { page, errors };
}

try {
    for (const language of ['ko', 'en', 'ja']) {
        const { page, errors } = await openCase('deferred', language);
        await page.waitForSelector('.home-statistics-status');
        assert.equal(await page.$$eval('.dashboard-kpi', nodes => nodes.length), 1);
        assert.equal(await page.$$eval('.server-grade, .power-card, .activity-progress', nodes => nodes.length), 0);
        assert.equal(await page.$eval('.home-statistics-status', node => node.textContent.includes('home.research.')), false);
        assert.equal(await page.$$eval('.home-statistics-status a', nodes => nodes.length), 1);
        assert.deepEqual(errors, []);
        await page.close();
        console.log(`PASS ${language}: prerender omits uncollected metrics and provides a translated notice`);
    }
    for (const mode of ['success', 'delayed', 'failure', 'base-failure']) {
        const { page, errors } = await openCase(mode);
        if (mode === 'base-failure') {
            await page.waitForSelector('.alert-warning');
            assert.equal(await page.$$eval('.dashboard-kpi', nodes => nodes.length), 0);
        } else if (mode === 'failure') {
            await page.waitForFunction(() => document.querySelector('.home-statistics-status')?.textContent.includes('불러오지 못해'));
            assert.equal(await page.$$eval('.dashboard-kpi', nodes => nodes.length), 1);
            assert.equal(await page.$$eval('.server-grade, .power-card', nodes => nodes.length), 0);
            assert.ok(await page.$('.change-item'));
        } else {
            if (mode === 'delayed') {
                await page.waitForSelector('.home-statistics-status');
                assert.equal(await page.$$eval('.dashboard-kpi', nodes => nodes.length), 1);
                await page.waitForFunction(() => document.querySelector('.home-statistics-status')?.textContent.includes('오래 걸리고'), { timeout: 25000 });
            }
            await page.waitForFunction(() => document.querySelectorAll('.dashboard-kpi').length === 4, { timeout: 25000 });
            const values = await page.$$eval('.kpi-value', nodes => nodes.map(node => node.textContent.trim()));
            assert.equal(values[1], '2', 'Only level 80+ players should be counted');
            assert.equal(values[3], '0', 'A measured zero must remain visible');
            assert.equal(await page.$('.home-statistics-status'), null);
            assert.ok(await page.$('.power-card'));
        }
        assert.deepEqual(errors, []);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        if (process.env.HOME_TEST_SCREENSHOT) {
            await page.$eval('.dashboard-section, .alert-warning', node => node.scrollIntoView());
            await page.screenshot({ path: `${process.env.HOME_TEST_SCREENSHOT}-${mode}.png` });
        }
        await page.close();
        console.log(`PASS ${mode}: home state and layout`);
    }
} finally {
    await browser.close();
}
