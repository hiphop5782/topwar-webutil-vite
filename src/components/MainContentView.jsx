import { Route, Routes } from "react-router-dom";
import PangeNotFound from "./error/PageNotFound";
import GatheringCalculator from './screen/calculator/GatheringCalculator';
import VitalCalculator from './screen/calculator/VitalCalculator';
import Emoji from './screen/Emoji';
import Home from './screen/Home';
import BaseInformation from './screen/information/BaseInformation';
import FormationPerk from './screen/simulator/FormationPerk';
import JobInformation from './screen/information/JobInformation';
import KartzRankInformation from './screen/information/KartzRankInformation';
import KartzSpecInformation from './screen/information/KartzSpecInformation';
import ServerAnalyzer from './screen/information/ServerAnalyzer';
import TitanRefineSimulator from './screen/simulator/TitanRefineSimulator';
import TitanResearchSimulator from './screen/simulator/TitanResearchSimulator';
import SkillCalculator from './screen/calculator/SkillCalculator';
import ValuePackCalculator from './screen/simulator/VapuePackCalculator';
import RandomSimulator from './screen/simulator/RandomSimulator';
import Developer from './screen/Developer';
import EternalLand from "./screen/information/EternalLand";
import AccountViewer from "./screen/trade/AccountViewer";
import AccountCreator from "./screen/trade/AccountCreator";
import TopwarSlotMachine from "./screen/simulator/TopwarSlotMachine";
import LuckyBox from "./screen/simulator/LuckyBox";
import KartzStatistics from "./screen/information/KartzStatistics";

export default function MainContentView() {
    return (
        <div className="row">
            <div className="col-md-2 d-none d-md-block">
                {/* <GoogleAdsVertical dataAdClient="ca-pub-5256661935690588" dataAdSlot="2606768455"/> */}
            </div>
            <div className="col-md-8">
            <Routes>
                <Route index element={<Home />}></Route>
                <Route path="information/base" element={<BaseInformation />}></Route>
                {/* <Route path="information/hero" element={<HeroInformation/>}></Route> */}
                {/* <Route path="information/decor" element={<DecorInformation/>}></Route> */}
                <Route path="information/job" element={<JobInformation />}></Route>
                <Route path="information/kartz-spec" element={<KartzSpecInformation/>}></Route>
                <Route path="information/kartz-rank" element={<KartzRankInformation/>}></Route>
                <Route path="information/kartz-statistics" element={<KartzStatistics/>}></Route>
                <Route path="information/el" element={<EternalLand/>}></Route>
                <Route path="information/server-info" element={<ServerAnalyzer />}></Route>
                <Route path="calculator/vital" element={<VitalCalculator />}></Route>
                <Route path="calculator/gathering" element={<GatheringCalculator />}></Route>
                <Route path="calculator/skill" element={<SkillCalculator />}></Route>
                <Route path="calculator/value-pack" element={<ValuePackCalculator/>}></Route>
                <Route path="simulator/random" element={<RandomSimulator/>}></Route>
                {/* <Route path="simulator/hero" element={<HeroSimulator/>}></Route> */}
                <Route path="simulator/formation-perk" element={<FormationPerk />}></Route>
                <Route path="simulator/titan-research" element={<TitanResearchSimulator />}></Route>
                <Route path="simulator/titan-refine" element={<TitanRefineSimulator />}></Route>
                <Route path="simulator/slot" element={<TopwarSlotMachine/>}></Route>
                <Route path="simulator/luckybox" element={<LuckyBox/>}></Route>
                <Route path="developer" element={<Developer/>}></Route>
                <Route path="emoji" element={<Emoji />}></Route>
                {/* <Route path="/blog" element={<Blog />}></Route> */}
                <Route path="account/viewer" element={<AccountViewer/>}></Route>
                <Route path="account/creator" element={<AccountCreator/>}></Route>
                <Route path="*" element={<PangeNotFound />}></Route>
            </Routes>
            </div>
            <div className="col-md-2 d-none d-md-block">
                {/* <GoogleAdsVertical dataAdClient="ca-pub-5256661935690588" dataAdSlot="8253345796"/> */}
            </div>
        </div>
    )
}