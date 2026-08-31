function normalize(value) {
    return String(value ?? "").normalize("NFKD").replace(/\p{M}+/gu, "").toLocaleLowerCase().trim();
}

function add(map, key, value) {
    if (!key) return;
    const list = map.get(key) ?? [];
    list.push(value);
    map.set(key, list);
}

export function buildKartzIndexes(history) {
    const players = new Map();
    const alliancesByTag = new Map();
    const alliancesByName = new Map();
    const servers = new Map();
    for (const snapshot of history) {
        const month = snapshot.month;
        const performance = new Map();
        const getPerformance = (server) => {
            const key = Number(server);
            const current = performance.get(key) ?? {
                server: key, top100: 0, top500: 0, roundTotal: 0, playerCount: 0,
                individualScore: 0, allianceScore: 0, allianceCount: 0,
            };
            performance.set(key, current);
            return current;
        };
        for (const row of snapshot.playerRankList ?? []) {
            add(players, `${row.server}|${normalize(row.nickname)}`, {
                month, rank: Number(row.rank), round: Number(row.round), server: Number(row.server),
            });
            const stats = getPerformance(row.server);
            const rank = Number(row.rank);
            stats.top500 += 1;
            if (rank <= 100) stats.top100 += 1;
            stats.playerCount += 1;
            stats.roundTotal += Number(row.round) || 0;
            stats.individualScore += Math.max(0, 501 - rank);
        }
        for (const row of snapshot.allianceRankList ?? []) {
            const entry = { month, rank: Number(row.rank), score: Number(row.score), server: Number(row.server) };
            if (row.tag) add(alliancesByTag, `${row.server}|${normalize(row.tag)}`, entry);
            if (row.name) add(alliancesByName, `${row.server}|${normalize(row.name)}`, entry);
            const stats = getPerformance(row.server);
            stats.allianceScore += Number(row.score) || 0;
            stats.allianceCount += 1;
        }

        const values = [...performance.values()].map((stats) => ({
            ...stats,
            averageRound: stats.playerCount ? stats.roundTotal / stats.playerCount : 0,
            depthScore: stats.top100 * 5 + stats.top500,
        }));
        const maximum = (key) => Math.max(1, ...values.map((row) => row[key]));
        const maxIndividual = maximum("individualScore");
        const maxRound = maximum("averageRound");
        const maxDepth = maximum("depthScore");
        const maxAlliance = maximum("allianceScore");
        values.forEach((stats) => {
            stats.performanceScore = (
                stats.individualScore / maxIndividual * 35
                + stats.averageRound / maxRound * 20
                + stats.depthScore / maxDepth * 15
                + stats.allianceScore / maxAlliance * 20
            ) / 90 * 100;
        });
        values.sort((left, right) => right.performanceScore - left.performanceScore)
            .forEach((stats, index) => add(servers, String(stats.server), {
                month, rank: index + 1, score: stats.performanceScore,
                top100: stats.top100, top500: stats.top500,
                averageRound: stats.averageRound,
                allianceScore: stats.allianceScore,
                allianceCount: stats.allianceCount,
            }));
    }

    const serverSummaries = new Map();
    const summaries = [...servers.entries()].map(([server, entries]) => {
        const averagePerformance = entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length;
        const persistence = history.length ? entries.length / history.length : 0;
        return {
            server, appearances: entries.length, persistence,
            score: averagePerformance * .9 + persistence * 100 * .1,
            bestRank: Math.min(...entries.map((entry) => entry.rank)),
            averageRank: entries.reduce((sum, entry) => sum + entry.rank, 0) / entries.length,
        };
    }).sort((left, right) => right.score - left.score);
    summaries.forEach((summary, index) => serverSummaries.set(summary.server, {
        ...summary, rank: index + 1,
    }));
    return { players, alliancesByTag, alliancesByName, servers, serverSummaries, historyCount: history.length };
}

export function findPlayerKartz(indexes, player, nicknameHistory, movementHistory) {
    if (!indexes) return [];
    const names = new Set([player.nickname]);
    for (const row of nicknameHistory ?? []) {
        names.add(row.fromNickname);
        names.add(row.toNickname);
    }
    const servers = new Set([Number(player.server)]);
    for (const row of movementHistory ?? []) {
        servers.add(Number(row.fromServer));
        servers.add(Number(row.toServer));
    }
    const byMonth = new Map();
    for (const server of servers) {
        for (const name of names) {
            for (const entry of indexes.players.get(`${server}|${normalize(name)}`) ?? []) {
                const current = byMonth.get(entry.month);
                if (!current || entry.rank < current.rank) byMonth.set(entry.month, entry);
            }
        }
    }
    return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function findAllianceKartz(indexes, row) {
    if (!indexes) return [];
    return (row.tag ? indexes.alliancesByTag.get(`${row.server}|${normalize(row.tag)}`) : null)
        ?? indexes.alliancesByName.get(`${row.server}|${normalize(row.name)}`)
        ?? [];
}
