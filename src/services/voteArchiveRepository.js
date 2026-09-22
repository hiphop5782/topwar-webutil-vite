import { ARCHIVE_REPOSITORY, ARCHIVE_BRANCH } from "../components/screen/vote/voteHistory.js";

async function readJson(path, { signal, missing = false, revision = ARCHIVE_BRANCH } = {}) {
    const response = await fetch(`https://raw.githubusercontent.com/${ARCHIVE_REPOSITORY}/${encodeURIComponent(revision)}/${path}`, { signal, cache: "no-cache" });
    if (missing && response.status === 404) return null;
    if (!response.ok) throw new Error(`투표 보관 자료를 읽지 못했습니다 (${response.status}).`);
    return response.json();
}
export async function loadVoteHistory(serverId, signal) {
    if (!/^\d+$/.test(String(serverId))) throw new Error("서버 번호가 올바르지 않습니다.");
    const index = await readJson(`${serverId}/index.json`, { signal, missing: true });
    if (index === null) return [];
    if (!Array.isArray(index.votes) || index.votes.some(v => !v.uuid || String(v.serverId) !== String(serverId))) throw new Error("투표 보관 목록 형식이 올바르지 않습니다.");
    return index.votes;
}
export async function loadArchivedVote(path, expectedId, revision) {
    if (!/^\d+\/\d{4}-\d{2}-\d{2}-\d{3,}\.json$/.test(path)) throw new Error("잘못된 보관 경로입니다.");
    const vote = await readJson(path, { revision });
    if (vote.uuid !== expectedId || String(vote.serverId) !== path.split("/")[0] || vote.status !== "archived") throw new Error("보관된 투표가 요청과 다릅니다.");
    return vote;
}
