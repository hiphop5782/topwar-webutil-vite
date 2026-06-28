export default function SectionHeading({ title, subtitle, badge }) {
    return (
        <div className="account-profile-section-heading">
            <div>
                <h2>{title}</h2>
                {subtitle ? <p>{subtitle}</p> : null}
            </div>
            {badge ? <span className="account-profile-badge">{badge}</span> : null}
        </div>
    );
}
