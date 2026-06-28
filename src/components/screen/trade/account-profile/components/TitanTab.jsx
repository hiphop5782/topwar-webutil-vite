import SectionHeading from "./SectionHeading";

export default function TitanTab({ titans }) {
    return (
        <>
            <SectionHeading
                title="타이탄"
                subtitle="주력 타이탄과 보조 타이탄의 역할, 파츠, 옵션을 빠르게 비교합니다."
                badge={`${titans?.length || 0} Titans`}
            />
            <div className="account-profile-card-grid">
                {(titans || []).map((titan) => (
                    <article className="account-profile-titan-card" key={titan.name}>
                        <div className="account-profile-titan-head">
                            <span>{titan.grade}</span>
                            <h3>{titan.name}</h3>
                            <strong>{titan.role}</strong>
                        </div>
                        <div className="account-profile-list-panel">
                            {titan.parts.map((part) => <span key={part}>{part}</span>)}
                        </div>
                        <div className="account-profile-chip-row">
                            {titan.options.map((option) => <span key={option}>{option}</span>)}
                        </div>
                    </article>
                ))}
            </div>
        </>
    );
}
