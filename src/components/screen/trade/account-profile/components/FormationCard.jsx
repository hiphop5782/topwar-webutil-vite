import HeroCard from "./HeroCard";
import StatGrid from "./StatGrid";

const TYPE_LABELS = {
    navy: "Navy",
    army: "Army",
    "air-force": "Air Force",
};

function normalizeFormationType(type) {
    const normalizedType = String(type || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

    if (TYPE_LABELS[normalizedType]) {
        return normalizedType;
    }

    return "navy";
}

export default function FormationCard({ formation }) {
    const safeFormation = formation || {};
    const type = normalizeFormationType(safeFormation.type);
    const heroes = Array.from(
        { length: 3 },
        (_, index) => safeFormation.heroes?.[index] || null
    );

    return (
        <article className={`formation-card formation-card-${type}`}>
            <div className="formation-card-header">
                <div>
                    <span className="formation-card-type">{TYPE_LABELS[type] || "Navy"}</span>
                    <h3 className="formation-card-title">
                        {safeFormation.name || "Unnamed Formation"}
                    </h3>
                </div>
            </div>
            <div className="formation-card-heroes">
                {heroes.map((hero, index) => (
                    <HeroCard hero={hero} index={index} key={`${safeFormation.id || "hero"}-${index}`} />
                ))}
            </div>
            <StatGrid stats={safeFormation.stats} />
        </article>
    );
}
