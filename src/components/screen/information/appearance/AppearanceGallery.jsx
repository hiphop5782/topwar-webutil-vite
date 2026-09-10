import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppearanceItem from './AppearanceItem';
import { buffLines, categoryIds, normalizeItems, relativePath } from './appearanceData';
import { createAppearanceSource } from './appearanceSource';
import './AppearanceGallery.css';

export default function AppearanceGallery({ baseUrl }) {
    const { t } = useTranslation('menu');
    const labels = t('appearance', { returnObjects: true });
    const id = useId();
    const source = useMemo(() => createAppearanceSource(baseUrl), [baseUrl]);
    const [category, setCategory] = useState('castle');
    const [query, setQuery] = useState('');
    const [view, setView] = useState('cards');
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState({ loading: true });

    useEffect(() => {
        const controller = new AbortController();
        setState({ loading: true });
        async function load() {
            try {
                const index = await source.read('index.json', controller.signal);
                const entry = index?.categories?.[category];
                if (!entry) throw new Error(`Missing category: ${category}`);
                const path = relativePath('index.json', entry.data || `${category}/data.json`);
                if (!path.startsWith(`${category}/`)) throw new Error('Invalid category path');
                const items = normalizeItems(await source.read(path, controller.signal));
                if (!controller.signal.aborted) setState({ items, path, loading: false });
            } catch (error) {
                if (!controller.signal.aborted) setState({ loading: false, error: error.message });
            }
        }
        load();
        return () => controller.abort();
    }, [source, category, attempt]);

    const items = useMemo(() => {
        const search = query.trim().toLocaleLowerCase();
        return (state.items || []).filter(item => [item.id, item.name, item.nameKey,
            ...buffLines(item.equipBuff), ...buffLines(item.ownBuff)].join(' ').toLocaleLowerCase().includes(search));
    }, [state.items, query]);

    return <section className="appearance-gallery">
        <h1 className="h3 fw-bold">{labels.title}</h1>
        <p className="text-body-secondary">{labels.description}</p>
        <div className="nav nav-tabs mb-3" role="tablist" aria-label={labels.categories}>
            {categoryIds.map((key, index) => <button key={key} type="button" role="tab"
                id={`${id}-${key}`} aria-controls={`${id}-panel`} aria-selected={category === key}
                tabIndex={category === key ? 0 : -1}
                className={`nav-link ${category === key ? 'active' : ''}`}
                onClick={() => { if (key !== category) { setState({ loading: true }); setCategory(key); } }}
                onKeyDown={event => {
                    let next;
                    if (event.key === 'ArrowRight') next = (index + 1) % 4;
                    if (event.key === 'ArrowLeft') next = (index + 3) % 4;
                    if (event.key === 'Home') next = 0;
                    if (event.key === 'End') next = 3;
                    if (next !== undefined) { event.preventDefault(); document.getElementById(`${id}-${categoryIds[next]}`)?.focus(); if (next !== index) { setState({ loading: true }); setCategory(categoryIds[next]); } }
                }}>{labels[key]}</button>)}
        </div>
        <div className="d-flex flex-wrap gap-3 align-items-end mb-3">
            <div className="flex-grow-1">
                <label className="form-label" htmlFor={`${id}-search`}>{labels.search}</label>
                <input id={`${id}-search`} type="search" className="form-control" value={query} onChange={event => setQuery(event.target.value)} placeholder={labels.placeholder} />
            </div>
            <div className="btn-group" role="group" aria-label={labels.view}>
                {['cards', 'list'].map(mode => <button key={mode} type="button" aria-pressed={view === mode}
                    className={`btn btn-${view === mode ? '' : 'outline-'}primary`} onClick={() => setView(mode)}>{labels[mode]}</button>)}
            </div>
        </div>
        <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${category}`} aria-busy={state.loading} tabIndex={0}>
            {state.loading ? <p role="status" className="py-5 text-center">{labels.loading}</p>
                : state.error ? <div role="alert" className="alert alert-danger">{labels.error}<div className="small mt-1">{state.error}</div><button type="button" className="btn btn-outline-danger mt-2" onClick={() => setAttempt(value => value + 1)}>{labels.retry}</button></div>
                : <><p role="status" className="small text-body-secondary">{labels.results}: {items.length} / {state.items.length}</p>
                    {!items.length ? <p className="alert alert-light border">{state.items.length ? labels.noResults : labels.empty}</p>
                        : <div className={`appearance-results ${view === 'list' ? 'appearance-list' : ''}`}>
                            {items.map((item, index) => <AppearanceItem key={`${category}-${item.id}-${index}`} item={item} image={source.image(state.path, item.image)} labels={labels} />)}
                        </div>}</>}
        </div>
    </section>;
}

