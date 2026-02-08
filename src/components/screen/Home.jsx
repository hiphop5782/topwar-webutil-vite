import BannerImage from "@src/assets/images/topwar-helper-banner.jpg";
import "./Home.css";

import UtterancesComments from "../comments/UtterancesComments";
import TopwarGame from "./simulator/TopwarGame";

function Home() {

    return (<>
        <div className="row">
            <div className="col">
                <TopwarGame/>
            </div>
        </div>
    </>);
}

export default Home;