import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

// Serve the real screen with an in-memory Firebase replacement; never write a live vote.
const html = `<!doctype html><html lang="ko"><body><div id="root"></div><script type="module">
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ToastContainer } from 'react-toastify';
import Reader from '/src/components/screen/vote/AttendanceVoteReader.jsx';
import Boundary from '/src/components/error/ScreenErrorBoundary.jsx';
await i18n.use(initReactI18next).init({lng:'ko',resources:{ko:{viewer:{}}},defaultNS:'viewer'});
function CrashTest() {
  const [crash,setCrash]=React.useState(false); window.crashScreen=()=>setCrash(true);
  if(crash) throw new Error('intentional rendering test');
  return React.createElement(Reader);
}
createRoot(document.getElementById('root')).render(React.createElement(HelmetProvider,null,
 React.createElement(MemoryRouter,{initialEntries:['/ko/vote/cast/test']},
 React.createElement(Boundary,null,React.createElement(Routes,null,
 React.createElement(Route,{path:'/:lang/vote/cast/:voteId',element:React.createElement(CrashTest)}))),
 React.createElement(ToastContainer))));
</script></body></html>`;
const server = await createServer({
    configFile: false, root: process.cwd(), cacheDir: 'node_modules/.vite-vote-test', resolve: { alias: { '@src': path.resolve('src') } },
    esbuild: { jsx: 'automatic' }, server: { host: '127.0.0.1', port: 0 },
    optimizeDeps: { include: ['react', 'react-dom/client', 'react-router-dom', 'react-helmet-async', 'i18next', 'react-i18next', 'react-toastify'] },
    plugins: [{
        name: 'vote-test-fixtures', enforce: 'pre',
        resolveId(id) {
            const normalized = id.replaceAll('\\', '/');
            if (/\/hooks\/useFirebase(?:\.js)?$/.test(normalized)) return '\0vote-test-firebase';
            if (/\/services\/topwarDataRepository(?:\.js)?$/.test(normalized)) return '\0vote-test-roster';
        },
        load(id) {
            if (id === '\0vote-test-roster') return 'export const loadRealPower = async () => ({players:[]});';
            if (id !== '\0vote-test-firebase') return;
            return `import {useCallback} from 'react';
            export function useFirebase(){return {
              getVote:useCallback((id,next,error)=>{window.emitVote=next;window.failVote=error;
                queueMicrotask(()=>next(window.fixture));return ()=>{};},[]),
              castVote:()=>{window.castCalls=(window.castCalls||0)+1;return new Promise((resolve,reject)=>{window.resolveCast=resolve;window.rejectCast=reject;});}
            };}`;
        },
        configureServer(vite) {
            vite.middlewares.use('/__vote_test', async (req, res) => {
                res.setHeader('Content-Type', 'text/html');
                res.end(await vite.transformIndexHtml('/__vote_test', html));
            });
        },
    }],
});
let browser;
try {
    await server.listen();
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => request.url().startsWith('http://127.0.0.1:') ? request.continue() : request.abort());
    page.on('pageerror', error => console.log('Browser error:', error.message));
    page.on('requestfailed', request => console.log('Request failed:', request.url(), request.failure()?.errorText));
    await page.setViewport({ width: 412, height: 915, isMobile: true });
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('vote-user-info', 'null');
        window.fixture = { title: 'Safety test', choices: [{ no: 1, content: 'Attend', players: [], currentCount: 0, limit: false }] };
    });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__vote_test`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('input[type=radio]');
    assert.ok(await page.$('.vote-profile-card'), 'Malformed storage must not blank the screen');
    await page.evaluate(() => window.failVote(new Error('offline')));
    await page.waitForSelector('[role=alert] button');
    await page.click('[role=alert] button');
    await page.waitForSelector('input[type=radio]');
    await page.evaluate(() => window.emitVote({ choices: null }));
    await page.waitForSelector('[role=alert] button');
    await page.click('[role=alert] button');
    await page.waitForSelector('input[type=radio]');
    await page.click('.vote-profile-card button');
    const inputs = await page.$$('.vote-profile-card input');
    await inputs[0].type('tester'); await inputs[1].type('10');
    await page.click('input[type=radio]');
    await page.click('button[aria-busy]');
    assert.equal(await page.$eval('button[aria-busy]', button => button.disabled), true);
    await page.click('button[aria-busy]');
    assert.equal(await page.evaluate(() => window.castCalls), 1);
    await page.evaluate(() => window.rejectCast(new Error('offline')));
    await page.waitForFunction(() => !document.querySelector('button[aria-busy]').disabled);
    assert.ok(await page.$('.vote-profile-card'));
    await page.click('button[aria-busy]');
    await page.evaluate(() => {
        window.fixture.choices[0].players = [{ nickname: 'tester', cp: 10, allianceTag: {} }, null];
        window.fixture.choices[0].currentCount = 1;
        window.emitVote(window.fixture); window.resolveCast(true);
    });
    await page.waitForSelector('.has-voted');
    assert.ok(await page.$('.vote-profile-card'), 'Post-submit snapshot must stay visible');
    await page.evaluate(() => window.crashScreen());
    await page.waitForFunction(() => document.body.innerText.includes('화면을 표시하지 못했습니다.'));
    assert.match(await page.$eval('body', body => body.innerText), /새로고침/);
    console.log('Mobile browser checks passed: corrupt storage, read failure/retry, invalid snapshot, double click, submit failure, post-submit update, render boundary.');
} finally {
    await browser?.close(); await server.close();
}
