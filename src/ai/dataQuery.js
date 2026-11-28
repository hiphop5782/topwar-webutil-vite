import { comparisonPathForTargets } from '../utils/compareData.js';

export const queryKinds = ['player_summary', 'player_compare', 'guild_compare', 'server_summary', 'server_compare', 'server_history'];
export const dataQuerySchema = {
    type: 'object', additionalProperties: false,
    properties: {
        kind: { type: 'string', enum: queryKinds },
        targets: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, uid: { type: 'string' }, server: { type: 'integer', minimum: 0 } }, required: ['name', 'uid', 'server'] } },
        startDate: { type: 'string', description: 'YYYY-MM-DD or empty for default' },
        endDate: { type: 'string', description: 'YYYY-MM-DD or empty for today' },
    },
    required: ['kind', 'targets', 'startDate', 'endDate'],
};

const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase().trim();
const displayNumber = value => value == null ? '미수집' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 0 });
const numericPower = player => player.power != null && player.power !== '' && Number.isFinite(Number(player.power)) && Number(player.power) >= 0 ? Number(player.power) : null;
const sourceNote = '수집된 표본 기준입니다. 실시간 전체 인원이나 실제 전투 승패를 의미하지 않습니다. 서로 다른 조사 시점의 자료가 포함될 수 있습니다.';
const dateValid = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function resolveQueryDates(plan, message, now = new Date()) {
    if (plan?.kind !== 'server_history') return plan;
    const today = now.toISOString().slice(0, 10);
    const end = Date.parse(today);
    const relativeDays = message.match(/최근\s*(\d+)\s*일|(?:last|past)\s+(\d+)\s+days|過去\s*(\d+)\s*日/i);
    let days = relativeDays ? Number(relativeDays[1] || relativeDays[2] || relativeDays[3]) : /최근\s*(?:한\s*달|1\s*개월|한\s*개월)|past\s+month|過去\s*1\s*か月/i.test(message) ? 30 : /최근\s*(?:일주일|한\s*주)|past\s+week/i.test(message) ? 7 : null;
    if (days !== null) {
        if (!Number.isInteger(days) || days < 1 || days > 3660) throw new Error('조회 기간은 1~3660일로 알려주세요.');
        return { ...plan, startDate: new Date(end - (days - 1) * 86400000).toISOString().slice(0, 10), endDate: today };
    }
    if (/지난\s*달|last\s+month|先月/i.test(message)) return { ...plan, startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 10), endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).toISOString().slice(0, 10) };
    if (/이번\s*달|this\s+month|今月/i.test(message)) return { ...plan, startDate: `${today.slice(0, 7)}-01`, endDate: today };
    return plan;
}

export function validateDataQuery(plan) {
    if (!plan || !queryKinds.includes(plan.kind) || !Array.isArray(plan.targets) || plan.targets.length < 1 || plan.targets.length > 4) throw new Error('조회 종류와 대상을 다시 알려주세요. 한 번에 최대 4개 대상을 비교할 수 있습니다.');
    const compare = plan.kind.endsWith('_compare');
    if (compare ? plan.targets.length < 2 : plan.targets.length !== 1) throw new Error(compare ? '비교할 대상을 두 개 이상 알려주세요.' : '요약 또는 이력 조회는 대상 하나를 알려주세요.');
    for (const target of plan.targets) {
        if (!target || typeof target.name !== 'string' || typeof target.uid !== 'string' || !Number.isInteger(target.server) || target.server < 0 || target.server > 99999 || target.name.length > 100 || target.uid.length > 30) throw new Error('조회 대상의 형식이 올바르지 않습니다.');
        if (plan.kind.startsWith('server_') ? !target.server : !target.name.trim() && !target.uid.trim()) throw new Error('서버 번호 또는 정확한 이름·ID를 알려주세요.');
    }
    for (const key of ['startDate', 'endDate']) if (typeof plan[key] !== 'string' || (plan[key] && !dateValid(plan[key]))) throw new Error('기간은 YYYY-MM-DD 형식으로 알려주세요.');
    if (plan.startDate && plan.endDate && plan.startDate > plan.endDate) throw new Error('시작일이 종료일보다 늦습니다.');
    if (plan.kind !== 'server_history' && (plan.startDate || plan.endDate)) throw new Error('현재 비교·요약은 최신 스냅샷만 지원합니다. 기간 지정은 서버 이동 이력에 사용할 수 있습니다.');
    return plan;
}

function ambiguity(label, candidates) {
    return { text: `${label} 대상을 하나로 특정하지 못했습니다. 서버 번호와 정확한 이름 또는 ID를 함께 알려주세요.`, columns: ['대상', '서버', 'ID'], rows: candidates.slice(0, 8).map(item => [item.name, item.server, item.uid]), notes: [`후보 ${candidates.length}개 중 최대 8개 표시`], links: [] };
}

