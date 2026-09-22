// useFirebase.js (훅 예시)
import { useCallback } from "react";
import { db } from "../db/firebase";
import { collection, doc, getDoc, onSnapshot, query, runTransaction, where } from "firebase/firestore";
import { normalizeVoteUser, validateVote, voteExpiry } from "@src/components/screen/vote/voteSafety";
import { finalVote, sameVoter } from "@src/components/screen/vote/voteHistory";
import { loadArchivedVote } from "@src/services/voteArchiveRepository";

export const useFirebase = () => {
    const saveVote = async (voteData) => {
        try {
            // "votes" 컬렉션에 UUID를 문서 ID로 사용
            const voteRef = doc(db, "votes", voteData.uuid);

            const existingVote = await getDoc(voteRef);
            if (existingVote.exists()) {
                throw new Error("DUPLICATE_VOTE_ID");
            }

            // Firebase에 저장할 데이터 가공 (currentCount 초기화 등)
            const { roster, ...settings } = voteData;
            const createdAt = new Date();
            const finalData = {
                ...settings,
                choices: voteData.choices.map(choice => ({
                    ...choice,
                    currentCount: 0, // 투표 시작 시 0명으로 시작
                    players: []//참여 인원은 비어있도록 설정
                })),
                createdAt,
                rosterCapturedAt: createdAt,
                status: "active",
                schemaVersion: 2,
                closed: false,
            };

            if (!Array.isArray(roster) || !roster.length || roster.some(p => !/^\d+$/.test(String(p.uid)))) throw new Error("UID_REQUIRED");
            // Leave ample room beneath Firestore's 1 MiB document limit (JSON is only an estimate).
            if (new TextEncoder().encode(JSON.stringify(roster)).length > 700000) throw new Error("대상 명단이 너무 큽니다.");
            await runTransaction(db, async transaction => {
                if ((await transaction.get(voteRef)).exists()) throw new Error("DUPLICATE_VOTE_ID");
                transaction.set(voteRef, finalData);
                transaction.set(doc(db, "votes", voteData.uuid, "snapshots", "roster"), { players: roster, capturedAt: createdAt });
            });
            return true;
        } catch (error) {
            console.error("Firebase 저장 에러:", error);
            throw error;
        }
    };

    // 2. 투표 데이터 실시간 불러오기 (추가된 부분)
    // callback을 사용하여 리렌더링 시 함수 재생성을 방지합니다.
    const getVote = useCallback((uuid, callback, onError) => {
        if (!uuid) return;
        const reportError = error => {
            console.error("Firebase 읽기 에러:", error);
            onError?.(error);
        };
        try {
            const voteRef = doc(db, "votes", uuid);
            let active = true;
            let generation = 0;
            const unsubscribe = onSnapshot(voteRef, docSnap => {
                const current = ++generation;
                try {
                    const data = docSnap.exists() ? docSnap.data() : null;
                    if (data?.status === "archived") {
                        loadArchivedVote(data.archivePath, uuid, data.archiveCommit).then(archive => {
                            if (active && generation === current) callback(archive);
                        }).catch(error => { if (active && generation === current) reportError(error); });
                    } else callback(data);
                }
                catch (error) { reportError(error); }
            }, reportError);
            return () => { active = false; unsubscribe(); };
        } catch (error) { reportError(error); }
    }, []);
    const getVoteManager = useCallback((uuid, password, callback) => {
        if (!uuid) return;

        const voteRef = doc(db, "votes", uuid);

        let active = true;
        let generation = 0;
        const unsubscribe = onSnapshot(voteRef, (docSnap) => {
            const current = ++generation;
            if (docSnap.exists()) {
                const data = docSnap.data();
                const dbPassword = data.password;
                const deliver = () => {
                    if (data.status !== "archived") return callback(data);
                    loadArchivedVote(data.archivePath, uuid, data.archiveCommit).then(archive => {
                        if (active && generation === current) callback(archive);
                    }).catch(() => { if (active && generation === current) callback({ error: "ARCHIVE_LOAD", message: "보관 자료를 읽지 못했습니다. 다시 불러와 주세요." }); });
                };

                // [케이스 1] DB에 비밀번호가 아예 없는 경우 -> 누구나 관리 가능 (Public)
                if (!dbPassword) {
                    deliver();
                    return;
                }

                // [케이스 2] 비밀번호가 있는 경우 -> 입력값과 대조 (Admin Mode)
                if (dbPassword === password) {
                    deliver();
                } else {
                    // 비밀번호가 틀렸을 때 처리
                    console.warn("관리 권한이 없습니다.");
                    callback({ error: "FORBIDDEN", message: "비밀번호가 일치하지 않습니다." });
                }
            } else {
                callback(null);
            }
        }, (error) => {
            console.error("Firebase 읽기 에러:", error);
            callback({ error: "LOAD_ERROR", message: "투표를 읽지 못했습니다." });
        });
        return () => { active = false; unsubscribe(); };
    }, []);

    const getVoteHistory = useCallback((serverId, callback, onError) => onSnapshot(
        query(collection(db, "votes"), where("serverId", "in", [String(serverId), Number(serverId)])),
        snapshot => callback(snapshot.docs.map(item => ({ ...item.data(), uuid: item.id }))), onError), []);
    const getVoteRoster = useCallback(async uuid => {
        const snapshot = await getDoc(doc(db, "votes", uuid, "snapshots", "roster"));
        if (!snapshot.exists()) throw new Error("대상자 스냅샷이 없습니다.");
        const players = snapshot.data().players;
        if (!Array.isArray(players)) throw new Error("대상자 스냅샷 형식이 잘못되었습니다.");
        return players;
    }, []);

    const castVote = async (voteId, choiceNo, userInfo, onError) => {
        try {
            const voteRef = doc(db, "votes", voteId);
            const voter = normalizeVoteUser(userInfo);
            if (!voter.nickname.trim() || voter.cp === "" || choiceNo == null) throw new Error("INVALID_VOTER");
            await runTransaction(db, async (transaction) => {
                const voteDoc = await transaction.get(voteRef);
                if (!voteDoc.exists()) throw "투표가 존재하지 않습니다.";

                const data = validateVote(voteDoc.data());
                if (finalVote(data)) throw new Error("최종 종료된 투표입니다.");
                if (data.schemaVersion >= 2 && !/^\d+$/.test(voter.uid)) throw new Error("UID를 입력하거나 조사 명단에서 닉네임을 선택하세요.");
                // --- 마감 로직 추가 ---
                // 1. 수동 마감 여부 체크
                if (data.closed) {
                    throw "관리자에 의해 마감이 완료된 투표입니다.";
                }

                // 2. 시간 만료 여부 체크 (설정된 경우)
                if (data.expiresAt != null) {
                    const now = new Date();
                    const expiry = voteExpiry(data.expiresAt);
                    if (now > expiry) {
                        throw "투표 기간이 종료되었습니다.";
                    }
                }
                // ----------------------


                const newChoices = data.choices.map(choice => {
                    if (choice.players != null && typeof choice.players !== "object") throw new Error("INVALID_VOTE_PLAYERS");
                    const players = Object.values(choice.players || {});
                    if (players.some(player => !player || typeof player.nickname !== "string")) throw new Error("INVALID_VOTE_PLAYERS");
                    if (!Number.isInteger(choice.currentCount) || choice.currentCount < 0
                        || (choice.limit && (!Number.isInteger(choice.count) || choice.count < 0))) throw new Error("INVALID_VOTE_COUNT");
                    return { ...choice, players };
                });

                // 1. 기존에 투표한 기록이 있는지 확인 (닉네임 기준)
                let previousChoiceIndex = -1;
                newChoices.forEach((c, idx) => {
                    if (c.players.some(p => sameVoter(p, voter))) {
                        previousChoiceIndex = idx;
                    }
                });

                // 2. 만약 이미 같은 항목에 투표했다면 종료
                if (previousChoiceIndex !== -1 && newChoices[previousChoiceIndex].no === choiceNo) {
                    throw "이미 해당 항목에 투표하셨습니다.";
                }

                // 3. 기존 기록 삭제 (항목 변경 로직)
                if (previousChoiceIndex !== -1) {
                    const prevChoice = newChoices[previousChoiceIndex];
                    newChoices[previousChoiceIndex] = {
                        ...prevChoice,
                        currentCount: Math.max(0, prevChoice.currentCount - 1),
                        players: prevChoice.players.filter(p => !sameVoter(p, voter))
                    };
                }

                // 4. 새 항목 추가 및 인원 제한 확인
                const newChoiceIndex = newChoices.findIndex(c => c.no === choiceNo);
                const targetChoice = newChoices[newChoiceIndex];
                if (!targetChoice) throw new Error("VOTE_CHOICE_REMOVED");

                if (targetChoice.limit && targetChoice.currentCount >= targetChoice.count) {
                    throw "선택한 항목의 정원이 가득 찼습니다.";
                }

                newChoices[newChoiceIndex] = {
                    ...targetChoice,
                    currentCount: targetChoice.currentCount + 1,
                    players: [...targetChoice.players, { ...voter, votedAt: new Date() }]
                };

                transaction.update(voteRef, { choices: newChoices });
            });
            return true;
        } catch (error) {
            console.error("투표 처리 실패", error);
            if (onError) onError(error);
            else alert(error);
            return false;
        }
    };

    // Lifecycle changes use transactions so stale clients cannot resume an archived vote.
    const changeVoteState = async (voteId, password, action) => {
        const voteRef = doc(db, "votes", voteId);
        try {
            await runTransaction(db, async transaction => {
                const snapshot = await transaction.get(voteRef);
                if (!snapshot.exists()) throw new Error("투표가 없습니다.");
                const data = snapshot.data();
                if (data.password && data.password !== password) throw new Error("관리자 비밀번호가 일치하지 않습니다.");
                if (finalVote(data)) throw new Error("최종 종료된 투표는 재개하거나 수정할 수 없습니다.");
                if (action === "archive" && !/^\d+$/.test(String(data.serverId))) throw new Error("서버 정보가 없어 보관할 수 없습니다.");
                if (action === "active" && data.expiresAt && voteExpiry(data.expiresAt) <= new Date()) throw new Error("투표 기한이 지났습니다.");
                transaction.update(voteRef, action === "archive"
                    ? { closed: true, status: "archiving", endedAt: new Date() }
                    : { closed: action === "paused", status: action });
            });
            return true;
        } catch (error) {
            alert(error.message || error);
            return false;
        }
    };
    const closeVoteManually = (id, password) => changeVoteState(id, password, "paused");
    const openVoteManually = (id, password) => changeVoteState(id, password, "active");
    const endVote = (id, password) => changeVoteState(id, password, "archive");

    //관리자용 삭제 함수
    const deletePlayerFromVote = async (voteId, choiceNo, nickname, inputPassword, uid) => {
        const voteRef = doc(db, "votes", voteId);

        try {
            await runTransaction(db, async (transaction) => {
                const voteDoc = await transaction.get(voteRef);
                if (!voteDoc.exists()) throw "투표가 존재하지 않습니다.";

                const data = voteDoc.data();
                if (finalVote(data)) throw "최종 종료된 투표는 수정할 수 없습니다.";

                // --- 비밀번호 검사 로직 추가 ---
                // DB에 비밀번호가 설정되어 있는데, 입력한 비밀번호와 다르면 에러 발생
                if (data.password && data.password !== inputPassword) {
                    throw "관리자 비밀번호가 일치하지 않습니다.";
                }
                // -----------------------------

                const newChoices = [...data.choices];
                const choiceIndex = newChoices.findIndex(c => c.no === choiceNo);
                if (choiceIndex === -1) throw "해당 항목을 찾을 수 없습니다.";

                const targetChoice = newChoices[choiceIndex];
                const players = Object.values(targetChoice.players || {});
                const updatedPlayers = players.filter(p => uid ? String(p.uid) !== String(uid) : p.nickname !== nickname);

                if (updatedPlayers.length === players.length) throw "이미 삭제되었거나 해당 항목에 없는 투표입니다.";

                newChoices[choiceIndex] = {
                    ...targetChoice,
                    currentCount: updatedPlayers.length,
                    players: updatedPlayers
                };

                transaction.update(voteRef, { choices: newChoices });
            });
            return true;
        } catch (error) {
            // castVote처럼 alert로 에러 메시지를 보여주거나 처리합니다.
            alert(error);
            console.error("플레이어 삭제 에러:", error);
            return false;
        }
    };

    return { saveVote, getVote, getVoteManager, getVoteHistory, getVoteRoster, castVote, closeVoteManually, openVoteManually, endVote, deletePlayerFromVote};
};
