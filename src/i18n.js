// i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import "dayjs/locale/ja";

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
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
    });

// 2. 동적 import 대신 미리 로드된 locale을 매칭만 해줍니다.
i18n.on('languageChanged', (lng) => {
  const shortLng = lng.split('-')[0]; // 'ko-KR' -> 'ko'
  
  // dayjs에 해당 locale을 적용 (이미 위에서 import 되었으므로 바로 작동합니다)
  dayjs.locale(shortLng); 
  console.log(`dayjs locale 변경: ${shortLng}`);
});

export default i18n;