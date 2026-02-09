import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom"
import Menu from "./Menu";
import MainContentView from "./MainContentView";
import { Bounce, ToastContainer } from "react-toastify";
import { supportedLngs, defaultLng } from "@src/i18n"; // i18n에서 가져옴

function WithLanguageRouter() {
    const { lang } = useParams();

    if(!supportedLngs.includes(lang)) {
        return <Navigate to={`/${supportedLngs}`} replace/>
    }

    const location = useLocation();

    return (
    <div className="container-fluid mt-5 pt-4">
        <Menu/>
        <MainContentView/>
        <ToastContainer
                position="bottom-right"
                autoClose={5000}
                hideProgressBar
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                transition={Bounce}/>
    </div>
    )
}
function WithoutLanguageRouter() {
    const location = useLocation();
    const path = location.pathname;

    // ✅ 정규식을 동적으로 생성 (ko|en|ja...)
    const langRegex = new RegExp(`^/(${supportedLngs.join('|')})(/|$)`);
    const isWithLang = langRegex.test(path);
    if (isWithLang) return <Navigate to={path} replace />;

    return <Navigate to={`/${supportedLanguages.default}${path}`} replace/>
}

export default function LanguageRouter() {

    return (
        <Routes>
            <Route path="/:lang/*" element={<WithLanguageRouter/>}/>
            <Route path="*" element={<WithoutLanguageRouter/>}/>
        </Routes>
    );
}