import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import SEO from "@src/components/template/SEO";
import "./PageNotFound.css";

export default function PageNotFound() {
    const location = useLocation();
    const { t } = useTranslation("seo");

    const language = location.pathname.split("/")[1];
    const supportedLanguages = ["ko", "en", "ja"];

    const homePath = supportedLanguages.includes(language)
        ? `/${language}`
        : "/ko";

    return (
        <>
            <SEO
                title={t("notFound.title")}
                description={t("default.description", {
                    title: t("notFound.title"),
                })}
                noindex
            />

            <div className="not-found">
                <div className="not-found-code">404</div>

                <h1>페이지를 찾을 수 없습니다</h1>

                <p>
                    요청하신 페이지가 삭제되었거나
                    <br />
                    주소가 변경되었을 수 있습니다.
                </p>

                <Link
                    to={homePath}
                    className="not-found-home"
                >
                    홈으로 돌아가기
                </Link>
            </div>
        </>
    );
}
