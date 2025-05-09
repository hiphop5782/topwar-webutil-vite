import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";

function Menu() {
    const nagivate = useNavigate();
    const { t, i18n } = useTranslation("common");
    const { lang } = useParams();

    const changeLanguage = useCallback((e)=>{
        const newLang = e.target.value;
        const pathWithoutLang = window.location.pathname.replace(/^\/(ko|en)/, '');
        nagivate(`/${newLang}${pathWithoutLang}`);
        i18n.changeLanguage(newLang);
    }, []);

    return (
        <nav className="navbar navbar-expand-lg bg-primary fixed-top" data-bs-theme="dark">
            <div className="container-fluid">
                <NavLink className="navbar-brand" to="/">Topwar Helper</NavLink>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarColor01" aria-controls="navbarColor01" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarColor01">
                    <ul className="navbar-nav me-auto"> 
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{t(`menu.info.label`)}</a>
                            <div className="dropdown-menu">
                                <NavLink className="dropdown-item" to={`/${lang}/information/base`}>{t(`menu.info.sub.base`)}</NavLink>
                                {/* <NavLink className="dropdown-item" to="/information/decor">장식 정보</NavLink> */}
                                {/* <NavLink className="dropdown-item" to="/information/hero">영웅 정보</NavLink> */}
                                <div className="dropdown-divider"></div>
                                <NavLink className="dropdown-item" to={`/${lang}/information/job`}>{t(`menu.info.sub.job`)}</NavLink>
                                <NavLink className="dropdown-item" to={`/${lang}/information/formation-perk`}>{t(`menu.info.sub.formation-perk`)}</NavLink>
                                <NavLink className="dropdown-item" to={`/${lang}/information/el`}>{t(`menu.info.sub.el`)} (구현중)</NavLink>
                                <div className="dropdown-divider"></div>
                                <NavLink className="dropdown-item" to={`/${lang}/information/server-info`}>{t(`menu.info.sub.server-analyze`)}</NavLink>
                                <div className="dropdown-divider"></div>
                                <NavLink className="dropdown-item" to={`/${lang}/information/kartz-spec`}>{t(`menu.info.sub.kartz-information`)}</NavLink>
                                <NavLink className="dropdown-item" to={`/${lang}/information/kartz-rank`}>{t(`menu.info.sub.kartz-rank`)}</NavLink>
                            </div>
                        </li>
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{t(`menu.calculator.label`)}</a>
                            <div className="dropdown-menu">
                                <NavLink className="dropdown-item" to={`/${lang}/calculator/vital`}>{t(`menu.calculator.sub.vital`)}</NavLink>
                                {/* <NavLink className="dropdown-item" to="/calculator/gathering">채집 속도 계산기</NavLink> */}
                                <NavLink className="dropdown-item" to={`/${lang}/calculator/skill`}>{t(`menu.calculator.sub.skill-shard`)}</NavLink>
                                <NavLink className="dropdown-item" to={`/${lang}/calculator/value-pack`}>{t(`menu.calculator.sub.store`)}</NavLink>
                                {/* <div className="dropdown-divider"></div>/ */}
                                {/* <a className="dropdown-item">Separated link</a> */}
                            </div>
                        </li>
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{t(`menu.simulator.label`)}</a>
                            <div className="dropdown-menu">
                                <NavLink className="dropdown-item" to={`/${lang}/simulator/titan-research`}>{t(`menu.simulator.sub.titan-research`)}</NavLink>
                                <NavLink className="dropdown-item" to={`/${lang}/simulator/titan-refine`}>{t(`menu.simulator.sub.titan-refine`)}</NavLink>
                                <div className="dropdown-divider"></div>
                                <NavLink className="dropdown-item" to={`/${lang}/simulator/random`}>{t(`menu.simulator.sub.random`)}</NavLink>
                                {/* <NavLink className="nav-link" to="/simulator/hero">데미지계산기</NavLink> */}
                            </div>
                        </li>
                        <li className="nav-item">
                            <NavLink className="nav-link" to={`/${lang}/emoji`}>{t(`menu.emoji.label`)}</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink className="nav-link" to={`/${lang}/developer`}>{t(`menu.developer.label`)}</NavLink>
                        </li>
                        
                        {/* ✅ 언어 선택 드롭다운 */}
                        <form className="d-flex align-items-center">
                            <select
                            className="form-select form-select-sm text-bg-dark"
                            value={lang}
                            onChange={changeLanguage}
                            style={{ width: "auto", marginLeft: "10px" }}
                            >
                            <option value="ko">한국어</option>
                            <option value="en">English</option>
                            </select>
                        </form>
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Menu;