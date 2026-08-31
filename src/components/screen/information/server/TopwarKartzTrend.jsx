export default function KartzTrend({ entries, loading, emptyLabel, title, score = false }) {
    if (loading) return <span className="overall-kartz-trend__empty">…</span>;
    if (!entries?.length) return <span className="overall-kartz-trend__empty">{emptyLabel}</span>;

    const width = 240;
    const height = 46;
    const maximum = Math.max(...entries.map((entry) => entry.rank), 1);
    const points = entries.map((entry, index) => {
        const x = entries.length === 1 ? width / 2 : index / (entries.length - 1) * width;
        const y = 4 + ((entry.rank - 1) / Math.max(1, maximum - 1)) * (height - 8);
        return `${x},${y}`;
    }).join(" ");
    const latest = entries.at(-1);

    return (
        <div className="overall-kartz-trend">
            <div><b>{title}</b><span>{entries.length} · {latest.month} #{latest.rank}{score && latest.score ? ` · ${latest.score.toLocaleString()}` : ""}</span></div>
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: ${latest.month} #${latest.rank}`} preserveAspectRatio="none">
                <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
                {entries.map((entry, index) => {
                    const [cx, cy] = points.split(" ")[index].split(",");
                    return <circle key={`${entry.month}-${index}`} cx={cx} cy={cy} r="2.3"><title>{entry.month} · #{entry.rank}{entry.round ? ` · R${entry.round}` : ""}{entry.score ? ` · ${entry.score.toLocaleString()}` : ""}</title></circle>;
                })}
            </svg>
            <div className="overall-kartz-trend__axis"><span>{entries[0].month}</span><span>{latest.month}</span></div>
            <div className="overall-kartz-trend__values">
                {entries.map((entry) => (
                    <span key={entry.month} title={`${entry.month}${entry.round ? ` · R${entry.round}` : ""}${entry.score ? ` · ${entry.score.toLocaleString()}` : ""}`}>
                        <small>{entry.month.slice(2)}</small>
                        <b>#{entry.rank}</b>
                    </span>
                ))}
            </div>
        </div>
    );
}
