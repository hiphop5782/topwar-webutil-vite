import './App.css'

//loading bootstrap + bootswatch
import 'bootswatch/dist/litera/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.esm.js';

//loading router
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';

import "./i18n";
import LanguageRouter from '@src/components/LanguageRouter';
import Chatbot from '@src/components/ai/Chatbot';

function App() {
  return (
    <BrowserRouter future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}>
      <LanguageRouter/>
      <Chatbot/>
    </BrowserRouter>
  )
}

export default App
