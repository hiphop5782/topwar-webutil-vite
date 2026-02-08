import { useCallback, useMemo, useState } from "react";
import { PiKeyReturnThin } from "react-icons/pi";
import { useRecoilState } from "recoil";
import { userState } from "../recoil/AccountCreateState";

const grades = [
    {no:1, name:"에픽", color:"gold"},
    {no:2, name:"유니크", color:"purple"},
    {no:3, name:"레어", color:"dodgerblue"},
    {no:4, name:"희귀", color:"green"},
    {no:5, name:"일반", color:"black"},
];

export default function RemoldInformationInput() {
    const [user, setUser] = useRecoilState(userState);

    //육해공 사용설정
    const checkUse = useCallback(e=>{
        setUser(prev=>({
            ...prev,
            remold: {
                ...prev.remold,
                [e.target.name] : {
                    ...prev.remold[e.target.name],
                    use: e.target.checked
                }
            }
        }));
    }, []);

    //육해공 등급변경
    const changeGrade = useCallback(e=>{
        const type = e.target.name.split("-")[0];
        const part = e.target.name.split("-")[1];
        const grade = e.target.value
        setUser(prev=>({
            ...prev,
            remold: {
                ...prev.remold,
                [type]: {
                    ...prev.remold[type],
                    [part]: {
                        ...prev.remold[type][part],
                        grade: grade
                    }
                }
            }
        }));

        if(part === "equip5" && grade === "에픽") {
            ["army", "navy", "airforce"]
            .filter(m=>m !== type)
            .forEach(m=>{
                setUser(prev=>{
                    const remold = prev.remold;
                    const type = prev.remold[m];
                    const currentGrade = type.equip5.grade;
                    if(currentGrade === "에픽") {
                        return {
                            ...prev,
                            remold:{
                                ...remold,
                                [m]:{
                                    ...type,
                                    equip5:{
                                        ...type.equip5,
                                        grade:"유니크"
                                    }
                                }
                            }
                        }
                    }
                    return prev;
                });
            });
        }
    }, []);

    //육해공 레벨변경
    const changeLevel = useCallback(e=>{
        const type = e.target.name.split("-")[0];
        const part = e.target.name.split("-")[1];
        setUser(prev=>({
            ...prev,
            remold: {
                ...prev.remold,
                [type]: {
                    ...prev.remold[type],
                    [part]: {
                        ...prev.remold[type][part],
                        level: parseInt(e.target.value)
                    }
                }
            }
        }));
    }, []);

    const army = useMemo(()=>user.remold.army, [user]);
    const navy = useMemo(()=>user.remold.navy, [user]);
    const airforce = useMemo(()=>user.remold.airforce, [user]);

    return (<>
        <div className="row mt-4">
            <div className="col-sm-3">
                <label>
                    <input type="checkbox" name="army" checked={army.use} onChange={checkUse} />
                    <span className="ms-2">육군</span>
                </label>
            </div>
            {army.use && (

            <div className="col-sm-9">
                <div className="row">
                    <label className="col-4 col-form-label">장비1</label>
                    <div className="col-4">
                        <select className="form-select" value={army.equip1.grade} 
                            name="army-equip1" onChange={changeGrade}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={army.equip1.level} 
                            name="army-equip1" onChange={changeLevel}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비2</label>
                    <div className="col-4">
                        <select className="form-select" value={army.equip2.grade} 
                            name="army-equip2" onChange={changeGrade}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={army.equip2.level} 
                            name="army-equip2" onChange={changeLevel}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비3</label>
                    <div className="col-4">
                        <select className="form-select" value={army.equip3.grade} 
                            name="army-equip3" onChange={changeGrade}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={army.equip3.level} 
                            name="army-equip3" onChange={changeLevel}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비4</label>
                    <div className="col-4">
                        <select className="form-select" value={army.equip4.grade} 
                            name="army-equip4" onChange={changeGrade}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={army.equip4.level}
                            name="army-equip4" onChange={changeLevel}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비5</label>
                    <div className="col-4">
                        <select className="form-select" value={army.equip5.grade} 
                            name="army-equip5" onChange={changeGrade}>
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
                    <input type="checkbox" checked={navy.use} name="navy" onChange={checkUse} />
                    <span className="ms-2">해군</span>
                </label>
            </div>
            {navy.use && (

            <div className="col-sm-9">
                <div className="row">
                    <label className="col-4 col-form-label">장비1</label>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip1.grade} 
                            name="navy-equip1" onChange={changeGrade}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip1.level} 
                            name="navy-equip1" onChange={changeLevel}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비2</label>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip2.grade} 
                            name="navy-equip2" onChange={changeGrade}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip2.level} 
                            name="navy-equip2" onChange={changeLevel}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비3</label>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip3.grade} 
                            name="navy-equip3" onChange={changeGrade}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip3.level} 
                            name="navy-equip3" onChange={changeLevel}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비4</label>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip4.grade} 
                            name="navy-equip4" onChange={changeGrade}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip4.level} 
                            name="navy-equip4" onChange={changeLevel}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비5</label>
                    <div className="col-4">
                        <select className="form-select" value={navy.equip5.grade} 
                            name="navy-equip5" onChange={changeGrade}>
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
                    <input type="checkbox" checked={airforce.use} name="airforce" onChange={checkUse} />
                    <span className="ms-2">공군</span>
                </label>
            </div>
            {airforce.use && (

            <div className="col-sm-9">
                <div className="row">
                    <label className="col-4 col-form-label">장비1</label>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip1.grade} 
                            name="airforce-equip1" onChange={changeGrade}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip1.level} 
                            name="airforce-equip1" onChange={changeLevel}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비2</label>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip2.grade} 
                            name="airforce-equip2" onChange={changeGrade}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip2.level} 
                            name="airforce-equip2" onChange={changeLevel}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비3</label>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip3.grade} 
                            name="airforce-equip3" onChange={changeGrade}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip3.level} 
                            name="airforce-equip3" onChange={changeLevel}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비4</label>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip4.grade} 
                            name="airforce-equip4" onChange={changeGrade}>
                            {grades.map(grade => (
                                <option key={grade.no}>{grade.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip4.level} 
                            name="airforce-equip4" onChange={changeLevel}>
                            {Array.from({ length: 12 }, (_, i) => 12 - i).map(n => (
                                <option key={n} value={n}>{`${n}레벨`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="row">
                    <label className="col-4 col-form-label">장비5</label>
                    <div className="col-4">
                        <select className="form-select" value={airforce.equip5.grade} 
                            name="airforce-equip5" onChange={changeGrade}>
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