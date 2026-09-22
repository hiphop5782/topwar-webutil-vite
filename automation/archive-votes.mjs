import { Firestore, FieldValue } from "@google-cloud/firestore";
import { archiveVoteData, finalizeArchive, githubStore } from "./archive-core.mjs";

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
const token = process.env.VOTE_ARCHIVE_TOKEN;
if (!serviceAccount || !token) throw new Error("Configure FIREBASE_SERVICE_ACCOUNT and VOTE_ARCHIVE_TOKEN repository secrets first.");
const credentials = JSON.parse(serviceAccount);
if (!credentials.project_id || !credentials.client_email || !credentials.private_key) throw new Error("INVALID_SERVICE_ACCOUNT");
const db = new Firestore({ projectId: credentials.project_id,
    credentials: { client_email: credentials.client_email, private_key: credentials.private_key } });
const store = githubStore(token);
const pending = await db.collection("votes").where("status", "==", "archiving").limit(25).get();
let failures = 0;
for (const snapshot of pending.docs) {
    try {
        const vote = { ...snapshot.data(), uuid: snapshot.id };
        const rosterRef = snapshot.ref.collection("snapshots").doc("roster");
        const rosterSnapshot = await rosterRef.get();
        const roster = rosterSnapshot.exists ? rosterSnapshot.data().players : null;
        if (vote.rosterSource === "snapshot" && !Array.isArray(roster)) throw new Error("MISSING_ROSTER_SNAPSHOT");
        const result = await archiveVoteData(store, vote, roster);
        // Delete detail only AFTER remote checksum verification. A concurrent change aborts cleanup.
        await finalizeArchive(db, snapshot, rosterSnapshot, result, FieldValue);
        console.log(`Archived ${snapshot.id}: ${result.archivePath}`);
    } catch (error) {
        failures++;
        console.error(`Archive failed for ${snapshot.id}; original retained. ${error.code || error.message}`);
    }
}
console.log(`Processed ${pending.size} votes; failures: ${failures}`);
if (failures) process.exitCode = 1;
