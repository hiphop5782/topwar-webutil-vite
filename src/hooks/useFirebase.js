// useFirebase.js (훅 예시)
import { useCallback } from "react";
import { db } from "../db/firebase";
import { doc, onSnapshot, runTransaction, setDoc, updateDoc } from "firebase/firestore";

export const useFirebase = () => {
    const saveVote = async (voteData) => {
        try {
            //오래된 투표 제거
            await cleanupOldVotes();

            // "votes" 컬렉션에 UUID를 문서 ID로 사용
            const voteRef = doc(db, "votes", voteData.uuid);

            // Firebase에 저장할 데이터 가공 (currentCount 초기화 등)
            const finalData = {
                ...voteData,
                choices: voteData.choices.map(choice => ({
                    ...choice,
                    currentCount: 0, // 투표 시작 시 0명으로 시작
                    players: []//참여 인원은 비어있도록 설정
                })),
                createdAt: new Date(),
                closed: false,
            };

            await setDoc(voteRef, finalData);
            return true;
        } catch (error) {
            console.error("Firebase 저장 에러:", error);
            throw error;
        }
    };

    // 2. 투표 데이터 실시간 불러오기 (추가된 부분)
    // callback을 사용하여 리렌더링 시 함수 재생성을 방지합니다.
    const getVote = useCallback((uuid, callback) => {
        if (!uuid) return;

        const voteRef = doc(db, "votes", uuid);

        return onSnapshot(voteRef, (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data());
            } else {
                callback(null);
            }
        }, (error) => {
            console.error("Firebase 읽기 에러:", error);
        });
    }, []);
    const getVoteManager = useCallback((uuid, password, callback) => {
        if (!uuid) return;

        const voteRef = doc(db, "votes", uuid);

        return onSnapshot(voteRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const dbPassword = data.password;

                // [케이스 1] DB에 비밀번호가 아예 없는 경우 -> 누구나 관리 가능 (Public)
                if (!dbPassword) {
                    callback(data);
                    return;
                }

                // [케이스 2] 비밀번호가 있는 경우 -> 입력값과 대조 (Admin Mode)
                if (dbPassword === password) {
                    callback(data);
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
        });
    }, []);

    const castVote = async (voteId, choiceNo, userInfo) => {
        const voteRef = doc(db, "votes", voteId);

        try {
            await runTransaction(db, async (transaction) => {
                const voteDoc = await transaction.get(voteRef);
                if (!voteDoc.exists()) throw "투표가 존재하지 않습니다.";

                const data = voteDoc.data();
                // --- 마감 로직 추가 ---
                // 1. 수동 마감 여부 체크
                if (data.closed) {
                    throw "관리자에 의해 마감이 완료된 투표입니다.";
                }

                // 2. 시간 만료 여부 체크 (설정된 경우)
                if (data.expiresAt) {
                    const now = new Date();
                    const expiry = data.expiresAt.toDate(); // Firestore Timestamp를 Date로 변환
                    if (now > expiry) {
                        throw "투표 기간이 종료되었습니다.";
                    }
                }
                // ----------------------


                const newChoices = [...data.choices];

                // 1. 기존에 투표한 기록이 있는지 확인 (닉네임 기준)
                let previousChoiceIndex = -1;
                newChoices.forEach((c, idx) => {
                    if (c.players && c.players.some(p => p.nickname === userInfo.nickname)) {
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
                        players: prevChoice.players.filter(p => p.nickname !== userInfo.nickname)
                    };
                }

                // 4. 새 항목 추가 및 인원 제한 확인
                const newChoiceIndex = newChoices.findIndex(c => c.no === choiceNo);
                const targetChoice = newChoices[newChoiceIndex];

                if (targetChoice.limit && targetChoice.currentCount >= targetChoice.count) {
                    throw "선택한 항목의 정원이 가득 찼습니다.";
                }

                newChoices[newChoiceIndex] = {
                    ...targetChoice,
                    currentCount: targetChoice.currentCount + 1,
                    players: [...(targetChoice.players || []), { ...userInfo, votedAt: new Date() }]
                };

                transaction.update(voteRef, { choices: newChoices });
            });
            return true;
        } catch (error) {
            alert(error);
            return false;
        }
    };

    // 오래된 투표 자동 삭제 함수 (예: 30일 기준)
    const cleanupOldVotes = async () => {
        try {
            const daysLimit = 30; // 30일 지난 데이터 삭제
            const threshold = new Date();
            threshold.setDate(threshold.getDate() - daysLimit);

            // 1. 오래된 투표 찾기 (createdAt이 threshold보다 작은 문서)
            const votesRef = collection(db, "votes");
            const q = query(votesRef, where("createdAt", "<", threshold));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) return;

            // 2. 배치(Batch) 작업을 통해 한꺼번에 삭제 (성능 최적화)
            const batch = writeBatch(db);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`${querySnapshot.size}개의 오래된 투표가 정리되었습니다.`);
        } catch (error) {
            console.error("정리 작업 중 에러:", error);
        }
    };

    // 관리자용 수동 마감 함수
    const closeVoteManually = async (voteId) => {
        const voteRef = doc(db, "votes", voteId);
        try {
            await updateDoc(voteRef, { closed: true });
            return true;
        } catch (error) {
            console.error("마감 처리 중 에러:", error);
            return false;
        }
    };

    //관리자용 수동 오픈 함수
    const openVoteManually = async (voteId) => {
        const voteRef = doc(db, "votes", voteId);
        try {
            await updateDoc(voteRef, { closed: false });
            return true;
        } catch (error) {
            console.error("마감 처리 중 에러:", error);
            return false;
        }
    };

    //관리자용 삭제 함수
    const deletePlayerFromVote = async (voteId, choiceNo, nickname, inputPassword) => {
        const voteRef = doc(db, "votes", voteId);

        try {
            await runTransaction(db, async (transaction) => {
                const voteDoc = await transaction.get(voteRef);
                if (!voteDoc.exists()) throw "투표가 존재하지 않습니다.";

                const data = voteDoc.data();

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
                const updatedPlayers = targetChoice.players.filter(p => p.nickname !== nickname);

                if (updatedPlayers.length === targetChoice.players.length) return;

                newChoices[choiceIndex] = {
                    ...targetChoice,
                    currentCount: Math.max(0, targetChoice.currentCount - 1),
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

    return { saveVote, getVote, getVoteManager, castVote, closeVoteManually, openVoteManually, deletePlayerFromVote};
};