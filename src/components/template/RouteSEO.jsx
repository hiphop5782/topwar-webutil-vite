import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { getRoutePolicy } from '@src/config/routePolicy';
import { createSiteUrl } from '@src/utils/siteUrl';
import SEO from './SEO';

export default function RouteSEO() {
    const { pathname, search } = useLocation();
    const { t } = useTranslation('seo');
    const policy = getRoutePolicy(pathname, search);
    const serverId = policy.routePath.startsWith('/vip/') ? policy.routePath.split('/')[2] : undefined;
    const title = t(policy.key + '.title', { serverId });
    return <SEO title={title}
        description={t(policy.key + '.description', { defaultValue: t('default.description', { title }) })}
        canonical={createSiteUrl(policy.canonicalPath)}
        alternates={policy.alternates.map(item => ({ language: item.language, href: createSiteUrl(item.path) }))}
        noindex={policy.noindex} />;
}
