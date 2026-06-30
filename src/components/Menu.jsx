import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef } from "react";
import Collapse from "bootstrap/js/dist/collapse";
import {
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";

const countryCodeMap = {
    ko: 'kr',
    en: 'us',
    ja: 'jp'
};

function Menu() {
    const navigate = useNavigate();
    const location = useLocation();

    const navbarRef = useRef(null);
    const collapseRef = useRef(null);
    const collapseInstanceRef = useRef(null);

    useEffect(() => {
        if (!collapseRef.current) return;

        collapseInstanceRef.current =
            Collapse.getOrCreateInstance(collapseRef.current, {
                toggle: false,
            });

        return () => {
            collapseInstanceRef.current?.dispose();
            collapseInstanceRef.current = null;
        };
    }, []);

    const toggleMenu = () => {
        collapseInstanceRef.current?.toggle();
    };

    const closeMenu = () => {
        collapseInstanceRef.current?.hide();
    };
    const closeMobileMenu = useCallback(() => {
        const collapseElement = collapseRef.current;

        if (!collapseElement) {
            return;
        }

        // PC 화면에서는 메뉴를 접지 않음
        const isMobileMenu =
            window.matchMedia("(max-width: 991.98px)").matches;

        if (!isMobileMenu) {
            return;
        }

        const collapse =
            Collapse.getOrCreateInstance(collapseElement, {
                toggle: false,
            });

        collapse.hide();
    }, []);
    useEffect(() => {
        closeMobileMenu();
    }, [
        location.pathname,
        location.search,
        location.hash,
        closeMobileMenu,
    ]);
    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (!navbarRef.current) return;

            if (navbarRef.current.contains(event.target)) {
                return;
            }

            closeMenu();
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };
    }, []);

    const { t, i18n } = useTranslation("menu");
    const { lang } = useParams();

    useEffect(() => {
        if (lang && i18n.language !== lang) {
            i18n.changeLanguage(lang);
        }
    }, [lang, i18n]);

    const changeLanguage = useCallback(
        (newLang) => {
            const supportedLngs =
                i18n.options.supportedLngs || [];

            const languageCodes =
                supportedLngs.filter(
                    (language) =>
                        language !== "cimode"
                );

            const langRegex = new RegExp(
                `^/(${languageCodes.join("|")})(?=/|$)`
            );

            const pathWithoutLang =
                location.pathname.replace(
                    langRegex,
                    ""
                );

            const normalizedPath =
                pathWithoutLang === ""
                    ? "/"
                    : pathWithoutLang.startsWith("/")
                        ? pathWithoutLang
                        : `/${pathWithoutLang}`;

            const targetPath =
                `/${newLang}${normalizedPath === "/"
                    ? ""
                    : normalizedPath
                }`;

            i18n
                .changeLanguage(newLang)
                .then(() => {
                    navigate({
                        pathname: targetPath,

                        // 기존 server 등의 파라미터 유지
                        search: location.search,

                        // 해시가 있다면 같이 유지
                        hash: location.hash,
                    });
                });
        },
        [
            navigate,
            i18n,
            location.pathname,
            location.search,
            location.hash,
        ]
    );

    // 언어에 맞는 국기 코드를 반환하는 함수
    const getFlagCode = useCallback((lang) => {
        const flags = { ko: 'kr', en: 'us', ja: 'jp' };
        return flags[lang] || 'kr'; // 기본값 kr
    }, []);



    return (
        <nav ref={navbarRef} className="navbar navbar-expand-lg app-navbar fixed-top">
            <div className="container-fluid">
                <LanguageRouterLink className="navbar-brand" to="/">Topwar Helper</LanguageRouterLink>
                <button
                    className="navbar-toggler"
                    type="button"
                    aria-controls="navbarColor01"
                    aria-label="Toggle navigation"
                    onClick={toggleMenu}
                >
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div ref={collapseRef} className="collapse navbar-collapse" id="navbarColor01">
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
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/information/kartz`}>{t(`menu:info.sub.kartz`)}</LanguageRouterLink>
                                <div className="dropdown-divider"></div>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/information/realpower`}>
                                    {t(`menu:info.sub.realpower`)}
                                </LanguageRouterLink>
                            </div>
                        </li>
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{t(`menu:calculator.label`)}</a>
                            <div className="dropdown-menu">
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/calculator/vital`}>{t(`menu:calculator.sub.vital`)}</LanguageRouterLink>
                                {/* <LanguageRouterLink className="dropdown-item" to="/calculator/gathering">채집 속도 계산기</LanguageRouterLink> */}
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/calculator/skill`}>{t(`menu:calculator.sub.skill-shard`)}</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/calculator/value-pack`}>{t(`menu:calculator.sub.store`)}</LanguageRouterLink>
                                <div className="dropdown-divider"></div>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/calculator/cost`}>
                                    {t(`menu:calculator.sub.costs`)}
                                </LanguageRouterLink>
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
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{t(`menu:history.label`)}</a>
                            <div className="dropdown-menu">
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/history/ssc-2026`}>{t(`menu:history.sub.ssc2026`)}</LanguageRouterLink>
                            </div>
                        </li>
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">계정</a>
                            <div className="dropdown-menu">
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/account/profile`}>계정 프로필</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/account/viewer`}>{t(`menu:account.sub.viewer`)} (구현중)</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/account/creator`}>{t(`menu:account.sub.creator`)} (구현중)</LanguageRouterLink>
                            </div>
                        </li>
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">{t(`menu:vote.label`)}</a>
                            <div className="dropdown-menu">
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/vote/create`}>{t(`menu:vote.sub.create`)}</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/vote/cast`}>{t(`menu:vote.sub.cast`)}</LanguageRouterLink>
                                <LanguageRouterLink className="dropdown-item" to={`/${lang}/vote/manage`}>{t(`menu:vote.sub.manage`)}</LanguageRouterLink>
                            </div>
                        </li>
                        <li className="nav-item">
                            <LanguageRouterLink className="nav-link" to={`/${lang}/post`}>{t(`menu:post.label`)}</LanguageRouterLink>
                        </li>
                        {/* <li className="nav-item">
                            <LanguageRouterLink className="nav-link" to={`/${lang}/developer`}>{t(`menu:developer.label`)}</LanguageRouterLink>
                        </li> */}

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
                    {/* <div className="navbar-toggler border border-0 mt-2 text-center" data-bs-toggle="collapse" data-bs-target="#navbarColor01" aria-controls="menuCollapse" aria-expanded="true"
                        style={{ cursor: "pointer" }}>
                        <FaArrowUp />
                        <span className="mx-2">메뉴 접기</span>
                        <FaArrowUp />
                    </div> */}
                </div>
            </div>
        </nav>
    );
}

export default Menu;
