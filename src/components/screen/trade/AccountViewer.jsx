import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FaBolt,
    FaBoxesStacked,
    FaBuilding,
    FaCat,
    FaChevronDown,
    FaCircleExclamation,
    FaCopy,
    FaDownload,
    FaGaugeHigh,
    FaGear,
    FaMedal,
    FaShieldHalved,
    FaStar,
    FaUpload,
    FaUsers,
    FaWandMagicSparkles,
} from "react-icons/fa6";
import "./AccountViewer.css";

const ANALYZE_URL = "https://server.progamer.info/api/account/analyze";

const BRANCH = {
    army: { label: "육군", icon: "🪖" },
    navy: { label: "해군", icon: "⚓" },
    air: { label: "공군", icon: "🦅" },
    other: { label: "기타", icon: "⚔️" },
};

const SECTION_META = {
    bases: { title: "기지 컬렉션", icon: FaBuilding },
    queues: { title: "대열", icon: FaUsers },
    formations: { title: "군진", icon: FaShieldHalved },
    decorations: { title: "장식", icon: FaStar },
    pets: { title: "초능력 동물", icon: FaCat },
    enigmaFields: { title: "초능력 영역", icon: FaWandMagicSparkles },
    heavyTroopers: { title: "중장비", icon: FaGear },
    weaponRemodeling: { title: "무기 개조", icon: FaBolt },
    specialization: { title: "전문 강화 및 파츠", icon: FaGaugeHigh },
    inventory: { title: "주요 아이템", icon: FaBoxesStacked },
    tradeTerms: { title: "거래 조건", icon: FaMedal },
};

function visible(value) {
    return value !== null && value !== undefined && value !== "";
}

function formatValue(value) {
    if (!visible(value)) return null;
    if (typeof value === "boolean") return value ? "예" : "아니오";
    if (typeof value === "number") return value.toLocaleString();
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(formatValue).filter(Boolean).join(" · ");
    return Object.entries(value)
        .filter(([, item]) => visible(item) && (!Array.isArray(item) || item.length))
        .map(([key, item]) => `${key}: ${formatValue(item)}`)
        .join(" · ");
}

function hasContent(value) {
    if (!visible(value) || value?.public === false) return false;
    if (Array.isArray(value)) return value.some(hasContent);
    if (typeof value === "object") {
        return Object.entries(value).some(([key, item]) => key !== "public" && hasContent(item));
    }
    return true;
}

function Metric({ label, value, featured = false }) {
    if (!visible(value)) return null;
    return <div className={`av-metric${featured ? " av-metric-featured" : ""}`}><span>{label}</span><strong>{formatValue(value)}</strong></div>;
}

function HeroCard({ hero }) {
    const name = String(hero?.name || "이름 미상").replace(/\s*\(\d+\)\s*$/, "");
    return <article className="av-hero-card">
        <div className="av-hero-avatar">{name.slice(0, 1).toUpperCase()}</div>
        <div className="av-hero-copy"><strong>{name}</strong><div className="av-hero-tags">
            {visible(hero?.stars) && <span><FaStar /> {hero.stars}성</span>}
            {visible(hero?.awakeningLevel) && <span>각성 {hero.awakeningLevel}</span>}
            {!!hero?.skillLevels?.length && <span>스킬 {hero.skillLevels.join("/")}</span>}
        </div></div>
    </article>;
}

