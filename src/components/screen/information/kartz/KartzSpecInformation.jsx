import KartzSpecInfoList from '@src/assets/json/kartz/enemy.json';
import { useCallback, useEffect, useState } from 'react';

const KartzSpecInformation = ()=>{

    const [list, setList] = useState([]);

    const [bossOnly, setBossOnly] = useState(true);
    useEffect(()=>{
        if(bossOnly) {
            setList(KartzSpecInfoList.filter(info=>info.round%5 === 0));
        }
        else {
            setList(KartzSpecInfoList);
        }
    }, [bossOnly]);

    const numberWithCommas = useCallback((x)=>{
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }, []);

    return (<>
        <h1>카르츠 몬스터 정보</h1>
        <hr/>
        <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="flexSwitchCheckDefault" checked={bossOnly} onChange={e=>setBossOnly(e.target.checked)}/>
            <label className="form-check-label" htmlFor="flexSwitchCheckDefault">보스 라운드만 보기</label>
        </div>
        <div className="row mt-4">
            <div className="col">
                <div className='table-responsive'>
                    <table className='table table-hover'>
                        <thead className='text-center table-primary'>
                            <tr>
                                <th>라운드</th>
                                <th>레벨</th>
                                <th>유닛수</th>
                                <th>공격/생명</th>
                                <th>데미지증가/감면</th>
                                <th>명중/회피</th>
                                <th>치명타데미지</th>
                                <th>방어도</th>
                                <th>군종</th>
                            </tr>
                        </thead>
                        <tbody className='text-center'>
                            {list.map(info=>(
                            <tr key={info.round} className={`${info.round % 5 == 0 ? 'table-info' : ''}`}>
                                <td>{info.round}</td>
                                <td>{info.level}</td>
                                <td>{numberWithCommas(info.unit)}</td>
                                <td>{numberWithCommas(info.attack)}</td>
                                <td>{numberWithCommas(info.dmg)}</td>
                                <td>{numberWithCommas(info.hit)}</td>
                                <td>{numberWithCommas(info.critDmg)}</td>
                                <td>{numberWithCommas(info.def)}</td>
                                <td>{info.type}</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </>)
};

export default KartzSpecInformation;