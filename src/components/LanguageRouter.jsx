import {
    Navigate,
    Route,
    Routes,
    useLocation,
    useParams,
} from "react-router-dom";
import { useEffect } from "react";

import {
    Bounce,
    ToastContainer,
} from "react-toastify";

import Menu from "./Menu";
import MainContentView from "./MainContentView";

import i18n, {
    defaultLng,
    i18nReady,
    namespaces,
    supportedLngs,
} from "@src/i18n";

/*
 * React가 번역 변경 결과를 DOM에 반영한 뒤
 * 프리렌더러에 저장 가능 상태를 알립니다.
 */
function notifyPrerenderReady() {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.dispatchEvent(
                new Event("prerender-ready")
            );
        });
    });
}

function WithLanguageRouter() {
    const { lang } = useParams();

    const isSupportedLanguage =
        typeof lang === "string" &&
        supportedLngs.includes(lang);

    useEffect(() => {
        if (!isSupportedLanguage) {
            return undefined;
        }

        let cancelled = false;

        async function prepareLanguage() {
            try {
                /*
                 * 모든 JSON 번역 리소스가 초기화될 때까지 기다립니다.
                 */
                await i18nReady;

                /*
                 * URL의 언어를 i18next에 적용합니다.
                 */
                await i18n.changeLanguage(lang);

                /*
                 * 현재 프로젝트에서 사용하는 모든 namespace가
                 * 준비됐는지 보장합니다.
                 *
                 * 정적 resources 방식이라 즉시 완료됩니다.
                 */
                await i18n.loadNamespaces(namespaces);

                if (cancelled) {
                    return;
                }

                console.log(
                    "프리렌더 i18n 준비 완료:",
                    {
                        language: i18n.language,
                        namespaces,
                    }
                );

                /*
                 * 번역 변경 후 React가 실제 텍스트를 DOM에
                 * 반영할 시간을 준 다음 이벤트를 보냅니다.
                 */
                notifyPrerenderReady();
            } catch (error) {
                console.error(
                    `언어 적용 실패: ${lang}`,
                    error
                );

                /*
                 * 번역 실패 상태의 HTML이 저장되지 않도록
                 * prerender-ready 이벤트를 보내지 않습니다.
                 *
                 * 이 경우 프리렌더러가 timeout으로 실패합니다.
                 */
            }
        }

        prepareLanguage();

        return () => {
            cancelled = true;
        };
    }, [lang, isSupportedLanguage]);

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
    const currentPath = location.pathname;

    const languagePattern = new RegExp(
        `^/(${supportedLngs.join("|")})(/|$)`
    );

    /*
     * 이미 언어 코드가 있는 URL이라면
     * 추가 리다이렉트를 하지 않습니다.
     */
    if (languagePattern.test(currentPath)) {
        return null;
    }

    /*
     * 루트 경로는 /ko로 이동합니다.
     *
     * /information/base처럼 언어가 없는 경로는
     * /ko/information/base로 이동합니다.
     */
    const normalizedPath =
        currentPath === "/"
            ? ""
            : currentPath;

    return (
        <Navigate
            to={`/${defaultLng}${normalizedPath}`}
            replace
        />
    );
}

export default function LanguageRouter() {
    return (
        <Routes>
            <Route
                path="/:lang/*"
                element={<WithLanguageRouter />}
            />

            <Route
                path="*"
                element={<WithoutLanguageRouter />}
            />
        </Routes>
    );
}