function statistics(players) {
    const powers = players.map(numericPower).filter(value => value !== null);
    const total = powers.reduce((sum, value) => sum + value, 0);
    return [players.length, powers.length, powers.length ? total : null, powers.length ? total / powers.length : null, powers.length ? powers.reduce((max, value) => Math.max(max, value), 0) : null];
}

export function querySnapshot(document, plan) {
    validateDataQuery(plan);
    if (!Array.isArray(document?.players)) throw new Error('통합 데이터 형식이 올바르지 않습니다.');
    const seen = new Set();
    const players = document.players.filter(player => {
        if (player.uid == null || seen.has(String(player.uid))) return false;
        seen.add(String(player.uid));
        return true;
    });
    const base = { notes: [sourceNote], sources: [{ label: '통합 플레이어 스냅샷', path: 'overall/latest.json', at: document.sourceUpdatedAt || document.generatedAt || null }], links: [] };
    const resolved = [];
    if (plan.kind.startsWith('player_')) {
        for (const target of plan.targets) {
            const scope = players.filter(player => !target.server || Number(player.server) === target.server);
            let matches = target.uid ? scope.filter(player => String(player.uid) === target.uid) : scope.filter(player => normalize(player.nickname) === normalize(target.name));
            if (!matches.length && !target.uid) matches = scope.filter(player => normalize(player.nickname).includes(normalize(target.name)));
            if (!matches.length) return { ...base, text: `${target.name || target.uid}: 최신 수집 데이터에서 찾지 못했습니다. UID 또는 현재 닉네임을 확인해 주세요.`, columns: [], rows: [] };
            if (matches.length !== 1) return { ...base, ...ambiguity(target.name, matches.map(player => ({ name: player.nickname, server: player.server, uid: player.uid }))) };
            resolved.push(matches[0]);
        }
        if (new Set(resolved.map(player => String(player.uid))).size !== resolved.length) throw new Error('같은 유저가 중복 선택됐습니다. 다른 비교 대상을 알려주세요.');
        return { ...base, text: plan.kind === 'player_compare' ? '유저별 최신 수집 정보를 비교했습니다.' : '유저의 최신 수집 정보입니다.', columns: ['닉네임', 'UID', '서버', '길드', '레벨', '전투력', '조사 시각'], rows: resolved.map(player => [player.nickname || '-', String(player.uid), player.server, `[${player.allianceTag || '-'}] ${player.allianceName || ''}`, player.level ?? '미수집', displayNumber(numericPower(player)), player.observedAt || '미수집']), links: resolved.map(player => ({ label: `${player.nickname || player.uid} 상세`, path: `/information/data/player-detail?nickname=${encodeURIComponent(player.nickname || '')}` })), context: { ...plan, targets: resolved.map(player => ({ name: player.nickname || '', uid: String(player.uid), server: Number(player.server) })) } };
    }
    const groups = new Map();
    for (const player of players) {
        const guild = plan.kind === 'guild_compare';
        if (guild && !player.allianceTag && !player.allianceName) continue;
        const id = guild ? `${player.server}|${player.allianceId && String(player.allianceId) !== '0' ? player.allianceId : player.allianceTag || player.allianceName}` : String(player.server);
        if (!groups.has(id)) groups.set(id, { id, server: Number(player.server), uid: guild && player.allianceId && String(player.allianceId) !== '0' ? String(player.allianceId) : '', name: guild ? `[${player.allianceTag || '-'}] ${player.allianceName || ''}` : `s${player.server}`, tag: player.allianceTag, fullName: player.allianceName, players: [] });
        groups.get(id).players.push(player);
    }
    for (const target of plan.targets) {
        const scope = [...groups.values()].filter(group => !target.server || group.server === target.server);
        const matches = plan.kind === 'guild_compare' ? scope.filter(group => target.uid ? group.uid === target.uid : [group.name, group.tag, group.fullName, `[${group.tag}]`].some(value => normalize(value) === normalize(target.name))) : scope;
        if (!matches.length) return { ...base, text: `${target.name || `s${target.server}`}: 최신 수집 데이터에서 찾지 못했습니다. 서버 번호와 길드 태그를 확인해 주세요.`, columns: [], rows: [] };
        if (matches.length !== 1) return { ...base, ...ambiguity(target.name, matches) };
        resolved.push(matches[0]);
    }
    if (new Set(resolved.map(group => group.id)).size !== resolved.length) throw new Error('같은 대상이 중복 선택됐습니다.');
    return { ...base, text: plan.kind === 'server_summary' ? '서버의 최신 수집 표본을 요약했습니다.' : '동일한 최신 통합 스냅샷에서 수집 표본을 비교했습니다.', columns: ['대상', '서버', '수집 인원', '전투력 수집 인원', '전투력 합계', '평균 전투력', '최대 전투력'], rows: resolved.map(group => [group.name, group.server, ...statistics(group.players).map(displayNumber)]), links: resolved.map(group => ({ label: `${group.name} 상세`, path: `/information/data/overall?view=${plan.kind === 'guild_compare' ? 'alliances' : 'servers'}&server=${group.server}${plan.kind === 'guild_compare' ? `&alliance=${encodeURIComponent(group.tag || group.fullName)}` : ''}` })), context: { ...plan, targets: resolved.map(group => ({ name: plan.kind === 'guild_compare' ? group.tag || group.fullName : '', uid: group.uid, server: group.server })) } };
}