function MarchCard({ march, index }) {
    const branchKey = BRANCH[march?.branch] ? march.branch : "other";
    const branch = BRANCH[branchKey];
    const stats = [
        ["HP", march?.stats?.hp], ["ATK", march?.stats?.atk], ["DEF", march?.stats?.def],
        ["DMG+", march?.stats?.dmgPlus], ["DMG-", march?.stats?.dmgMinus],
    ].filter(([, value]) => visible(value));

    return <article className={`av-march av-${branchKey}`}>
        <header className="av-march-head">
            <div className="av-branch-mark"><span>{branch.icon}</span><div><small>{march?.order === "secondary" ? "SECONDARY" : `MARCH ${index + 1}`}</small><h3>{march?.name || branch.label}</h3></div></div>
            <div className="av-power"><span>COMBAT POWER</span><strong>{formatValue(march?.power) || "-"}</strong></div>
        </header>
        <div className="av-march-facts">
            <Metric label="출정 크기" value={march?.marchSize} featured />
            <Metric label="마스터리" value={march?.mastery} />
            <Metric label="장비 개조" value={march?.equipmentRemold} />
            <Metric label="제압" value={march?.suppression} />
        </div>
        {!!march?.heroes?.length && <div className="av-heroes">{march.heroes.filter((hero) => hasContent(hero)).map((hero, heroIndex) => <HeroCard hero={hero} key={`${hero.name}-${heroIndex}`} />)}</div>}
        {!!stats.length && <div className="av-stats">{stats.map(([label, value]) => <div key={label}><span>{label}</span><strong>{formatValue(value)}{typeof value === "number" ? "%" : ""}</strong></div>)}</div>}
        <div className="av-flags">
            {visible(march?.noBuffs) && <span className="av-flag av-good">버프 미적용</span>}
            {visible(march?.confidence) && <span className="av-flag">분석 신뢰도 {Math.round(Number(march.confidence) * 100)}%</span>}
            {march?.titan && <span className="av-flag av-gold">타이탄 {formatValue(march.titan.name || march.titan.rawText)}</span>}
        </div>
        {!!march?.notes?.length && <ul className="av-notes">{march.notes.map((note, noteIndex) => <li key={`${note}-${noteIndex}`}>{formatValue(note)}</li>)}</ul>}
    </article>;
}

function ValueList({ value, path = "root" }) {
    if (!hasContent(value)) return null;
    if (Array.isArray(value)) return <div className="av-value-list">{value.map((item, index) => typeof item === "object" ? <ValueList value={item} path={`${path}-${index}`} key={`${path}-${index}`} /> : <span className="av-value-chip" key={`${path}-${index}`}>{formatValue(item)}</span>)}</div>;
    if (typeof value !== "object") return <span className="av-value-chip">{formatValue(value)}</span>;
    return <div className="av-object-grid">{Object.entries(value).filter(([key, item]) => key !== "public" && hasContent(item)).map(([key, item]) => <div className="av-object-row" key={`${path}-${key}`}><span>{key}</span>{typeof item === "object" ? <ValueList value={item} path={`${path}-${key}`} /> : <strong>{formatValue(item)}</strong>}</div>)}</div>;
}

const BASIC_FORMATION_META = {
    fullDefense: { label: "전면방어", max: 60 },
    defense: { label: "방어", max: 30 },
    assault: { label: "돌격", max: 15 },
    fortified: { label: "철벽", max: 15 },
    swift: { label: "스위프트", max: 120 },
};

const SPECIAL_FORMATION_META = {
    shark: { label: "샤크 군진", image: "/images/account-profile/formation-shark.png" },
    scorpion: { label: "스콜피온 군진", image: "/images/account-profile/formation-scorpion.png" },
    eagle: { label: "이글 군진", image: "/images/account-profile/formation-eagle.png" },
};

const BASIC_FORMATION_POSITIONS = {
    fullDefense: "top-left",
    assault: "top-right",
    defense: "bottom-left",
    fortified: "bottom-right",
    swift: "bottom-center",
};

const ENIGMA_SLOT_POSITIONS = {
    1: [[69, 15], [18, 29], [51, 49], [82, 67], [34, 82]],
    2: [[58, 15], [85, 32], [51, 49], [16, 39], [19, 70], [82, 65], [48, 85]],
    3: [[54, 15], [82, 31], [50, 52], [18, 37], [23, 75], [75, 78]],
    4: [[27, 16], [56, 11], [83, 22], [19, 42], [51, 41], [81, 46], [55, 67], [20, 82], [80, 83]],
    5: [[27, 13], [56, 22], [83, 28], [18, 41], [50, 55], [81, 51], [21, 76], [52, 87], [80, 75]],
};

function slotIndexesFor(swiftLevel, valueCount) {
    if (valueCount >= 9 || Number(swiftLevel) >= 80) return [1, 2, 3, 4, 5, 6, 7, 8, 9];
    if (valueCount === 8 || Number(swiftLevel) >= 60) return [1, 2, 3, 4, 5, 6, 7, 8];
    if (valueCount === 7 || Number(swiftLevel) >= 40) return [1, 2, 3, 4, 5, 6, 8];
    if (valueCount === 6 || Number(swiftLevel) >= 20) return [1, 2, 3, 4, 5, 8];
    return [1, 2, 3, 5, 8].slice(0, valueCount || 5);
}

