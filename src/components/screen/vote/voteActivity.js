const DAY = 86400000;
export function loginAgeDays(player, surveyedAt = Date.now()) {
    if (player.isOnline === true) return 0;
    const login = Number(player.lastLogin ?? player.lastShowTime);
    if (!Number.isFinite(login) || login <= 0) return null;
    const reference = typeof surveyedAt === "number" ? surveyedAt : Date.parse(surveyedAt);
    return Math.max(0, ((Number.isFinite(reference) ? reference : Date.now()) - (login < 1e12 ? login * 1000 : login)) / DAY);
}
export const isLongInactive = (player, surveyedAt) => loginAgeDays(player, surveyedAt) > 30;
export function rankedVoteAlliances(players) {
    const alliances = new Map();
    for (const player of players) {
        const id = String(player.allianceId ?? "");
        if (!id || id === "0") continue;
        const guild = alliances.get(id) || { id, tag: player.allianceTag || "", name: player.allianceName || "", count: 0, activeCount: 0, power: 0 };
        guild.count += 1;
        if (player.voteLoginAge != null && player.voteLoginAge <= 7) guild.activeCount += 1;
        const power = Number(player.score ?? player.power ?? 0);
        guild.power += Number.isFinite(power) ? power : 0;
        alliances.set(id, guild);
    }
    return [...alliances.values()].sort((a, b) => b.activeCount - a.activeCount || b.power - a.power || `${a.tag} ${a.name}`.localeCompare(`${b.tag} ${b.name}`));
}
