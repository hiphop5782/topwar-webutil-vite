import { useMemo, useState } from "react";
import { t } from "i18next";
import JobData from "@src/assets/json/job.json";
import SEO from "../../template/SEO";
import "./JobInformation.css";

const JOBS = [
    ["CL", "전투 정예", "Combat Elite"],
    ["MM", "기계 전문가", "Mechanic Master"],
];
const EMPTY = { oil: 0, food: 0, item: 0, core: 0, seconds: 0 };

function timeToSeconds(value = "") {
    const [d = 0, h = 0, m = 0, s = 0] = value.match(/\d+/g)?.map(Number) || [];
    return (((d * 24 + h) * 60 + m) * 60) + s;
}

function formatTime(value) {
    const d = Math.floor(value / 86400);
    const h = Math.floor((value % 86400) / 3600);
    const m = Math.floor((value % 3600) / 60);
    return [d && `${d}일`, h && `${h}시간`, m && `${m}분`].filter(Boolean).join(" ") || "0분";
}

function totalOf(upgrades) {
    return upgrades.reduce((sum, item) => ({
        oil: sum.oil + (item.oil || 0),
        food: sum.food + (item.food || 0),
        item: sum.item + (item.item || 0),
        core: sum.core + (item.core || 0),
        seconds: sum.seconds + timeToSeconds(item.time),
    }), { ...EMPTY });
}

