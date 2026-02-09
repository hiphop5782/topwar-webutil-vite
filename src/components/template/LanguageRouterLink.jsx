import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function LanguageRouterLink({ to, children, ...props }) {
    const { i18n } = useTranslation();
    
    const localizedPath = useMemo(() => {
        const currentLanguage = i18n.language;
        // ✅ i18n 설정에서 지원하는 언어 목록을 가져와서 정규식을 동적으로 만듭니다.
        // 예: ["ko", "en", "ja"] -> /^\/(ko|en|ja)/
        const supportedLngs = i18n.options.supportedLngs || [];
        const langRegex = new RegExp(`^\\/(${supportedLngs.filter(l => l !== 'cimode').join('|')})`);

        if (!to.startsWith('/')) return to;

        if (to.startsWith(`/${currentLanguage}/`) || to === `/${currentLanguage}`) {
            return to;
        }

        // ✅ 하드코딩된 (ko|en|ja) 대신 동적 정규식 사용
        const cleanPath = to.replace(langRegex, '');
        
        const finalPath = cleanPath === "/" || cleanPath === "" 
            ? `/${currentLanguage}` 
            : `/${currentLanguage}${cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath}`;

        return finalPath;
    }, [to, i18n.language, i18n.options.supportedLngs]); // 의존성에 추가

    return (
        <Link {...props} to={localizedPath}>
            {children}
        </Link>
    );
}