import { useCallback } from "react";
import BaseSkinSelector from "./BaseSkinSelector";

export default function AccountCreator() {

    const onBaseSelect = useCallback((baseNoList)=>{
        console.log("베이스 선택 : " + baseNoList);
    }, []);

    return (<>
        <h1>계정 홍보 화면 생성</h1>    
        <hr/>
        <h2>Step 1 : 기본 정보</h2>

        <hr/>
        <h2>Step 2 : 보유 기지 정보</h2>
        <BaseSkinSelector onSelect={onBaseSelect}/>

        <hr/>
        <h2>Step 3 : 부대 정보</h2>
        
        <hr/>
        <h2>Step 4 : 전문 강화 정보</h2>

        <hr/>
        <h2>Step 5 : 장비 개조 정보</h2>

        <hr/>
        <h2>Step 6 : 군진 정보</h2>

        <hr/>
        <h2>Step 7 : 타이탄 정보</h2>

        <hr/>
        <h2>Step 8 : 초능력 영역 정보</h2>

        <hr/>
        <h2>Step 9 : 초능력 동물 정보</h2>
    </>)
}