function normalizeFormationSlots(slotLevels, swiftLevel) {
    const values = Array.isArray(slotLevels) ? slotLevels : [];
    const explicitSlots = values.every((slot) => slot && typeof slot === "object");
    if (explicitSlots) {
        return Array.from({ length: 9 }, (_, offset) => {
            const index = offset + 1;
            const found = values.find((slot) => Number(slot.index ?? slot.slot) === index);
            return { index, active: found?.active !== false && visible(found?.level), level: found?.level ?? null };
        });
    }
    const indexes = slotIndexesFor(swiftLevel, values.length);
    const byIndex = new Map(indexes.map((index, offset) => [index, values[offset]]));
    return Array.from({ length: 9 }, (_, offset) => {
        const index = offset + 1;
        return { index, active: byIndex.has(index), level: byIndex.get(index) ?? null };
    });
}

function BasicFormationBoard({ formations }) {
    const basic = Array.isArray(formations?.basic) ? formations.basic : [];
    const legacy = Array.isArray(formations?.items) ? formations.items : [];
    if (!basic.length && !legacy.length) return null;
    const totalLevel = basic.reduce((sum, item) => sum + (Number(item?.level) || 0), 0);
    return <div className="av-basic-formation">
        <div className="av-basic-formation-image">
            <img src="/images/account-profile/formation-basic-blank.png" alt="일반 군진 노드 배치" />
            {basic.map((item, index) => {
                const meta = BASIC_FORMATION_META[item?.type] || { label: item?.name || "군진" };
                const position = BASIC_FORMATION_POSITIONS[item?.type];
                if (!position) return null;
                const max = Number(item?.maxLevel ?? meta.max);
                const level = Number(item?.level);
                const isMax = Number.isFinite(level) && Number.isFinite(max) && level >= max;
                return <div className={`av-basic-node av-basic-node-${position}${isMax ? " is-max" : ""}`} key={`${item?.type}-${index}`}><strong>Lv.{formatValue(item?.level) || "-"}{isMax && <em>MAX</em>}</strong><span>{item?.name || meta.label}</span></div>;
            })}
            {!!basic.length && <div className="av-basic-node av-basic-node-total"><strong>Lv.{formatValue(totalLevel)}</strong><span>군진 총 레벨</span></div>}
        </div>
        {!!legacy.length && <div className="av-basic--legacy">{legacy.map((item, index) => <span className="av-value-chip" key={`${item}-${index}`}>{formatValue(item)}</span>)}</div>}
    </div>;
}

function SpecialFormationCard({ formation, swiftLevel }) {
    const type = SPECIAL_FORMATION_META[formation?.type] ? formation.type : "shark";
    const meta = SPECIAL_FORMATION_META[type];
    const slots = normalizeFormationSlots(formation?.slots || formation?.slotLevels, swiftLevel);
    return <article className={`av-special-formation av-special-${type}`}>
        <header><img src={meta.image} alt={meta.label} /><div><span>SPECIAL FORMATION</span><h3>{formation?.name || meta.label}</h3><div className="av-special-badges">{visible(formation?.tierLevel) && <b className={Number(formation.tierLevel) >= 10 ? "is-max" : ""}>Tier {formatValue(formation.tierLevel)}{Number(formation.tierLevel) >= 10 && " · MAX"}</b>}{visible(formation?.formationLevel) && <b className={Number(formation.formationLevel) >= 50 ? "is-max" : ""}>군진 Lv.{formatValue(formation.formationLevel)}{Number(formation.formationLevel) >= 50 && " · MAX"}</b>}</div></div></header>
        <div className="av-slot-grid" aria-label={`${formation?.name || meta.label} 슬롯`}>
            {slots.map((slot) => <div className={`av-slot${slot.active ? " av-slot-active" : " av-slot-locked"}${Number(slot.level) >= 5 ? " is-max" : ""}${Number(slot.level) === 0 ? " is-zero" : ""}`} key={slot.index} title={`슬롯 ${slot.index} · ${slot.active ? `Lv.${formatValue(slot.level) || "-"}` : "잠금"}`}>
                <strong>{slot.active ? `Lv.${formatValue(slot.level) || "-"}` : ""}</strong>
                <div className="av-slot-pedestal" aria-hidden="true"><i /><i /><i /></div>
                <small>S{slot.index}</small>
                <span className="visually-hidden">{slot.active ? `활성, 레벨 ${formatValue(slot.level) || "미상"}` : "잠금"}</span>
            </div>)}
        </div>
        {!!formation?.formationPerks?.length && <div className="av-perks"><span>FORMATION PERK</span><div>{formation.formationPerks.map((perk, index) => <b key={`${formatValue(perk)}-${index}`}>{formatValue(perk)}</b>)}</div></div>}
        {!!formation?.notes?.length && <ul className="av-notes">{formation.notes.map((note, index) => <li key={`${note}-${index}`}>{formatValue(note)}</li>)}</ul>}
    </article>;
}

