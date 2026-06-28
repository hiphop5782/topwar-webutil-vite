import SectionHeading from "./SectionHeading";

function MarchSection({ march, type }) {
    const stats = march?.stats || {};

    return (
        <article className={`account-profile-readable-march account-profile-branch-${type}`}>
            <header>
                <h3>{march?.name || "March"} — {march?.cp || "-"}</h3>
                <span>March Size {march?.marchSize || "-"}</span>
            </header>
            <p className="account-profile-readable-heroes">{(march?.heroes || []).join(" · ") || "-"}</p>
            <p className="account-profile-readable-note">{march?.skill || "-"}</p>
            <div className="account-profile-readable-stat-lines">
                <span>HP {stats.hp || "-"}</span>
                <span>ATK {stats.atk || "-"}</span>
                <span>DMG+ {stats.dmgPlus || "-"}</span>
                <span>DMG- {stats.dmgMinus || "-"}</span>
                <span>DEF {stats.def || "-"}</span>
            </div>
            {(march?.badges || []).length ? (
                <div className="account-profile-readable-badges">
                    {march.badges.map((badge) => <span key={badge}>{badge}</span>)}
                </div>
            ) : null}
        </article>
    );
}

export default function MarchTab({ branches }) {
    return (
        <>
            <SectionHeading
                title="Troops"
                subtitle="원문처럼 부대별로 CP, 영웅, 각성, March Size, 스탯을 한 덩어리로 읽습니다."
                badge="No Buffs"
            />
            <div className="account-profile-readable-stack">
                {(branches || []).map((branch) => (
                    <section className="account-profile-readable-section" key={branch.type}>
                        <h2>{branch.label}</h2>
                        <p>
                            Mastery {branch.mastery || "-"} | Equipment {branch.equipment || "-"} | Suppression {branch.suppression || "-"}
                        </p>
                        <div className="account-profile-readable-march-list">
                            {(branch.marches || []).map((march) => (
                                <MarchSection march={march} type={branch.type} key={march.name} />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </>
    );
}