export function summarizeServerHistory(plan, files, results) {
    const server = plan.targets[0].server;
    const rows = [];
    const seen = new Set();
    let failed = 0;
    const successful = [];
    results.forEach((result, index) => {
        if (result.status !== 'fulfilled' || !Array.isArray(result.value?.rows)) { failed++; return; }
        successful.push({ ...files[index], at: result.value.updatedAt || null });
        for (const row of result.value.rows) {
            if (Number(row.fromServer) !== server && Number(row.toServer) !== server) continue;
            const date = String(row.detectedAt || '').slice(0, 10);
            if (!dateValid(date) || date < plan.startDate || date > plan.endDate) continue;
            const key = JSON.stringify([row.uid, row.fromServer, row.toServer, row.detectedAt]);
            if (seen.has(key)) continue;
            seen.add(key);
            rows.push(row);
        }
    });
    rows.sort((a, b) => String(b.detectedAt).localeCompare(String(a.detectedAt)));
    const inbound = rows.filter(row => Number(row.toServer) === server).length;
    const outbound = rows.filter(row => Number(row.fromServer) === server).length;
    const text = successful.length ? `s${server} 이동 감지 기록 (${plan.startDate} ~ ${plan.endDate}, UTC): 유입 ${inbound}건, 유출 ${outbound}건${failed ? ' — 일부 파일 조회 실패로 불완전한 집계입니다.' : '.'}` : '해당 기간의 이동 이력을 확인할 수 없습니다. 기록이 없다는 뜻은 아닙니다.';
    return { text, columns: ['감지 시각', '닉네임', 'UID', '이전 서버', '이후 서버'], rows: rows.slice(0, 50).map(row => [row.detectedAt, row.nickname || '-', String(row.uid), row.fromServer, row.toServer]), notes: [sourceNote, `조회 성공 ${successful.length}/${files.length}개 파일. 반복 이동은 각각 집계하며, 최신 50건까지 표시합니다.`, '서버 역사 전체가 아닌 수집된 서버 이동 기록입니다. 감지 시각은 실제 이동 시각과 다를 수 있습니다.'], sources: successful.map(file => ({ label: `서버 이동 ${file.date}`, path: file.path, at: file.at })), links: [{ label: '유입 이력 보기', path: `/information/data/move?in=${server}&begin=${plan.startDate}&end=${plan.endDate}` }, { label: '유출 이력 보기', path: `/information/data/move?out=${server}&begin=${plan.startDate}&end=${plan.endDate}` }], context: plan };
}

export async function executeDataQuery(input, repository, progress = () => {}) {
    const plan = validateDataQuery(input);
    progress('데이터를 조회하고 있습니다…');
    if (plan.kind !== 'server_history') {
        const result = querySnapshot(await repository.loadOverallLatest(), plan);
        const comparisonPath = comparisonPathForTargets(result.context?.kind, result.context?.targets);
        if (comparisonPath) result.links.unshift({ label: '비교 전용 페이지 열기', path: comparisonPath });
        return result;
    }
    const endDate = plan.endDate || new Date().toISOString().slice(0, 10);
    const startDate = plan.startDate || new Date(Date.parse(endDate) - 29 * 86400000).toISOString().slice(0, 10);
    const dated = validateDataQuery({ ...plan, startDate, endDate });
    // 파일 날짜와 감지 날짜가 다를 수 있으므로 감지일 필터는 원문 행에 적용한다.
    const files = await repository.listOverallHistoryFiles('movement');
    const results = [];
    for (let offset = 0; offset < files.length; offset += 4) {
        results.push(...await Promise.allSettled(files.slice(offset, offset + 4).map(file => repository.loadDataFile(file.path))));
        progress(`이동 이력을 조회하고 있습니다… ${results.length}/${files.length}`);
    }
    return summarizeServerHistory(dated, files, results);
}
