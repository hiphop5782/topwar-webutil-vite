import { formatStatValue } from "../utils/formatPower";

const STAT_ITEMS = [
    ["TP", "tp"],
    ["MS", "ms"],
    ["HP", "hp"],
    ["ATK", "atk"],
    ["DMG+", "dmgPlus"],
    ["DMG-", "dmgMinus"],
    ["DEF", "def"],
];

export default function StatGrid({ stats }) {
    const safeStats = stats || {};

    return (
        <div className="account-profile-stat-grid">
            {STAT_ITEMS.map(([label, key]) => (
                <div className="account-profile-stat-item" key={key}>
                    <span className="account-profile-stat-label">{label}</span>
                    <strong className="account-profile-stat-value">
                        {formatStatValue(safeStats[key])}
                    </strong>
                </div>
            ))}
        </div>
    );
}
