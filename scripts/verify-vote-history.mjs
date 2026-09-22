import assert from 'node:assert/strict';
import { buildRoster, mergeHistory, nextArchivePath, publicArchive, voteState, sameVoter } from '../src/components/screen/vote/voteHistory.js';
import { archiveVoteData, finalizeArchive, digest } from '../automation/archive-core.mjs';

const vote = { uuid: 'TEST1234', serverId: '3223', schemaVersion: 2, title: 'Poll', status: 'archiving', closed: true,
    password: 'MUST_NOT_PUBLISH', adminToken: 'MUST_NOT_PUBLISH', targetScope: 'alliance', allianceId: '1',
    createdAt: new Date('2026-09-20T00:00:00Z'), endedAt: new Date('2026-09-21T16:00:00Z'),
    rosterCapturedAt: new Date('2026-09-20T00:00:00Z'),
    choices: [{ no: 1, content: 'yes', color: '#ff0000', players: [{ uid: '101', nickname: 'Renamed', cp: 3, password: 'MUST_NOT_PUBLISH' }] }] };
const players = [{ uid: '101', username: 'Name', serverId: 3223, level: 80, power: 3000000, allianceId: 1 },
    { uid: '102', nickname: 'No answer', level: 90, power: 4000000, allianceId: 1 },
    { uid: '103', nickname: 'low', level: 79, allianceId: 1 },
    { uid: '104', nickname: 'other guild', level: 80, allianceId: 2 },
    { uid: '105', nickname: 'other server', level: 80, allianceId: 1, serverId: 3224 }];
const roster = buildRoster(players, vote);
assert.deepEqual(roster.map(p => p.uid), ['102', '101']);
assert.throws(() => buildRoster([{ nickname: 'missing UID', level: 80 }], { ...vote, targetScope: 'server' }));
assert.equal(sameVoter({ uid: '101', nickname: 'old' }, { uid: '101', nickname: 'new' }), true);
assert.equal(sameVoter({ uid: '101', nickname: 'same' }, { uid: '102', nickname: 'same' }), false);
const archive = publicArchive(vote, roster);
assert.ok(!JSON.stringify(archive).includes('MUST_NOT_PUBLISH'));
assert.equal(archive.roster.length, 2); assert.equal(archive.choices[0].players[0].uid, '101');
assert.throws(() => publicArchive(vote, null));
assert.throws(() => publicArchive({ ...vote, choices: [{ ...vote.choices[0], players: [{ nickname: 'missing' }] }] }, roster));
assert.equal(publicArchive({ ...vote, schemaVersion: 1 }, null).rosterSource, 'unavailable');
assert.equal(nextArchivePath('3223', vote.endedAt, []), '3223/2026-09-22-001.json');
assert.equal(nextArchivePath('3223', vote.endedAt, [{ archivePath: '3223/2026-09-22-009.json' }]), '3223/2026-09-22-010.json');
assert.equal(voteState({ closed: true }), 'paused');
assert.equal(voteState({ expiresAt: new Date(0) }), 'expired');
assert.equal(voteState(vote), 'archiving');
const merged = mergeHistory([{ uuid: 'new', createdAt: '2026-09-22' }, vote], [archive]);
assert.equal(merged.length, 2); assert.equal(merged[0].uuid, 'new'); assert.equal(merged[1].status, 'archived');

function memoryStore() {
    let revision = 0;
    const versions = new Map([[0, {}]]);
    return { head: async () => revision,
        read: async (path, rev) => structuredClone(versions.get(rev)[path] || null),
        commit: async (parent, files) => {
            if (parent !== revision) throw Object.assign(new Error('conflict'), { status: 409 });
            versions.set(++revision, { ...versions.get(parent), ...structuredClone(files) }); return revision;
        },
    };
}
const store = memoryStore();
const first = await archiveVoteData(store, vote, roster);
assert.equal(first.archivePath, '3223/2026-09-22-001.json');
assert.equal(digest(await store.read(first.archivePath, first.archiveCommit)), first.checksum);
const retry = await archiveVoteData(store, vote, roster);
assert.equal(retry.archiveCommit, first.archiveCommit, 'Retry must not duplicate commits/files');
await assert.rejects(archiveVoteData(store, { ...vote, title: 'changed' }, roster), /CONFLICT/);
const concurrent = await Promise.all([archiveVoteData(store, { ...vote, uuid: 'SECOND' }, roster), archiveVoteData(store, { ...vote, uuid: 'THIRD' }, roster)]);
assert.equal(new Set(concurrent.map(r => r.archivePath)).size, 2);
assert.equal((await store.read('3223/index.json', await store.head())).votes.length, 3);
const failing = { ...memoryStore(), commit: async () => { throw new Error('offline'); } };
await assert.rejects(archiveVoteData(failing, vote, roster), /offline/);
assert.equal(await failing.read('3223/index.json', await failing.head()), null);
const corrupted = memoryStore(); const read = corrupted.read;
corrupted.read = async (path, rev) => rev > 0 && path.endsWith('001.json') ? {} : read(path, rev);
await assert.rejects(archiveVoteData(corrupted, vote, roster), /VERIFICATION_FAILED/);
const stamp = { isEqual: other => other === stamp };
const voteSnapshot = { ref: 'vote', exists: true, updateTime: stamp };
const rosterSnapshot = { ref: 'roster', exists: true, updateTime: stamp };
let currentVote = voteSnapshot, currentRoster = rosterSnapshot, operations = [];
const db = { runTransaction: async callback => {
    const pending = [];
    await callback({ get: async ref => ref === 'vote' ? currentVote : currentRoster,
        update: (ref, value) => pending.push(['update', ref, value]), delete: ref => pending.push(['delete', ref]) });
    operations.push(...pending);
} };
const fields = { delete: () => 'DELETE', serverTimestamp: () => 'SERVER_TIME' };
await finalizeArchive(db, voteSnapshot, rosterSnapshot, first, fields);
assert.equal(operations[0][2].status, 'archived'); assert.equal(operations[0][2].choices, 'DELETE');
assert.deepEqual(operations[1], ['delete','roster']);
operations = []; currentVote = { ...voteSnapshot, updateTime: { isEqual: () => false } };
await assert.rejects(finalizeArchive(db, voteSnapshot, rosterSnapshot, first, fields), /VOTE_CHANGED/);
assert.equal(operations.length, 0);
currentVote = voteSnapshot; currentRoster = { ...rosterSnapshot, exists: false };
await assert.rejects(finalizeArchive(db, voteSnapshot, rosterSnapshot, first, fields), /ROSTER_CHANGED/);
assert.equal(operations.length, 0);
console.log('Vote history checks passed: UID snapshot, filters, date/sequence, privacy, merge, retries, concurrency and verification failures.');
