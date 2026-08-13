import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import "./PageNotFound.css";

export default function PageNotFound() {
    const location = useLocation();

    const language = location.pathname.split("/")[1];
    const supportedLanguages = ["ko", "en", "ja"];

    const homePath = supportedLanguages.includes(language)
        ? `/${language}`
        : "/ko";

    return (
        <>
            <Helmet>
                <title>페이지를 찾을 수 없습니다 | Topwar Helper</title>
                <meta name="robots" content="noindex, follow" />
            </Helmet>

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