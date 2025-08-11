import { useCallback, useState } from "react";
import { PiKeyReturnThin } from "react-icons/pi";

const grades = [
    {no:1, name:"에픽", color:"gold"},
    {no:2, name:"유니크", color:"purple"},
    {no:3, name:"레어", color:"dodgerblue"},
    {no:4, name:"희귀", color:"green"},
    {no:5, name:"일반", color:"black"},
];

export default function RemoldInformationInput({ json }) {
    const [army, setArmy] = useState({
        use:true,
        equip1:{use:true, grade:"에픽", level:12},
        equip2:{use:true, grade:"에픽", level:12},
        equip3:{use:true, grade:"에픽", level:12},
        equip4:{use:true, grade:"에픽", level:12},
        equip5:{use:true, grade:"에픽"},
    });
    const [navy, setNavy] = useState({
        use:true,
        equip1:{use:true, grade:"에픽", level:12},
        equip2:{use:true, grade:"에픽", level:12},
        equip3:{use:true, grade:"에픽", level:12},
        equip4:{use:true, grade:"에픽", level:12},
        equip5:{use:true, grade:"유니크"},
    });
    const [airforce, setAirforce] = useState({
        use:true,
        equip1:{use:true, grade:"에픽", level:12},
        equip2:{use:true, grade:"에픽", level:12},
        equip3:{use:true, grade:"에픽", level:12},
        equip4:{use:true, grade:"에픽", level:12},
        equip5:{use:true, grade:"유니크"},
    });

    const checkArmy = useCallback(e=>{
        setArmy(prev=>({...prev, use:e.target.checked}));
    }, []);
    const checkNavy = useCallback(e=>{
        setNavy(prev=>({...prev, use:e.target.checked}));
    }, []);
    const checkAirforce = useCallback(e=>{
        setAirforce(prev=>({...prev, use:e.target.checked}));
    }, []);

    const changeArmyGrade = useCallback((type, grade)=>{
        setArmy(prev=>({
            ...prev, 
            [type]:{
                ...prev[type],
                grade:grade
            }
        }));

        if(type === "equip5" && grade === "에픽") {
            setNavy(prev=>({
                ...prev, 
                equip5:{
                    ...prev.equip5,
                    grade:prev.equip5.grade === "에픽" ? "유니크" : prev.equip5.grade
                }
            }));
            setAirforce(prev=>({
                ...prev, 
                equip5:{
                    ...prev.equip5,
                    grade:prev.equip5.grade === "에픽" ? "유니크" : prev.equip5.grade
                }
            }));
        }
    }, []);
    const changeArmyLevel = useCallback((type, level)=>{
        setArmy(prev=>({
            ...prev,
            [type]:{
                ...prev[type],
                level:level
            }
        }));
    }, []);
    const changeNavyGrade = useCallback((type,grade)=>{
        setNavy(prev=>({
            ...prev, 
            [type]:{
                ...prev[type],
                grade:grade
            }
        }));

        if(type === "equip5" && grade === "에픽") {
            setArmy(prev=>({
                ...prev, 
                equip5:{
                    ...prev.equip5,
                    grade:prev.equip5.grade === "에픽" ? "유니크" : prev.equip5.grade
                }
            }));
            setAirforce(prev=>({
                ...prev, 
                equip5:{
                    ...prev.equip5,
                    grade:prev.equip5.grade === "에픽" ? "유니크" : prev.equip5.grade
                }
            }));
        }
    }, []);
    const changeNavyLevel = useCallback((type,grade)=>{
        setNavy(prev=>({
            ...prev,
            [type]:{
                ...prev[type],
                level:level
            }
        }));
    }, []);
    const changeAirforceGrade = useCallback((type,grade)=>{
        setAirforce(prev=>({
            ...prev, 
            [type]:{
                ...prev[type],
                grade:grade
            }
        }));

        if(type === "equip5" && grade === "에픽") {
            setArmy(prev=>({
                ...prev, 
                equip5:{
                    ...prev.equip5,
                    grade:prev.equip5.grade === "에픽" ? "유니크" : prev.equip5.grade
                }
            }));
            setNavy(prev=>({
                ...prev, 
                equip5:{
                    ...prev.equip5,
                    grade:prev.equip5.grade === "에픽" ? "유니크" : prev.equip5.grade
                }
            }));
        }
    }, []);
    const changeAirforceLevel = useCallback((type,grade)=>{
        setAirforce(prev=>({
            ...prev,
            [type]:{
                ...prev[type],
                level:level
            }
        }));
    }, []);

    return (<>
        <div className="row mt-4">
            <div className="col-sm-3">
                <label>
                    <input type="checkbox" checked={army.use} onChange={checkArmy} />
                    <span className="ms-2">육군</span>
                </label>
            </div>
            {army.use && (

            <div className="col-sm-9">
                <div className="row">
                    <label className="col-4 col-form-label">장비1</label>
                    <div className="col-4">
                        <select className="form-select" value={army.equip1.grade} onChange={e => changeArmyGrade('equip1', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={army.equip1.level} onChange={e => changeArmyLevel('equip1', e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비2</label>
                    <div className="col-4">
                        <select className="form-select" value={army.equip2.grade} onChange={e => changeArmyGrade('equip2', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={army.equip2.level} onChange={e => changeArmyLevel('equip2', e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비3</label>
                    <div className="col-4">
                        <select className="form-select" value={army.equip3.grade} onChange={e => changeArmyGrade('equip3', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={army.equip3.level} onChange={e => changeArmyLevel('equip3', e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비4</label>
                    <div className="col-4">
                        <select className="form-select" value={army.equip4.grade} onChange={e => changeArmyGrade('equip4', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={army.equip4.level} onChange={e => changeArmyLevel('equip4', e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비5</label>
                    <div className="col-4">
                        <select className="form-select" value={army.equip5.grade} onChange={e => changeArmyGrade('equip5', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            )}
        </div>
        <div className="row mt-4">
            <div className="col-sm-3">
                <label>
                    <input type="checkbox" checked={navy.use} onChange={e => checkRemold('navy', e.target.checked)} />
                    <span className="ms-2">해군</span>
                </label>
            </div>
            {navy.use && (

            <div className="col-sm-9">
                <div className="row">
                    <label className="col-4 col-form-label">장비1</label>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip1.grade} onChange={e => changeNavyGrade('equip1', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip1.level} onChange={e => changeNavyLevel('equip1', e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비2</label>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip2.grade} onChange={e => changeNavyGrade('equip2', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip2.level} onChange={e => changeNavyLevel('equip2', e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비3</label>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip3.grade} onChange={e => changeNavyGrade('equip3', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip3.level} onChange={e => changeNavyLevel('equip3', e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비4</label>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip4.grade} onChange={e => changeNavyGrade('equip4', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip4.level} onChange={e => changeNavyLevel('equip4', e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비5</label>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip5.grade} onChange={e => changeNavyGrade('equip5', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            )}
        </div>
        <div className="row mt-4">
            <div className="col-sm-3">
                <label>
                    <input type="checkbox" checked={airforce.use} onChange={e => checkRemold('airforce', e.target.checked)} />
                    <span className="ms-2">공군</span>
                </label>
            </div>
            {airforce.use && (

            <div className="col-sm-9">
                <div className="row">
                    <label className="col-4 col-form-label">장비1</label>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip1.grade} onChange={e => changeAirforceGrade('equip1', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip1.level} onChange={e => changeAirforceLevel('equip1', e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비2</label>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip2.grade} onChange={e => changeAirforceGrade('equip2', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip2.level} onChange={e => changeAirforceLevel('equip2', e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비3</label>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip3.grade} onChange={e => changeAirforceGrade('equip3', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip3.level} onChange={e => changeAirforceLevel('equip3', e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비4</label>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip4.grade} onChange={e => changeAirforceGrade('equip4', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip4.level} onChange={e => changeAirforceLevel('equip4', e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비5</label>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip5.grade} onChange={e => changeAirforceGrade('equip5', e.target.value)}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            )}
        </div>
    </>)
}