import { useMemo } from "react";
import fm from "front-matter";
import { format, formatDistanceToNow } from "date-fns";
import { ko, enUS, ja } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";

const localeMap = { ko, en: enUS, ja };

const modules = import.meta.glob("/src/assets/md/*/readme.md", {eager: true, query: "?raw"});

export default function PostList() {
    const { i18n } = useTranslation();

    // i18n.language가 'ko-KR'처럼 올 수 있으므로 앞의 두 글자만 자르는 것이 안전합니다.
    const currentLang = i18n.language.split('-')[0];
    const currentLocale = localeMap[currentLang] || enUS; // 매핑 실패 시 영어 기본

    const posts = useMemo(()=>{
        return Object.keys(modules).sort((a,b)=>b.localeCompare(a)).map((path, index)=>{
            const pathParts = path.split("/");
            const folderName = pathParts[pathParts.length-2];
            const rawContent = modules[path].default || "";
            const {attributes, body} = fm(rawContent);
            return {
                no : index,
                title: attributes.title || "제목이 없는 포스트",
                folder: folderName,
                date: attributes.date || "",
                tags: attributes.tags || [],
                summary: attributes.description || "",
            }
        });
    }, [modules]);

    return (<>
        <h1>포스트 ({posts.length})</h1>

        <hr/>

        <ul className="list-group list-group-flush">
        {posts.map(post=>(
            <li className="list-group-item p-4 border-0 px-0" key={post.no}>
                <div className="shadow p-4 rounded border border-secondary">
                    <h3 className="text-truncate mb-4 fw-bold">
                        <LanguageRouterLink to={`/post/${post.folder}`} className="text-primary text-decoration-none">{post.title}</LanguageRouterLink>
                    </h3>
                    <p className="text-muted">{post.summary}</p>
                    <p className="text-muted text-end">{formatDistanceToNow(post.date, {addSuffix:true, locale:currentLocale})}</p>
                </div>
            </li>
        ))}
        </ul>
    </>)
}