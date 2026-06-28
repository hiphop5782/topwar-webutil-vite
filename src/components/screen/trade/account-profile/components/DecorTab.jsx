import SectionHeading from "./SectionHeading";

export default function DecorTab({ decors }) {
    const groups = decors?.groups || [];

    return (
        <>
            <SectionHeading
                title="Queue / Decor"
                subtitle="Queue skin level and queue lineup as compact text sections."
                badge="Queue Skin Lv.23"
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
