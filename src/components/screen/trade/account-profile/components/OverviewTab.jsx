import SectionHeading from "./SectionHeading";

const TAB_LINKS = [
    { tab: "troops", label: "Troops", text: "Navy Main, Navy 2, Army" },
    { tab: "formation", label: "Formation + Beast", text: "Tech and beast specialization" },
    { tab: "inventory", label: "Enigma + Items", text: "Mothership, shards, tickets, resources" },
    { tab: "bases", label: "Base + Queue", text: "Permanent base, buff bases, queue skin" },
];

export default function OverviewTab({ account, onSelectTab }) {
    const highlights = account?.summary?.highlights || [];
    const branches = account?.branches || [];

    return (
        <>
            <SectionHeading
                title="Readable Summary"
                subtitle="원문 판매글처럼 위에서 아래로 빠르게 훑는 요약입니다. 상세는 아래 버튼이나 탭에서 봅니다."
                badge="For Sale"
            />
            <section className="account-profile-readable-sheet">
                <header className="account-profile-readable-sheet-head">
                    <span>{account?.profile?.accountCp || "-"} CP | {account?.profile?.server || "-"} | Morale {account?.profile?.morale || "-"}</span>
                    <strong>{account?.profile?.price || "-"}</strong>
                    <em>{account?.profile?.saleNote || ""}</em>
                </header>
                <div className="account-profile-readable-two-column">
                    <section>
                        <h3>Highlights</h3>
                        <ul className="account-profile-readable-list">
                            {highlights.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                    </section>
                    <section>
                        <h3>Main Marches</h3>
                        <ul className="account-profile-readable-list">
                            {branches.flatMap((branch) => branch.marches || []).map((march) => (
                                <li key={march.name}>
                                    <strong>{march.name} {march.cp}</strong> · March Size {march.marchSize || "-"}
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </section>
            <section className="account-profile-readable-link-row">
                {TAB_LINKS.map((item) => (
                    <button type="button" key={item.tab} onClick={() => onSelectTab(item.tab)}>
                        <strong>{item.label}</strong>
                        <span>{item.text}</span>
                    </button>
                ))}
            </section>
        </>
    );
}
