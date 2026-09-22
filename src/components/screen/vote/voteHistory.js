// Shared by the browser and the archive worker. Never copy whole Firestore records into public JSON.
export const ARCHIVE_REPOSITORY = "hiphop5782/topwar-vote";
export const ARCHIVE_BRANCH = "main";
export const uidOf = player => String(player?.uid ?? "").trim();
export const identityOf = player => uidOf(player) ? `uid:${uidOf(player)}` : `legacy:${String(player?.nickname || player?.username || "").normalize("NFKC").toLowerCase()}`;
export const sameVoter = (a, b) => uidOf(a) && uidOf(b) ? uidOf(a) === uidOf(b)
    : String(a?.nickname || a?.username || "").normalize("NFKC").toLowerCase() === String(b?.nickname || b?.username || "").normalize("NFKC").toLowerCase();
export const finalVote = vote => ["archiving", "archived"].includes(vote?.status);
export function dateMillis(value) {
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (value?.seconds != null) return value.seconds * 1000;
    const n = new Date(value ?? 0).getTime();
    return Number.isFinite(n) ? n : 0;
}
export const isoDate = value => value == null ? null : new Date(dateMillis(value)).toISOString();
export function voteState(vote, now = Date.now()) {
    if (finalVote(vote)) return vote.status;
    if (vote?.closed) return "paused";
    if (vote?.expiresAt && dateMillis(vote.expiresAt) <= now) return "expired";
    return "active";
}
export function buildRoster(players, vote) {
    if (!Array.isArray(players)) throw new Error("조사 명단을 불러오지 못했습니다.");
    const roster = new Map();
    for (const player of players) {
        if (Number(player.level) < 80 || !Number.isFinite(Number(player.level))) continue;
        if (player.serverId != null && String(player.serverId) !== String(vote.serverId)) continue;
        if (vote.targetScope === "alliance" && String(player.allianceId) !== String(vote.allianceId)) continue;
        const uid = uidOf(player);
        const nickname = String(player.nickname || player.username || "").trim();
        if (!/^\d+$/.test(uid) || !nickname) throw new Error("대상 명단에 UID 또는 닉네임이 없는 인원이 있습니다.");
        const power = Number(player.score ?? player.power ?? 0);
        roster.set(uid, { uid, nickname, power: Number.isFinite(power) ? power : 0,
            allianceId: String(player.allianceId ?? ""), allianceTag: String(player.allianceTag || ""), allianceName: String(player.allianceName || "") });
    }
    if (!roster.size) throw new Error("레벨 80 이상인 투표 대상자가 없습니다.");
    return [...roster.values()].sort((a, b) => b.power - a.power || a.uid.localeCompare(b.uid));
}
export function mergeHistory(live, archived) {
    const byId = new Map(archived.map(vote => [vote.uuid, { ...vote, status: "archived", closed: true }]));
    for (const vote of live) if (!byId.has(vote.uuid)) byId.set(vote.uuid, vote);
    return [...byId.values()].sort((a, b) => dateMillis(b.createdAt) - dateMillis(a.createdAt) || String(a.uuid).localeCompare(String(b.uuid)));
}
export function archiveSummary(vote, archivePath) {
    return { uuid: vote.uuid, serverId: String(vote.serverId), title: String(vote.title || ""),
        targetScope: vote.targetScope === "alliance" ? "alliance" : "server", allianceId: String(vote.allianceId || ""),
        allianceTag: String(vote.allianceTag || ""), allianceName: String(vote.allianceName || ""),
        createdAt: isoDate(vote.createdAt), endedAt: isoDate(vote.endedAt), status: "archived", archivePath,
        totalCount: (vote.choices || []).reduce((n, c) => n + Object.values(c.players || {}).length, 0) };
}
export function publicArchive(vote, roster) {
    const numberOr = (value, fallback) => (typeof value === "number" || typeof value === "string") && value !== "" && Number.isFinite(Number(value)) ? Number(value) : fallback;
    const cleanPlayer = player => ({ uid: uidOf(player), nickname: String(player.nickname || player.username || ""),
        cp: numberOr(player.cp, ""), cpUnit: ["raw", "million"].includes(player.cpUnit) ? player.cpUnit : "legacy", power: numberOr(player.power ?? player.score, null),
        allianceId: String(player.allianceId || ""), allianceTag: String(player.allianceTag || ""), allianceName: String(player.allianceName || "") });
    if (vote.schemaVersion >= 2 && (!Array.isArray(roster) || roster.some(p => !/^\d+$/.test(uidOf(p)))
        || vote.choices.some(c => Object.values(c.players || {}).some(p => !/^\d+$/.test(uidOf(p)))))) throw new Error("UID_REQUIRED");
    const summary = archiveSummary(vote, "");
    delete summary.archivePath;
    return { ...summary, schemaVersion: vote.schemaVersion || 1, closed: true, expiresAt: isoDate(vote.expiresAt),
        rosterSource: Array.isArray(roster) ? "snapshot" : "unavailable", rosterCapturedAt: isoDate(vote.rosterCapturedAt),
        roster: (roster || []).map(cleanPlayer),
        choices: vote.choices.map(c => ({ no: typeof c.no === "number" ? c.no : String(c.no), content: String(c.content), color: /^#[a-f\d]{6}$/i.test(c.color) ? c.color : "", limit: Boolean(c.limit),
            count: Number(c.count || 0), currentCount: Object.values(c.players || {}).length,
            players: Object.values(c.players || {}).map(p => ({ ...cleanPlayer(p), votedAt: isoDate(p.votedAt) })) })) };
}
export function nextArchivePath(serverId, endedAt, entries) {
    if (!/^\d+$/.test(String(serverId))) throw new Error("INVALID_SERVER");
    const date = new Date(dateMillis(endedAt) + 9 * 3600000).toISOString().slice(0, 10);
    const prefix = `${serverId}/${date}-`;
    const max = entries.reduce((n, e) => e.archivePath?.startsWith(prefix) ? Math.max(n, Number(e.archivePath.slice(prefix.length).replace(/\.json$/, "")) || 0) : n, 0);
    return `${prefix}${String(max + 1).padStart(3, "0")}.json`;
}
