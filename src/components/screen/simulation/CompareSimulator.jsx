import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowRightArrowLeft, FaCheck, FaMagnifyingGlass, FaShareNodes, FaXmark } from 'react-icons/fa6';
import { loadOverallLatest, listKartzHistoryFiles, loadDataFile } from '@src/services/topwarDataRepository';
import { buildComparisonEntities, comparisonDifference, comparisonTypes, normalizeComparisonSearch, compareServerPopulation, compareKartzServer, serverComparisonScopes, comparisonAdvantage, kartzAdvantage } from '@src/utils/compareData';
import './CompareSimulator.css';

function TargetPicker({ side, selected, otherId, entities, onSelect, t }) {
    const [query, setQuery] = useState('');
    const deferred = useDeferredValue(query);
    const results = useMemo(() => {
        const tokens = normalizeComparisonSearch(deferred).split(/\s+/).filter(Boolean);
        if (!tokens.length) return [];
        const matches = [];
        for (const item of entities.values()) {
            if (tokens.every(token => item.search.includes(token))) matches.push(item);
            if (matches.length === 20) break;
        }
        return matches;
    }, [entities, deferred]);
    const inputId = `compare-search-${side}`;
    return <section className={`compare-picker compare-picker--${side}`} aria-label={`${t('target')} ${side.toUpperCase()}`}>
        <div className="compare-picker__label"><span>{side.toUpperCase()}</span><label htmlFor={inputId}>{t('target')}</label>{selected && <button type="button" className="compare-icon-button" onClick={() => onSelect('')} aria-label={`${side.toUpperCase()} ${t('clear')}`}><FaXmark /></button>}</div>
        {selected ? <div className="compare-picker__selected"><h2>{selected.name}</h2><p>s{selected.server} · {selected.detail || selected.id}</p><small>{t('selected')}</small></div> : <>
            <div className="compare-search"><FaMagnifyingGlass aria-hidden="true" /><input id={inputId} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} autoComplete="off" maxLength={100} /></div>
            <p className="compare-picker__hint">{t('searchHint')}</p>
            {query.trim() && <div className="compare-search-results" aria-live="polite">
                {results.map(item => <button key={item.id} type="button" disabled={item.id === otherId} onClick={() => onSelect(item.id)}><span><strong>{item.name}</strong><small>s{item.server} · {item.detail || item.id}</small></span>{item.id === otherId && <FaCheck aria-hidden="true" />}</button>)}
                {!results.length && <p>{t('noResults')}</p>}
                {results.length === 20 && <p>{t('refine')}</p>}
            </div>}
        </>}
    </section>;
}

