export default function SummaryDashboard({ account }) {
    const branchPower = account?.summary?.branchPower || [];
    const highlights = account?.summary?.highlights || [];

    return (
        <section className="account-profile-summary-dashboard account-profile-readable-summary">
            <div className="account-profile-readable-facts">
                <div>
                    <span>Price</span>
                    <strong>{account?.profile?.price || "-"}</strong>
                </div>
                <div>
                    <span>Account</span>
                    <strong>{account?.profile?.accountCp || "-"} CP</strong>
                    <em>{account?.profile?.server || "-"} / Morale {account?.profile?.morale || "-"}</em>
                </div>
                {branchPower.map((item) => (
                    <div key={item.branch}>
                        <span>{item.branch}</span>
                        <strong>{item.topCp}</strong>
                        <em>March Size {item.marchSize || "-"} / {item.count} marches</em>
                    </div>
                ))}
            </div>
            <div className="account-profile-readable-bullets">
                {highlights.map((item) => <span key={item}>{item}</span>)}
            </div>
        </section>
    );
}
