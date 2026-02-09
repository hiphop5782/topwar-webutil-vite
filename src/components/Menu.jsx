import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect } from "react";
import { FaArrowUp } from "react-icons/fa6";

const countryCodeMap = {
    ko: 'kr',
    en: 'us',
    ja: 'jp'
};

function Menu() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation("menu");
    const { lang } = useParams();

    useEffect(() => {
        if (lang && i18n.language !== lang) {
            i18n.changeLanguage(lang);
        }
    }, [lang, i18n]);

    const changeLanguage = useCallback((newLang) => {
        // 1. i18n 설정에서 지원 언어 목록 가져오기
        const supportedLngs = i18n.options.supportedLngs || [];

        // 2. 동적 정규식 생성: /^(ko|en|ja)/
        const langRegex = new RegExp(`^/(${supportedLngs.filter(l => l !== 'cimode').join('|')})`);

        // 3. 현재 경로에서 기존 언어 코드 제거
        const currentPath = window.location.pathname;
        const pathWithoutLang = currentPath.replace(langRegex, '');

        // 4. 새 언어와 결합하여 이동
        const targetPath = `/${newLang}${pathWithoutLang === "" ? "" : pathWithoutLang}`;

        i18n.changeLanguage(newLang).then(() => {
            navigate(targetPath);
        });
    }, [navigate, i18n]);

    // 언어에 맞는 국기 코드를 반환하는 함수
    const getFlagCode = useCallback((lang) => {
        const flags = { ko: 'kr', en: 'us', ja: 'jp' };
        return flags[lang] || 'kr'; // 기본값 kr
    }, []);

    return (
        <nav className="navbar navbar-expand-lg bg-primary fixed-top" data-bs-theme="dark">
            <div className="container-fluid">
                <LanguageRouterLink className="navbar-brand" to="/">Topwar Helper</LanguageRouterLink>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarColor01" aria-controls="navbarColor01" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarColor01">
                    <ul className="navbar-nav me-auto">
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{t(`menu:info.label`)}</a>
                            <div className="dropdown-menu">
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/information/base`}>{t(`menu:info.sub.base`)}</LanguageRouterLink>
                                {/* <LanguageRouterLink className="dropdown-item" to="/information/decor">장식 정보</LanguageRouterLink> */}
                                {/* <LanguageRouterLink className="dropdown-item" to="/information/hero">영웅 정보</LanguageRouterLink> */}
                                <div className="dropdown-divider"></div>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/information/job`}>{t(`menu:info.sub.job`)}</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/information/el`}>{t(`menu:info.sub.el`)}</LanguageRouterLink>
                                <div className="dropdown-divider"></div>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/information/data`}>{t(`menu:info.sub.data`)}</LanguageRouterLink>
                                <div className="dropdown-divider"></div>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/information/kartz-spec`}>{t(`menu:info.sub.kartz-information`)}</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/information/kartz-rank`}>{t(`menu:info.sub.kartz-rank`)}</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/information/kartz-statistics`}>{t(`menu:info.sub.kartz-statistics`)}</LanguageRouterLink>
                            </div>
                        </li>
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{t(`menu:calculator.label`)}</a>
                            <div className="dropdown-menu">
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/calculator/vital`}>{t(`menu:calculator.sub.vital`)}</LanguageRouterLink>
                                {/* <LanguageRouterLink className="dropdown-item" to="/calculator/gathering">채집 속도 계산기</LanguageRouterLink> */}
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/calculator/skill`}>{t(`menu:calculator.sub.skill-shard`)}</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/calculator/value-pack`}>{t(`menu:calculator.sub.store`)}</LanguageRouterLink>
                                {/* <div className="dropdown-divider"></div> */}
                                {/* <LanguageRouterLink className="dropdown-item" to={`/${lang}/calculator/el-score`}>{t(`menu:calculator.sub.el-score`)}</LanguageRouterLink> */}
                                {/* <div className="dropdown-divider"></div>/ */}
                                {/* <a className="dropdown-item">Separated link</a> */}
                            </div>
                        </li>
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{t(`menu:simulator.label`)}</a>
                            <div className="dropdown-menu">
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/simulator/titan-research`}>{t(`menu:simulator.sub.titan-research`)}</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/simulator/titan-refine`}>{t(`menu:simulator.sub.titan-refine`)}</LanguageRouterLink>
                                <div className="dropdown-divider"></div>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/simulator/formation-perk`}>{t(`menu:simulator.sub.formation-perk`)}</LanguageRouterLink>
                                <div className="dropdown-divider"></div>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/simulator/random`}>{t(`menu:simulator.sub.random`)}</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/simulator/slot`}>{t(`menu:simulator.sub.slot`)}</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/simulator/luckybox`}>{t(`menu:simulator.sub.luckybox`)}</LanguageRouterLink>
                                <div className="dropdown-divider"></div>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/simulator/lotto`}>{t(`menu:simulator.sub.lotto`)}</LanguageRouterLink>
                                {/* <LanguageRouterLink className="nav-link" to="/simulator/hero">데미지계산기</LanguageRouterLink> */}
                            </div>
                        </li>
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{t(`menu:emoji.label`)}</a>
                            <div className="dropdown-menu">
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/emoji/create`}>{t(`menu:emoji.sub.create`)}</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/emoji/list`}>{t(`menu:emoji.sub.list`)}</LanguageRouterLink>
                            </div>
                        </li>
                        {/* <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{t(`menu:account.label`)} (구현중)</a>
                            <div className="dropdown-menu">
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/account/viewer`}>{t(`menu:account.sub.viewer`)} (구현중)</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/account/creator`}>{t(`menu:account.sub.creator`)} (구현중)</LanguageRouterLink>
                            </div>
                        </li> */}
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{t(`menu:vote.label`)}</a>
                            <div className="dropdown-menu">
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/vote/create`}>{t(`menu:vote.sub.create`)}</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/vote/cast`}>{t(`menu:vote.sub.cast`)}</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/vote/manage`}>{t(`menu:vote.sub.manage`)}</LanguageRouterLink>
                            </div>
                        </li>
                        <li className="nav-item">
                            <LanguageRouterLink className="nav-link" to={`/${lang}/developer`}>{t(`menu:developer.label`)}</LanguageRouterLink>
                        </li>

                        {/* ✅ 언어 선택 드롭다운 부분 */}
                        <div className="dropdown ms-lg-2 mt-2 mt-lg-0">
                            <button className="btn btn-dark btn-sm dropdown-toggle d-flex align-items-center" type="button" data-bs-toggle="dropdown">
                                <span className={`fi fi-${getFlagCode(i18n.language)} me-2`}></span>
                                {i18n.language.toUpperCase()}
                            </button>
                            <ul className="dropdown-menu dropdown-menu-dark shadow">
                                <li>
                                    <button className="dropdown-item d-flex align-items-center" onClick={() => changeLanguage('ko')}>
                                        <span className="fi fi-kr me-2"></span> 한국어
                                    </button>
                                </li>
                                <li>
                                    <button className="dropdown-item d-flex align-items-center" onClick={() => changeLanguage('en')}>
                                        <span className="fi fi-us me-2"></span> English
                                    </button>
                                </li>
                                <li>
                                    <button className="dropdown-item d-flex align-items-center" onClick={() => changeLanguage('ja')}>
                                        <span className="fi fi-jp me-2"></span> 日本語
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </ul>

                    {/* <button className="btn btn-primary mt-3 navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarColor01" aria-controls="menuCollapse" aria-expanded="true">메뉴 접기</button> */}
                    <div className="navbar-toggler border border-0 mt-2 text-center" data-bs-toggle="collapse" data-bs-target="#navbarColor01" aria-controls="menuCollapse" aria-expanded="true"
                        style={{ cursor: "pointer" }}>
                        <FaArrowUp />
                        <span className="mx-2">메뉴 접기</span>
                        <FaArrowUp />
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Menu;