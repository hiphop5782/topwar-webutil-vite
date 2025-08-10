import { useCallback, useState } from "react";
import BaseSkinSelector from "./BaseSkinSelector";
import BasicInformationInput from "./BasicInformationInput";
import RemoldInformationInput from "./RemoldInformationInput";

export default function AccountCreator() {

    const [user, setUser] = useState({
        vip:16,
        cp:100,
        mastery:{
            army:15,
            navy:15,
            airforce:15,
        },
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
    });

    const onBasicInformationInput = useCallback((basicInformation)=>{
        console.log("기본정보 입력 : ",basicInformation);
    });
    
    const onBaseSelect = useCallback((baseNoList)=>{
        console.log("베이스 선택 : " , baseNoList);
    }, []);

    const changeMastery = useCallback((type, value)=>{
        const level = parseInt(value);
        setUser(prev=>({
            ...prev,
            mastery:{
                ...prev.mastery,
                [type]:level
            }
        }));
    }, []);

    const checkRemold = useCallback((type, checked)=>{
        setUser(prev=>({
            ...prev,
            remold:{
                ...prev.remold,
                [type]:{
                    ...prev.remold[type],
                    use:checked
                }
            }
        }));
    }, []);
    const changeRemoldGrade = useCallback((type, equip, grade)=>{
        setUser(prev=>({
            ...prev,
            remold:{
                ...prev.remold,
                [type]:{
                    ...prev.remold[type],
                    [equip]:{
                        ...prev.remold[type][equip],

                    }
                }
            }
        }));
    }, []);
    const changeRemoldLevel = useCallback((type, equip, level)=>{}, []);

    return (<>
        <h1>계정 홍보 화면 생성</h1>    
        <hr/>
        <h2>Step 1 : 기본 정보</h2>
        <BasicInformationInput json={user} onChange={onBasicInformationInput}/>

        <hr/>
        <h2>Step 2 : 보유 기지 정보</h2>
        <BaseSkinSelector onSelect={onBaseSelect}/>

        <hr/>
        <h2>Step 3 : 전문 강화 정보</h2>

        <div className="row mt-4">
            <label className="col-sm-3 col-form-label">육군</label>
            <div className="col-sm-9">
                <select value={user.mastery.army} onChange={e=>changeMastery('army', e.target.value)} className="form-select">
                    {Array.from({length:20}, (_, i)=>20-i).map(n=>(
                        <option key={n} value={n}>{`${n}레벨`}</option>
                    ))}
                </select>
            </div>
        </div>
        <div className="row mt-4">
            <label className="col-sm-3 col-form-label">해군</label>
            <div className="col-sm-9">
                <select value={user.mastery.navy} onChange={e=>changeMastery('navy', e.target.value)} className="form-select">
                    {Array.from({length:20}, (_, i)=>20-i).map(n=>(
                        <option key={n} value={n}>{`${n}레벨`}</option>
                    ))}
                </select>
            </div>
        </div>
        <div className="row mt-4">
            <label className="col-sm-3 col-form-label">공군</label>
            <div className="col-sm-9">
                <select value={user.mastery.airforce} onChange={e=>changeMastery('airforce', e.target.value)} className="form-select">
                    {Array.from({length:20}, (_, i)=>20-i).map(n=>(
                        <option key={n} value={n}>{`${n}레벨`}</option>
                    ))}
                </select>
            </div>
        </div>
        
        <hr/>
        <h2>Step 4 : 부대 정보</h2>

        <hr/>
        <h2>Step 5 : 장비 개조 정보</h2>
        <RemoldInformationInput json={user}/>
        

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