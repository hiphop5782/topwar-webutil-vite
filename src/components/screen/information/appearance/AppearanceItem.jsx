import { useState } from 'react';
import { effectState } from './appearanceData';
import { createAppearanceSearch } from './appearanceSearch';

function HighlightText({ text, query }) {
    const search = createAppearanceSearch(query);
    if (!search) return text;
    const parts = [];
    let offset = 0;
    for (const { start, end } of search.findMatches(text)) {
        parts.push(text.slice(offset, start));
        parts.push(<mark className="appearance-search-match" key={start}>{text.slice(start, end)}</mark>);
        offset = end;
    }
    parts.push(text.slice(offset));
    return parts;
}

function Effects({ title, item, field, labels, query }) {
    const { lines, missing, empty } = effectState(item, field);
    return <section className="mt-3">
        <h3 className="h6 fw-bold">{title}</h3>
        {lines.length > 0 && <ul className="small mb-0 ps-3">{lines.map((line, index) => <li key={index}><HighlightText text={line} query={query} /></li>)}</ul>}
        {missing && <p className="small text-body-secondary mb-0">{labels.missingBuff}</p>}
        {empty && <p className="small text-body-secondary mb-0">{labels.noBuff}</p>}
    </section>;
}
export default function AppearanceItem({ item, image, labels, query = '' }) {
    const [failedUrl, setFailedUrl] = useState(null);
    return <article className="card h-100 appearance-item">
        <div className="appearance-image bg-body-tertiary rounded-top">
            {image && failedUrl !== image
                ? <img src={image} alt={String(item.name || item.id)} loading="lazy" onError={() => setFailedUrl(image)} />
                : <span className="small text-body-secondary">{labels.noImage}</span>}
        </div>
        <div className="card-body">
            <h2 className="h5 mb-1"><HighlightText text={String(item.name || item.id)} query={query} /></h2>

            <Effects title={labels.equip} item={item} field="equipBuff" labels={labels} query={query} />
            <Effects title={labels.own} item={item} field="ownBuff" labels={labels} query={query} />
        </div>
    </article>;
}
