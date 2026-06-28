export default function TabNavigation({ tabs, activeTab, onChange }) {
    return (
        <nav className="account-profile-tabs" aria-label="Account profile sections">
            {tabs.map((tab) => (
                <button
                    className="account-profile-tab"
                    type="button"
                    aria-selected={activeTab === tab.id}
                    onClick={() => onChange(tab.id)}
                    key={tab.id}
                >
                    {tab.label}
                </button>
            ))}
        </nav>
    );
}
