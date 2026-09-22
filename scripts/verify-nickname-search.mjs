import assert from 'node:assert/strict';
import { matchesNicknameSearch, normalizeNicknameForSearch } from '../src/utils/normalizeNicknameForSearch.js';

for (const query of ['', 'ㅎ', '호', '홍', '홍ㅅ', '홍시', '호']) {
    assert.equal(matchesNicknameSearch('🍊홍시🍊', query), true, query);
}
for (const query of ['하', '혼', '홍사', '호시', '홍시2']) {
    assert.equal(matchesNicknameSearch('홍시', query), false, query);
}
assert.equal(matchesNicknameSearch('Ａｌｐｈａ１２３', 'alpha123'), true);
assert.equal(matchesNicknameSearch('Player١٢٣', 'PLAYER123'), true);
assert.equal(matchesNicknameSearch('홍시', '홍시'), true);
assert.notEqual(normalizeNicknameForSearch('호'), normalizeNicknameForSearch('홍'), 'Do not change identity normalization');
console.log('Nickname search passed: incomplete Hangul, decomposed input, Unicode case/digits and negative matches.');
