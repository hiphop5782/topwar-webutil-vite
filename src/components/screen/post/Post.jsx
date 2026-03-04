import { useEffect, useState, useMemo, memo } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import fm from "front-matter";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
// import { ko, enUS, ja } from "date-fns/locale";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
import { FaChevronLeft, FaChevronRight, FaList } from "react-icons/fa6";

const ALL_MODULES = import.meta.glob("/src/assets/md/*/readme.md", { query: "?raw" });
// const localeMap = { ko, en: enUS, ja };

// ✅ 리딩 바 (내부 상태 격리)
const ReadingBar = () => {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const currentScroll = window.scrollY;
            if (totalHeight <= 0) return;
            setWidth((currentScroll / totalHeight) * 100);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(0,0,0,0.05)' }}>
            <div style={{
                width: `${width}%`, height: '100%',
                background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
                transition: 'width 0.1s ease-out'
            }} />
        </div>
    );
};

export default function Post() {
    const { folder } = useParams();
    const { i18n } = useTranslation();
    const [post, setPost] = useState({ attributes: {}, body: "" });
    const [pagination, setPagination] = useState({ prev: null, next: null });

    useEffect(() => {
        const loadPageData = async () => {
            const keys = Object.keys(ALL_MODULES).sort();
            const targetPath = `/src/assets/md/${folder}/readme.md`;
            const currentIndex = keys.findIndex(path => path.includes(`/${folder}/`));

            if (ALL_MODULES[targetPath]) {
                const mod = await ALL_MODULES[targetPath]();
                const { attributes, body } = fm(mod.default);
                setPost({ attributes, body });
                window.scrollTo(0, 0);
            }

            const getPostInfo = async (path) => {
                if (!path) return null;
                const mod = await ALL_MODULES[path]();
                const { attributes } = fm(mod.default);
                const pathParts = path.split("/");
                const fName = pathParts[pathParts.length - 2];
                return { folder: fName, title: attributes.title || fName };
            };

            const [prevInfo, nextInfo] = await Promise.all([
                getPostInfo(keys[currentIndex - 1]),
                getPostInfo(keys[currentIndex + 1])
            ]);
            setPagination({ prev: prevInfo, next: nextInfo });
        };
        loadPageData();
    }, [folder]);

    return (
        <div className="container-fluid p-0">
            {/* 1. Sticky 헤더 섹션: 우측 끝 버튼 배치 */}
            <div className="sticky-top bg-white border-bottom shadow-sm" style={{ top: '56px', zIndex: 1020 }}>
                <div className="container-fluid py-2" style={{ maxWidth: '1000px' }}>
                    <div className="d-flex justify-content-between align-items-center px-3">
                        {/* 왼쪽: 제목 */}
                        <h5 className="fw-bold m-0 text-truncate text-start" style={{ maxWidth: '60%' }}>
                            {post.attributes.title || folder}
                        </h5>
                        
                        {/* 오른쪽 끝: 버튼 그룹 */}
                        <div className="d-flex gap-2 flex-shrink-0">
                            <LanguageRouterLink to={pagination.prev ? `/post/${pagination.prev.folder}` : "#"} 
                                className={`btn btn-sm ${!pagination.prev ? 'btn-light disabled' : 'btn-outline-secondary'}`}>
                                    <FaChevronLeft/>
                            </LanguageRouterLink>
                            
                            <LanguageRouterLink to="/post" className="btn btn-sm btn-outline-dark px-3">
                                <FaList/>
                            </LanguageRouterLink>

                            <LanguageRouterLink to={pagination.next ? `/post/${pagination.next.folder}` : "#"} 
                                className={`btn btn-sm ${!pagination.next ? 'btn-light disabled' : 'btn-outline-secondary'}`}>
                                <FaChevronRight/>
                            </LanguageRouterLink>
                        </div>
                    </div>
                </div>
                <ReadingBar />
            </div>

            {/* 2. 마크다운 본문 섹션 */}
            <div className="container-fluid my-5" style={{ maxWidth: '900px' }}>
                <div className="markdown-body text-start px-3">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                            code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || "");
                                return !inline && match ? (
                                    <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                                        {String(children).replace(/\n$/, "")}
                                    </SyntaxHighlighter>
                                ) : (
                                    <code className={className} {...props}>{children}</code>
                                );
                            },
                            img: ({ src, alt }) => {
                                const imagePath = src.startsWith('./')
                                    ? new URL(`/src/assets/md/${folder}/${src.replace('./', '')}`, import.meta.url).href
                                    : src;
                                return <img src={imagePath} alt={alt} style={{ maxWidth: "100%", borderRadius: "8px", margin: "20px 0" }} />;
                            },
                            table: ({ children }) => (
                                <div className="table-responsive my-4">
                                    <table className="table table-bordered table-striped">{children}</table>
                                </div>
                            )
                        }}
                    >
                        {post.body}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
}