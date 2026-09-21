import ScreenErrorBoundary from './components/error/ScreenErrorBoundary'
import { createRoot } from 'react-dom/client'
import 'pretendard/dist/web/static/pretendard.css';
import './index.css'
import App from './App.jsx'
import { HelmetProvider } from "react-helmet-async";

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <HelmetProvider>
      <ScreenErrorBoundary><App /></ScreenErrorBoundary>
    </HelmetProvider>
  // </StrictMode>,
)
