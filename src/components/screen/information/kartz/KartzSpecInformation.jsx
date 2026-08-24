import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParamState } from '../../../../hooks/useParamState';
import { loadKartzEnemy } from '@src/services/topwarDataRepository';
import DataLoadingPlaceholder from '@src/components/template/DataLoadingPlaceholder';

const SILVER_RATIO = 0.24;
const SPEC_FIELDS = ['level', 'unit', 'attack', 'dmg', 'hit', 'critDmg', 'def'];

const KartzSpecInformation = ()=>{
    const {t} = useTranslation("viewer");

    const [sourceList, setSourceList] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        loadKartzEnemy()
            .then((data) => setSourceList(Array.isArray(data) ? data : []))
            .catch((error) => {
                console.error("Kartz enemy data load failed", error);
                setSourceList([]);
            })
            .finally(() => setDataLoading(false));
    }, []);

    //const [bossOnly, setBossOnly] = useState(true);
    const [bossOnly, setBossOnly] = useParamState("boss", false, {
        parse: (value) => value === "true",
        serialize: (value) => String(value),
    });
    const [league, setLeague] = useParamState('league', 'diamond', {
        parse: (value) => value === 'silver' ? 'silver' : 'diamond',
    });

    const list = useMemo(() => {
        const filteredList = bossOnly
            ? sourceList.filter((info) => info.round % 5 === 0)
            : sourceList;

        if (league !== 'silver') return filteredList;

        return filteredList.map((info) => {
            const silverInfo = {...info};
            SPEC_FIELDS.forEach((field) => {
                silverInfo[field] = Math.round(Number(info[field]) * SILVER_RATIO);
            });
            return silverInfo;
        });
    }, [bossOnly, league, sourceList]);

    const numberWithCommas = useCallback((x)=>{
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }, []);

    if (dataLoading) {
        return <DataLoadingPlaceholder rows={10} />;
    }

    return (<>
        <h1>{t("KartzSpecInformation.title")}</h1>
        <hr/>
        <div className="mb-3">
            <div className="btn-group" role="group" aria-label={t('KartzSpecInformation.league-select')}>
                <button
                    type="button"
                    className={`btn ${league === 'silver' ? 'btn-primary' : 'btn-outline-primary'}`}
                    aria-pressed={league === 'silver'}
                    onClick={() => setLeague('silver')}
                >
                    {t('KartzSpecInformation.league-silver')}
                </button>
                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    title={t('KartzSpecInformation.league-gold-pending')}
                    disabled
                >
                    {t('KartzSpecInformation.league-gold')}
                </button>
                <button
                    type="button"
                    className={`btn ${league === 'diamond' ? 'btn-primary' : 'btn-outline-primary'}`}
                    aria-pressed={league === 'diamond'}
                    onClick={() => setLeague('')}
                >
                    {t('KartzSpecInformation.league-diamond')}
                </button>
            </div>
            {league === 'silver' && (
                <div className="form-text">{t('KartzSpecInformation.silver-estimate')}</div>
            )}
        </div>
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
                            <tr key={info.round} className={`${info.round % 5 === 0 ? 'table-info' : ''}`}>
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
