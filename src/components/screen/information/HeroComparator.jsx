import { useCallback, useEffect, useState } from "react";
import "./HeroComparator.css";
import BuffListJson from "@src/assets/json/buff.json";
import TargetListJson from "@src/assets/json/target.json";

function HeroComparator({firstHero, secondHero}) {
    const [buffList, setBuffList] = useState([]);
    const [targetList, setTargetList] = useState([]);
    const [regexp, setRegexp] = useState(null);

    useEffect(()=>{
        setBuffList(BuffListJson.map((b,i)=>b.name));
        setTargetList(TargetListJson.map((t,i)=>t.name));
    }, []);
    useEffect(()=>{
        if(buffList.length == 0 || targetList.length == 0) return;
        const regexpStr = `((${targetList.join("|")})\\s*(\\d+(\\.\\d+)?%\\s*)\\[(${buffList.join("|")})\\])`;
        setRegexp(new RegExp(regexpStr, "gi"));
    }, [buffList, targetList]);

    //영웅이 비교가 가능한지 판정하는 메소드
    //- internal, ready, active, passive 중 보유한 속성이 같아야함
    const isComparable = useCallback((a, b)=>{
        var checkList = [false, false, false, false];

        if(!a.skill || !b.skill) return false;

        //둘다 없거나 둘다 있거나를 검증
        checkList[0] = (!a.skill.internal && !b.skill.internal) || (!!a.skill.internal && !!b.skill.internal);
        checkList[1] = (!a.skill.ready && !b.skill.ready) || (!!a.skill.ready && !!b.skill.ready);
        checkList[2] = (!a.skill.active && !b.skill.active) || (!!a.skill.active && !!b.skill.active);
        checkList[3] = (!a.skill.passive && !b.skill.passive) || (!!a.skill.passive && !!b.skill.passive);

        return checkList.reduce((p, n)=>p&&n, true);
    }, [firstHero, secondHero]);

    //글자가 받침으로 끝나는지 확인하는 함수
    const checkBatchimEnding = useCallback(word => {
        if (typeof word !== 'string') return null;
 
        var lastLetter = word[word.length - 1];
        var uni = lastLetter.charCodeAt(0);
        
        if (uni < 44032 || uni > 55203) return null;
        
        return (uni - 44032) % 28 != 0;
    }, []);

    const [result, setResult] = useState(null);
    useEffect(()=>{
        if(!firstHero || !secondHero || isComparable(firstHero, secondHero) == false) {
            setResult(null);
            return;
        }

        setResult({
            internal : calculateInternal(firstHero, secondHero),
            ready : calculateReady(firstHero, secondHero),
            active : calculateActive(firstHero, secondHero),
            passive: calculatePassive(firstHero, secondHero)
        });
    }, [firstHero, secondHero]);

    const calculateInternal = useCallback((a, b)=>{
        return false;
    }, [regexp]);
    const calculateReady = useCallback((a, b)=>{
        const findA = a.skill.ready.match(regexp);
        const findB = b.skill.ready.match(regexp);
        
        if(findA.length == 0 || findB.length == 0) return false;
        
        let strBuffer = "";
        findA.forEach(fa=>{
            let match = false;
            findB.forEach(fb=>{
                const result = patternEquals(fa, fb);
                //console.log(result);
                if(result.match) {
                    match = result.match;
                    const gap = patternMinus(fa, fb);
                    //console.log("gap", gap);
                    strBuffer += `<br>${result.skill}<br>`;
                    if(gap > 0) {
                        strBuffer += `<b class='text-info'>${a.name}</b>${checkBatchimEnding(a.name) === true ? "이" : ""}가 ${b.name} 보다 ${gap}% 높습니다 &nbsp;`;
                        strBuffer += `(한 슬롯 당 ${parseInt(gap / 9)}%)`;
                    }
                    else if(gap < 0) {
                        strBuffer += `<b class='text-info'>${b.name}</b>${checkBatchimEnding(a.name) === true ? "이" : ""}가 ${a.name} 보다 ${-gap}% 높습니다 &nbsp;`;
                        strBuffer += `(한 슬롯 당 ${parseInt(-gap / 9)}%)`;
                    }
                    else {
                        strBuffer += "두 영웅 수치가 같습니다";
                    }
                    strBuffer += "<br/>";
                }
            });
            if(match === false){
                strBuffer += `<br>${getSkillName(fa)}<br>`;
                strBuffer += `<b class="text-info">${a.name}</b>에게만 있습니다`;
            }
        });
        return strBuffer || false;
    }, [regexp]);
    const calculateActive = useCallback((a, b)=>{
        return false;
    }, [regexp]);
    const calculatePassive = useCallback((a, b)=>{
        return false;
    }, [regexp]);

    //스킬명 추출
    const getSkillName = useCallback(str=>{
        return str.match(/\[[가-힣\s]+\]/g)[0];
    }, []);
    //문자열을 수치 제외하고 비교
    const patternEquals = useCallback((a,b)=>{
        const numericPattern = new RegExp("\\s*\\d+(\\.\\d+)%\\s*", "g");
        const targetPattern = new RegExp(`(${targetList.join("|")})`,"g");
        const cleanA = a.replace(numericPattern, "").replace(targetPattern, "");
        const cleanB = b.replace(numericPattern, "").replace(targetPattern, "");
        const skillA = cleanA.match(/\[[가-힣\s]+\]/g)[0];
        return {
            match:cleanA === cleanB,
            skill : skillA
        }
    }, []);
    const patternMinus = useCallback((a, b)=>{
        const numericPattern = new RegExp("(\\d+(\\.\\d+))%", "gi");
        const onePattern = new RegExp("(1행|2행|3행)", "gi");
        const twoPattern = new RegExp("(1,2행|2,3행|1,3행)", "gi");
        const threePattern = new RegExp("(전체)", "gi");
        const resultA = parseFloat(a.match(numericPattern));
        const resultB = parseFloat(b.match(numericPattern));
        let totalA = 0, totalB = 0;
        
        //(주의)onePattern을 먼저 검사하면 1,2행에서 2행이 감지됨
        if(a.search(twoPattern) >= 0) totalA += resultA * 6;
        else if(a.search(onePattern) >= 0) totalA += resultA * 3;
        else if(a.search(threePattern) >= 0) totalA += resultA * 9;

        if(b.search(twoPattern) >= 0) totalB += resultB * 6;
        else if(b.search(onePattern) >= 0) totalB += resultB * 3;
        else if(b.search(threePattern) >= 0) totalB += resultB * 9;

        return totalA - totalB;
    }, []);

    //하이라이트 처리
    const highlight = useCallback(str=>{
        const str2 = highlightNumber(str);
        const str3 = highlightSkill(str2);
        return str3;
    }, []);
    const highlightNumber = useCallback(str=>{
        return str.replace(/(\d+(\.\d+)?)/g, "<span class='highlight-number'>$1</span>");
    }, []);
    const highlightSkill = useCallback(str=>{
        return str.replace(/(\[[가-힣\s]+\])/g, "<span class='highlight-skill'>$1</span>")
    }, []);


    //영웅이 선택되지 않은 경우
    if(!firstHero || !secondHero) {
        return <>영웅을 선택하세요</>;
    }

    //영웅이 모두 선택되었지만 비교가 불가능한 경우
    if(result == null)  {
        return <><h5 className="text-danger">같은 유형만<br/>비교가 가능합니다</h5></>
    }

    //영웅이 모두 선택되었으며 비교가 가능한 경우
    return (
        <>
            <div className="card mb-3">
                <h3 className="card-header">비교 결과</h3>
                <div className="card-body">
                    <div className="card-text d-flex">
                        <div className="flex-grow-1 text-end">{firstHero.name}</div>
                        <div className="flex-grow-1 text-center fw-bolder text-danger">vs</div>
                        <div className="flex-grow-1 text-start">{secondHero.name}</div>
                    </div>
                </div>
                <ul className="list-group list-group-flush text-start">
                    {result.internal && 
                    <li className="list-group-item">
                        <span className="badge bg-secondary">내정 스킬 비교 결과</span>
                        <p dangerouslySetInnerHTML={{__html:highlight(result.internal)}}>{result.internal}</p>
                    </li>}
                    {result.ready && 
                    <li className="list-group-item">
                        <span className="badge bg-primary">준비 스킬 비교 결과</span>
                        <p dangerouslySetInnerHTML={{__html:highlight(result.ready)}}></p>
                    </li>}
                    {result.active && 
                    <li className="list-group-item">
                        <span className="badge bg-danger">액티브 비교 결과</span>
                        <p dangerouslySetInnerHTML={{__html:highlight(result.active)}}></p>
                    </li>}
                    {result.passive && 
                    <li className="list-group-item">
                        <span className="badge bg-success">패시브 비교 결과</span>
                        <p dangerouslySetInnerHTML={{__html:highlight(result.passive)}}></p>
                    </li>}
                </ul>
            </div>
        </> 
    );
}

export default HeroComparator;