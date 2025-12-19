import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";


export default function LanguageRouterLink({to, children, ...props}) {
    const {i18n} = useTranslation();
    
    const localizedPath = useMemo(()=>{
        const currentLanguage = i18n.language;
        return to.startsWith('/') ? `/${currentLanguage}${to}` : to;
    }, []);

    //render
    return (
        <Link {...props} to={localizedPath}>
            {children}
        </Link>
    )
}