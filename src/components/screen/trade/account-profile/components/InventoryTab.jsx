import SectionHeading from "./SectionHeading";

export default function InventoryTab({ inventory, enigma }) {
    return (
        <>
            <SectionHeading
                title="Enigma / Inventory"
                subtitle="Enigma, mothership, shards, tickets, resources, and sale terms in compact text sections."
                badge="Details"
            />
            <div className="account-profile-readable-stack">
                <section className="account-profile-readable-section">
                    <h2>Enigma</h2>
                    <ul className="account-profile-readable-list">
                        {(enigma || []).map((field) => (
                            <li key={field.name}><strong>{field.name}</strong>: {field.levels}</li>
                        ))}
                    </ul>
                </section>
                {(inventory || []).map((group) => (
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
