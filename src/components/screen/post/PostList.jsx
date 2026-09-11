import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import SafeImage from "@src/components/template/SafeImage";
import SEO from "../../template/SEO";
import { publicPosts } from './publicPosts';
import { postAssetUrl } from './postAssets';



export default function PostList() {
    const { t } = useTranslation();

    const posts = useMemo(() => {
        return [...publicPosts].reverse()
            .map(({ folder: folderName, attributes, body }, index) => {

                // 본문에서 첫 번째 Markdown 이미지 추출
                const imgRegex =
                    /!\[[^\]]*]\(\s*(?:<([^>]+)>|([^)]+?))\s*\)/;

                const match = body.match(imgRegex);

                let thumbnailUrl = null;

                if (match) {
                    // <경로> 형식이면 match[1]
                    // 일반 경로 형식이면 match[2]
                    let src = (match[1] ?? match[2] ?? "").trim();

                    // 일반 경로 뒤에 Markdown title이 붙은 경우 제거
                    // 예: ./image.png "이미지 설명"
                    src = src.replace(
                        /\s+(?:"[^"]*"|'[^']*')\s*$/,
                        ""
                    );

                    thumbnailUrl = postAssetUrl(folderName, src);

                }

                return {
                    no: index,
                    title: attributes.title || "제목이 없는 포스트",
                    folder: folderName,
                    date: attributes.date || "",
                    tags: attributes.tags || [],
                    summary: attributes.description || "",
                    thumbnail: thumbnailUrl,
                }
            });
    }, []);

    return (<>
        <SEO title={t("seo:post.list.title")}/>

        <div className="container-fluid mb-5">
            <h1>포스트 ({posts.length})</h1>

            <hr />

            <ul className="list-group list-group-flush">
                {posts.map(post => (
                    <li className="list-group-item p-4 border-0 px-0" key={post.no}>
                        <div className="shadow p-4 rounded border border-secondary">
                            <div className="row g-0">
                                {/* ✅ 썸네일 영역: 이미지가 있을 때만 표시 */}
                                {post.thumbnail && (
                                    <div className="col-sm-2">
                                        <LanguageRouterLink to={`/post/${post.folder}`}>
                                            <SafeImage
                                                src={post.thumbnail}
                                                alt={post.title}
                                                className="img-fluid img-thumbnail h-100 w-100"
                                                style={{ objectFit: 'cover', minHeight: '200px' }}
                                            />
                                        </LanguageRouterLink>
                                    </div>
                                )}
                                <div className={post.thumbnail ? "col-sm-10" : "col-12"}>
                                    <div className="p-4 h-100 d-flex flex-column">
                                        <h3 className="text-truncate mb-3 fw-bold">
                                            <LanguageRouterLink to={`/post/${post.folder}`} className="text-primary text-decoration-none">
                                                {post.title}
                                            </LanguageRouterLink>
                                        </h3>
                                        <p className="text-muted flex-grow-1" style={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: '3',
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>
                                            {post.summary}
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </li>
                ))}
            </ul>
        </div>
    </>)
}
