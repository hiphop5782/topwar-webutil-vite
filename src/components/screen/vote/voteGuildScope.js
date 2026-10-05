import { finalVote, uidOf } from "./voteHistory.js";

export function validateGuildChange(vote, roster) {
    if (finalVote(vote)) throw new Error("최종 종료된 투표는 변경할 수 없습니다.");
    if (vote.targetScope !== "server") throw new Error("서버 전체 투표만 길드 대상으로 변경할 수 있습니다.");
    if (!/^\d+$/.test(String(vote.serverId)) || vote.rosterSource !== "snapshot" || !Array.isArray(roster) || !roster.length) throw new Error("생성 당시 스냅샷이 없어 변경할 수 없습니다.");
    if (roster.some(p => !/^\d+$/.test(uidOf(p)) || (p.serverId != null && String(p.serverId) !== String(vote.serverId)))) throw new Error("스냅샷 UID 또는 서버 정보가 올바르지 않습니다.");
}

// Detect any intervening response/roster change before applying a destructive confirmation.
export function guildChangeRevision(vote, roster) {
    const canonical = value => {
        if (typeof value?.toDate === "function") return value.toDate().toISOString();
        if (value instanceof Date) return value.toISOString();
        if (Array.isArray(value)) return value.map(canonical);
        if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
        return value ?? null;
    };
    return JSON.stringify(canonical({ serverId: vote.serverId, targetScope: vote.targetScope, status: vote.status, closed: vote.closed, choices: vote.choices, roster }));
}

export function snapshotGuilds(roster) {
    const guilds = new Map();
    for (const player of roster) {
        const id = String(player.allianceId || "");
        if (!id || id === "0") continue;
        const guild = guilds.get(id) || { id, tag: player.allianceTag || "", name: player.allianceName || "", count: 0 };
        guild.count++;
        guilds.set(id, guild);
    }
    return [...guilds.values()].sort((a, b) => `${a.tag} ${a.name}`.localeCompare(`${b.tag} ${b.name}`));
}

export function planGuildChange(vote, roster, allianceId) {
    validateGuildChange(vote, roster);
    const guild = snapshotGuilds(roster).find(g => g.id === String(allianceId));
    if (!guild) throw new Error("생성 당시 스냅샷에 있는 길드를 선택하세요.");
    const retained = roster.filter(p => String(p.allianceId) === guild.id);
    const uids = new Set(retained.map(uidOf));
    let removedResponses = 0;
    if (!Array.isArray(vote.choices)) throw new Error("투표 항목이 올바르지 않습니다.");
    const choices = vote.choices.map(choice => {
        const players = Object.values(choice.players || {});
        const kept = players.filter(p => uids.has(uidOf(p)));
        removedResponses += players.length - kept.length;
        return { ...choice, players: kept, currentCount: kept.length };
    });
    return { guild, roster: retained, choices, removedPeople: roster.length - retained.length, removedResponses };
}
