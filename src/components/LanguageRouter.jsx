import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom"
import supportedLanguages from "@src/assets/json/supported-languages.json";
import Menu from "./Menu";
import MainContentView from "./MainContentView";
import { Bounce, ToastContainer } from "react-toastify";

function WithLanguageRouter() {
    const { lang } = useParams();

    if(!supportedLanguages.list.includes(lang)) {
        return <Navigate to={`/${supportedLanguages.default}`} replace/>
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

    // 이미 언어 포함되어 있으면 그대로
    const isWithLang = supportedLanguages.list.some(lang => path.startsWith(`/${lang}/`) || path === `/${lang}`);
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