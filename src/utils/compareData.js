export const comparisonTypes = ['players', 'servers', 'guilds'];
export const serverComparisonScopes = ['5', '10', '30', '50', '100', 'all'];
const neutralMetrics = new Set(['players', 'knownPower', 'guilds', 'top5Share']);
export function comparisonAdvantage(metric, left, right) {
    if (neutralMetrics.has(metric)) return 'neutral';
    if (left == null || right == null || !Number.isFinite(left) || !Number.isFinite(right)) return 'unknown';
    if (left === right) return 'tie';
    return (metric === 'kartzBestRank' ? left < right : left > right) ? 'a' : 'b';
}

export function kartzAdvantage(left, right) {
    const metrics = ['kartzTop100', 'kartzAverageRound', 'kartzAllianceScore'];
    const results = metrics.map(metric => comparisonAdvantage(metric, left[metric], right[metric]));
    const a = results.filter(value => value === 'a').length;
    const b = results.filter(value => value === 'b').length;
    return { a, b, available: results.filter(value => value !== 'unknown').length, winner: results.includes('unknown') ? 'unknown' : a === b ? 'tie' : a > b ? 'a' : 'b' };
}

export function compareServerPopulation(document, server, scope = 'all') {
    const unique = new Map();
    for (const player of document?.players ?? []) {
        if (Number(player.server) === Number(server) && player.uid != null && !unique.has(String(player.uid))) unique.set(String(player.uid), player);
    }
    const ranked = [...unique.values()].filter(player => number(player.power) !== null).sort((a, b) => number(b.power) - number(a.power) || String(a.uid).localeCompare(String(b.uid)));
    const players = scope === 'all' ? [...unique.values()] : ranked.slice(0, Number(scope));
    const entity = buildComparisonEntities({ players }, 'servers').get(String(server));
    if (!entity) return null;
    const powers = players.map(player => number(player.power)).filter(value => value !== null).sort((a, b) => a - b);
    const middle = Math.floor(powers.length / 2);
    entity.metrics.medianPower = powers.length ? (powers[middle] + powers[Math.floor((powers.length - 1) / 2)]) / 2 : null;
    const levels = players.map(player => number(player.level)).filter(value => value !== null);
    entity.metrics.averageLevel = levels.length ? levels.reduce((sum, value) => sum + value, 0) / levels.length : null;
    entity.metrics.level100 = levels.length ? levels.filter(value => value >= 100).length : null;
    entity.metrics.top5Share = entity.metrics.totalPower > 0 ? powers.slice(-5).reduce((sum, value) => sum + value, 0) / entity.metrics.totalPower * 100 : null;
    return entity;
}

export function compareKartzServer(snapshot, server) {
    const players = snapshot?.playerRankList?.filter(row => Number(row.server) === Number(server)) ?? [];
    const alliances = snapshot?.allianceRankList?.filter(row => Number(row.server) === Number(server)) ?? [];
    const rounds = players.map(row => number(row.round)).filter(value => value !== null);
    const ranks = players.map(row => number(row.rank)).filter(value => value !== null && value > 0);
    const scores = alliances.map(row => number(row.score)).filter(value => value !== null);
    return {
        kartzPlayers: Array.isArray(snapshot?.playerRankList) ? players.length : null,
        kartzTop100: Array.isArray(snapshot?.playerRankList) ? ranks.filter(rank => rank <= 100).length : null,
        kartzBestRank: ranks.length ? Math.min(...ranks) : null,
        kartzAverageRound: rounds.length ? rounds.reduce((sum, value) => sum + value, 0) / rounds.length : null,
        kartzMaxRound: rounds.length ? Math.max(...rounds) : null,
        kartzAlliances: Array.isArray(snapshot?.allianceRankList) ? alliances.length : null,
        kartzAllianceScore: scores.length ? scores.reduce((sum, value) => sum + value, 0) : null,
    };
}
export const normalizeComparisonSearch = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase().trim();
export const guildComparisonId = (server, id) => JSON.stringify([Number(server), String(id)]);
const number = value => value != null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;

