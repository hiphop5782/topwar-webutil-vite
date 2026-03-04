import './App.css'

//loading bootstrap + bootswatch
import 'bootswatch/dist/sandstone/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.esm.js';

//loading router
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';

import "./i18n";
import LanguageRouter from './components/LanguageRouter';

function App() {
  return (
    <BrowserRouter future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}>
      <LanguageRouter/>
    </BrowserRouter>
  )
}

export default App
