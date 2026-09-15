import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getRoutePolicy } from '@src/config/routePolicy';
import { supportedLngs, defaultLng } from '@src/config/languages';

export default function LanguageRouterLink({ to, children, ...props }) {
    const { i18n } = useTranslation();
    let localizedPath = to;
    if (typeof to === 'string' && to.startsWith('/') && !to.startsWith('//')) {
        const url = new URL(to, 'https://internal.invalid');
        const language = supportedLngs.includes(i18n.resolvedLanguage) ? i18n.resolvedLanguage : defaultLng;
        const clean = url.pathname.replace(/^\/(ko|en|ja)(?=\/|$)/, '');
        const policy = getRoutePolicy('/' + language + (clean === '/' ? '' : clean));
        localizedPath = policy.canonicalPath + url.search + url.hash;
    }
    return <Link {...props} to={localizedPath}>{children}</Link>;
}
