import './App.css'

//loading bootstrap + bootswatch
import 'bootswatch/dist/sandstone/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.esm.js';

//loading router
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import MainContentView from './components/MainContentView';
import Menu from './components/Menu';

function App() {
  return (
    <BrowserRouter>
      <div className="container-fluid mt-5 pt-4">
        <Menu/>
        <MainContentView/>
      </div>
    </BrowserRouter>
  )
}

export default App