export function buildComparisonEntities(document, type) {
    const entities = new Map();
    const seen = new Set();
    for (const player of document?.players ?? []) {
        if (player.uid == null || seen.has(String(player.uid))) continue;
        seen.add(String(player.uid));
        const server = Number(player.server);
        const power = number(player.power);
        if (type === 'players') {
            const id = String(player.uid);
            entities.set(id, { id, name: player.nickname || id, server, detail: [player.allianceTag ? `[${player.allianceTag}]` : '', player.allianceName].filter(Boolean).join(' '), observedAt: player.observedAt || null, metrics: { power, level: number(player.level), armyPower: number(player.armyPower) }, search: normalizeComparisonSearch(`${player.nickname || ''} ${id} ${server} ${player.allianceTag || ''}`) });
            continue;
        }
        if (!Number.isInteger(server) || server <= 0) continue;
        const guildId = player.allianceId && String(player.allianceId) !== '0' ? String(player.allianceId) : player.allianceTag || player.allianceName;
        if (type === 'guilds' && !guildId) continue;
        const id = type === 'servers' ? String(server) : guildComparisonId(server, guildId);
        if (!entities.has(id)) {
            const name = type === 'servers' ? `s${server}` : [player.allianceTag ? `[${player.allianceTag}]` : '', player.allianceName].filter(Boolean).join(' ') || String(guildId);
            entities.set(id, { id, name, server, detail: type === 'guilds' ? String(guildId) : '', observedAt: null, earliestAt: null, metrics: { players: 0, knownPower: 0, totalPower: null, averagePower: null, maxPower: null, guilds: 0 }, guildIds: new Set(), leaders: [], search: normalizeComparisonSearch(`${name} ${server} ${guildId || ''}`) });
        }
        const group = entities.get(id);
        group.metrics.players++;
        if (power !== null) {
            group.metrics.knownPower++;
            group.metrics.totalPower = (group.metrics.totalPower ?? 0) + power;
            group.metrics.maxPower = Math.max(group.metrics.maxPower ?? 0, power);
            group.leaders.push({ uid: String(player.uid), name: player.nickname || String(player.uid), power });
            group.leaders.sort((a, b) => b.power - a.power || a.uid.localeCompare(b.uid));
            if (group.leaders.length > 5) group.leaders.pop();
        }
        if (guildId) group.guildIds.add(String(guildId));
        const observedAt = player.observedAt;
        if (observedAt && Number.isFinite(Date.parse(observedAt))) {
            if (!group.observedAt || observedAt > group.observedAt) group.observedAt = observedAt;
            if (!group.earliestAt || observedAt < group.earliestAt) group.earliestAt = observedAt;
        }
    }
    for (const entity of entities.values()) {
        if (type === 'players') continue;
        entity.metrics.averagePower = entity.metrics.knownPower ? entity.metrics.totalPower / entity.metrics.knownPower : null;
        entity.metrics.guilds = entity.guildIds.size;
        delete entity.guildIds;
    }
    return entities;
}

export function comparisonDifference(left, right) {
    if (left == null || right == null) return { value: null, percent: null };
    return { value: left - right, percent: right === 0 ? (left === 0 ? 0 : null) : (left - right) / right * 100 };
}

export function comparisonPathForTargets(kind, targets) {
    if (!kind?.endsWith('_compare') || targets?.length !== 2) return null;
    const type = kind === 'player_compare' ? 'players' : kind === 'guild_compare' ? 'guilds' : 'servers';
    const ids = targets.map(target => type === 'players' ? target.uid : type === 'servers' ? String(target.server) : guildComparisonId(target.server, target.uid || target.name));
    if (ids.some(id => !id)) return null;
    return `/simulation/compare?${new URLSearchParams({ type, left: ids[0], right: ids[1] })}`;
}
