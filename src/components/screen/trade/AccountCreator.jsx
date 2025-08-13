import { useCallback, useState } from "react";
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
import { FaArrowDown } from "react-icons/fa6";

export default function AccountCreator() {

    const [user, setUser] = useState({
        vip:16,
        cp:100,
        baseSkins:[85,71,17,67],
        mastery:{
            army:15,
            navy:15,
            airforce:15,
        },
        troop:{},
        remold:{
            army:{
                use:true,
                equip1:{use:true,grade:"에픽",level:12},
                equip2:{use:true,grade:"에픽",level:12},
                equip3:{use:true,grade:"에픽",level:12},
                equip4:{use:true,grade:"에픽",level:12},
                equip5:{use:true,grade:"에픽"},
            },
            navy:{
                use:true,
                equip1:{use:true,grade:"에픽",level:12},
                equip2:{use:true,grade:"에픽",level:12},
                equip3:{use:true,grade:"에픽",level:12},
                equip4:{use:true,grade:"에픽",level:12},
                equip5:{use:true,grade:"유니크"},
            },
            airforce:{
                use:true,
                equip1:{use:true,grade:"에픽",level:12},
                equip2:{use:true,grade:"에픽",level:12},
                equip3:{use:true,grade:"에픽",level:12},
                equip4:{use:true,grade:"에픽",level:12},
                equip5:{use:true,grade:"유니크"},
            }
        },
        formation:{
            shark:{tier:5, slot:[3,3,3,3,3], level:50},
            scorpion:{tier:5, slot:[3,3,3,3,3], level:50},
            eagle:{tier:5, slot:[3,3,3,3,3], level:50},
        },
        //enigmaField:{},
        //enigmaBeast:{},
        memo:"",
    });

    const onBasicInformationInput = useCallback((basicInformation)=>{
        console.log("기본정보 입력 : ",basicInformation);
    }, []);
    
    const onBaseSelectionChange = useCallback((baseNoList)=>{
        console.log("베이스 변경" , baseNoList);
    }, []);

    const onTroopChange = useCallback((troop)=>{
        console.log("부대 변경", troop);
    }, []);

    const onMasteryChange = useCallback((mastery)=>{
        console.log("전문강화 변경", mastery);
    }, []);

    const onRemoldChange = useCallback((remold)=>{
        console.log("개조 변경", remold);
    }, []);

    const onFormationChange = useCallback((formation)=>{
        console.log("군진 변경", formation)
    }, []);

    const onTitanChange = useCallback((titan)=>{
        console.log("타이탄 변경", titan);
    }, []);

    const onEnigmaFieldChange = useCallback((enigmaField)=>{
        console.log("초능력영역 변경", enigmaField);
    }, []);

    const onEnigmaBeastChange = useCallback((enigmaBeast)=>{
        console.log("초능력동물 변경", enigmaBeast);
    }, []);

    const onEtcChange = useCallback((memo)=>{
        console.log("기타 항목 변경", memo);
    }, []);

    return (<>
        <h1>계정 홍보 화면 생성</h1>    
        <hr/>
        <h2>Step 1 : 기본 정보</h2>
        <BasicInformationInput json={user} onChange={onBasicInformationInput}/>

        <hr/>
        <h2>Step 2 : 보유 기지 정보</h2>
        <BaseSkinSelector json={user} onChange={onBaseSelectionChange}/>

        <hr/>
        <h2>Step 3 : 전문 강화 정보</h2>
        <MasteryInput json={user} onChange={onMasteryChange}/>
        
        <hr/>
        <h2>Step 4 : 부대 정보</h2>
        <TroopInformation json={user} onChange={onTroopChange}/>

        <hr/>
        <h2>Step 5 : 장비 개조 정보</h2>
        <RemoldInformationInput json={user} onChange={onRemoldChange}/>
        
        <hr/>
        <h2>Step 6 : 군진 정보</h2>
        <FormationInput json={user} onChange={onFormationChange}/>

        <hr/>
        <h2>Step 7 : 초능력 동물 정보</h2>
        <EnigmaBeastInformation json={user} onChange={onEnigmaBeastChange}/>

        <hr/>
        <h2>Step 8 : 초능력 영역 정보 (클릭하여 변경)</h2>
        <EnigmaFieldInformation json={user} onChange={onEnigmaFieldChange}/>

        <hr/>
        <h2>Step 9 : 기타 정보</h2>
        <EtcInformation json={user} onChange={onEtcChange}/>

        <div className="row my-5 text-center">
            <div className="col">
                <FaArrowDown size={150}></FaArrowDown>
            </div>
        </div>

        <div className="row mt-5 pt-5">
            <div className="col">
                <h1>최종 생성 데이터</h1>
                <textarea value={JSON.stringify(user, null, 4)} className="form-control" style={{minHeight:300}} readOnly></textarea>
            </div>
        </div>


        <div style={{height:700}}></div>
    </>)
}