import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({ headless: true });
try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
        if (!request.url().includes('/data/topwar-json/')) return void request.continue();
        const path = new URL(request.url()).pathname;
        const data = path.endsWith('index.json') ? { revision: 'test', datasets: {} } : path.includes('overall/latest') ? { players: [] } : path.includes('servers-object') ? { seasons: {} } : [];
        void request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
    });
    for (const language of ['ko', 'en', 'ja']) {
        await page.setViewport({ width: 1440, height: 1000 });
        await page.goto(`http://localhost:5656/${language}/information/data/overall/`, { waitUntil: 'networkidle2' });
        assert.equal(await page.evaluate(() => document.querySelectorAll('.data-navigation [aria-current=page]').length), 1);
        assert(await page.evaluate(() => document.querySelector('.data-navigation [aria-current=page]').classList.contains('btn-danger')));
        assert(await page.evaluate(() => document.querySelector('.navbar-nav > li:nth-last-child(2) a').pathname.includes('/post')));
        if (process.env.NAV_SCREENSHOT_DIR && language === 'ko') await page.screenshot({ path: `${process.env.NAV_SCREENSHOT_DIR}/overall-desktop.png` });
        await page.setViewport({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.locator('.data-navigation__toggle').click();
        await page.waitForFunction(() => document.querySelector('.data-navigation__toggle').getAttribute('aria-expanded') === 'true');
        await page.locator('.data-navigation a[href*="/data/servers"]').click();
        await page.waitForFunction(() => document.querySelector('.data-navigation__toggle').getAttribute('aria-expanded') === 'false');
        assert(await page.evaluate(() => document.querySelector('.data-navigation [aria-current=page]').classList.contains('btn-primary')));
        assert(await page.evaluate(() => document.querySelector('.data-navigation a[href*="/data/overall"]').classList.contains('btn-outline-danger')));
        if (process.env.NAV_SCREENSHOT_DIR && language === 'ko') await page.screenshot({ path: `${process.env.NAV_SCREENSHOT_DIR}/navigation-mobile.png` });
        console.log(`PASS ${language}: active colors, blog last, mobile disclosure, navigation and no overflow`);
    }
    assert.deepEqual(errors, []);
} finally {
    await browser.close();
}
