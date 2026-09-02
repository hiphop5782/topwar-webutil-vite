import { Route, Routes } from "react-router-dom";
import PageNotFound from "./error/PageNotFound";
import VitalCalculator from '@src/components/screen/calculator/VitalCalculator';
import LegacyEmoji from '@src/components/screen/emoji/LegacyEmoji';
import Home from '@src/components/screen/Home';
import BaseInformation from '@src/components/screen/information/BaseInformation';
import FormationPerk from '@src/components/screen/simulator/FormationPerk';
import JobInformation from '@src/components/screen/information/JobInformation';
import KartzSpecInformation from '@src/components/screen/information/kartz/KartzSpecInformation';
import TitanRefineSimulator from '@src/components/screen/simulator/TitanRefineSimulator';
import TitanResearchSimulator from '@src/components/screen/simulator/TitanResearchSimulator';
import SkillCalculator from '@src/components/screen/calculator/SkillCalculator';
import ValuePackCalculator from '@src/components/screen/calculator/VapuePackCalculator';
import Developer from '@src/components/screen/Developer';
import EternalLand from "@src/components/screen/information/el/EternalLand";
import AccountViewer from "@src/components/screen/trade/AccountViewer";
import AccountCreator from "@src/components/screen/trade/AccountCreator";
import AccountProfilePage from "@src/components/screen/trade/account-profile/AccountProfilePage";
import KartzStatistics from "@src/components/screen/information/KartzStatistics";
import { RecoilRoot } from "recoil";
import ELScoreCalculator from "@src/components/screen/information/el/ELScoreCalculator";
import KakaoAds from "@src/components/adsense/KakaoAds";
import { useIsMobile } from "@src/hooks/useIsMobile";
import EternalLandScore from "@src/components/screen/information/el/EternalLandScore";
import EternalLandDarkforce from "@src/components/screen/information/el/EternalLandDarkforce";
import AttendanceVoteCreator from "@src/components/screen/vote/AttendanceVoteCreator";
import AttendanceVoteReader from "@src/components/screen/vote/AttendanceVoteReader";
import AttendanceVoteManager from "@src/components/screen/vote/AttendanceVoteManager";
import EmojiCreator from "@src/components/screen/emoji/EmojiCreator";
import TopwarDataViewer from "@src/components/screen/information/server/TopwarDataViewer";
import TopwarPlayerDataViewer from "@src/components/screen/information/server/TopwarPlayerDataViewer";
import TopwarPlayerMoveHistory from "@src/components/screen/information/server/TopwarPlayerMoveHistory";
import TopwarServerDataViewer from "@src/components/screen/information/server/TopwarServerDataViewer";
import TopwarAllianceDataViewer from "@src/components/screen/information/server/TopwarAllianceDataViewer";
import TopwarPlayerNicknameHistory from "@src/components/screen/information/server/TopwarPlayerNicknameHistory";
import TopwarPlayerDetail from "@src/components/screen/information/server/TopwarPlayerDetail";

import KartzDataViewer from "@src/components/screen/information/kartz/KartzDataViewer";
import KartzRankViewer from "@src/components/screen/information/kartz/KartzRankViewer";
import KartzServerHistoryViewer from "@src/components/screen/information/kartz/KartzServerHistoryViewer";
import KartzUserHistoryViewer from "@src/components/screen/information/kartz/KartzUserHistoryViewer";
import PostList from "@src/components/screen/post/PostList";
import Post from "@src/components/screen/post/Post";
import TopwarSscPointViewer from "@src/components/screen/history/2026-ssc/TopwarSscPointViewer";
import TopwarRealPowerViewer from "@src/components/screen/information/server/TopwarRealPowerViewer";
import TopwarDataOverAll from "@src/components/screen/information/server/TopwarDataOverAll";

import SscDashboard from "@src/components/screen/history/2026-ssc/SscDashboard";
import LionDanceRanking from "@src/components/screen/history/liondance/LionDanceRanking";

import ItemLevelCostCalculator from "@src/components/screen/calculator/ItemLevelCostCalculator";
import SealStoneChaos from "@src/components/screen/history/2026-ssc/SealStoncChaos";
import Privacy from "@src/components/screen/etc/Privacy";
import Contact from "@src/components/screen/etc/Contact";
import Disclaimer from "@src/components/screen/etc/Disclaimer";

import CityRewardEvent from "@src/components/screen/event/CityRewardEvent";

import ThiefFinder from "@src/components/screen/vip/ThiefFinder";
import RouteSEO from "@src/components/template/RouteSEO";
import RouteAnalytics from "@src/components/template/RouteAnalytics";

