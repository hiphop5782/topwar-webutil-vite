import {
    Navigate,
    Route,
    Routes,
    useLocation,
    useParams,
} from "react-router-dom";
import {
    useEffect,
    useState,
} from "react";

import {
    Bounce,
    ToastContainer,
} from "react-toastify";

import Menu from "./Menu";
import MainContentView from "./MainContentView";

import i18n, {
    defaultLng,
    i18nReady,
    supportedLngs,
} from "@src/i18n";

import Footer from "@src/components/template/Footer";


function WithLanguageRouter() {
    const { lang } = useParams();

    const [readyLanguage, setReadyLanguage] =
        useState(null);

    const isSupportedLanguage =
        typeof lang === "string" &&
        supportedLngs.includes(lang);


    /*
     * URL 언어를 i18next에 적용
     */
    useEffect(() => {
        if (!isSupportedLanguage) {
            return;
        }

        let cancelled = false;

        async function prepareLanguage() {
            try {
                console.log(
                    `[PRERENDER] 언어 준비 시작: ${lang}`
                );

                await i18nReady;

                console.log(
                    `[PRERENDER] i18n 초기화 완료`
                );

                if (i18n.language !== lang) {
                    await i18n.changeLanguage(lang);
                }

                if (cancelled) {
                    return;
                }

                document.documentElement.lang = lang;

                console.log(
                    `[PRERENDER] 언어 적용 완료: ${i18n.language}`
                );

                /*
                 * 이 state 변경으로 React가 한 번 더 렌더링됩니다.
                 */
                setReadyLanguage(lang);
            }
            catch (error) {
                console.error(
                    `[PRERENDER] 언어 적용 실패: ${lang}`,
                    error
                );
            }
        }

        prepareLanguage();

        return () => {
            cancelled = true;
        };

    }, [
        lang,
        isSupportedLanguage,
    ]);


    /*
     * readyLanguage가 DOM에 반영된 렌더링이 끝난 뒤
     * prerender-ready 전송
     */
    useEffect(() => {
        if (
            !isSupportedLanguage ||
            readyLanguage !== lang
        ) {
            return;
        }

        const dispatchPrerenderReady = () => {
            console.log(
                `[PRERENDER] READY 발생: ${window.location.pathname}`
            );

            document.dispatchEvent(
                new Event("prerender-ready")
            );
        };

        const normalizedPath =
            window.location.pathname.replace(/\/+$/, "");

        const isHomePage =
            normalizedPath === `/${lang}`;

        if (!isHomePage) {
            dispatchPrerenderReady();
            return;
        }

        if (
            document.documentElement.dataset
                .homeStatisticsReady === "true"
        ) {
            dispatchPrerenderReady();
            return;
        }

        document.addEventListener(
            "home-statistics-ready",
            dispatchPrerenderReady,
            { once: true }
        );

        return () => {
            document.removeEventListener(
                "home-statistics-ready",
                dispatchPrerenderReady
            );
        };

    }, [
        readyLanguage,
        lang,
        isSupportedLanguage,
    ]);


    if (!isSupportedLanguage) {
        return (
            <Navigate
                to={`/${defaultLng}`}
                replace
            />
        );
    }


    return (
        <div className="container-fluid mt-5 pt-4">

            <Menu />

            <MainContentView />

            <Footer />

            <ToastContainer
                position="bottom-right"
                autoClose={5000}
                hideProgressBar
                theme="colored"
                transition={Bounce}
            />

        </div>
    );
}


function WithoutLanguageRouter() {
    const location = useLocation();

    const currentPath =
        location.pathname;

    const languagePattern =
        new RegExp(
            `^/(${supportedLngs.join("|")})(/|$)`
        );

    if (
        languagePattern.test(currentPath)
    ) {
        return null;
    }

    const normalizedPath =
        currentPath === "/"
            ? ""
            : currentPath;

    return (
        <Navigate
            to={
                `/${defaultLng}${normalizedPath}`
            }
            replace
        />
    );
}


export default function LanguageRouter() {
    return (
        <Routes>

            <Route
                path="/:lang/*"
                element={
                    <WithLanguageRouter />
                }
            />

            <Route
                path="*"
                element={
                    <WithoutLanguageRouter />
                }
            />

        </Routes>
    );
}
