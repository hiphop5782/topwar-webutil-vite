import SectionHeading from "./SectionHeading";

export default function FormationTab({ formation }) {
    const nodes = formation?.nodes || [];

    return (
        <>
            <SectionHeading
                title="Formation"
                subtitle="Formation tech values are shown as one readable line first, then as a short list."
                badge="Tech"
            />
            <section className="account-profile-readable-sheet">
                <header className="account-profile-readable-sheet-head">
                    <span>Tech</span>
                    <strong>{nodes.map((node) => node.level).join(" / ") || "-"}</strong>
                </header>
                <ul className="account-profile-readable-list account-profile-readable-list-grid">
                    {nodes.map((node) => <li key={node.name}>{node.name}: Lv.{node.level || "-"}</li>)}
                </ul>
            </section>
        </>
    );
}
