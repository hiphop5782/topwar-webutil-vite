import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

// All Firebase/GitHub calls are replaced with fixtures; this test cannot archive real votes.
const html = `<!doctype html><html lang="ko"><body><div id="root"></div><script type="module">
import React from 'react'; import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router-dom'; import {HelmetProvider} from 'react-helmet-async';
import i18n from 'i18next'; import {initReactI18next} from 'react-i18next';
import History from '/src/components/screen/vote/AttendanceVoteHistory.jsx';
import Reader from '/src/components/screen/vote/AttendanceVoteReader.jsx';
import Manager from '/src/components/screen/vote/AttendanceVoteManager.jsx';
import Creator from '/src/components/screen/vote/AttendanceVoteCreator.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
await i18n.use(initReactI18next).init({lng:'ko',resources:{ko:{viewer:{}}},defaultNS:'viewer'});
const route=new URL(location.href).searchParams.get('route') || '/ko/vote/cast/3223';
createRoot(document.getElementById('root')).render(React.createElement(HelmetProvider,null,
 React.createElement(MemoryRouter,{initialEntries:[route]},React.createElement(Routes,null,
 React.createElement(Route,{path:'/:lang/vote/create',element:React.createElement(Creator)}),
 React.createElement(Route,{path:'/:lang/vote/cast/:voteId',element:React.createElement(History)}),
 React.createElement(Route,{path:'/:lang/vote/cast/:serverId/:voteId',element:React.createElement(Reader)}),
 React.createElement(Route,{path:'/:lang/vote/manage/:voteId',element:React.createElement(Manager)})))));
</script></body></html>`;
const server = await createServer({ configFile: false, root: process.cwd(), cacheDir: 'node_modules/.vite-history-test',
    resolve: { alias: { '@src': path.resolve('src') } }, esbuild: { jsx: 'automatic' },
    server: { host: '127.0.0.1', port: 0 },
    optimizeDeps: { entries: [], include: ['react', 'react-dom/client', 'react-router-dom', 'react-helmet-async', 'i18next', 'react-i18next', 'react-toastify'] },
    plugins: [{ name: 'history-fixtures', enforce: 'pre', resolveId(id) {
        const normalized = id.replaceAll('\\', '/');
        for (const name of ['hooks/useFirebase', 'services/topwarDataRepository', 'services/voteArchiveRepository']) {
            if (normalized.endsWith('/' + name) || normalized.endsWith('/' + name + '.js')) return '\0fixture:' + name;
        }
    }, load(id) {
        if (id === '\0fixture:services/topwarDataRepository') return 'export const loadRealPower=async()=>({players:window.roster});';
        if (id === '\0fixture:services/voteArchiveRepository') return 'export const loadVoteHistory=async()=>window.archived; export const loadArchivedVote=async()=>window.archiveDetail;';
        if (id !== '\0fixture:hooks/useFirebase') return;
        return `import {useCallback} from 'react';
        const change=async status=>{window.fixture={...window.fixture,status,closed:status!=='active'};window.emitManager(window.fixture);return true;};
        export function useFirebase(){return {
          getVoteHistory:useCallback((id,next)=>{queueMicrotask(()=>next(window.live));return ()=>{};},[]),
          getVote:useCallback((id,next)=>{window.emitVote=next;queueMicrotask(()=>next(window.fixture));return ()=>{};},[]),
          getVoteRoster:useCallback(async()=>window.roster,[]),
          getVoteManager:useCallback((id,password,next)=>{window.emitManager=next;next(window.fixture);return ()=>{};},[]),
          closeVoteManually:()=>change('paused'),openVoteManually:()=>change('active'),endVote:()=>change('archiving'),
          deletePlayerFromVote:async()=>{window.deleted=true;return true;},
          saveVote:async vote=>{window.savedVote=vote;return true;},castVote:async()=>true
        };}`;
    }, configureServer(vite) { vite.middlewares.use('/__history_test', async (req, res) => {
        res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml('/__history_test', html));
    }); } }],
});
let browser;
try {
    await server.listen();
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => request.url().startsWith('http://127.0.0.1:') ? request.continue() : request.abort());
    await page.setViewport({ width: 412, height: 915 });
    await page.evaluateOnNewDocument(() => {
        window.roster = [{ uid:'1001',nickname:'높은CP',power:150000000,level:80,serverId:3223,allianceId:'1' },
            { uid:'1002',nickname:'홍시',power:300000,level:80,serverId:3223,allianceId:'1' }];
        window.fixture = { uuid:'NEWCODE1',title:'Newest vote',serverId:'3223',schemaVersion:2,rosterSource:'snapshot',
            targetScope:'server',createdAt:'2026-09-22',status:'active',closed:false,
            choices:[{no:1,content:'Yes',color:'#00aa00',currentCount:1,players:[{uid:'1001',nickname:'ChangedName',cp:150,cpUnit:'million'}]}] };
        window.archiveDetail = { ...window.fixture, uuid:'OLDCODE1',title:'Old vote',status:'archived',closed:true,roster:window.roster };
        window.archived = [{...window.archiveDetail,createdAt:'2026-09-20',archivePath:'3223/2026-09-21-001.json'}];
        window.live = [window.fixture,{...window.fixture,uuid:'PAUSE001',title:'Paused vote',status:'paused',closed:true,createdAt:'2026-09-21'},window.archived[0]];
    });
    const base = `http://127.0.0.1:${server.httpServer.address().port}/__history_test`;
    const open = async route => { await page.goto(base + '?route=' + encodeURIComponent(route), { waitUntil:'networkidle0' }); };
    const clickText = async text => {
        const found = await page.evaluate(text => {
            const element = [...document.querySelectorAll('button,a')].find(e => e.textContent.trim() === text);
            if (!element) return false; element.click(); return true;
        }, text);
        assert.ok(found, `Missing button/link: ${text}`);
    };
    await open('/ko/vote/cast/3223');
    await page.waitForSelector('a.card');
    assert.deepEqual(await page.$$eval('a.card h2', nodes => nodes.map(e=>e.textContent)), ['Newest vote','Paused vote','Old vote']);
    assert.equal(await page.$$eval('a.card.border-primary', nodes => nodes.length), 1);
    await page.click('a.card');
    await page.waitForSelector('.vote-nickname-picker input');
    assert.equal(await page.$$eval('.vote-nickname-results button', nodes => nodes.length), 2, 'Results visible without focusing search');
    await page.click('input[type=radio]');
    assert.equal(await page.$eval('button[aria-busy]', node => node.disabled), true, 'Typing alone cannot submit a cached identity');
    assert.equal(await page.$eval('.vote-nickname-results', node => getComputedStyle(node).position), 'static');
    await page.click('.vote-nickname-picker input');
    await page.waitForSelector('.vote-nickname-results button');
    assert.equal(await page.$eval('.vote-nickname-results button', node=>node.textContent.includes('150M')), true);
    assert.equal(await page.$$eval('.vote-nickname-results button', nodes=>nodes[1].textContent.includes('0.3M')), true);
    const buttonSize = await page.$eval('.vote-nickname-results button', node => ({ height: node.getBoundingClientRect().height, width: node.getBoundingClientRect().width, container: node.parentElement.clientWidth }));
    assert.ok(buttonSize.height <= 44 && buttonSize.width < buttonSize.container, 'Compact result buttons should not fill a mobile row');
    const cdp = await page.createCDPSession();
    await cdp.send('Input.imeSetComposition', { text: '호', selectionStart: 1, selectionEnd: 1 });
    await page.waitForFunction(() => document.querySelectorAll('.vote-nickname-results button').length === 1 && document.querySelector('.vote-nickname-results button strong')?.textContent === '홍시');
    assert.equal(await page.$eval('.vote-nickname-picker input', node => node.value), '호', 'Unfinished IME text filters results before committing');
    await cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });
    await page.waitForFunction(() => document.querySelectorAll('.vote-nickname-results button').length === 2);
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await page.waitForSelector('.vote-selected-player');
    assert.equal(await page.$eval('button[aria-busy]', node => node.disabled), false);
    await page.click('h1');
    assert.ok(await page.$('.vote-nickname-results button'), 'Outside click must not hide result buttons');
    await page.click('.vote-nickname-picker input');
    await page.type('.vote-nickname-picker input', 'unknown');
    assert.equal(await page.$eval('button[aria-busy]', node => node.disabled), true, 'Editing search invalidates previous selection');
    await clickText('직접 입력하겠습니다');
    assert.equal(await page.$('.vote-nickname-results'), null);
    const manual = await page.$$('.vote-profile-card input');
    assert.equal(await manual[0].evaluate(node => node.value), '높은CPunknown');
    assert.equal(await manual[1].evaluate(node => node.value), '', 'Do not reuse another player CP');
    assert.equal(await manual[2].evaluate(node => node.value), '', 'Do not reuse another player UID');
    await clickText('조사 명단에서 선택');
    await page.focus('.vote-nickname-picker input');
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.waitForSelector('.vote-nickname-results button');
    await page.click('.vote-nickname-results button');
    assert.equal(await page.$eval('.vote-selected-player', node=>node.textContent.includes('150M')), true);
    assert.equal(await page.$$eval('.attendance-roster-name', nodes=>nodes.length), 2, 'Renamed UID does not create a duplicate');
    await clickText('← 서버 투표 내역'); await page.waitForSelector('a.card');
    await open('/ko/vote/cast/NEWCODE1'); await page.waitForSelector('.vote-profile-card');
    await open('/ko/vote/manage/NEWCODE1');
    await clickText('불러오기'); await page.waitForSelector('button[aria-label="ChangedName 투표 삭제"]');
    page.on('dialog', dialog=>dialog.accept());
    await clickText('일시정지'); await page.waitForFunction(()=>document.body.textContent.includes('재개'));
    await clickText('재개'); await page.waitForFunction(()=>document.body.textContent.includes('일시정지'));
    await clickText('투표 최종 종료 · GitHub 보관');
    await page.waitForFunction(()=>document.body.textContent.includes('GitHub 보관 대기'));
    assert.equal(await page.$('button[aria-label="ChangedName 투표 삭제"]'), null);
    await page.evaluate(()=>window.emitManager(window.archiveDetail));
    await page.waitForFunction(()=>document.body.textContent.includes('GitHub 보관 완료'));
    assert.equal(await page.$$eval('button', nodes=>nodes.some(n=>n.textContent.trim()==='재개')), false);
    await open('/ko/vote/cast/3223/OLDCODE1');
    await page.evaluate(()=>window.emitVote(window.archiveDetail));
    await page.waitForFunction(()=>!document.querySelector('.vote-profile-card'));
    assert.equal(await page.$('input[type=radio]'), null);
    assert.equal(await page.$$eval('.attendance-roster-name', nodes=>nodes.length), 2);
    await open('/ko/vote/create');
    await clickText('서버전(SvS)');
    await page.waitForSelector('input[placeholder="예: 3453"]');
    await page.type('input[placeholder="예: 3453"]','3223');
    await clickText('최종 저장');
    await page.waitForFunction(()=>Boolean(window.savedVote));
    const saved = await page.evaluate(()=>window.savedVote);
    assert.equal(saved.rosterSource,'snapshot'); assert.deepEqual(saved.roster.map(p=>p.uid),['1001','1002']);
    assert.equal(saved.serverId,'3223');
    assert.ok(await page.$eval('body',node=>/\/vote\/cast\/3223\//.test(node.textContent)));
    assert.deepEqual(errors, []);
    console.log('Vote history browser checks passed: history merge/sort, reader links/legacy routes, snapshot CP/UID, lifecycle lock, archive display and creation.');
} finally { await browser?.close(); await server.close(); }