function JobInformation() {
    const [job, setJob] = useState("CL");
    const [skill, setSkill] = useState(null);
    const [selectedLevels, setSelectedLevels] = useState([]);
    const [plans, setPlans] = useState([]);
    const numbers = useMemo(() => new Intl.NumberFormat("ko-KR"), []);
    const compact = useMemo(() => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }), []);
    const upgrades = useMemo(
        () => skill?.upgrades.filter(item => selectedLevels.includes(item.level)) || [],
        [skill, selectedLevels]
    );
    const total = useMemo(() => totalOf(upgrades), [upgrades]);
    const grandTotal = useMemo(() => totalOf(plans.flatMap(plan => plan.upgrades)), [plans]);

    const chooseSkill = (row, item) => {
        setSkill({ ...item, row });
        setSelectedLevels([]);
    };
    const changeJob = next => {
        setJob(next);
        setSkill(null);
        setPlans([]);
    };
    const addPlan = () => {
        const key = `${job}-${skill.row}-${skill.col}`;
        const plan = { key, name: skill.name[job], levels: selectedLevels, upgrades, total };
        setPlans(previous => [...previous.filter(item => item.key !== key), plan]);
    };
    const toggleLevel = level => {
        setSelectedLevels(previous => previous.includes(level)
            ? previous.filter(item => item !== level)
            : [...previous, level].sort((a, b) => a - b));
    };
    const resourceCards = value => (
        <div className="job-resources">
            <Resource label="직업 연구서" value={numbers.format(value.item)} />
            {value.core > 0 && <Resource label="코어" value={numbers.format(value.core)} />}
            <Resource label="석유" value={compact.format(value.oil)} title={numbers.format(value.oil)} />
            <Resource label="식량" value={compact.format(value.food)} title={numbers.format(value.food)} />
            <Resource wide label="총 연구 시간" value={formatTime(value.seconds)} />
        </div>
    );

    return <>
        <SEO title={t("seo:information.job.title")}/>
        <main className="job-page">
            <header className="job-header">
                <div><h1>전문 직업 강화 계산기</h1><p>필요한 강화 레벨을 선택해 자원 소모량을 계산해 보세요.</p></div>
                <div className="job-switcher" aria-label="직업 선택">
                    {JOBS.map(([value, label, english]) => <button key={value} type="button" className={job === value ? "active" : ""} aria-pressed={job === value} onClick={() => changeJob(value)}><strong>{label}</strong><small>{english}</small></button>)}
                </div>
            </header>

            <div className="job-workspace">
                <section className="job-card job-tree">
                    <Heading step="STEP 1" title="스킬 선택" description="계산할 스킬을 눌러주세요." />
                    {JobData.map(row => <div className="job-row" key={row.row}>
                        <span>{row.row}행</span>
                        <div>{[1, 2, 3].map(column => {
                            const item = row.items.find(candidate => candidate.col === column);

                            if (!item) {
                                return <span className="job-skill-slot-empty" key={column} aria-hidden="true" />;
                            }

                            const active = skill?.row === row.row && skill?.col === item.col;
                            return <button type="button" key={column} className={active ? "active" : ""} aria-pressed={active} onClick={() => chooseSkill(row.row, item)}>
                                <img src={`${import.meta.env.VITE_PUBLIC_URL}/images/job/${job}-${row.row}-${item.col}.png`} alt="" />
                                <b>{item.name[job]}</b>
                            </button>;
                        })}</div>
                    </div>)}
                </section>

                <aside className={`job-card job-calculator ${skill ? "active" : ""}`} aria-label="강화 구간 계산기">
                    {skill ? <>
                        <button className="job-close" type="button" onClick={() => setSkill(null)} aria-label="닫기">×</button>
                        <div className="job-skill-title">
                            <img src={`${import.meta.env.VITE_PUBLIC_URL}/images/job/${job}-${skill.row}-${skill.col}.png`} alt="" />
                            <div><small>{skill.row}행 스킬</small><h2>{skill.name[job]}</h2><p>{skill.explain[job]}</p></div>
                        </div>
                        <section className="job-details job-level-costs">
                            <Heading step="LEVEL COST" title="전체 레벨별 소모량" />
                            <div><table><thead><tr><th><input type="checkbox" aria-label="전체 레벨 선택" checked={selectedLevels.length === skill.upgrades.length} onChange={event => setSelectedLevels(event.target.checked ? skill.upgrades.map(item => item.level) : [])} /></th><th>레벨</th><th>직상</th><th>석유</th><th>식량</th>{skill.upgrades.some(item => item.core !== undefined) && <th>코어</th>}<th>시간</th></tr></thead><tbody>
                                {skill.upgrades.map(item => {
                                    const selected = selectedLevels.includes(item.level);
                                    return <tr key={item.level} className={selected ? "selected" : ""} onClick={() => toggleLevel(item.level)}><td><input type="checkbox" aria-label={`레벨 ${item.level} 선택`} checked={selected} onClick={event => event.stopPropagation()} onChange={() => toggleLevel(item.level)} /></td><td>Lv.{item.level}</td><td>{numbers.format(item.item)}</td><td title={numbers.format(item.oil)}>{compact.format(item.oil)}</td><td title={numbers.format(item.food)}>{compact.format(item.food)}</td>{skill.upgrades.some(upgrade => upgrade.core !== undefined) && <td>{numbers.format(item.core || 0)}</td>}<td>{item.time}</td></tr>;
                                })}
                            </tbody></table></div>
                        </section>
                        {selectedLevels.length > 0 && <section className="job-selection-total"><h3>선택 합계</h3>{resourceCards(total)}</section>}
                        <button type="button" className="job-add" onClick={addPlan} disabled={selectedLevels.length === 0}>강화 계획에 추가</button>
                    </> : <div className="job-empty"><h2>스킬을 선택해 주세요</h2><p>레벨 행을 선택하면 필요한 자원의 합계를 확인할 수 있습니다.</p></div>}
                </aside>
            </div>

            <section className="job-card job-plans">
                <Heading step="PLAN" title={`강화 계획 (${plans.length})`} />
                {plans.length ? <>
                    <div className="job-plan-list">{plans.map(plan => <article key={plan.key}><div><strong>{plan.name}</strong><small>Lv. {plan.levels.join(", ")}</small></div><span>직상 {numbers.format(plan.total.item)}개</span><button type="button" onClick={() => setPlans(value => value.filter(item => item.key !== plan.key))} aria-label={`${plan.name} 삭제`}>×</button></article>)}</div>
                    <div className="job-grand-total"><div className="job-grand-title"><h3>전체 필요량</h3><button type="button" onClick={() => setPlans([])}>전체 삭제</button></div>{resourceCards(grandTotal)}</div>
                </> : <p className="job-plan-empty">계산 결과를 계획에 추가하면 여러 스킬의 전체 필요량을 확인할 수 있습니다.</p>}
            </section>
        </main>
        {skill && <button type="button" className="job-backdrop" onClick={() => setSkill(null)} aria-label="계산기 닫기" />}
    </>;
}

function Heading({ step, title, description }) {
    return <div className="job-heading"><div><span>{step}</span><h2>{title}</h2></div>{description && <small>{description}</small>}</div>;
}

function Resource({ label, value, title, wide = false }) {
    return <div className={`job-resource ${wide ? "wide" : ""}`}><span>{label}</span><strong title={title}>{value}</strong></div>;
}

export default JobInformation;
