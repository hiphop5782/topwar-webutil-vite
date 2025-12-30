// useFirebase.js (훅 예시)
import { useCallback } from "react";
import { db } from "../db/firebase";
import { doc, onSnapshot, runTransaction, setDoc } from "firebase/firestore";

export const useFirebase = () => {
    const saveVote = async (voteData) => {
        try {
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
                createdAt: new Date()
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

        // onSnapshot은 해당 문서의 변경사항을 실시간으로 감시합니다.
        // 이 함수는 '감시 종료 함수(unsubscribe)'를 반환합니다.
        return onSnapshot(voteRef, (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data());
            } else {
                console.error("해당 투표 데이터가 없습니다.");
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

    return { saveVote, getVote, castVote };
};