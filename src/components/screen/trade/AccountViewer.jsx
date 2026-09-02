import { useSearchParams } from "react-router-dom";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { DETAIL_SECTIONS, readAccountLibrary } from "./accountTradeModel";
import "./AccountTrade.css";

export default function AccountViewer() {
    const [searchParams] = useSearchParams();
    const library = readAccountLibrary();
    const requestedId = searchParams.get("id");
    const account = requestedId ? library[requestedId] : null;
    if (!account) return <main className="trade-page"><section className="trade-card trade-empty-view"><h1>표시할 계정 정보가 없습니다</h1><p>올바른 계정 링크를 열거나 작성기에서 공개 데이터를 생성해 주세요.</p><LanguageRouterLink className="btn btn-danger fw-bold" to="/account/creator">계정 정보 작성하기</LanguageRouterLink></section></main>;
    const basic = account.basic || {};
    return <main className="trade-page trade-viewer">
        <header className="trade-hero trade-viewer-hero"><div><span className="trade-kicker">TOP WAR ACCOUNT</span><h1>{basic.title || "계정 정보"}</h1><div className="trade-summary-chips">{basic.server && <span>서버 {basic.server}</span>}{basic.totalPower && <span>전투력 {basic.totalPower}</span>}{basic.vip && <span>VIP {basic.vip}</span>}{basic.morale && <span>사기 {basic.morale}</span>}</div></div>{basic.price && <strong className="trade-price">{basic.price}</strong>}</header>
        {!!account.marches?.length && <section className="trade-card"><div className="trade-section-head"><div><span>MAIN MARCHES</span><h2>주요 부대</h2></div></div><div className="trade-view-marches">{account.marches.map((march) => <article className={`trade-view-march trade-branch-${march.branch}`} key={march.id}><header><div><span>{march.branch?.toUpperCase()}</span><h3>{march.name}</h3></div><strong>{march.power || "-"}</strong></header><div className="trade-hero-names">{march.heroes?.map((hero, index) => <span key={`${hero.name}-${index}`}>{hero.name}{hero.stars && ` ★${hero.stars}`}</span>)}</div><dl>{[["출정",march.marchSize],["마스터리",march.mastery],["개조",march.remold],["제압",march.suppression],["스킬",march.skill],["각성",march.awakening]].filter(([,value]) => value).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="trade-stat-row">{Object.entries(march.stats || {}).map(([key,value]) => <span key={key}>{key} {value}</span>)}</div></article>)}</div></section>}
        <section className="trade-detail-grid">{DETAIL_SECTIONS.map(([key, label]) => account.details?.[key]?.length ? <article className="trade-card trade-view-detail" key={key}><span>{label}</span><ul>{account.details[key].map((item,index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></article> : null)}</section>
        <div className="trade-view-actions"><LanguageRouterLink className="btn btn-outline-danger" to="/account/creator">작성기로 이동</LanguageRouterLink></div>
    </main>;
}
