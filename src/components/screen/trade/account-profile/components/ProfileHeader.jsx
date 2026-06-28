export default function ProfileHeader({ profile }) {
    const safeProfile = profile || {};

    return (
        <header className="account-profile-hero">
            <div className="account-profile-avatar">TW</div>
            <div className="account-profile-hero-main">
                <div className="account-profile-title-row">
                    <h1 className="account-profile-title">{safeProfile.title || "Account Showcase"}</h1>
                    <span className="account-profile-badge account-profile-badge-gold">
                        {safeProfile.tags?.[0] || "Viewer"}
                    </span>
                </div>
                <div className="account-profile-metrics">
                    <div className="account-profile-metric">
                        <span>Account CP</span>
                        <strong>{safeProfile.accountCp || safeProfile.level || "-"}</strong>
                    </div>
                    <div className="account-profile-metric">
                        <span>Server</span>
                        <strong>{safeProfile.server || "-"}</strong>
                    </div>
                    <div className="account-profile-metric">
                        <span>Morale</span>
                        <strong>{safeProfile.morale || "-"}</strong>
                    </div>
                    <div className="account-profile-metric">
                        <span>Sale</span>
                        <strong>{safeProfile.saleNote || "OBO"}</strong>
                    </div>
                </div>
            </div>
            <aside className="account-profile-price-card">
                <span>ACCOUNT TYPE</span>
                <strong>PVP</strong>
                <small>{safeProfile.privacyNote || "Private data hidden"}</small>
            </aside>
        </header>
    );
}
