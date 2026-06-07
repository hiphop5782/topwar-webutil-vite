// i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import dayjs from "dayjs";

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

// 💡 [여기에 작성하세요] 언어가 변경될 때마다 실행되는 리스너
i18n.on('languageChanged', async (lng) => {
    try {
        // i18next의 lng 값(예: ko-KR, en-US)을 dayjs 형식에 맞게 보정 (필요시)
        // 예: 'ko-KR' -> 'ko', 'en-US' -> 'en'
        const shortLng = lng.split('-')[0];

        // dayjs locale 동적 로드
        await import(`dayjs/locale/${shortLng}.js`);
        dayjs.locale(shortLng);

        console.log(`dayjs locale이 변경되었습니다: ${shortLng}`);
    } catch (error) {
        console.error(`dayjs locale 로드 실패 (${lng}):`, error);
        dayjs.locale('en'); // 실패 시 기본값
    }
});

export default i18n;