export default function CollectionPanel({ collections }) {
    const items = Array.isArray(collections) ? collections : [];

    if (items.length === 0) {
        return null;
    }

    return (
        <section className="account-profile-collection-panel">
            {items.map((item, index) => (
                <div className="account-profile-collection-item" key={`${item?.label || "collection"}-${index}`}>
                    <span className="account-profile-collection-label">{item?.label || "Info"}</span>
                    <strong className="account-profile-collection-value">{item?.value ?? "-"}</strong>
                </div>
            ))}
        </section>
    );
}
