import './ResearchHub.css';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import LanguageRouterLink from '@src/components/template/LanguageRouterLink';
import { getRoutePolicy } from '@src/config/routePolicy';
import { researchCollections } from '@src/config/researchCollections';
import { publicPosts } from './publicPosts';

export default function ResearchHub({ compact = false, contextual = false, folder }) {
    const { i18n, t } = useTranslation('seo');
    const { pathname } = useLocation();
    const language = ['ko','en','ja'].includes(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'ko';
    const route = getRoutePolicy(pathname).routePath;
    const groups = contextual ? researchCollections.filter(group => folder ? group.posts.includes(folder) : group.matches.some(prefix => route.startsWith(prefix))) : researchCollections;
    if (!groups.length) return null;
    const labels = {
        ko: { heading: contextual ? '관련 분석과 자료' : route === '/post' ? '주제별 자료' : 'Top War 조사·분석·공략', more: '분석·공략 전체 보기', tools: '데이터·계산 도구', original: '' },
        en: { heading: contextual ? 'Related research and resources' : route === '/post' ? 'Browse by topic' : 'Top War research and guides', more: 'All research and guides (Korean)', tools: 'Data and calculation tools', original: ' · Korean original' },
        ja: { heading: contextual ? '関連する分析と資料' : route === '/post' ? 'テーマ別の資料' : 'Top War 調査・分析・攻略', more: '分析・攻略一覧（韓国語）', tools: 'データ・計算ツール', original: ' · 韓国語原文' },
    }[language];
    return <section className="research-hub my-4 p-3 p-lg-4 border rounded bg-light" aria-label={labels.heading}>
        <div className="d-flex flex-wrap justify-content-between gap-2 mb-3"><h2 className="h4 mb-0">{labels.heading}</h2>{route !== '/post' && <Link to="/ko/post/">{labels.more}</Link>}</div>
        <div className="row g-3">{groups.map(group => <section key={group.id} id={'research-' + group.id} className={contextual ? 'col-12' : 'col-12 col-xl-6'}>
            <div className="bg-white border rounded p-3 h-100">
                <h3 className="h5">{group.title[language]}</h3>
                {!contextual && <p className="small text-secondary">{group.description[language]}</p>}
                <ul className="mb-2">{group.posts.filter(id => id !== folder).slice(0, compact ? 1 : contextual ? 2 : undefined).map(id => {
                    const post = publicPosts.find(post => post.folder === id);
                    return post && <li key={id} className="mb-2"><Link to={'/ko/post/' + id + '/'}><span lang="ko">{post.attributes.title}</span>{labels.original}</Link>{compact && <p lang="ko" className="small text-secondary mb-0 mt-1">{post.attributes.description}</p>}</li>;
                })}</ul>
                {!compact && <div className="d-flex flex-wrap gap-2"><span className="small fw-bold">{labels.tools}:</span>{group.tools.map(to => <LanguageRouterLink key={to} to={to} className="small">{t(getRoutePolicy(to).key + '.title')}</LanguageRouterLink>)}</div>}
            </div>
        </section>)}</div>
    </section>;
}
