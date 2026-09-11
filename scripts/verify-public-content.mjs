import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import puppeteer from 'puppeteer';

// Exercise the production bundle, including client-side navigation to invalid posts.
const dist = path.resolve('dist');
const folders = (await readdir('src/assets/md', { withFileTypes: true }))
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
const drafts = folders.filter(folder => folder.startsWith('9999-99-99'));
const published = folders.filter(folder => !folder.startsWith('9999-99-99'));
const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8');
assert.ok(!sitemap.includes('9999-99-99'));
assert.ok(!sitemap.includes('/information/ssc'));
assert.ok(!sitemap.includes('/information/kartz/user'));
assert.ok(sitemap.includes('/information/appearance'));
for (const asset of (await readdir(path.join(dist, 'assets'))).filter(file => file.endsWith('.js'))) {
    const source = await readFile(path.join(dist, 'assets', asset), 'utf8');
    assert.ok(!source.includes('/src/assets/md/9999-99-99'), `Draft module leaked into ${asset}`);
}

const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        let file = path.resolve(dist, `.${pathname}`);
        if (!file.startsWith(dist + path.sep) && file !== dist) {
            response.writeHead(403).end();
            return;
        }
        try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); }
        catch { file = path.join(dist, 'index.html'); }
        response.setHeader('Content-Type', mimeTypes[path.extname(file)] || 'application/octet-stream');
        response.end(await readFile(file));
    } catch { response.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
        // These checks need only the local application and post bundle, not live ads/APIs.
        if (request.url().startsWith(origin) || request.url().startsWith('data:')) request.continue();
        else request.abort();
    });
    for (const language of ['ko', 'en', 'ja']) {
        await page.goto(`${origin}/${language}/post`);
        await page.waitForSelector('.list-group-item');
        const links = await page.$$eval('.list-group-item a', nodes => nodes.map(node => node.getAttribute('href')));
        assert.ok(links.length >= published.length);
        assert.ok(links.every(link => !link.includes('9999-99-99')));

        for (const folder of [published[0], published.at(-1)]) {
            await page.goto(`${origin}/${language}/post/${folder}`);
            await page.waitForSelector('.markdown-body');
            assert.ok((await page.$eval('.markdown-body', node => node.textContent.trim())).length > 0);
            await page.waitForFunction(() => [...document.querySelectorAll('.markdown-body img')]
                .every(image => image.complete && image.naturalWidth > 0));
            const navigation = await page.$$eval('.sticky-top a', nodes => nodes.map(node => node.getAttribute('href')));
            assert.ok(navigation.every(link => !link.includes('9999-99-99')));
        }

        for (const suffix of ['post/not-a-real-post', ...drafts.map(folder => `post/${folder}`), 'information/kartz/user']) {
            await page.evaluate(url => {
                history.pushState({}, '', url);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }, `/${language}/${suffix}`);
            await page.waitForSelector('.not-found');
            await page.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content.includes('noindex'));
            assert.equal(await page.$('.markdown-body'), null);
            assert.ok(await page.$('.not-found-home'));
            await page.reload();
            await page.waitForSelector('.not-found');
            await page.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content.includes('noindex'));
            assert.equal(await page.$('.markdown-body'), null);
        }
        await page.goto(`${origin}/${language}/post/${published[0]}`);
        await page.waitForSelector('.markdown-body');
        await page.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content === 'index, follow');
        console.log(`${language}: public posts, navigation, drafts, missing posts, retired route and robots passed`);
    }
    console.log('Public content checks passed. The local fallback returns HTTP 200; production HTTP status must be checked separately.');
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
