import assert from 'node:assert/strict';
import { isLongInactive, loginAgeDays, rankedVoteAlliances } from '../src/components/screen/vote/voteActivity.js';
import { buildRoster } from '../src/components/screen/vote/voteHistory.js';
const surveyedAt = '2026-11-01T00:00:00Z';
const now = Date.parse(surveyedAt);
const ago = days => (now - days * 86400000) / 1000;
assert.equal(isLongInactive({ lastLogin: ago(30) }, surveyedAt), false);
assert.equal(isLongInactive({ lastLogin: ago(31) }, surveyedAt), true);
assert.equal(isLongInactive({ lastLogin: 0 }, surveyedAt), false);
assert.equal(isLongInactive({}, surveyedAt), false);
assert.equal(loginAgeDays({ lastShowTime: ago(7) }, surveyedAt), 7);
assert.equal(loginAgeDays({ lastLogin: ago(7) * 1000 }, surveyedAt), 7);
assert.equal(isLongInactive({ lastLogin: ago(90), isOnline: true }, surveyedAt), false);
const players = [
    { uid: '1', nickname: 'Active', level: 80, serverId: 3223, allianceId: 'a', score: 10, lastLogin: ago(1) },
    { uid: '2', nickname: 'Dormant', level: 80, serverId: 3223, allianceId: 'b', score: 100, lastLogin: ago(15) },
    { uid: '3', nickname: 'Gone', level: 80, serverId: 3223, allianceId: 'b', score: 1000, lastLogin: ago(31) },
    { uid: '4', nickname: 'Unknown', level: 80, serverId: 3223, allianceId: 'c', score: 50 }
];
const eligible = players.filter(player => !isLongInactive(player, surveyedAt));
const ranked = rankedVoteAlliances(eligible.map(player => ({ ...player, voteLoginAge: loginAgeDays(player, surveyedAt) })));
assert.deepEqual(ranked.map(guild => guild.id), ['a', 'b', 'c']);
assert.equal(ranked[1].count, 1);
assert.equal(ranked[1].power, 100);
const roster = buildRoster(players, { serverId: '3223', targetScope: 'server' }, surveyedAt);
assert.deepEqual(roster.map(player => player.uid), ['3', '2', '4', '1']);
assert.equal(roster.find(player => player.uid === '3').longInactive, true);
assert.equal(roster.find(player => player.uid === '4').longInactive, false);
assert.deepEqual(buildRoster(players, { serverId: '3223', targetScope: 'alliance', allianceId: 'b' }, surveyedAt).map(player => player.uid), ['3', '2']);
console.log('Vote activity checks passed.');
