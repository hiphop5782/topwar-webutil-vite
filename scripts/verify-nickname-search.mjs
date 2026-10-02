import assert from 'node:assert/strict';
import { matchesNicknameSearch, normalizeNicknameForSearch } from '../src/utils/normalizeNicknameForSearch.js';
import { normalizeOverallSearch } from '../src/utils/normalizeOverallSearch.js';
import { hasMultiplePlanSearchQueries, matchesPlanPlayer } from '../src/components/screen/plan/planUtils.js';

for (const query of ['', 'ㅎ', '호', '홍', '홍ㅅ', '홍시', '호']) {
    assert.equal(matchesNicknameSearch('🍊홍시🍊', query), true, query);
}
for (const query of ['하', '혼', '홍사', '호시', '홍시2']) {
    assert.equal(matchesNicknameSearch('홍시', query), false, query);
}
assert.equal(matchesNicknameSearch('Ａｌｐｈａ１２３', 'alpha123'), true);
assert.equal(matchesNicknameSearch('Player١٢٣', 'PLAYER123'), true);
assert.equal(matchesNicknameSearch('ɴɪʙʙʟᴇꜱ', 'nibbles'), true);
assert.equal(normalizeNicknameForSearch('ɴɪʙʙʟᴇꜱ'), 'nibbles');
for (const [nickname, query] of [
    ['ᴍᴇᴍᴏʀʏ', 'memory'],
    ['ɴɪʙʙʟᴇꜱ', 'nibbles'],
    ['✨ᴍᴇᴍᴏʀʏ✨', 'MEMORY'],
    ['홍시', '홍ㅅ'],
    ['Crème', 'creme'],
    ['Straße', 'strasse'],
]) {
    assert.equal(normalizeOverallSearch(nickname).includes(normalizeOverallSearch(query)), true, `${nickname} / ${query}`);
}
assert.equal(normalizeOverallSearch('ᴍᴇᴍᴏʀʏ').includes(normalizeOverallSearch('memories')), false);
assert.equal(matchesNicknameSearch('홍시', '홍시'), true);
assert.notEqual(normalizeNicknameForSearch('호'), normalizeNicknameForSearch('홍'), 'Do not change identity normalization');
const pastedPlanNames = 'JohnLee,deukdo,스파클💦,MℛՇ ჯℯℛ,Thắng,ʜɪʏᴏ,E𝘻𝘻ү,Marć,🧐conan';
for (const nickname of ['JohnLee', '스파클💦', 'MℛՇ ჯℯℛ', 'Thắng', 'ʜɪʏᴏ', 'E𝘻𝘻ү', 'Marć', '🧐conan']) {
    assert.equal(matchesPlanPlayer({ nickname }, pastedPlanNames), true, `pasted plan search: ${nickname}`);
}
assert.equal(matchesPlanPlayer({ nickname: 'JohnLeeExtra' }, pastedPlanNames), false, 'Pasted lists use exact normalized nickname matches');
assert.equal(matchesPlanPlayer({ nickname: 'ＫＩＤ³²²³' }, 'kid3223,홍시'), true, 'Full-width and superscript characters in pasted lists');
assert.equal(matchesPlanPlayer({ nickname: 'baepd' }, 'DisneyUK,bae,joker'), false, 'Short names in pasted lists must not partially match');
assert.equal(hasMultiplePlanSearchQueries('JohnLee，홍시'), true);
console.log('Nickname search passed: incomplete Hangul, decomposed input, Unicode case/digits/small capitals and negative matches.');
