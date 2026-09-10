import { useState } from 'react';
import { effectState } from './appearanceData';

function Effects({ title, item, field, labels }) {
    const { lines, missing, empty } = effectState(item, field);
    return <section className="mt-3">
        <h3 className="h6 fw-bold">{title}</h3>
        {lines.length > 0 && <ul className="small mb-0 ps-3">{lines.map((line, index) => <li key={index}>{line}</li>)}</ul>}
        {missing && <p className="small text-body-secondary mb-0">{labels.missingBuff}</p>}
        {empty && <p className="small text-body-secondary mb-0">{labels.noBuff}</p>}
    </section>;
}
export default function AppearanceItem({ item, image, labels }) {
    const [failedUrl, setFailedUrl] = useState(null);
    return <article className="card h-100 appearance-item">
        <div className="appearance-image bg-body-tertiary rounded-top">
            {image && failedUrl !== image
                ? <img src={image} alt={String(item.name || item.id)} loading="lazy" onError={() => setFailedUrl(image)} />
                : <span className="small text-body-secondary">{labels.noImage}</span>}
        </div>
        <div className="card-body">
            <h2 className="h5 mb-1">{String(item.name || item.id)}</h2>

            <Effects title={labels.equip} item={item} field="equipBuff" labels={labels} />
            <Effects title={labels.own} item={item} field="ownBuff" labels={labels} />
        </div>
    </article>;
}
