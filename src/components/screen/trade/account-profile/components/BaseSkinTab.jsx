import SectionHeading from "./SectionHeading";

export default function BaseSkinTab({ baseSkins }) {
    const safeBases = baseSkins || {};
    const groups = safeBases.groups || [];

    return (
        <>
            <SectionHeading
                title="Base Skin"
                subtitle="Permanent base and major buff bases in the same order as the sale text."
                badge={safeBases.featured?.[0] || "Base"}
            />
            <div className="account-profile-readable-stack">
                {groups.map((group) => (
                    <section className="account-profile-readable-section" key={group.title}>
                        <h2>{group.title}</h2>
                        <ul className="account-profile-readable-list">
                            {(group.items || []).map((item) => <li key={item}>{item}</li>)}
                        </ul>
                    </section>
                ))}
            </div>
        </>
    );
}
