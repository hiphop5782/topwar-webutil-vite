import "./DataLoadingPlaceholder.css";

export default function DataLoadingPlaceholder({
    rows = 6,
    cards = 0,
    compact = false,
    className = "",
}) {
    return (
        <div
            className={`data-loading-placeholder ${
                compact ? "is-compact" : ""
            } ${className}`.trim()}
            role="status"
            aria-live="polite"
            aria-label="Loading data"
        >
            {cards > 0 && (
                <div className="data-placeholder-cards">
                    {Array.from({ length: cards }, (_, index) => (
                        <span key={index} className="data-placeholder-card" />
                    ))}
                </div>
            )}

            <span className="data-placeholder-title" />

            <div className="data-placeholder-rows">
                {Array.from({ length: rows }, (_, index) => (
                    <span
                        key={index}
                        className="data-placeholder-row"
                        style={{
                            "--placeholder-width": `${92 - (index % 3) * 9}%`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
