import { createHash } from "node:crypto";
import { archiveSummary, nextArchivePath, publicArchive, ARCHIVE_REPOSITORY, ARCHIVE_BRANCH } from "../src/components/screen/vote/voteHistory.js";

export const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function finalizeArchive(db, snapshot, rosterSnapshot, result, fields) {
    await db.runTransaction(async transaction => {
        const current = await transaction.get(snapshot.ref);
        const currentRoster = await transaction.get(rosterSnapshot.ref);
        if (!current.exists || !current.updateTime.isEqual(snapshot.updateTime)) throw new Error("VOTE_CHANGED_KEEP_ORIGINAL");
        if (currentRoster.exists !== rosterSnapshot.exists || (currentRoster.exists && !currentRoster.updateTime.isEqual(rosterSnapshot.updateTime))) throw new Error("ROSTER_CHANGED_KEEP_ORIGINAL");
        transaction.update(snapshot.ref, {
            status: "archived", closed: true, archivePath: result.archivePath, archiveCommit: result.archiveCommit,
            archiveChecksum: result.checksum, archivedAt: fields.serverTimestamp(), totalCount: result.archive.totalCount,
            choices: fields.delete(), roster: fields.delete(),
        });
        if (currentRoster.exists) transaction.delete(rosterSnapshot.ref);
    });
}

// A single Git commit publishes the immutable result AND its index. Non-fast-forward updates retry.
export async function archiveVoteData(store, vote, roster) {
    if (vote.status !== "archiving" || !vote.closed || !vote.endedAt || !vote.uuid || !/^\d+$/.test(String(vote.serverId))) throw new Error("INVALID_ARCHIVE_REQUEST");
    const archive = publicArchive(vote, roster);
    const checksum = digest(archive);
    for (let attempt = 0; attempt < 5; attempt++) {
        const head = await store.head();
        const indexPath = `${vote.serverId}/index.json`;
        const index = await store.read(indexPath, head) || { schemaVersion: 1, votes: [] };
        if (!Array.isArray(index.votes)) throw new Error("INVALID_ARCHIVE_INDEX");
        const existing = index.votes.find(item => item.uuid === vote.uuid);
        if (existing) {
            if (!new RegExp(`^${vote.serverId}/\\d{4}-\\d{2}-\\d{2}-\\d{3,}\\.json$`).test(existing.archivePath)) throw new Error("INVALID_ARCHIVE_PATH");
            const saved = await store.read(existing.archivePath, head);
            if (!saved || digest(saved) !== checksum || existing.checksum !== checksum) throw new Error("ARCHIVE_CONFLICT_OR_CORRUPTION");
            return { archivePath: existing.archivePath, archiveCommit: head, checksum, archive };
        }
        const path = nextArchivePath(vote.serverId, vote.endedAt, index.votes);
        if (await store.read(path, head)) throw new Error("ARCHIVE_PATH_ALREADY_EXISTS");
        const nextIndex = { schemaVersion: 1, votes: [...index.votes, { ...archiveSummary(archive, path), checksum }]
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) };
        let commit;
        try {
            commit = await store.commit(head, { [path]: archive, [indexPath]: nextIndex }, `Archive vote ${vote.uuid}`);
        } catch (error) {
            if (error.status === 409 || error.status === 422) continue;
            throw error;
        }
        const [saved, savedIndex] = await Promise.all([store.read(path, commit), store.read(indexPath, commit)]);
        if (digest(saved) !== checksum || !savedIndex?.votes.some(item => item.uuid === vote.uuid && item.archivePath === path && item.checksum === checksum)) throw new Error("ARCHIVE_VERIFICATION_FAILED");
        return { archivePath: path, archiveCommit: commit, checksum, archive };
    }
    throw new Error("ARCHIVE_BUSY_RETRY_NEXT_RUN");
}

export function githubStore(token) {
    const api = async (path, method = "GET", body) => {
        const response = await fetch(`https://api.github.com/repos/${ARCHIVE_REPOSITORY}/${path}`, {
            method, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
            ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) {
            const error = new Error(`GitHub operation failed (${response.status})`);
            error.status = response.status;
            throw error; // Never print response bodies or tokens.
        }
        return response.json();
    };
    return {
        head: async () => (await api(`git/ref/heads/${ARCHIVE_BRANCH}`)).object.sha,
        read: async (path, revision) => {
            try {
                const file = await api(`contents/${path}?ref=${revision}`);
                if (file.encoding !== "base64") throw new Error("UNSUPPORTED_ARCHIVE_SIZE");
                return JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
            } catch (error) { if (error.status === 404) return null; throw error; }
        },
        commit: async (parent, files, message) => {
            const previous = await api(`git/commits/${parent}`);
            const tree = await api("git/trees", "POST", { base_tree: previous.tree.sha,
                tree: Object.entries(files).map(([path, value]) => ({ path, mode: "100644", type: "blob", content: JSON.stringify(value, null, 2) + "\n" })) });
            const commit = await api("git/commits", "POST", { message, tree: tree.sha, parents: [parent] });
            await api(`git/refs/heads/${ARCHIVE_BRANCH}`, "PATCH", { sha: commit.sha, force: false });
            return commit.sha;
        },
    };
}
