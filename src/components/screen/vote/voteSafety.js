const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const text = value => typeof value === "string" ? value : typeof value === "number" && Number.isFinite(value) ? String(value) : "";

export function normalizeVoteUser(value) {
    const user = record(value) ? value : {};
    const cp = typeof user.cp === "string" || typeof user.cp === "number" ? user.cp : "";
    return {
        nickname: text(user.nickname),
        cp: cp !== "" && Number.isFinite(Number(cp)) && Number(cp) >= 0 ? cp : "",
        allianceTag: text(user.allianceTag), allianceName: text(user.allianceName), uid: text(user.uid),
        cpUnit: ["raw", "million"].includes(user.cpUnit) ? user.cpUnit : "legacy",
    };
}

export function voteExpiry(value) {
    if (value == null) return null;
    const date = typeof value?.toDate === "function" ? value.toDate()
        : value instanceof Date ? value
        : typeof value === "string" || typeof value === "number" ? new Date(value) : null;
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error("INVALID_VOTE_EXPIRY");
    return date;
}

// Reject structural corruption instead of silently dropping choices or writing repaired data.
export function validateVote(value) {
    if (!record(value) || !Array.isArray(value.choices) || !value.choices.length) throw new Error("INVALID_VOTE_DATA");
    const ids = new Set();
    for (const choice of value.choices) {
        if (!record(choice) || !["string", "number"].includes(typeof choice.no) || ids.has(choice.no)
            || typeof choice.content !== "string") throw new Error("INVALID_VOTE_CHOICES");
        ids.add(choice.no);
    }
    voteExpiry(value.expiresAt);
    return value;
}

export function normalizeVoteDisplay(value) {
    if (value == null) return null;
    validateVote(value);
    return {
        ...value, title: text(value.title), allianceTag: text(value.allianceTag),
        allianceName: text(value.allianceName), allianceId: text(value.allianceId), serverId: text(value.serverId),
        choices: value.choices.map(choice => ({
            ...choice,
            currentCount: Number.isFinite(Number(choice.currentCount)) ? Math.max(0, Number(choice.currentCount)) : 0,
            count: Number.isFinite(Number(choice.count)) ? Math.max(0, Number(choice.count)) : 0,
            players: Object.values(choice.players && typeof choice.players === "object" ? choice.players : {})
                .filter(record).map(player => ({ ...player, ...normalizeVoteUser(player) })),
        })),
    };
}
