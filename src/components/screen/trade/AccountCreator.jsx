import { useCallback, useEffect, useState } from "react";
import BaseSkinSelector from "./BaseSkinSelector";
import BasicInformationInput from "./BasicInformationInput";
import RemoldInformationInput from "./RemoldInformationInput";
import MasteryInput from "./MasteryInput";
import FormationInput from "./FomationInput";
import TitanInformationInput from "./TitanInformationInput";
import EnigmaFieldInformation from "./EnigmaFieldInformation";
import EnigmaBeastInformation from "./EnigmaBeastInformation";
import TroopInformation from "./TroopInformation";
import EtcInformation from "./EtcInformation";
import { FaArrowDown, FaCopy, FaDownload } from "react-icons/fa6";

function NextStep() {
    return (
        <div className="row my-5">
            <div className="col">
                <FaArrowDown size={150}></FaArrowDown>
            </div>
        </div>
    )
}

export default function AccountCreator() {

    const [user, setUser] = useState({
        vip: 16,
        cp: 100,
        baseSkins: [],
        mastery: {
            army: 15,
            navy: 15,
            airforce: 15,
        },
        troop: {},
        remold: {
            army: {
                use: true,
                equip1: { use: true, grade: "에픽", level: 12 },
                equip2: { use: true, grade: "에픽", level: 12 },
                equip3: { use: true, grade: "에픽", level: 12 },
                equip4: { use: true, grade: "에픽", level: 12 },
                equip5: { use: true, grade: "에픽" },
            },
            navy: {
                use: true,
                equip1: { use: true, grade: "에픽", level: 12 },
                equip2: { use: true, grade: "에픽", level: 12 },
                equip3: { use: true, grade: "에픽", level: 12 },
                equip4: { use: true, grade: "에픽", level: 12 },
                equip5: { use: true, grade: "유니크" },
            },
            airforce: {
                use: true,
                equip1: { use: true, grade: "에픽", level: 12 },
                equip2: { use: true, grade: "에픽", level: 12 },
                equip3: { use: true, grade: "에픽", level: 12 },
                equip4: { use: true, grade: "에픽", level: 12 },
                equip5: { use: true, grade: "유니크" },
            }
        },
        formation: {
            shark: { tier: 5, slot: [3, 3, 3, 3, 3], level: 50 },
            scorpion: { tier: 5, slot: [3, 3, 3, 3, 3], level: 50 },
            eagle: { tier: 5, slot: [3, 3, 3, 3, 3], level: 50 },
        },
        //enigmaField:{},
        //enigmaBeast:{},
        memo: "",
    });

    const onBasicInformationInput = useCallback((basicInformation) => {
        console.log("기본정보 입력 : ", basicInformation);
    }, []);

    const onBaseSelectionChange = useCallback((baseNoList) => {
        console.log("베이스 변경", baseNoList);
    }, []);

    const onTroopChange = useCallback((troop) => {
        console.log("부대 변경", troop);
    }, []);

    const onMasteryChange = useCallback((mastery) => {
        console.log("전문강화 변경", mastery);
    }, []);

    const onRemoldChange = useCallback((remold) => {
        console.log("개조 변경", remold);
    }, []);

    const onFormationChange = useCallback((formation) => {
        console.log("군진 변경", formation)
    }, []);

    const onTitanChange = useCallback((titan) => {
        console.log("타이탄 변경", titan);
    }, []);

    const onEnigmaFieldChange = useCallback((enigmaField) => {
        console.log("초능력영역 변경", enigmaField);
    }, []);

    const onEnigmaBeastChange = useCallback((enigmaBeast) => {
        console.log("초능력동물 변경", enigmaBeast);
    }, []);

    const onEtcChange = useCallback((memo) => {
        console.log("기타 항목 변경", memo);
    }, []);

    const handleFileChange = useCallback(e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = evt => {
                try {
                    const json = JSON.parse(evt.target.result);
                    setUser(json);
                    console.log("** JSON 로드 완료 **");
                }
                catch (err) {
                    console.error("오류 발생", err);
                }
            };
            reader.readAsText(file);
        }
    }, []);

    const downloadJson = useCallback(() => {
        const json = JSON.stringify(user, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'account.json';
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
    }, [user]);

    const copyStateToClipboard = useCallback(async () => {
        try {
            // 1. Convert state to a JSON string
            const json = JSON.stringify(user, null, 2);
            // 2. Use the Clipboard API to write the text
            await navigator.clipboard.writeText(json);
        } catch (err) {
            console.error('Failed to copy state: ', err);
        }
    }, [user]);

    return (<>
        <h1>계정 홍보 화면 생성</h1>
        <hr />
        <h2>Step 1 : 기존 정보 파일이 있다면 선택(없으면 pass)</h2>
        <input type="file" className="form-control" accept="application/json" onChange={handleFileChange} />
        <NextStep />
        <h2>Step 2 : 기본 정보</h2>
        <BasicInformationInput json={user} onChange={onBasicInformationInput} />
        <NextStep />
        <h2>Step 3 : 보유 기지 정보</h2>
        <BaseSkinSelector json={user} onChange={onBaseSelectionChange} />
        <NextStep />
        <h2>Step 4 : 전문 강화 정보</h2>
        <MasteryInput json={user} onChange={onMasteryChange} />
        <NextStep />
        <h2>Step 5 : 부대 정보</h2>
        <TroopInformation json={user} onChange={onTroopChange} />
        <NextStep />
        <h2>Step 6 : 장비 개조 정보</h2>
        <RemoldInformationInput json={user} onChange={onRemoldChange} />
        <NextStep />
        <h2>Step 7 : 군진 정보</h2>
        <FormationInput json={user} onChange={onFormationChange} />
        <NextStep />
        <h2>Step 8 : 초능력 동물 정보</h2>
        <EnigmaBeastInformation json={user} onChange={onEnigmaBeastChange} />
        <NextStep />
        <h2>Step 9 : 초능력 영역 정보 (클릭하여 변경)</h2>
        <EnigmaFieldInformation json={user} onChange={onEnigmaFieldChange} />
        <NextStep />
        <h2>Step 10 : 기타 정보</h2>
        <EtcInformation json={user} onChange={onEtcChange} />

        <NextStep />
        <h1>최종 생성 데이터</h1>
        <textarea value={JSON.stringify(user, null, 4)} className="form-control" style={{ minHeight: 300 }} readOnly></textarea>

        <NextStep />
        <div className="d-flex">
            <button className="btn btn-primary bt n-lg" onClick={downloadJson}>
                <FaDownload />
                <span className="ms-2">다운로드</span>
            </button>
            <span className="fs-2 ms-5 me-5">or</span>
            <button className="btn btn-primary btn-lg" onClick={copyStateToClipboard}>
                <FaCopy />
                <span className="ms-2">클립보드에 복사</span>
            </button>
        </div>



        <div style={{ height: 700 }}></div>
    </>)
}