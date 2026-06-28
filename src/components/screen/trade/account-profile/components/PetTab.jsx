import SectionHeading from "./SectionHeading";

export default function PetTab({ pets }) {
    const featured = pets?.featured || {};

    return (
        <>
            <SectionHeading
                title="동물 / 펫"
                subtitle="핵심 펫 옵션과 지역 슬롯을 분리해서 확인합니다."
                badge={`${pets?.summary?.gold || 0} Gold Pets`}
            />
            <article className="account-profile-pet-hero">
                <div className="account-profile-pet-image-wrap">
                    {featured.image ? <img src={featured.image} alt={featured.name} /> : null}
                </div>
                <div className="account-profile-pet-detail">
                    <span>{featured.rank || "PET"}</span>
                    <h3>{featured.name || "Featured Pet"}</h3>
                    <div className="account-profile-chip-row">
                        <span>Potential {featured.potential || "-"}</span>
                        <span>{featured.stars || "-"}</span>
                        <span>Power {featured.power || "-"}</span>
                    </div>
                    <div className="account-profile-option-list">
                        {(featured.options || []).map(([label, value]) => (
                            <div key={label}>
                                <span>{label}</span>
                                <strong>{value}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </article>
            <div className="account-profile-pet-zone-grid">
                {(pets?.zones || []).map((zone) => (
                    <article className="account-profile-zone-card" key={zone.name}>
                        <div className="account-profile-zone-head">
                            <strong>{zone.name}</strong>
                            <span>{zone.levels.length} Slots</span>
                        </div>
                        <div className="account-profile-zone-slots">
                            {zone.levels.map((level, index) => (
                                <span className={level === 0 ? "account-profile-slot-zero" : ""} key={`${zone.name}-${index}`}>
                                    Lv.{level}
                                </span>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
        </>
    );
}
