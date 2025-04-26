import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

//loading bootstrap + bootswatch
import 'bootswatch/dist/sandstone/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.esm.js';

//loading router
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import MainContentView from './components/MainContentView';

function App() {

  return (
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <div className="container-fluid mt-5 pt-4">
        <MainContentView/>
      </div>
    </BrowserRouter>
  )
}

export default App
