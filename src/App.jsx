import "bootswatch/dist/litera/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.esm.js";

import "./App.css";
import "./i18n";

import { BrowserRouter } from "react-router-dom";

import LanguageRouter from "@src/components/LanguageRouter";
import Chatbot from "@src/components/ai/Chatbot";

function App() {
    return (
        <BrowserRouter
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
            }}
        >
            <LanguageRouter />
            <Chatbot />
        </BrowserRouter>
    );
}

export default App;