function FormationSection({ data }) {
    if (!hasContent(data)) return null;
    const basic = Array.isArray(data?.basic) ? data.basic : [];
    const swiftLevel = basic.find((item) => item?.type === "swift")?.level;
    const special = Array.isArray(data?.special) ? data.special : [];
    return <section className="av-formation-section">
        <div className="av-formation-heading"><div className="av-detail-icon"><FaShieldHalved /></div><div><span>FORMATION SYSTEM</span><h2>군진</h2><p>일반 군진 성장도와 특수 군진의 9개 슬롯을 한눈에 확인합니다.</p></div></div>
        <BasicFormationBoard formations={data} />
        {!!special.length && <div className="av-special-grid">{special.map((formation, index) => <SpecialFormationCard formation={formation} swiftLevel={swiftLevel} key={`${formation?.type}-${index}`} />)}</div>}
        {!!data?.notes?.length && <div className="av-formation-notes"><ValueList value={data.notes} path="formation-notes" /></div>}
    </section>;
}

function getEnigmaSlotLevels(item) {
    const source = item?.platformLevels || item?.slotLevels || item?.slots || [];
    if (!Array.isArray(source)) return [];
    return source.map((slot) => slot && typeof slot === "object" ? slot.level ?? slot.value : slot);
}

function normalizeEnigmaItems(data) {
    if (Array.isArray(data?.items) && data.items.length) return data.items;
    if (Array.isArray(data?.fields) && data.fields.length) return data.fields;
    if (Array.isArray(data?.areas) && data.areas.length) return data.areas;
    return [];
}

function EnigmaFieldSection({ data }) {
    const items = normalizeEnigmaItems(data);
    if (!items.length) return <ValueList value={data} path="enigmaFields" />;
    return <section className="av-enigma-section">
        <header><div className="av-detail-icon"><FaWandMagicSparkles /></div><div><span>ENIGMA FIELD</span><h2>초능력 영역</h2><p>영역별 실제 슬롯 배치와 강화 레벨</p></div></header>
        <div className="av-enigma-grid">{items.slice(0, 5).map((item, index) => {
            const area = Math.min(5, Math.max(1, Number(item?.area ?? item?.areaNumber ?? index + 1)));
            const positions = ENIGMA_SLOT_POSITIONS[area];
            const levels = getEnigmaSlotLevels(item);
            return <article className={`av-enigma-field av-enigma-field-${area}`} key={`${item?.name}-${index}`}>
                <div className="av-enigma-field-title"><span>{area}영역</span><strong>{item?.name || `초능력 영역 ${area}`}</strong>{item?.allSlotBonusesActivated === true && <b>전체 보너스 활성</b>}</div>
                <div className="av-enigma-map" aria-label={`${area}영역 슬롯 레벨`}>
                    {positions.map(([left, top], slotIndex) => <div className={`av-enigma-platform${visible(levels[slotIndex]) ? " is-active" : " is-empty"}`} style={{ left: `${left}%`, top: `${top}%` }} key={slotIndex}><strong>{visible(levels[slotIndex]) ? `Lv.${formatValue(levels[slotIndex])}` : "-"}</strong><small>S{slotIndex + 1}</small></div>)}
                </div>
                {visible(item?.rawText) && <p className="av-enigma-raw">{formatValue(item.rawText)}</p>}
            </article>;
        })}</div>
        {!!data?.notes?.length && <ValueList value={data.notes} path="enigma-notes" />}
    </section>;
}

