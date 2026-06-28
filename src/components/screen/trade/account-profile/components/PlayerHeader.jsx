import { formatPower } from "../utils/formatPower";

export default function PlayerHeader({ player }) {
    const safePlayer = player || {};

    return (
        <header className="account-profile-player-header">
            <div>
                <span className="account-profile-eyebrow">Top War Account</span>
                <h2 className="account-profile-player-name">
                    {safePlayer.nickname || "Unknown Player"}
                </h2>
            </div>
            <div className="account-profile-player-meta">
                <span>Server {safePlayer.server || "-"}</span>
                <span>VIP {safePlayer.vip || "-"}</span>
                <span>Power {formatPower(safePlayer.power)}</span>
            </div>
        </header>
    );
}
