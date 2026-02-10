import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom"
import Menu from "./Menu";
import MainContentView from "./MainContentView";
import { Bounce, ToastContainer } from "react-toastify";
import { supportedLngs, defaultLng } from "@src/i18n"; // i18n에서 정확히 가져옴

function WithLanguageRouter() {
    const { lang } = useParams();

    // ✅ 배열이 아니라 단일 기본 언어 문자열(defaultLng)로 리다이렉트
    if (!supportedLngs.includes(lang)) {
        return <Navigate to={`/${defaultLng}`} replace />
    }

    return (
        <div className="container-fluid mt-5 pt-4">
            <Menu />
            <MainContentView />
            <ToastContainer
                position="bottom-right"
                autoClose={5000}
                hideProgressBar
                theme="colored"
                transition={Bounce} />
        </div>
    )
}

function WithoutLanguageRouter() {
    const location = useLocation();
    const path = location.pathname;

    const langRegex = new RegExp(`^/(${supportedLngs.join('|')})(/|$)`);
    const isWithLang = langRegex.test(path);

    // ✅ 무한 루프 방지: 이미 언어가 있다면 리다이렉트 하지 않고 null 반환
    if (isWithLang) return null;

    // ✅ 오타 수정: supportedLanguages.default -> defaultLng
    return <Navigate to={`/${defaultLng}${path}`} replace />
}

export default function LanguageRouter() {
    return (
        <Routes>
            <Route path="/:lang/*" element={<WithLanguageRouter />} />
            <Route path="*" element={<WithoutLanguageRouter />} />
        </Routes>
    );
}