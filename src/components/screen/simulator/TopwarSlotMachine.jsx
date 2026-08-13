import { Helmet } from "react-helmet-async";
import "./TopwarSlotMachine.css";

export default function TopwarSlotMachine () {

    return (<>
        <Helmet>
            <meta name="robots" content="noindex, follow" />
        </Helmet>
        
        <div className="iframe-container">
            <iframe src="https://hiphop5782.github.io/topwar-slot/" allowFullScreen></iframe>
        </div>
    </>)
}