import SectionHeading from "./SectionHeading";

export default function BeastTab({ beasts }) {
    return (
        <>
            <SectionHeading
                title="Beast"
                subtitle="원문처럼 Beast 이름, Tier, specialization 값을 한 줄씩 확인합니다."
                badge="Beast"
            />
            <section className="account-profile-readable-sheet">
                <ul className="account-profile-readable-list account-profile-readable-list-large">
                    {(beasts || []).map((beast) => (
                        <li key={beast.name}>
                            <strong>{beast.name} {beast.tier || ""}</strong>: {(beast.slots || []).join("/") || beast.specialization || "-"}
                        </li>
                    ))}
                </ul>
            </section>
        </>
    );
}
