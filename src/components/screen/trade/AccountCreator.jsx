import { useMemo, useState } from "react";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { DETAIL_SECTIONS, createEmptyAccount, createPublicAccount, parseTradeText, savePublicAccount } from "./accountTradeModel";
import "./AccountTrade.css";

const splitLines = (value) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

function Field({ label, value, onChange }) {
    return <label className="trade-field"><span>{label}</span><input className="form-control" value={value || ""} onChange={(event) => onChange(event.target.value)} /></label>;
}

export default function AccountCreator() {
    const [rawText, setRawText] = useState("");
    const [account, setAccount] = useState(createEmptyAccount);
    const [message, setMessage] = useState("");
    const [transferText, setTransferText] = useState("");
    const [publishedId, setPublishedId] = useState("");
    const publicAccount = useMemo(() => createPublicAccount(account), [account]);
    const updateBasic = (key, value) => setAccount((current) => ({ ...current, basic: { ...current.basic, [key]: value } }));
    const togglePublic = (key) => setAccount((current) => ({ ...current, visibility: { ...current.visibility, [key]: !current.visibility[key] } }));
    const updateMarch = (index, key, value) => setAccount((current) => ({ ...current, marches: current.marches.map((march, i) => i === index ? { ...march, [key]: value } : march) }));
    const analyze = () => {
        if (!rawText.trim()) { setMessage("분석할 판매글을 입력해 주세요."); return; }
        setAccount(parseTradeText(rawText));
        setMessage("초안을 만들었습니다. 잘못 인식한 값과 빠진 항목을 확인해 주세요.");
    };
    const publish = () => {
        savePublicAccount(publicAccount);
        setPublishedId(publicAccount.id);
        setMessage("공개 데이터를 저장했습니다. 아래 버튼으로 뷰어를 확인할 수 있습니다.");
    };
    const exportDraft = () => {
        setTransferText(JSON.stringify(account, null, 2));
        setMessage("현재 작업을 텍스트로 내보냈습니다. 복사해 보관할 수 있습니다.");
    };
    const importDraft = () => {
        try {
            const imported = JSON.parse(transferText);
            const empty = createEmptyAccount();
            setAccount({ ...empty, ...imported, id: imported.id || empty.id, basic: { ...empty.basic, ...imported.basic }, details: { ...empty.details, ...imported.details }, visibility: { ...empty.visibility, ...imported.visibility } });
            setRawText(imported.originalText || "");
            setMessage("작업 데이터를 불러왔습니다.");
        } catch { setMessage("불러올 JSON 텍스트의 형식을 확인해 주세요."); }
    };

    return <main className="trade-page">
        <header className="trade-hero"><div><span className="trade-kicker">ACCOUNT LISTING BUILDER</span><h1>계정 정보 작성기</h1><p>판매글을 붙여넣으면 입력 가능한 항목을 찾아 초안으로 만듭니다. UID는 수집하거나 저장하지 않습니다.</p></div></header>
        <section className="trade-card">
            <div className="trade-section-head"><div><span>STEP 1</span><h2>판매글 분석</h2></div><button className="btn btn-danger fw-bold" type="button" onClick={analyze}>텍스트에서 정보 추출</button></div>
            <textarea className="form-control trade-source" value={rawText} onChange={(event) => setRawText(event.target.value)} placeholder="계정 판매글을 그대로 붙여넣으세요. 한국어와 영어 형식을 함께 인식합니다." />
            {message && <p className="trade-message" role="status">{message}</p>}
        </section>
        <section className="trade-card">
            <div className="trade-section-head"><div><span>WORK DATA</span><h2>작업 내용 가져오기·내보내기</h2></div><div className="trade-button-row"><button className="btn btn-outline-secondary" type="button" onClick={importDraft}>텍스트에서 불러오기</button><button className="btn btn-outline-danger" type="button" onClick={exportDraft}>현재 작업 내보내기</button></div></div>
            <textarea className="form-control trade-transfer" value={transferText} onChange={(event) => setTransferText(event.target.value)} placeholder="작성기에서 내보낸 JSON 텍스트를 여기에 붙여넣으면 언제든 다시 편집할 수 있습니다." />
        </section>
        <section className="trade-card">
            <div className="trade-section-head"><div><span>STEP 2</span><h2>기본정보 확인</h2></div><label className="trade-public-toggle"><input type="checkbox" checked={account.visibility.basic} onChange={() => togglePublic("basic")} /> 공개</label></div>
            <div className="trade-field-grid">
                {[['title','제목'],['server','서버'],['totalPower','총 전투력'],['vip','VIP'],['morale','사기'],['price','가격']].map(([key,label]) => <Field key={key} label={label} value={account.basic[key]} onChange={(value) => updateBasic(key, value)} />)}
            </div>
        </section>
        <section className="trade-card">
            <div className="trade-section-head"><div><span>STEP 3</span><h2>주요 부대</h2></div><label className="trade-public-toggle"><input type="checkbox" checked={account.visibility.marches} onChange={() => togglePublic("marches")} /> 공개</label></div>
            <div className="trade-march-editor-list">
                {account.marches.map((march, index) => <article className={`trade-march-editor trade-branch-${march.branch}`} key={march.id}>
                    <div className="trade-field-grid">
                        {[['name','부대 이름'],['power','전투력'],['marchSize','출정 크기'],['mastery','마스터리'],['remold','무기 개조'],['suppression','제압'],['skill','스킬'],['awakening','각성']].map(([key,label]) => <Field key={key} label={label} value={march[key]} onChange={(value) => updateMarch(index, key, value)} />)}
                    </div>
                    <label className="trade-field trade-wide"><span>영웅 (한 줄에 한 명)</span><textarea className="form-control" value={(march.heroes || []).map((hero) => `${hero.name}${hero.stars ? ` (${hero.stars})` : ""}`).join("\n")} onChange={(event) => updateMarch(index, "heroes", splitLines(event.target.value).map((name) => ({ name, stars: "" })))} /></label>
                </article>)}
                {!account.marches.length && <div className="trade-empty">텍스트를 분석하면 공군·육군·해군 부대가 여기에 생성됩니다.</div>}
            </div>
        </section>
        <section className="trade-card">
            <div className="trade-section-head"><div><span>STEP 4</span><h2>보유 정보 마무리</h2></div></div>
            <div className="trade-detail-grid">{DETAIL_SECTIONS.map(([key, label]) => <article className="trade-detail-editor" key={key}>
                <div className="trade-detail-title"><h3>{label}</h3><label className="trade-public-toggle"><input type="checkbox" checked={account.visibility[key]} onChange={() => togglePublic(key)} /> 공개</label></div>
                <textarea className="form-control" value={(account.details[key] || []).join("\n")} onChange={(event) => setAccount((current) => ({ ...current, details: { ...current.details, [key]: splitLines(event.target.value) } }))} placeholder="한 줄에 한 항목씩 입력" />
            </article>)}</div>
        </section>
        <section className="trade-card trade-publish"><div><span>STEP 5</span><h2>공개 미리보기 생성</h2><p>체크한 항목만 공개 데이터에 포함되며 기존 계정들은 덮어쓰지 않습니다.</p></div><div className="trade-button-row"><button className="btn btn-danger btn-lg fw-bold" type="button" onClick={publish}>공개 데이터 저장</button>{publishedId && <LanguageRouterLink className="btn btn-dark btn-lg fw-bold" to={`/account/viewer?id=${encodeURIComponent(publishedId)}`}>공개 뷰어에서 확인</LanguageRouterLink>}</div></section>
    </main>;
}
