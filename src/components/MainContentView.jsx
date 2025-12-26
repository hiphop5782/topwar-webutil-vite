import { Route, Routes } from "react-router-dom";
import PangeNotFound from "./error/PageNotFound";
import GatheringCalculator from '@src/components/screen/calculator/GatheringCalculator';
import VitalCalculator from '@src/components/screen/calculator/VitalCalculator';
import Emoji from '@src/components/screen/Emoji';
import Home from '@src/components/screen/Home';
import BaseInformation from '@src/components/screen/information/BaseInformation';
import FormationPerk from '@src/components/screen/simulator/FormationPerk';
import JobInformation from '@src/components/screen/information/JobInformation';
import KartzRankInformation from '@src/components/screen/information/KartzRankInformation';
import KartzSpecInformation from '@src/components/screen/information/KartzSpecInformation';
import ServerAnalyzer from '@src/components/screen/information/ServerAnalyzer';
import TitanRefineSimulator from '@src/components/screen/simulator/TitanRefineSimulator';
import TitanResearchSimulator from '@src/components/screen/simulator/TitanResearchSimulator';
import SkillCalculator from '@src/components/screen/calculator/SkillCalculator';
import ValuePackCalculator from '@src/components/screen/simulator/VapuePackCalculator';
import RandomSimulator from '@src/components/screen/simulator/RandomSimulator';
import Developer from '@src/components/screen/Developer';
import EternalLand from "@src/components/screen/information/el/EternalLand";
import AccountViewer from "@src/components/screen/trade/AccountViewer";
import AccountCreator from "@src/components/screen/trade/AccountCreator";
import TopwarSlotMachine from "@src/components/screen/simulator/TopwarSlotMachine";
import LuckyBox from "@src/components/screen/simulator/LuckyBox";
import KartzStatistics from "@src/components/screen/information/KartzStatistics";
import { RecoilRoot } from "recoil";
import ELScoreCalculator from "@src/components/screen/information/el/ELScoreCalculator";
import KakaoAds from "./adsense/KakaoAds";
import { useIsMobile } from "@src/hooks/useIsMobile";
import EternalLandScore from "@src/components/screen/information/el/EternalLandScore";
import EternalLandHowto from "@src/components/screen/information/el/EternalLandHowto";
import EternalLandTip from "@src/components/screen/information/el/EternalLandTip";
import EternalLandReward from "@src/components/screen/information/el/EternalLandReward";
import EternalLandDarkforce from "@src/components/screen/information/el/EternalLandDarkforce";

export default function MainContentView() {
    const isMobile = useIsMobile(1200);

    return (
        <div className="row mb-5 pb-5">
            <div className="col-md-2 d-none d-lg-flex justify-content-center align-items-start" style={{minWidth:"160px"}}>
                {/* <GoogleAdsVertical dataAdClient="ca-pub-5256661935690588" dataAdSlot="2606768455"/> */}
                <KakaoAds id="DAN-2TYGu5OktHTg0aW6" width={160} height={600}/>
            </div>
            <div className="col-md-8">
                {/* 카카오 애드핏 수평 광고 */}
                <div className="row mb-4">
                    <div className="col d-flex justify-content-center align-items-center">
                        {isMobile ? (
                            <KakaoAds id="DAN-lZUjWtUlP8hglGID" width={320} height={50} />
                        ) : (
                            <KakaoAds id="DAN-Z2S2sYjDqUqroYxO" width={728} height={90} />
                        )}
                    </div>
                </div>

                {/* routes */}
                <Routes>
                    <Route index element={<Home />}></Route>
                    <Route path="information/base" element={<BaseInformation />}></Route>
                    {/* <Route path="information/hero" element={<HeroInformation/>}></Route> */}
                    {/* <Route path="information/decor" element={<DecorInformation/>}></Route> */}
                    <Route path="information/job" element={<JobInformation />}></Route>
                    <Route path="information/kartz-spec" element={<KartzSpecInformation/>}></Route>
                    <Route path="information/kartz-rank" element={<KartzRankInformation/>}></Route>
                    <Route path="information/kartz-statistics" element={<KartzStatistics/>}></Route>
                    <Route path="information/el" element={<EternalLand/>}>
                        <Route index element={<EternalLandScore/>}/>
                        <Route path="howto" element={<EternalLandHowto/>}/>
                        <Route path="tip" element={<EternalLandTip/>}/>
                        <Route path="reward" element={<EternalLandReward/>}/>
                        <Route path="darkforce" element={<EternalLandDarkforce/>}/>
                        <Route path="score" element={<ELScoreCalculator/>}/>
                    </Route>
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
                    <Route path="account/creator" element={
                        <RecoilRoot>
                            <AccountCreator/>
                        </RecoilRoot>
                    }></Route>
                    <Route path="*" element={<PangeNotFound />}></Route>
                </Routes>
            </div>
            <div className="col-md-2 d-none d-lg-flex justify-content-center align-items-start" style={{minWidth:"160px"}}>
                {/* <GoogleAdsVertical dataAdClient="ca-pub-5256661935690588" dataAdSlot="8253345796"/> */}
                <KakaoAds id="DAN-WwP4DvEIbCS6Wv93"/>
            </div>
        </div>
    )
}