export default function HeroCard({ hero, index }) {
    return (
        <div className="account-profile-hero-card">
            <div className="account-profile-hero-rank">{index + 1}</div>
            <div className="account-profile-hero-name">{hero || "Empty Slot"}</div>
        </div>
    );
}
