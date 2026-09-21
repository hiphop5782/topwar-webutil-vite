import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as safety from '../src/components/screen/vote/voteSafety.js';
import { normalizeNicknameForSearch } from '../src/utils/normalizeNicknameForSearch.js';

const require = createRequire(import.meta.url);
async function loadWithMocks(path, mocks) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    const { code } = await transform(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : require(name), module, module.exports);
    return module.exports;
}

const user = { nickname: 'tester', cp: 10 };
const choice = { no: 1, content: 'Attend', players: [], currentCount: 0, limit: false };
const poll = () => ({ title: 'Poll', choices: [structuredClone(choice)] });
for (const saved of [null, [], 1, 'bad', {}, { nickname: {}, cp: {}, allianceTag: {} }]) {
    const safe = safety.normalizeVoteUser(saved);
    assert.equal(typeof safe.nickname, 'string');
    assert.equal(typeof safe.allianceTag, 'string');
    assert.equal(safe.cp, '');
}
assert.equal(safety.normalizeVoteUser({ ...user, cp: Infinity }).cp, '');
assert.equal(safety.normalizeVoteUser(user).cp, 10);
for (const expiry of [{ toDate: () => new Date('2030-01-01') }, new Date('2030-01-01'), '2030-01-01']) {
    assert.equal(safety.voteExpiry(expiry).getUTCFullYear(), 2030);
}
for (const expiry of [{}, 'bad', false, new Date(NaN)]) assert.throws(() => safety.voteExpiry(expiry));
assert.equal(safety.voteExpiry(null), null);
for (const data of [{}, { choices: {} }, { choices: [null] }, { choices: [choice, choice] }]) {
    assert.throws(() => safety.normalizeVoteDisplay(data));
}
const raw = poll();
raw.choices[0].players = { one: null, two: { ...user, allianceTag: {} } };
const display = safety.normalizeVoteDisplay(raw);
assert.equal(display.choices[0].players.length, 1);
assert.equal(display.choices[0].players[0].allianceTag, '');
assert.equal(raw.choices[0].players.one, null, 'Display normalization must not mutate database data');

let data, writes, docError, transactionError, snapshotError, unsubscribeCalled;
const firestore = {
    doc: () => { if (docError) throw docError; return {}; },
    onSnapshot: (ref, next, error) => {
        if (snapshotError) error(snapshotError);
        else next({ exists: () => true, data: () => data });
        return () => { unsubscribeCalled = true; };
    },
    runTransaction: async (db, callback) => {
        if (transactionError) throw transactionError;
        await callback({ get: async () => ({ exists: () => true, data: () => data }), update: (ref, update) => writes.push(update) });
    },
};
const { useFirebase } = await loadWithMocks('../src/hooks/useFirebase.js', {
    react: { useCallback: callback => callback }, '../db/firebase': { db: {} }, 'firebase/firestore': firestore,
    '@src/utils/normalizeNicknameForSearch': { normalizeNicknameForSearch },
    '@src/components/screen/vote/voteSafety': safety,
});
const api = useFirebase();
const originalError = console.error;
const errors = [];
console.error = (...args) => errors.push(args);
try {
    const reset = () => { data = poll(); writes = []; docError = transactionError = snapshotError = null; };
    reset();
    assert.equal(await api.castVote('id', 1, user), true);
    assert.equal(writes[0].choices[0].players[0].nickname, user.nickname);
    assert.equal(writes[0].choices[0].currentCount, 1);
    for (const setup of [
        () => { docError = new Error('invalid document path'); },
        () => { transactionError = new Error('offline'); },
        () => { data.choices = []; },
        () => { data.expiresAt = {}; },
        () => { data.choices[0].no = 2; },
        () => { data.choices[0].players = [null]; },
        () => { data.choices[0].currentCount = 'bad'; },
        () => { data.closed = true; },
        () => { data.expiresAt = new Date(0); },
        () => { data.choices[0].limit = true; data.choices[0].count = 0; },
    ]) {
        reset(); setup(); let reported;
        assert.equal(await api.castVote('id', 1, user, error => { reported = error; }), false);
        assert.ok(reported); assert.equal(writes.length, 0);
    }
    reset();
    data.choices = [{ ...choice, players: { first: user }, currentCount: 1 }, { ...choice, no: 2 }];
    assert.equal(await api.castVote('id', 2, user), true, 'Legacy player maps support vote changes');
    assert.equal(writes[0].choices[0].currentCount, 0);
    assert.equal(writes[0].choices[1].currentCount, 1);
    reset(); data.choices[0].players = [user]; data.choices[0].currentCount = 1;
    let duplicate;
    assert.equal(await api.castVote('id', 1, user, error => { duplicate = error; }), false);
    assert.equal(duplicate, '이미 해당 항목에 투표하셨습니다.');
    assert.equal(writes.length, 0);
    for (const type of ['document', 'snapshot', 'callback']) {
        reset(); let reported;
        if (type === 'document') docError = new Error('path');
        if (type === 'snapshot') snapshotError = new Error('permission-denied');
        api.getVote('id', () => { if (type === 'callback') throw new Error('bad snapshot'); }, error => { reported = error; });
        assert.ok(reported, `${type} errors must reach the screen`);
    }
    reset(); api.getVote('id', () => {})(); assert.equal(unsubscribeCalled, true);
} finally { console.error = originalError; }

const { default: Boundary } = await loadWithMocks('../src/components/error/ScreenErrorBoundary.jsx', {});
const boundary = new Boundary({ children: React.createElement('p', null, 'normal') });
assert.match(renderToStaticMarkup(boundary.render()), /normal/);
boundary.state = Boundary.getDerivedStateFromError(new Error('render failed'));
const fallback = renderToStaticMarkup(boundary.render());
assert.match(fallback, /role="alert"/);
assert.match(fallback, /새로고침/);
assert.match(fallback, /참여자 목록/);
console.log('Vote safety checks passed: malformed data, expiry, transaction failures, duplicate/change votes, read errors, recovery screen.');