export default function CompareSimulator() {
    const { t, i18n } = useTranslation('compare');
    const [params, setParams] = useSearchParams();
    const type = comparisonTypes.includes(params.get('type')) ? params.get('type') : 'players';
    const [document, setDocument] = useState(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [shareStatus, setShareStatus] = useState('');
    const scope = serverComparisonScopes.includes(params.get('scope')) ? params.get('scope') : 'all';
    const [kartzFiles, setKartzFiles] = useState(null);
    const [kartz, setKartz] = useState(null);
    const [kartzError, setKartzError] = useState(false);
    const [kartzAttempt, setKartzAttempt] = useState(0);
    const month = params.get('month') || kartzFiles?.[0]?.fileName || '';
    useEffect(() => {
        if (type !== 'servers') return;
        let active = true;
        setKartzError(false);
        listKartzHistoryFiles().then(files => { if (active) setKartzFiles(files); }).catch(() => { if (active) setKartzError(true); });
        return () => { active = false; };
    }, [type, kartzAttempt]);
    useEffect(() => {
        setKartz(null);
        if (type !== 'servers' || !kartzFiles) return;
        const file = kartzFiles.find(item => item.fileName === month);
        if (!file) return;
        let active = true;
        setKartzError(false);
        loadDataFile(file.path).then(data => {
            if (!Array.isArray(data?.playerRankList) && !Array.isArray(data?.allianceRankList)) throw new Error('Invalid Kartz snapshot');
            if (active) setKartz({ month, data });
        }).catch(() => { if (active) setKartzError(true); });
        return () => { active = false; };
    }, [type, kartzFiles, month, kartzAttempt]);
    useEffect(() => {
        let active = true;
        setError(false);
        loadOverallLatest().then(data => {
            if (!Array.isArray(data?.players)) throw new Error('Invalid player snapshot');
            if (active) setDocument(data);
        }).catch(() => { if (active) setError(true); });
        return () => { active = false; };
    }, [attempt]);
    useEffect(() => { setShareStatus(''); }, [params]);
    const entities = useMemo(() => buildComparisonEntities(document, type), [document, type]);
    const selectedLeft = entities.get(params.get('left'));
    const selectedRight = entities.get(params.get('right'));
    const population = useMemo(() => type === 'servers' ? [selectedLeft, selectedRight].map(entity => entity ? compareServerPopulation(document, entity.server, scope) : null) : [], [document, type, selectedLeft, selectedRight, scope]);
    const enrich = (entity, index) => {
        if (!entity || type !== 'servers') return entity;
        const scoped = population[index];
        return { ...entity, ...(scoped || { leaders: [], observedAt: null, earliestAt: null }), metrics: { ...(scoped?.metrics || { players: 0, knownPower: 0 }), ...(kartz?.month === month ? compareKartzServer(kartz.data, entity.server) : {}) } };
    };
    const left = enrich(selectedLeft, 0);
    const right = enrich(selectedRight, 1);
    const ready = left && right && left.id !== right.id;
    const invalid = document && ['left', 'right'].some(side => params.get(side) && !entities.has(params.get(side)));
    const formatter = useMemo(() => new Intl.NumberFormat(i18n.resolvedLanguage || 'ko', { maximumFractionDigits: 2 }), [i18n.resolvedLanguage]);
    const format = value => value == null ? t('missing') : formatter.format(value);
    const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(i18n.resolvedLanguage || 'ko') : t('missing');
    const metrics = type === 'players' ? ['power', 'level', 'armyPower'] : ['players', 'knownPower', 'totalPower', 'averagePower', 'maxPower', ...(type === 'servers' ? ['medianPower', 'averageLevel', 'level100', 'top5Share', 'guilds', ...(kartz?.month === month ? ['kartzPlayers', 'kartzTop100', 'kartzBestRank', 'kartzAverageRound', 'kartzMaxRound', 'kartzAlliances', 'kartzAllianceScore'] : [])] : [])];
    const powerMetric = type === 'players' ? 'power' : 'totalPower';
    const powerWinner = ready ? comparisonAdvantage(powerMetric, left.metrics[powerMetric], right.metrics[powerMetric]) : 'unknown';
    const kartzSummary = ready ? kartzAdvantage(left.metrics, right.metrics) : null;
    const winnerText = winner => winner === 'a' || winner === 'b' ? t('advantage.leads', { side: winner.toUpperCase(), name: winner === 'a' ? left.name : right.name }) : t(`advantage.${winner}`);
    const limitedSample = ready && type !== 'players' && (left.metrics.knownPower !== left.metrics.players || right.metrics.knownPower !== right.metrics.players || (type === 'servers' && scope !== 'all' && (left.metrics.players < Number(scope) || right.metrics.players < Number(scope))));
    const select = (side, id) => setParams(current => { const next = new URLSearchParams(current); next.set('type', type); if (id) next.set(side, id); else next.delete(side); return next; });
    const share = async () => {
        try { await navigator.clipboard.writeText(window.location.href); setShareStatus('copied'); }
        catch { setShareStatus('copyFallback'); }
    };
    return <main className="compare-simulator">
        <header className="compare-header"><div><p className="compare-eyebrow">TOPWAR · COMPARE</p><h1>{t('title')}</h1><p>{t('description')}</p></div><button type="button" className="compare-share" onClick={share} disabled={!ready}><FaShareNodes aria-hidden="true" />{t('share')}</button></header>
        {shareStatus && <div role="status" className="compare-status">{t(shareStatus)}{shareStatus === 'copyFallback' && <input aria-label={t('share')} readOnly value={window.location.href} onFocus={event => event.target.select()} />}</div>}
        <nav className="compare-tabs" aria-label={t('type')}>
            {comparisonTypes.map(item => <button key={item} type="button" aria-pressed={type === item} onClick={() => { if (type !== item) setParams({ type: item }); }}>{t(`types.${item}`)}</button>)}
        </nav>
        {type === 'servers' && <section className="compare-controls">
            <div><strong>{t('scope')}</strong><div className="compare-scope">{serverComparisonScopes.map(value => <button type="button" key={value} aria-pressed={scope === value} onClick={() => setParams(current => { const next = new URLSearchParams(current); next.set('scope', value); return next; })}>{value === 'all' ? t('all') : `Top${value}`}</button>)}</div><p>{t('scopeHint')}</p></div>
            <div><label htmlFor="compare-kartz-month">{t('kartz')}</label><select id="compare-kartz-month" value={month} disabled={!kartzFiles?.length} onChange={event => { const value = event.target.value; setParams(current => { const next = new URLSearchParams(current); next.set('month', value); return next; }); }}><option value="" disabled>{t('missing')}</option>{month && !kartzFiles?.some(file => file.fileName === month) && <option value={month}>{month}</option>}{kartzFiles?.map(file => <option key={file.fileName} value={file.fileName}>{file.fileName}</option>)}</select><p>{t('kartzHint')}</p>
                {kartzError ? <p role="alert">{t('kartzError')} <button type="button" onClick={() => setKartzAttempt(value => value + 1)}>{t('retry')}</button></p> : !kartzFiles || (kartzFiles.some(file => file.fileName === month) && kartz?.month !== month) ? <p role="status">{t('kartzLoading')}</p> : !kartzFiles.some(file => file.fileName === month) ? <p role="status">{t('kartzEmpty')}</p> : null}
            </div>
        </section>}
        {error ? <div role="alert" className="compare-empty"><p>{t('loadError')}</p><button type="button" className="btn btn-outline-primary" onClick={() => setAttempt(value => value + 1)}>{t('retry')}</button></div> : !document ? <div role="status" className="compare-empty">{t('loading')}</div> : <>
            {invalid && <p role="status" className="compare-status">{t('invalid')}</p>}
            {left && right && left.id === right.id && <p role="status" className="compare-status">{t('duplicate')}</p>}
            <div className="compare-selectors">
                <TargetPicker key={`${type}:a:${params.get('left') || ''}`} side="a" selected={left} otherId={right?.id} entities={entities} onSelect={id => select('left', id)} t={t} />
                <button type="button" className="compare-swap" aria-label={t('swap')} disabled={!left && !right} onClick={() => setParams(current => { const next = new URLSearchParams(current); const a = next.get('left'); const b = next.get('right'); if (b) next.set('left', b); else next.delete('left'); if (a) next.set('right', a); else next.delete('right'); return next; })}><FaArrowRightArrowLeft /></button>
                <TargetPicker key={`${type}:b:${params.get('right') || ''}`} side="b" selected={right} otherId={left?.id} entities={entities} onSelect={id => select('right', id)} t={t} />
            </div>
            {ready ? <section className="compare-results" aria-label={t('result')}>
                <div className="compare-verdicts" aria-live="polite">
                    <section className={`compare-verdict compare-verdict--${powerWinner}`} data-verdict="power"><small>{t('advantage.powerTitle')} · {t(`metrics.${powerMetric}`)}</small><h2>{winnerText(powerWinner)}</h2><div className="compare-duel"><span>A <strong>{format(left.metrics[powerMetric])}</strong></span><span>B <strong>{format(right.metrics[powerMetric])}</strong></span></div>{left.metrics[powerMetric] != null && right.metrics[powerMetric] != null && <div className="compare-balance" aria-hidden="true"><span style={{ width: `${left.metrics[powerMetric] + right.metrics[powerMetric] > 0 ? left.metrics[powerMetric] / (left.metrics[powerMetric] + right.metrics[powerMetric]) * 100 : 50}%` }} /></div>}<p>{t('advantage.powerHint')}</p>{limitedSample && <p className="compare-sample-note">{t('advantage.limited')}</p>}</section>
                    {type === 'servers' && <section className={`compare-verdict compare-verdict--${kartzSummary.winner}`} data-verdict="kartz"><small>{t('advantage.kartzTitle')} · {month}</small><h2>{winnerText(kartzSummary.winner)}</h2><div className="compare-duel"><span>A <strong>{t('advantage.wins', { count: kartzSummary.a })}</strong></span><span>B <strong>{t('advantage.wins', { count: kartzSummary.b })}</strong></span></div><p>{t('advantage.kartzHint')}</p><small>{t('advantage.available', { count: kartzSummary.available })}</small></section>}
                </div>
                <p className="compare-verdict-note">{t('advantage.notice')}</p>
                <div className="compare-results__heading"><h2>{t('result')}</h2><span>{t('differenceHint')}</span></div>
                <div className="compare-table-scroll" role="region" aria-label={t('result')} tabIndex={0}><table><thead><tr><th scope="col">{t('metric')}</th><th scope="col">A · {left.name}</th><th scope="col">B · {right.name}</th><th scope="col">{t('difference')}</th></tr></thead><tbody>
                    {metrics.map(metric => {
                        const a = left.metrics[metric]; const b = right.metrics[metric]; const diff = comparisonDifference(a, b); const maximum = Math.max(a ?? 0, b ?? 0); const winner = comparisonAdvantage(metric, a, b);
                        return <tr key={metric} data-metric={metric}><th scope="row">{t(`metrics.${metric}`)}{metric === 'kartzPlayers' && <small className="compare-metric-note">{month} · {t('all')}</small>}</th>{[a, b].map((value, index) => <td key={index} className={`compare-value compare-value--${index === 0 ? 'a' : 'b'}${winner === (index === 0 ? 'a' : 'b') ? ' compare-value--winner' : ''}`}><strong>{format(value)}{metric === 'top5Share' && value != null ? '%' : ''}</strong>{winner === (index === 0 ? 'a' : 'b') && <span className="compare-win-badge">▲ {t('advantage.badge')}</span>}{value != null && metric !== 'kartzBestRank' && <span className="compare-bar" aria-hidden="true"><span style={{ width: `${maximum > 0 ? value / maximum * 100 : 0}%` }} /></span>}</td>)}<td className="compare-difference"><span className={`compare-row-verdict compare-row-verdict--${winner}`}>{winner === 'a' || winner === 'b' ? t('advantage.side', { side: winner.toUpperCase() }) : t(`advantage.${winner}`)}</span>{diff.value == null ? t('missing') : <><strong>{diff.value > 0 ? '+' : ''}{format(diff.value)}{metric === 'top5Share' ? ' pp' : ''}</strong><small>{diff.percent == null ? t('noRatio') : `${diff.percent > 0 ? '+' : ''}${format(diff.percent)}%`}</small></>}</td></tr>;
                    })}
                    <tr><th scope="row">{t('observed')}</th><td>{date(left.earliestAt || left.observedAt)}{left.earliestAt && left.earliestAt !== left.observedAt && <> — {date(left.observedAt)}</>}</td><td>{date(right.earliestAt || right.observedAt)}{right.earliestAt && right.earliestAt !== right.observedAt && <> — {date(right.observedAt)}</>}</td><td>—</td></tr>
                </tbody></table></div>
                {type !== 'players' && <div className="compare-leaders">{[left, right].map((entity, index) => <section key={entity.id}><h3>{index === 0 ? 'A' : 'B'} · {t('leaders')}</h3><ol>{entity.leaders.map(player => <li key={player.uid}><span>{player.name}</span><strong>{format(player.power)}</strong></li>)}</ol>{!entity.leaders.length && <p>{t('missing')}</p>}</section>)}</div>}
            </section> : <div className="compare-empty"><span aria-hidden="true">A ↔ B</span><h2>{t('chooseTwo')}</h2><p>{t('chooseHint')}</p></div>}
            <footer className="compare-footnote"><strong>{t('source')}</strong><p>{t('sourceTime')} {date(document.sourceUpdatedAt || document.generatedAt)}</p>{type === 'servers' && kartz?.month === month && <p>{t('kartz')} · {month} · {kartzFiles.find(file => file.fileName === month)?.path}</p>}<p>{t('notice')}</p></footer>
        </>}
    </main>;
}
