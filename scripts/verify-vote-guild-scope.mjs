import assert from 'node:assert/strict';
import { planGuildChange, guildChangeRevision, snapshotGuilds } from '../src/components/screen/vote/voteGuildScope.js';
const roster = [{ uid:'1', nickname:'old', allianceId:'10' }, { uid:'2', allianceId:'20' }, { uid:'3', allianceId:'' }];
const vote = { serverId:'3223', targetScope:'server', rosterSource:'snapshot', status:'active', choices:[
    { no:1, content:'Yes', currentCount:4, color:'#ff0000', players:[{uid:'1',nickname:'renamed'}, {uid:'2'}, {uid:'999',allianceId:'10'}, {nickname:'old'}] },
    { no:2, content:'No', currentCount:1, players:{ first:{uid:'3'} } },
] };
const original = JSON.stringify({vote,roster});
const plan = planGuildChange(vote,roster,'10');
assert.deepEqual(plan.roster.map(p=>p.uid),['1']);
assert.equal(plan.removedPeople,2); assert.equal(plan.removedResponses,4);
assert.equal(plan.choices[0].currentCount,1); assert.equal(plan.choices[1].currentCount,0);
assert.equal(plan.choices[0].players[0].nickname,'renamed'); assert.equal(plan.choices[0].color,'#ff0000');
assert.equal(JSON.stringify({vote,roster}),original);
assert.equal(snapshotGuilds(roster).length,2);
for(const change of [{status:'archiving'},{status:'archived'},{targetScope:'alliance'},{rosterSource:'live'}]) assert.throws(()=>planGuildChange({...vote,...change},roster,'10'));
assert.throws(()=>planGuildChange(vote,roster,'99'));
assert.throws(()=>planGuildChange(vote,[{uid:'1',serverId:3224,allianceId:'10'}],'10'));
assert.notEqual(guildChangeRevision(vote,roster),guildChangeRevision({...vote,choices:[]},roster));
assert.notEqual(guildChangeRevision(vote,roster),guildChangeRevision(vote,roster.slice(0,1)));
console.log('Guild scope checks passed: snapshot-only UID filtering, unknown/manual response removal, counts, immutable inputs, final-state guards and revision checks.');