export default function MainContentView() {
    const isMobile = useIsMobile(1200);

    return (
        <div className="row mb-5 pb-5">
            {/* <div className="col-md-2 d-none d-md-flex justify-content-center align-items-start" style={{minWidth:"160px"}}> */}
            <div className="col-md-2 d-none d-md-flex justify-content-center align-items-start">
                {/* <GoogleAdsVertical dataAdClient="ca-pub-5256661935690588" dataAdSlot="2606768455"/> */}
                {/* <KakaoAds id="DAN-2TYGu5OktHTg0aW6" width={160} height={600}/> */}
            </div>
            <div className="col-md-8">
                <RouteSEO />
                <RouteAnalytics />
                {/* 카카오 애드핏 수평 광고 */}
                <div className="row mb-4">
                    <div className="col d-flex justify-content-center align-items-center">
                        {/* 
                        {isMobile ? (
                            <KakaoAds id="DAN-lZUjWtUlP8hglGID" width={320} height={50} />
                        ) : (
                            <KakaoAds id="DAN-Z2S2sYjDqUqroYxO" width={728} height={90} />
                        )}
                        */}
                    </div>
                </div>

                {/* routes */}
                <Routes>
                    <Route index element={<Home />}></Route>

                    {/* 포스트 */}
                    <Route path="post" element={<PostList/>}></Route>
                    <Route path="post/:folder" element={<Post/>}></Route>

                    <Route path="information/base" element={<BaseInformation />}></Route>
                    <Route path="information/job" element={<JobInformation />}></Route>
                    {/* <Route path="information/kartz-spec" element={<KartzSpecInformation/>}></Route> */}
                    {/* <Route path="information/kartz-rank" element={<KartzRankInformation/>}></Route> */}
                    <Route path="information/kartz-statistics" element={<KartzStatistics/>}></Route>
                    
                    <Route path="information/el" element={<EternalLand/>}>
                        <Route index element={<EternalLandScore/>}/>
                        {/* <Route path="howto" element={<EternalLandHowto/>}/> */}
                        {/* <Route path="tip" element={<EternalLandTip/>}/> */}
                        {/* <Route path="reward" element={<EternalLandReward/>}/> */}
                        <Route path="darkforce" element={<EternalLandDarkforce/>}/>
                        <Route path="score" element={<ELScoreCalculator/>}/>
                    </Route>
                    <Route path="information/data" element={<TopwarDataViewer/>}>
                        <Route index element={<TopwarPlayerDataViewer/>}></Route>
                        <Route path="overall" element={<TopwarDataOverAll/>}></Route>
                        <Route path="server" element={<TopwarServerDataViewer/>}></Route>
                        <Route path="alliance" element={<TopwarAllianceDataViewer/>}></Route>
                        <Route path="move" element={<TopwarPlayerMoveHistory defaultDays={7}/>}></Route>
                        <Route path="nickname" element={<TopwarPlayerNicknameHistory />}></Route>
                        <Route path="player-detail" element={<TopwarPlayerDetail />}></Route>
                        <Route path="realpower" element={<TopwarRealPowerViewer/>}></Route>
                        {/* <Route path="compare" element={<TopwarCompareViewer/>}></Route> */}
                        {/* <Route path="realtime" element={<TopwarServerRealtimeDataViewer/>}></Route> */}
                    </Route>
                    <Route path="information/kartz" element={<KartzDataViewer/>}>
                        <Route index element={<KartzSpecInformation/>}></Route>
                        <Route path="rank" element={<KartzRankViewer/>}></Route>
                        <Route path="user" element={<KartzUserHistoryViewer/>}></Route>
                        <Route path="server" element={<KartzServerHistoryViewer/>}></Route>
                    </Route>

                    {/* <Route path="information/ssc" element={<TopwarSscPointViewer/>}></Route> */}
                    
                    
                    <Route path="calculator/vital" element={<VitalCalculator />}></Route>
                    <Route path="calculator/skill" element={<SkillCalculator />}></Route>
                    <Route path="calculator/value-pack" element={<ValuePackCalculator/>}></Route>
                    <Route path="calculator/cost" element={<ItemLevelCostCalculator/>}></Route>

                    <Route path="simulator/formation-perk" element={<FormationPerk />}></Route>
                    <Route path="simulator/titan-research" element={<TitanResearchSimulator />}></Route>
                    <Route path="simulator/titan-refine" element={<TitanRefineSimulator />}></Route>
                    <Route path="developer" element={<Developer/>}></Route>
                    <Route path="emoji/create" element={<EmojiCreator />}></Route>
                    <Route path="emoji/list" element={<LegacyEmoji />}></Route>
                    {/* <Route path="/blog" element={<Blog />}></Route> */}
                    <Route path="account/viewer" element={<AccountViewer/>}></Route>
                    <Route path="account/profile" element={<AccountProfilePage/>}></Route>
                    <Route path="account/creator" element={
                        <RecoilRoot>
                            <AccountCreator/>
                        </RecoilRoot>
                    }></Route>
                    <Route path="vote/create" element={<AttendanceVoteCreator/>}></Route>
                    <Route path="vote/cast" element={<AttendanceVoteReader/>}></Route>
                    <Route path="vote/cast/:voteId" element={<AttendanceVoteReader/>}></Route>
                    <Route path="vote/manage" element={<AttendanceVoteManager/>}></Route>
                    <Route path="vote/manage/:voteId" element={<AttendanceVoteManager/>}></Route>

                    {/* history */}
                    <Route path="history/ssc-2026" element={<SealStoneChaos/>}>
                        <Route index element={<SscDashboard/>}/>
                        <Route path="users" element={<TopwarSscPointViewer/>}/>
                    </Route>
                    <Route path="history/liondance" element={<LionDanceRanking/>}/>

                    {/* event */}
                    <Route path="event/city-reward" element={<CityRewardEvent/>}></Route>
                    <Route path="vip/:serverId" element={<ThiefFinder/>}></Route>


                    <Route path="privacy" element={<Privacy/>}/>
                    <Route path="contact" element={<Contact/>}/>
                    <Route path="disclaimer" element={<Disclaimer/>}/>

                    {/* 404 not found */}
                    <Route path="*" element={<PageNotFound />}></Route>
                </Routes>
            </div>
            {/* <div className="col-md-2 d-none d-md-flex justify-content-center align-items-start" style={{minWidth:"160px"}}> */}
            <div className="col-md-2 d-none d-md-flex justify-content-center align-items-start">
                {/* <GoogleAdsVertical dataAdClient="ca-pub-5256661935690588" dataAdSlot="8253345796"/> */}
                {/* <KakaoAds id="DAN-WwP4DvEIbCS6Wv93"/> */}
            </div>
        </div>
    ) 
}
