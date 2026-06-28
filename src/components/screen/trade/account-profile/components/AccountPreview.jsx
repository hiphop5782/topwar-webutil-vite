import CollectionPanel from "./CollectionPanel";
import FormationCard from "./FormationCard";
import PlayerHeader from "./PlayerHeader";

export default function AccountPreview({ account }) {
    const safeAccount = account || {};
    const formations = Array.isArray(safeAccount.formations)
        ? safeAccount.formations
        : [];

    return (
        <section className="account-profile-preview">
            <PlayerHeader player={safeAccount.player} />
            <CollectionPanel collections={safeAccount.collections} />
            <div className="account-profile-formation-list">
                {formations.length > 0 ? (
                    formations.map((formation, index) => (
                        <FormationCard
                            formation={formation}
                            key={formation?.id || `${formation?.name || "formation"}-${index}`}
                        />
                    ))
                ) : (
                    <div className="account-profile-empty-preview">
                        표시할 편성 데이터가 없습니다.
                    </div>
                )}
            </div>
        </section>
    );
}
