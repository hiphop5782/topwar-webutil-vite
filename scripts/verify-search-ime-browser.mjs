import assert from 'node:assert/strict';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const html = `<!doctype html><html lang="ko"><body><div id="root"></div><script type="module">
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import SearchInput from '/src/components/template/CompositionSearchInput.jsx';
import { useParamState } from '/src/hooks/useParamState.js';
function Fixture() {
    const [value, setValue] = useParamState('nickname');
    const location = useLocation();
    const navigate = useNavigate();
    return React.createElement(React.Fragment, null,
        React.createElement(SearchInput, {type: 'search', value, onValueChange: next => {
            window.commits.push(next); setValue(next);
        }}),
        React.createElement('output', null, location.search),
        React.createElement('button', {id: 'reset', onClick: () => setValue('')}, 'Reset'),
        React.createElement('button', {id: 'navigate', onClick: () => navigate('?nickname=외부&server=123')}, 'Navigate'));
}
window.commits = [];
createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,
    {initialEntries: ['/?server=123']}, React.createElement(Fixture)));
</script></body></html>`;

const server = await createServer({
    configFile: false,
    cacheDir: 'node_modules/.vite-search-ime-test',
    esbuild: { jsx: 'automatic' },
    server: { host: '127.0.0.1', port: 0 },
    optimizeDeps: { entries: [], include: ['react', 'react/jsx-dev-runtime', 'react-dom/client', 'react-router-dom'] },
    plugins: [{ name: 'search-ime-fixture', configureServer(vite) {
        vite.middlewares.use('/__ime_test', async (req, res) => {
            res.setHeader('Content-Type', 'text/html');
            res.end(await vite.transformIndexHtml('/__ime_test', html));
        });
    } }],
});
let browser;
try {
    await server.listen();
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__ime_test`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('input');
    const cdp = await page.createCDPSession();
    await page.focus('input');
    for (const text of ['ㅎ', '하', '한']) {
        await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
        assert.equal(await page.$eval('input', input => input.value), text);
        assert.equal(await page.$eval('output', output => output.textContent), '?server=123');
        assert.deepEqual(await page.evaluate(() => window.commits), []);
    }
    await cdp.send('Input.insertText', { text: '한' });
    await page.waitForFunction(() => new URLSearchParams(document.querySelector('output').textContent).get('nickname') === '한');
    assert.equal(await page.$eval('input', input => input.value), '한');
    assert.deepEqual(await page.evaluate(() => window.commits), ['한']);

    // A second intentionally identical syllable must remain intact.
    await cdp.send('Input.imeSetComposition', { text: '한', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.insertText', { text: '한' });
    await page.waitForFunction(() => document.querySelector('input').value === '한한');
    assert.deepEqual(await page.evaluate(() => window.commits), ['한', '한한']);
    await page.keyboard.type('abc');
    await page.waitForFunction(() => new URLSearchParams(document.querySelector('output').textContent).get('nickname') === '한한abc');
    await page.click('#reset');
    await page.waitForFunction(() => document.querySelector('input').value === '');
    assert.equal(await page.$eval('output', output => output.textContent), '?server=123');
    await page.click('#navigate');
    await page.waitForFunction(() => document.querySelector('input').value === '외부');
    console.log('Search IME passed: composition isolation, single commit, repeated syllables, ASCII, reset and URL synchronization.');
} finally {
    await browser?.close();
    await server.close();
}