function EnigmaBeastSection({ data }) {
    const items = Array.isArray(data?.items) ? data.items : [];
    if (!items.length) return <ValueList value={data} path="pets" />;
    return <section className="av-beast-section">
        <header><div className="av-detail-icon"><FaCat /></div><div><span>ENIGMA BEAST</span><h2>초능력 동물</h2></div></header>
        <div className="av-beast-grid">{items.map((item, index) => <article className="av-beast-card" key={`${item?.name}-${index}`}><div className="av-beast-mark">✦</div><div><h3>{item?.name || "이름 미상"}</h3><div className="av-beast-badges">{visible(item?.count) && <b>{formatValue(item.count)}마리</b>}{visible(item?.stars) && <b>{formatValue(item.stars)}성</b>}{visible(item?.grade) && <b>{formatValue(item.grade)}</b>}{visible(item?.level) && <b>Lv.{formatValue(item.level)}</b>}</div>{visible(item?.mainOption) && <p><span>메인</span>{formatValue(item.mainOption)}</p>}{!!item?.subOptions?.length && <p><span>서브</span>{formatValue(item.subOptions)}</p>}{!!item?.options?.length && <p><span>옵션</span>{formatValue(item.options)}</p>}{visible(item?.rawText) && <small>{formatValue(item.rawText)}</small>}</div></article>)}</div>
        {!!data?.notes?.length && <ValueList value={data.notes} path="pet-notes" />}
    </section>;
}

function DetailSection({ sectionKey, data }) {
    if (!hasContent(data)) return null;
    if (sectionKey === "formations") return <FormationSection data={data} />;
    if (sectionKey === "enigmaFields") return <EnigmaFieldSection data={data} />;
    if (sectionKey === "pets") return <EnigmaBeastSection data={data} />;
    const meta = SECTION_META[sectionKey];
    const Icon = meta.icon;
    return <article className={`av-detail av-detail-${sectionKey}`}>
        <header><div className="av-detail-icon"><Icon /></div><h3>{meta.title}</h3></header>
        <ValueList value={data} path={sectionKey} />
    </article>;
}

function getAccountSection(account, key) {
    if (key === "enigmaFields") return account?.enigmaFields || account?.enigmaField || account?.enigma?.fields;
    if (key === "pets") return account?.pets || account?.enigmaBeasts || account?.enigma?.beasts;
    return account?.[key];
}

function AnalysisDashboard({ account }) {
    const basic = account?.basic?.public === false ? {} : account?.basic || {};
    const marches = (account?.marches || []).filter((march) => march?.public !== false);
    const sections = Object.keys(SECTION_META).filter((key) => hasContent(getAccountSection(account, key)));
    return <div className="av-dashboard">
        <header className="av-profile">
            <div><span className="av-eyebrow">TOP WAR ACCOUNT INTELLIGENCE</span><h1>{basic.title || "계정 분석 결과"}</h1><div className="av-highlights">{(basic.highlights || []).map((item, index) => <span key={`${item}-${index}`}>{formatValue(item)}</span>)}</div></div>
            {visible(basic.price) && <div className="av-price"><span>ASKING PRICE</span><strong>{formatValue(basic.price)}</strong></div>}
        </header>
        <section className="av-overview">
            <Metric label="총 전투력" value={basic.totalPower} featured />
            <Metric label="서버" value={basic.server} />
            <Metric label="VIP" value={basic.vip} />
            <Metric label="사기" value={basic.morale} />
            <Metric label="출정 부대" value={basic.marchCount || marches.length} />
        </section>
        {!!account?.extraction?.summary && <section className="av-summary"><FaWandMagicSparkles /><div><span>AI SUMMARY</span><p>{account.extraction.summary}</p></div></section>}
        {!!marches.length && <section className="av-section"><div className="av-section-title"><span>FORCE OVERVIEW</span><h2>주요 부대</h2></div><div className="av-march-grid">{marches.map((march, index) => <MarchCard march={march} index={index} key={`${march.name}-${index}`} />)}</div></section>}
        {hasContent(account?.formations) && <FormationSection data={account.formations} />}
        {!!sections.filter((key) => key !== "formations").length && <section className="av-section"><div className="av-section-title"><span>ACCOUNT COLLECTION</span><h2>보유 정보</h2></div><div className="av-detail-grid">{sections.filter((key) => key !== "formations").map((key) => <DetailSection sectionKey={key} data={getAccountSection(account, key)} key={key} />)}</div></section>}
        {!!account?.unclassified?.length && <details className="av-unclassified"><summary><FaCircleExclamation /> 분류되지 않은 정보 {account.unclassified.length}건</summary><ValueList value={account.unclassified} path="unclassified" /></details>}
    </div>;
}

