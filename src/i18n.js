import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import dayjs from "dayjs";

import "dayjs/locale/ko";
import "dayjs/locale/ja";

import {
    supportedLngs,
    defaultLng,
} from "@src/config/languages";

/*
 * src/locales/{언어}/{namespace}.json을 모두 읽습니다.
 *
 * 예:
 * src/locales/ko/common.json
 * src/locales/ko/menu.json
 * src/locales/en/common.json
 */
const localeModules = import.meta.glob(
    "/src/locales/*/*.json",
    {
        eager: true,
        import: "default",
    }
);

/*
 * i18next가 사용하는 resources 구조로 변환합니다.
 *
 * {
 *   ko: {
 *     common: {...},
 *     menu: {...}
 *   },
 *   en: {
 *     common: {...},
 *     menu: {...}
 *   }
 * }
 */
const resources = {};

for (const [filePath, content] of Object.entries(localeModules)) {
    const matched = filePath.match(
        /\/src\/locales\/([^/]+)\/([^/]+)\.json$/
    );

    if (!matched) {
        console.warn(
            "번역 파일 경로를 분석할 수 없습니다:",
            filePath
        );
        continue;
    }

    const [, language, namespace] = matched;

    resources[language] ??= {};
    resources[language][namespace] = content;
}

/*
 * 번역 폴더가 누락된 언어를 검사합니다.
 */
for (const language of supportedLngs) {
    if (!resources[language]) {
        throw new Error(
            `지원 언어 "${language}"의 번역 폴더가 없습니다. ` +
            `src/locales/${language} 경로를 확인하세요.`
        );
    }
}

/*
 * 모든 번역 파일에서 namespace 목록을 자동 수집합니다.
 */
export const namespaces = Array.from(
    new Set(
        Object.values(resources).flatMap(
            (languageResources) =>
                Object.keys(languageResources)
        )
    )
).sort();

/*
 * 다른 파일에서도 기존 방식으로 가져갈 수 있도록 다시 export합니다.
 */
export {
    supportedLngs,
    defaultLng,
};

/*
 * i18next 초기화 Promise입니다.
 * 프리렌더링 시 이 Promise가 완료될 때까지 기다립니다.
 */
export const i18nReady = i18n
    .use(initReactI18next)
    .init({
        resources,

        lng: defaultLng,
        fallbackLng: defaultLng,
        supportedLngs,

        ns: namespaces,
        defaultNS: "common",

        load: "languageOnly",
        nonExplicitSupportedLngs: false,

        interpolation: {
            escapeValue: false,
        },

        react: {
            useSuspense: false,
        },
    });

/*
 * i18next 언어 변경 시 Day.js 언어도 변경합니다.
 */
i18n.on("languageChanged", (language) => {
    const shortLanguage =
        language?.split("-")[0] || defaultLng;

    dayjs.locale(shortLanguage);

    console.log(
        `dayjs locale 변경: ${shortLanguage}`
    );
});

export default i18n;
