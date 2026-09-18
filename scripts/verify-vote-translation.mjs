import assert from 'node:assert/strict';
import { translateTexts, voteText } from '../src/components/screen/vote/voteTranslation.js';

const source = { title: 'Poll', password: 'secret', choices: [{ no: 1, content: 'Attend', currentCount: 1, players: [{ nickname: 'private' }] }] };
assert.equal(voteText(source), voteText({ ...source, choices: [{ ...source.choices[0], currentCount: 5, players: [] }] }));
assert.notEqual(voteText(source), voteText({ ...source, choices: [{ ...source.choices[0], content: 'Changed' }] }));
assert.ok(!voteText(source).includes('secret') && !voteText(source).includes('private'));

const originalFetch = globalThis.fetch;
const texts = { 'vote.title': '투표', 'vote.choice.0': '참석' };
const language = { name: 'English', code: 'en' };
const controller = new AbortController();
try {
    globalThis.fetch = async (url, init) => {
        assert.equal(url, 'https://ax.progamer.info/api/chat');
        assert.equal(init.signal, controller.signal);
        const body = JSON.parse(init.body);
        assert.equal(body.model, 'qwen3:8b');
        assert.equal(body.stream, false);
        assert.equal(body.think, false);
        assert.deepEqual(JSON.parse(body.messages[1].content), texts);
        return { ok: true, json: async () => ({ message: { content: JSON.stringify({ 'vote.title': 'Poll', 'vote.choice.0': 'Attend', unwanted: 'ignored' }) } }) };
    };
    assert.deepEqual(await translateTexts(texts, language, controller.signal), { 'vote.title': 'Poll', 'vote.choice.0': 'Attend' });
    for (const content of ['{}', '{"vote.title":"Poll","vote.choice.0":""}', 'not JSON']) {
        globalThis.fetch = async () => ({ ok: true, json: async () => ({ message: { content } }) });
        await assert.rejects(() => translateTexts(texts, language));
    }
    globalThis.fetch = async () => ({ ok: false, status: 403 });
    await assert.rejects(() => translateTexts(texts, language), /HTTP 403/);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ error: 'model not found' }) });
    await assert.rejects(() => translateTexts(texts, language), /Missing translation response/);
    console.log('Vote translation checks passed.');
} finally {
    globalThis.fetch = originalFetch;
}
