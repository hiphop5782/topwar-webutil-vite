import { useCallback, useEffect, useState } from "react";
import BaseSkinSelector from "./component/BaseSkinSelector";
import BasicInformationInput from "./component/BasicInformationInput";
import RemoldInformationInput from "./component/RemoldInformationInput";
import MasteryInput from "./component/MasteryInput";
import FormationInput from "./component/FomationInput";
import TitanInformationInput from "./component/TitanInformationInput";
import EnigmaFieldInformation from "./component/EnigmaFieldInformation";
import EnigmaBeastInformation from "./component/EnigmaBeastInformation";
import TroopInformation from "./component/TroopInformation";
import EtcInformation from "./component/EtcInformation";
import { FaArrowDown, FaCopy, FaDownload } from "react-icons/fa6";
import { useRecoilState } from "recoil";
import { userState } from "./recoil/AccountCreateState";
import HeavyTrooperInformation from "./component/HeavyTrooperInformation";

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

    const [user, setUser] = useRecoilState(userState);

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
        <NextStep/>
        <h2>Step 2 : 기본 정보</h2>
        <BasicInformationInput/>
        <NextStep/>
        <h2>Step 3 : 보유 기지 정보</h2>
        <BaseSkinSelector/>
        <NextStep/>
        <h2>Step 4 : 전문 강화 정보</h2>
        <MasteryInput/>
        <NextStep/>
        <h2>Step 5 : 부대 정보</h2>
        <TroopInformation/>
        <NextStep/>
        <h2>Step 6 : 메카 정보</h2>
        <HeavyTrooperInformation/>
        <NextStep/>
        <h2>Step 7 : 장비 개조 정보</h2>
        <RemoldInformationInput/>
        <NextStep/>
        <h2>Step 8 : 군진 정보</h2>
        <FormationInput/>
        <NextStep/>
        <h2>Step 9 : 초능력 동물 정보</h2>
        <EnigmaBeastInformation/>
        <NextStep/>
        <h2>Step 10 : 초능력 영역 정보 (클릭하여 변경)</h2>
        <EnigmaFieldInformation/>
        <NextStep/>
        <h2>Step 11 : 기타 정보</h2>
        <EtcInformation/>

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