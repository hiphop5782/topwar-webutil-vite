// i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

// ✅ 여기서 지원 언어를 한 번만 정의합니다.
export const supportedLngs = ["ko", "en", "ja"]; 
export const defaultLng = "ko";

i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
        fallbackLng: defaultLng,
        supportedLngs: supportedLngs,
        ns: ["common", "menu", "viewer"],
        defaultNS: "common",
        backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
        interpolation: { escapeValue: false }
    });

export default i18n;