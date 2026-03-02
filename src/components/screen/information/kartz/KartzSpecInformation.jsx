import KartzSpecInfoList from '@src/assets/json/kartz/enemy.json';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const KartzSpecInformation = ()=>{
    const {t} = useTranslation("viewer");

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
        <h1>{t("KartzSpecInformation.title")}</h1>
        <hr/>
        <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="flexSwitchCheckDefault" checked={bossOnly} onChange={e=>setBossOnly(e.target.checked)}/>
            <label className="form-check-label" htmlFor="flexSwitchCheckDefault">{t("KartzSpecInformation.boss-only")}</label>
        </div>
        <div className="row mt-4">
            <div className="col">
                <div className='table-responsive'>
                    <table className='table table-hover'>
                        <thead className='text-center table-primary'>
                            <tr>
                                <th>{t("KartzSpecInformation.table-round")}</th>
                                <th>{t("KartzSpecInformation.table-level")}</th>
                                <th>{t("KartzSpecInformation.table-unitcount")}</th>
                                <th>{t("KartzSpecInformation.table-atk-hp")}</th>
                                <th>{t("KartzSpecInformation.table-dmg")}</th>
                                <th>{t("KartzSpecInformation.table-acc-agi")}</th>
                                <th>{t("KartzSpecInformation.table-critical")}</th>
                                <th>{t("KartzSpecInformation.table-def")}</th>
                                <th>{t("KartzSpecInformation.table-type")}</th>
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