import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const endpoint = 'https://ax.progamer.info/api/chat';
const model = 'qwen3:8b';
const report = { startedAt: new Date().toISOString(), endpoint, model, settings: { think: false, num_ctx: 4096, num_predict: 128, timeoutMs: 60000 }, rounds: [] };
const reportPath = process.argv[2];
if (!reportPath) throw new Error('Provide an output JSON path');

async function request(id) {
    const start = performance.now();
    let firstTokenMs = null;
    let text = '';
    let final;
    try {
        const response = await fetch(endpoint, {
            method: 'POST', signal: AbortSignal.timeout(report.settings.timeoutMs), headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, stream: true, think: false, options: { temperature: 0, num_ctx: 4096, num_predict: 128 }, messages: [
                { role: 'system', content: '제공된 가상 테스트 데이터만 사용하여 한국어 두 문장으로 요약하세요. 첫 문장은 서버 인원과 전투력 1위, 둘째 문장은 조사 시점 기준이라는 안내입니다. 다른 사실은 추가하지 마세요.' },
                { role: 'user', content: JSON.stringify({ server: 3223 + id, playerCount: 100 + id, topPlayer: `테스트${id}`, power: 100000000 + id, collectedAt: '2026-11-27' }) },
            ] }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const decoder = new TextDecoder();
        let pending = '';
        function consume(line) {
            if (!line.trim()) return;
            const item = JSON.parse(line);
            if (item.error) throw new Error(item.error);
            if (item.message?.content) {
                firstTokenMs ??= performance.now() - start;
                text += item.message.content;
            }
            if (item.done) final = item;
        }
        for await (const chunk of response.body) {
            pending += decoder.decode(chunk, { stream: true });
            const lines = pending.split('\n');
            pending = lines.pop();
            for (const line of lines) consume(line);
        }
        consume(pending + decoder.decode());
        if (!final || !text.trim()) throw new Error('Incomplete response');
        return { ok: true, firstTokenMs, elapsedMs: performance.now() - start, loadMs: final.load_duration / 1e6, promptTokens: final.prompt_eval_count, outputTokens: final.eval_count, tokensPerSecond: final.eval_duration ? final.eval_count / (final.eval_duration / 1e9) : null, doneReason: final.done_reason, sample: text };
    } catch (error) {
        return { ok: false, firstTokenMs, elapsedMs: performance.now() - start, error: error.message };
    }
}

for (const concurrency of [0, 1, 3, 5, 10]) {
    const started = performance.now();
    const results = await Promise.all(Array.from({ length: concurrency || 1 }, (_, index) => request(concurrency * 100 + index)));
    const round = { label: concurrency ? `concurrency-${concurrency}` : 'cold-start', concurrency: concurrency || 1, wallMs: performance.now() - started, results };
    report.rounds.push(round);
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ round: round.label, successful: results.filter(result => result.ok).length, total: results.length, wallSeconds: +(round.wallMs / 1000).toFixed(2), firstTokenSeconds: results.map(result => result.firstTokenMs == null ? null : +(result.firstTokenMs / 1000).toFixed(2)), errors: results.filter(result => !result.ok).map(result => result.error) }));
    if (results.some(result => !result.ok) || (concurrency > 0 && round.wallMs > 30000)) {
        report.stoppedEarly = 'Failure or warm batch exceeded 30 seconds; higher concurrency skipped';
        await writeFile(reportPath, JSON.stringify(report, null, 2));
        break;
    }
    if (concurrency !== 10) await new Promise(resolve => setTimeout(resolve, 2000));
}
