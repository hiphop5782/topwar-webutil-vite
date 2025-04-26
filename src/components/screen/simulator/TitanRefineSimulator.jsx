import colorList from "@src/assets/json/titan/titan-colors.json";
import partsList from "@src/assets/json/titan/titan-parts-types.json";
import gearNames from "@src/assets/json/titan/titan-gear-names.json";
import gearOptionList from "@src/assets/json/titan/titan-gear-options.json";
import gearOptionRange from "@src/assets/json/titan/titan-gear-range.json";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaCheck } from "react-icons/fa"
import { FaXmark } from "react-icons/fa6";

import "./TitanRefineSimulator.css";
import "animate.css";

const TitanRefineSimulator = () => {
    const [parts, setParts] = useState('pistol');
    const [gearOptions, setGearOptions] = useState([]);
    const [materialOption, setMaterialOption] = useState({ title: '육군 데미지 증가', value: 2.5 });

    const [editingOption, setEditingOption] = useState({title:'', value:0.0});
    const [editingMaterialOption, setEditingMaterialOption] = useState({title:'', value:0.0});
    const [history, setHistory] = useState([]);

    //파츠가 변경되면 기어옵션을 변경
    useEffect(() => {
        if (!parts) return;

        //console.log(gearOptionList[parts][3]);
        const option = gearOptionList[parts][3];
        const mean = parseFloat(parseFloat((option.min + option.max) / 2).toFixed(2));
        setGearOptions([{
            title:option.title,
            value: mean
        }]);

        setMaterialOption({title:option.title, value:mean});
    }, [parts]);

    const addGearOptions = useCallback((e) => {
        const option = gearOptionList[parts][3];
        const mean = parseFloat(parseFloat((option.min + option.max) / 2).toFixed(2));
        setGearOptions(prev => {
            if (prev.length === 3) return prev;
            return [...prev, { title: option.title, value: mean }]
        });
    }, [gearOptions, parts]);
    const removeGearOptions = useCallback((e) => {
        setGearOptions(prev => {
            if (prev.length === 1) return prev;
            return prev.filter((opt, idx) => idx < prev.length - 1)
        });
    }, [gearOptions]);

    const changeGearOption = useCallback((opt, idx) => {
        setGearOptions(prev => prev.map((option, index) => {
            if (index === idx) {
                const obj = { ...option, edit: true };
                setEditingOption(obj)
                return obj;
            }
            return {...option, edit:false};
        }));
    }, [editingOption, gearOptions]);

    const confirmChangeGearOption = useCallback((opt, idx)=>{
        setGearOptions(prev => prev.map((option, index) => {
            if (index === idx) {
                return {...editingOption, edit:false};
            }
            return {...option};
        }));
    }, [editingOption, gearOptions]);
    const cancelChangeGearOption = useCallback((opt, idx)=>{
        setGearOptions(prev => prev.map((option, index) => {
            if (index === idx) {
                return { ...option, edit: false };
            }
            return option;
        }));
    }, [gearOptions]);
    
    const changeEditingOptionTitle = useCallback(e=>{
        setEditingOption(prev=>({
            ...editingOption,
            title:e.target.value
        }));
    }, [editingOption]);
    const changeEditingOptionValue = useCallback(e=>{
        const value = e.target.value;
        if(isNaN(value)) return;

        setEditingOption(prev=>({
            ...editingOption,
            value:parseFloat(parseFloat(value).toFixed(2))
        }));
    }, [editingOption]);

    const changeMaterialOption = useCallback(()=>{
        setMaterialOption(prev=>({...prev, edit:true}));
        setEditingMaterialOption({...materialOption});
    }, [materialOption]);
    const changeEditingMaterialOptionTitle = useCallback((e)=>{
        const title = e.target.value;
        const option = gearOptionList[parts].filter(opt=>opt.title === title)[0];
        //console.log("parts", parts, "title", title, "option", gearOptionList[parts]);
        const mean = parseFloat(parseFloat((option.min + option.max) / 2).toFixed(2));
        setEditingMaterialOption(prev=>({title:title, value:mean}));
    }, [editingMaterialOption, parts]);
    const changeEditingMaterialOptionValue = useCallback((e)=>{
        setEditingMaterialOption(prev=>({...prev, value:e.target.value}));
    }, [editingMaterialOption]);
    const confirmChangeMaterialOption = useCallback(()=>{
        setMaterialOption(prev=>({...editingMaterialOption, edit:false}));
        setEditingMaterialOption({title:'', value:0.0});
    }, [materialOption, editingMaterialOption]);
    const cancelChangeMaterialOption = useCallback(()=>{
        setMaterialOption(prev=>({...prev, edit:false}));
        setEditingMaterialOption({title:'', value:0.0});
    }, [materialOption, editingMaterialOption]);


    const editing = useMemo(()=>{
        return gearOptions.reduce((p, n) => {
            return p || (n?.edit === true);
        }, false) || materialOption.edit;
    }, [gearOptions, materialOption]);

    const gaussianRandomValue = useCallback((min, max, mean = (min + max) / 2, stdDev = (max - min) / 6)=> {
        let value;
        do {
            let u = 0, v = 0;
            while (u === 0) u = Math.random();  // 0 방지
            while (v === 0) v = Math.random();

            // Box-Muller 변환으로 정규분포 난수 생성
            const standardNormal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            value = standardNormal * stdDev + mean;
        } while (value < min || value > max);  // 범위 내 값이 나올 때까지 반복

        return parseFloat(value.toFixed(2));
    }, []);

    const randomValue = useCallback((begin, end, numeric=false)=>{
        const range = end - begin + (numeric ? 1 : 0);
        const value = Math.random() * range;
        return numeric ? Math.floor(value) : value;
    }, []);

    const combineOptions = useCallback((prevOption, newOption)=>{
        if(prevOption.title !== newOption.title) {
            return {...newOption};
        }

        const {min, max} = gearOptionRange.filter(item=>prevOption.title.includes(item.type))[0];
        //const refineValue = prevOption.value + gaussianRandomValue(newOption.value / 10 , newOption.value / 4);//10~25%로 임의지정
        const refineValue = parseFloat(prevOption.value) + randomValue(min, max);
        //console.log("parts", parts);
        //console.log("maxValue", gearOptionList[parts].filter(opt=>opt.title === newOption.title));
        const maxValue = gearOptionList[parts].filter(opt=>opt.title === newOption.title)[0].max;
        
        return {...prevOption, value:Math.min(refineValue, maxValue), max : refineValue >= maxValue};
    }, [parts]);


    const refining = useRef(false);
    const refine = useCallback(()=>{
        refining.current = true;
        setSelectedIndex(-1);
        setAnimationIndex(-1);

        const copy = [...gearOptions];
        //재련할 옵션과 같으면서 max가 아닌 index 찾기
        //const indexList = copy.map((opt, idx)=>(opt?.title === materialOption.title && opt?.max === true) ? -1 : idx).filter(idx=>idx!==-1);

        //max는 제외
        const indexList = copy.map((opt, idx)=>(opt?.title === materialOption.title && opt?.max === true) ? -1 : idx).filter(idx=>idx!==-1);

        //없으면 중지
        //if(copy.length === 3 && indexList.length === 0) return;
        
        //없는 index 보충
        if(copy.length < 3) {
            indexList.push(copy.length);    
        }
        
        //const index = indexList[Math.floor(Math.random() * indexList.length)];
        const index = Math.floor(Math.random() * 3);
        let comment = `<span class="fw-bold text-danger">${index+1}</span>번 옵션 항목에 `;
        
        if(copy[index] === undefined) {//신규
            copy[index] = materialOption;
            comment += `신규 옵션 추가, [${materialOption.title} - <span class="fw-bold text-danger">${materialOption.value}</span>%]`;
        }
        else {
            const option = copy[index];
    
            //옵션이름이 다르면 덮어쓰기, 같으면 수치비교 후 합성
            const refineOption = combineOptions(option, materialOption);
            copy[index] = refineOption;
            if(option.title === refineOption.title) {
                comment += `기존 옵션 수치 향상, [${refineOption.title} - <span class="fw-bold text-danger">${option.value.toFixed(2)}</span>% → <span class="fw-bold text-danger">${refineOption.value.toFixed(2)}</span>% (<span class="fw-bold text-danger">${(refineOption.value - option.value).toFixed(2)}</span>% 상승)]`;
            }
            else {
                comment += `다른 옵션으로 덮어쓰기됨, [${refineOption.title} - <span class="fw-bold text-danger">${refineOption.value.toFixed(2)}%</span>]`;
            }
        }

        setGearOptions(copy);
        setAnimationIndex(index);
        setSelectedIndex(index);
        setHistory(prev=>[comment, ...prev]);
        refining.current = false;
    }, [parts, gearOptions, materialOption]);  

    //애니메이션 관련
    const [useAnimation, setUseAnimation] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [animationIndex, setAnimationIndex] = useState(-1);
    const [animationPlaying, setAnimationPlaying] = useState(false);

    const playAnimation = useCallback(()=>{
        if(animationPlaying === true) return;
        setAnimationPlaying(true);
    }, [animationPlaying]);

    useEffect(()=>{
        if(animationPlaying === false) return;
        
        refining.current = true;
        setSelectedIndex(-1);
        setAnimationIndex(0);

        const copy = [...gearOptions];
        //재련할 옵션과 같으면서 max가 아닌 index 찾기
        const indexList = copy.map((opt, idx)=>(opt?.title === materialOption.title && opt?.max === true) ? -1 : idx).filter(idx=>idx!==-1);

        //없으면 중지
        if(copy.length === 3 && indexList.length === 0) return;

        
        //없는 index 보충
        if(copy.length < 3) {
            indexList.push(copy.length);    
        }
        
        const index = indexList[Math.floor(Math.random() * indexList.length)];
        let comment = `<span class="fw-bold text-danger">${index+1}</span>번 옵션 항목에 `;
        
        if(copy[index] === undefined) {//신규
            copy[index] = materialOption;
            comment += `신규 옵션 추가, [${materialOption.title} - <span class="fw-bold text-danger">${materialOption.value}%</span>]`;
        }
        else {
            const option = copy[index];
    
            //옵션이름이 다르면 덮어쓰기, 같으면 수치비교 후 합성
            const refineOption = combineOptions(option, materialOption);
            copy[index] = refineOption;
            if(option.title === refineOption.title) {
                comment += `기존 옵션 수치 향상, [${refineOption.title} - <span class="fw-bold text-danger">${option.value.toFixed(2)}</span>% → <span class="fw-bold text-danger">${refineOption.value.toFixed(2)}</span>% (<span class="fw-bold text-danger">${(refineOption.value - option.value).toFixed(2)}</span>% 상승)]`;
            }
            else {
                comment += `다른 옵션으로 덮어쓰기됨, [${refineOption.title} - <span class="fw-bold text-danger">${refineOption.value.toFixed(2)}</span>%]`;
            }
        }

        //animation
        let count = 0;
        const nextStep = (idx=0)=>{
            const nextIndex = (idx+1) % 3;
            setAnimationIndex(nextIndex);
            count++;
            if(count < 6 || nextIndex != index) {
                setTimeout(()=>{nextStep(nextIndex)}, 250);
            }
            else {
                setGearOptions(copy);
                refining.current = false;
                setAnimationPlaying(false);
                setSelectedIndex(index);
                setHistory(prev=>[comment, ...prev]);
            }
        };

        const job = setTimeout(()=>nextStep(), 250);

        return ()=>clearTimeout(job);
    }, [animationPlaying]);

    return (<>
        <h1>타이탄 재련</h1>
        <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="refine-animation-available"
                checked={useAnimation} onChange={e=>setUseAnimation(e.target.checked)}/>
            <label className="form-check-label" htmlFor="refine-animation-available">재련 애니메이션 사용</label>
        </div>
        <hr />
        <div className="row">
            <div className="col">
                
                <div className="d-flex align-items-center flex-wrap">
                    <span className="fs-3 me-4">제작부위</span>
                    <span>
                        <span className="pointer-field">
                            {partsList.map(part => (<img key={part} src={`${import.meta.env.VITE_PUBLIC_URL}/images/titan/titan-item-${part}.png`} onClick={e => setParts(part)} className={`catalyst-img${parts === part ? ' active' : ''}`} />))}
                        </span>
                    </span>
                </div>
            </div>
        </div>
        <div className="row">
            <div className="col-sm-6">
                <h2>
                    <span className="me-2">타이탄 설정</span>
                    <span role="button" className="text-primary fs-6" onClick={addGearOptions}>추가</span>
                    <span role="button" className="text-danger fs-6 ms-2" onClick={removeGearOptions}>제거</span>
                </h2>
                <div className="text-muted">*옵션 클릭 시 변경 가능</div>
                <div className="row">
                    <div className="col">
                        <div className="card mb-3 bg-dark text-light flex-row">
                            <div className="card-img-top p-2 position-relative">
                                <img src={`${import.meta.env.VITE_PUBLIC_URL}/images/titan/${parts}-gold.png`} width={'100%'} />
                            </div>
                            <div className="card-body" style={{ minWidth: '70%'}}>
                                <h5 className="card-title" style={{ color: colorList['gold'] }}>{gearNames[parts]}</h5>
                                <div className="option-mapper">
                                    {animationIndex != -1 && (
                                    <div className="option-highlighter" style={{top:`${animationIndex * 33.3333}%`}}>&nbsp;</div>
                                    )}
                                    {gearOptions.map((opt, idx) => (
                                        <div className={`${selectedIndex===idx?'select-effect ':''}card-text row mb-1`} key={idx}>
                                            {opt?.edit === true ? (<>
                                                <div className="input-group">
                                                    <select className="form control form-control-sm col-8" onChange={changeEditingOptionTitle} value={editingOption.title}>
                                                        {gearOptionList[parts].map((option, i)=>(
                                                            <option key={i}>{option.title}</option>
                                                        ))}
                                                    </select>
                                                    <input type="number" className="form-control form-control-sm col-4 text-end" value={editingOption.value} 
                                                                onChange={changeEditingOptionValue} min={0} step={0.01}/>
                                                    <span className="ms-1">%</span>
                                                </div>
                                                <div className="text-end">
                                                    <FaCheck className="text-success fs-6" onClick={e=>confirmChangeGearOption(opt, idx)}/>
                                                    <FaXmark className="text-danger ms-2 fs-6" onClick={e=>cancelChangeGearOption(opt, idx)}/>
                                                </div>
                                            </>) : (<>
                                                <span className="col-8 text-begin text-truncate" role="button" onClick={e => changeGearOption(opt, idx)}>{opt.title}</span>
                                                <span className="col-4 text-end text-truncate" role="button" onClick={e => changeGearOption(opt, idx)}>{parseFloat(opt.value).toFixed(2)}%</span>
                                            </>)}
                                        </div>
                                    ))}
                                    {Array.from({length:3-gearOptions.length}, (_,i)=>i).map((idx)=>(
                                        <div className={`card-text row mb-1`} key={idx}>
                                            <span className="col-8 text-begin text-truncate">&nbsp;</span>
                                            <span className="col-4 text-end text-truncate">&nbsp;</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-sm-6">
                <h2>
                    <span className="me-2">재료 설정</span>
                </h2>
                <div className="text-muted">*옵션 클릭 시 변경 가능</div>
                <div className="row">
                    <div className="col">
                        <div className="card mb-3 bg-dark text-light flex-row">
                            <div className="card-img-top p-2 position-relative">
                                <img src={`${import.meta.env.VITE_PUBLIC_URL}/images/titan/${parts}-gold.png`} width={'100%'} />
                            </div>
                            <div className="card-body" style={{ minWidth: '70%' }}>
                                <h5 className="card-title" style={{ color: colorList['gold'] }}>{gearNames[parts]}</h5>
                                <div className="card-text row mb-1">
                                    {materialOption.edit === true ? (<>
                                    <div className="input-group">
                                        <select className="form control form-control-sm col-8" onChange={changeEditingMaterialOptionTitle} value={editingMaterialOption.title}>
                                            {gearOptionList[parts].map(option=>(
                                                <option>{option.title}</option>
                                            ))}
                                        </select>
                                        <input type="number" className="form-control form-control-sm col-4 text-end" value={editingMaterialOption.value} 
                                                    onChange={changeEditingMaterialOptionValue} min={0} step={0.01}/>
                                        <span className="ms-1">%</span>
                                    </div>
                                    <div className="text-end">
                                        <FaCheck className="text-success fs-6" onClick={confirmChangeMaterialOption}/>
                                        <FaXmark className="text-danger ms-2 fs-6" onClick={cancelChangeMaterialOption}/>
                                    </div>
                                    </>) : (<>
                                    <span className="col-8 text-begin text-truncate" onClick={changeMaterialOption}>{materialOption.title}</span>
                                    <span className="col-4 text-end text-truncate" onClick={changeMaterialOption}>{materialOption.value}%</span>
                                    </>)}
                                    
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="row mt-2">
            <div className="col">
                <button type="button" className="btn btn-primary btn-lg w-100" 
                    onClick={e=>useAnimation ? playAnimation(e) : refine(e)} 
                    disabled={editing === true && refining.current === false && animationPlaying === false}>재련</button>
            </div>
        </div>

        <hr/>

        <div className="row mt-2">
            <div className="col">
                <h3>History</h3>
                {history.map((h,i)=>(<div key={i} dangerouslySetInnerHTML={{__html:h}}></div>))}
            </div>
        </div>

        <hr/>
        <div className="row mt-4">
            <div className="col">
                <div>* 타이탄 재련 수치 (by THAODIEN - s348)</div>
                {gearOptionRange.map((option, i)=>(
                <div key={i}>{option.type} : {option.min}% ~ {option.max}%</div>
                ))}
            </div>
        </div>

    </>);
};

export default TitanRefineSimulator;