export default function AccountViewer() {
    const { i18n } = useTranslation();
    const fileRef = useRef(null);
    const [sourceText, setSourceText] = useState("");
    const [jsonText, setJsonText] = useState("");
    const [account, setAccount] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [inputOpen, setInputOpen] = useState(true);
    const lang = useMemo(() => ["ko", "en", "ja", "zh"].includes(i18n.language) ? i18n.language : "ko", [i18n.language]);

    const applyJson = (text) => {
        const cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
        const parsed = JSON.parse(cleaned);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("최상위 데이터가 JSON 객체가 아닙니다.");
        setJsonText(JSON.stringify(parsed, null, 2));
        setAccount(parsed);
        setError("");
        setInputOpen(false);
    };

    const analyze = async () => {
        if (!sourceText.trim()) { setError("분석할 계정 판매글을 입력해 주세요."); return; }
        setLoading(true); setError("");
        try {
            const response = await fetch(`${ANALYZE_URL}?lang=${encodeURIComponent(lang)}`, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8", Accept: "application/json" }, body: sourceText.trim() });
            const body = await response.text();
            if (!response.ok) throw new Error(body || `HTTP ${response.status}`);
            applyJson(body);
        } catch (requestError) { setError(requestError instanceof SyntaxError ? `AI 응답 JSON이 완성되지 않았습니다: ${requestError.message}` : requestError.message); }
        finally { setLoading(false); }
    };

    const loadFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try { applyJson(await file.text()); } catch (fileError) { setError(`파일을 읽을 수 없습니다: ${fileError.message}`); }
        event.target.value = "";
    };

    const download = () => {
        const blob = new Blob([jsonText], { type: "application/json;charset=UTF-8" });
        const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
        anchor.href = url; anchor.download = `topwar-account-${Date.now()}.json`; anchor.click(); URL.revokeObjectURL(url);
    };

    return <main className="account-viewer-page">
        <section className={`av-input${inputOpen ? "" : " av-input-collapsed"}`}>
            <button className="av-input-toggle" type="button" onClick={() => setInputOpen((open) => !open)} aria-expanded={inputOpen}><div><span>AI ACCOUNT ANALYZER</span><strong>{account ? "다른 계정 분석 또는 JSON 불러오기" : "계정 판매글 분석"}</strong></div><FaChevronDown /></button>
            {inputOpen && <div className="av-input-body">
                <div className="av-input-grid"><label><span>자유 형식 판매글</span><textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="분석할 계정 판매글을 붙여넣으세요." /></label><label><span>AI JSON 직접 붙여넣기</span><textarea className="av-json-input" value={jsonText} onChange={(event) => setJsonText(event.target.value)} placeholder="이미 받은 AI JSON 결과가 있다면 붙여넣으세요." /></label></div>
                {error && <div className="av-error"><FaCircleExclamation /> {error}</div>}
                <div className="av-actions"><button className="btn btn-danger fw-bold" type="button" onClick={analyze} disabled={loading}>{loading ? "AI 분석 중…" : "AI 분석 및 시각화"}</button><button className="btn btn-outline-secondary" type="button" onClick={() => { try { applyJson(jsonText); } catch (parseError) { setError(`JSON 형식을 확인해 주세요: ${parseError.message}`); } }}>JSON 적용</button><button className="btn btn-outline-secondary" type="button" onClick={() => fileRef.current?.click()}><FaUpload /> 파일 열기</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={loadFile} />{account && <><button className="btn btn-outline-secondary" type="button" onClick={() => navigator.clipboard.writeText(jsonText)}><FaCopy /> JSON 복사</button><button className="btn btn-outline-secondary" type="button" onClick={download}><FaDownload /> 저장</button></>}</div>
            </div>}
        </section>
        {account ? <AnalysisDashboard account={account} /> : <section className="av-welcome"><div className="av-welcome-icon"><FaWandMagicSparkles /></div><h1>판매글을 보기 쉬운 계정 카드로</h1><p>위에 판매글을 붙여넣거나 기존 AI JSON 파일을 열어 시각화하세요.</p><div><span>부대별 전투력</span><span>영웅·각성·스킬</span><span>군진·펫·아이템</span></div></section>}
    </main>;
}
