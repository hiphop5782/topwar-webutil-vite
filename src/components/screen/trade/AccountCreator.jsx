import { useCallback } from "react";
import BaseSkinSelector from "./BaseSkinSelector";

export default function AccountCreator() {

    const onBaseSelect = useCallback((baseNoList)=>{
        console.log("베이스 선택 : " + baseNoList);
    }, []);

    return (<>
        <h1>계정 홍보 화면 생성</h1>    
        <hr/>
        <h2>Step 1 : 기본 정보 입력</h2>

        <hr/>
        <h2>Step 2 : 보유 기지 선택</h2>
        <BaseSkinSelector onSelect={onBaseSelect}/>
    </>)
}