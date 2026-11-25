import ResearchHub from './screen/post/ResearchHub';
import AppearanceGallery from './screen/information/appearance/AppearanceGallery';
import ServerDirectory from "@src/components/screen/information/server/ServerDirectory";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import PageNotFound from "./error/PageNotFound";
import VitalCalculator from '@src/components/screen/calculator/VitalCalculator';
import LegacyEmoji from '@src/components/screen/emoji/LegacyEmoji';
import Home from '@src/components/screen/Home';
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
import GoogleAds from "@src/components/adsense/GoogleAds";
// 기존 광고 복원 시 아래 import와 함수 내부 설정을 함께 활성화하고 해당 위치의 GoogleAds를 주석 처리한다.
// import KakaoAds from "@src/components/adsense/KakaoAds";
// import AdsterraBanner from "@src/components/adsense/AdsterraBanner";
// import { useVisitorCountry } from "@src/hooks/useVisitorCountry";
import EternalLandScore from "@src/components/screen/information/el/EternalLandScore";
import EternalLandDarkforce from "@src/components/screen/information/el/EternalLandDarkforce";
import AttendanceVoteCreator from "@src/components/screen/vote/AttendanceVoteCreator";
import AttendanceVoteReader from "@src/components/screen/vote/AttendanceVoteReader";
import AttendanceVoteManager from "@src/components/screen/vote/AttendanceVoteManager";
import AttendanceVoteHistory from "@src/components/screen/vote/AttendanceVoteHistory";
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
import PostList from "@src/components/screen/post/PostList";
import Post from "@src/components/screen/post/Post";
import TopwarSscPointViewer from "@src/components/screen/history/2026-ssc/TopwarSscPointViewer";
import TopwarRealPowerViewer from "@src/components/screen/information/server/TopwarRealPowerViewer";
import TopwarDataOverAll from "@src/components/screen/information/server/TopwarDataOverAll";
import TopwarTPViewer from "@src/components/screen/information/server/TopwarTPViewer";

import SscDashboard from "@src/components/screen/history/2026-ssc/SscDashboard";
import LionDanceRanking from "@src/components/screen/history/liondance/LionDanceRanking";

import ItemLevelCostCalculator from "@src/components/screen/calculator/ItemLevelCostCalculator";
import SealStoneChaos from "@src/components/screen/history/2026-ssc/SealStoncChaos";
import SealStoneChaos2027 from "@src/components/screen/history/2027-ssc/SealStoneChaos2027";
import Ssc2PersonalRank from "@src/components/screen/history/2027-ssc/Ssc2PersonalRank";
import Ssc2ServerRank from "@src/components/screen/history/2027-ssc/Ssc2ServerRank";
import Ssc2TrainAnalyzer from "@src/components/screen/history/2027-ssc/Ssc2TrainAnalyzer";
import Privacy from "@src/components/screen/etc/Privacy";
import Contact from "@src/components/screen/etc/Contact";
import Disclaimer from "@src/components/screen/etc/Disclaimer";
import About from "@src/components/screen/etc/About";

import CityRewardEvent from "@src/components/screen/event/CityRewardEvent";

import ThiefFinder from "@src/components/screen/vip/ThiefFinder";
import RouteSEO from "@src/components/template/RouteSEO";
import RouteAnalytics from "@src/components/template/RouteAnalytics";
import PlanCreator from "@src/components/screen/plan/PlanCreator";
import PlanViewer from "@src/components/screen/plan/PlanViewer";
// import { useIsMobile } from "@src/hooks/useIsMobile";

export default function MainContentView() {
    const location = useLocation();
    // 사이드 광고는 CSS로 숨겨 화면 폭을 왕복해도 같은 광고 요소를 유지한다.
    // 검색 조건 변경이나 데이터 갱신에는 광고를 다시 요청하지 않는다.
    const adPageKey = location.pathname;
    // 기존 광고 복원용 설정 (한국: 애드핏, 해외: Adsterra).
    // const isBelowSideAdWidth = useIsMobile(991);
    // const useCompactBanner = useIsMobile(1091);
    // const visitorCountry = useVisitorCountry(location.search);
    // const useAdsterra = visitorCountry != null && visitorCountry !== "KR";

    return (
        <div className="row mb-5 pb-5">
            <div className="col-lg-2 d-none d-lg-flex justify-content-center align-items-start">
                <GoogleAds key={`left-${adPageKey}`} vertical />
                {/* 기존 좌측 광고 복원용
                {!isBelowSideAdWidth && visitorCountry && (useAdsterra
                    ? <AdsterraBanner key={`left-adsterra-${adPageKey}`} adKey="74d11ec5bd55d44100537e0fdfde2231" width={160} height={600} />
                    : <KakaoAds key={`left-kakao-${adPageKey}`} id="DAN-2TYGu5OktHTg0aW6" width={160} height={600} />)}
                */}
            </div>
            <div className="col-lg-8">
                <RouteSEO />
                <RouteAnalytics />
                <div className="mb-4">
                    <GoogleAds key={`top-${adPageKey}`} />
                    {/* 기존 상단 광고 복원용
                    <div className="d-flex justify-content-center align-items-center">
                        {visitorCountry && (useCompactBanner ? (useAdsterra
                            ? <AdsterraBanner key={`compact-adsterra-${adPageKey}`} adKey="803200a0f22a3c468a48fa872462c0b7" width={320} height={50} />
                            : <KakaoAds key={`compact-kakao-${adPageKey}`} id="DAN-lZUjWtUlP8hglGID" width={320} height={50} />) : (useAdsterra
                            ? <AdsterraBanner key={`wide-adsterra-${adPageKey}`} adKey="c0635d2c36f9e90bd00715eb73b70551" width={728} height={90} />
                            : <KakaoAds key={`wide-kakao-${adPageKey}`} id="DAN-Z2S2sYjDqUqroYxO" width={728} height={90} />))}
                    </div>
                    */}
                </div>

                <ResearchHub contextual />

                {/* routes */}
                <Routes>
                    <Route index element={<Home />}></Route>

                    {/* 포스트 */}
                    <Route path="post" element={<PostList />}></Route>
                    <Route path="post/:folder" element={<Post />}></Route>

                    <Route path="information/appearance" element={<AppearanceGallery />} />
                    <Route path="information/job" element={<JobInformation />}></Route>
                    {/* <Route path="information/kartz-spec" element={<KartzSpecInformation/>}></Route> */}
                    {/* <Route path="information/kartz-rank" element={<KartzRankInformation/>}></Route> */}
                    <Route path="information/kartz-statistics" element={<KartzStatistics />}></Route>

                    <Route path="information/el" element={<EternalLand />}>
                        <Route index element={<EternalLandScore />} />
                        {/* <Route path="howto" element={<EternalLandHowto/>}/> */}
                        {/* <Route path="tip" element={<EternalLandTip/>}/> */}
                        {/* <Route path="reward" element={<EternalLandReward/>}/> */}
                        <Route path="darkforce" element={<EternalLandDarkforce />} />
                        <Route path="score" element={<ELScoreCalculator />} />
                    </Route>
                    <Route path="information/data" element={<TopwarDataViewer />}>
                        <Route index element={<TopwarPlayerDataViewer />}></Route>
                        <Route path="overall" element={<TopwarDataOverAll />}></Route>
                        <Route path="troops" element={<TopwarTPViewer />}></Route>
                        <Route path="servers" element={<ServerDirectory />} />
                        <Route path="server" element={<TopwarServerDataViewer />}></Route>
                        <Route path="alliance" element={<TopwarAllianceDataViewer />}></Route>
                        <Route path="move" element={<TopwarPlayerMoveHistory defaultDays={7} />}></Route>
                        <Route path="nickname" element={<TopwarPlayerNicknameHistory />}></Route>
                        <Route path="player-detail" element={<TopwarPlayerDetail />}></Route>
                        <Route path="realpower" element={<TopwarRealPowerViewer />}></Route>
                        {/* <Route path="compare" element={<TopwarCompareViewer/>}></Route> */}
                        {/* <Route path="realtime" element={<TopwarServerRealtimeDataViewer/>}></Route> */}
                    </Route>
                    <Route path="information/kartz" element={<KartzDataViewer />}>
                        <Route index element={<KartzSpecInformation />}></Route>
                        <Route path="rank" element={<KartzRankViewer />}></Route>
                        <Route path="server" element={<KartzServerHistoryViewer />}></Route>
                    </Route>

                    {/* <Route path="information/ssc" element={<TopwarSscPointViewer/>}></Route> */}


                    <Route path="calculator/vital" element={<VitalCalculator />}></Route>
                    <Route path="calculator/skill" element={<SkillCalculator />}></Route>
                    <Route path="calculator/value-pack" element={<ValuePackCalculator />}></Route>
                    <Route path="calculator/cost" element={<ItemLevelCostCalculator />}></Route>

                    <Route path="simulator/formation-perk" element={<FormationPerk />}></Route>
                    <Route path="simulator/titan-research" element={<TitanResearchSimulator />}></Route>
                    <Route path="simulator/titan-refine" element={<TitanRefineSimulator />}></Route>
                    <Route path="developer" element={<Developer />}></Route>
                    <Route path="emoji/create" element={<EmojiCreator />}></Route>
                    <Route path="emoji/list" element={<LegacyEmoji />}></Route>
                    {/* <Route path="/blog" element={<Blog />}></Route> */}
                    <Route path="account/viewer" element={<AccountViewer />}></Route>
                    <Route path="account/profile" element={<AccountProfilePage />}></Route>
                    <Route path="account/creator" element={
                        <RecoilRoot>
                            <AccountCreator />
                        </RecoilRoot>
                    }></Route>
                    <Route path="vote/create" element={<AttendanceVoteCreator />}></Route>
                    <Route path="vote/cast" element={<AttendanceVoteReader />}></Route>
                    <Route path="vote/cast/:voteId" element={<AttendanceVoteHistory />}></Route>
                    <Route path="vote/cast/:serverId/:voteId" element={<AttendanceVoteReader />}></Route>
                    <Route path="vote/:serverId/:voteId" element={<AttendanceVoteReader />}></Route>
                    <Route path="vote/manage" element={<AttendanceVoteManager />}></Route>
                    <Route path="vote/manage/:voteId" element={<AttendanceVoteManager />}></Route>
                    <Route path="vote/:serverId/:voteId/manage" element={<AttendanceVoteManager />}></Route>
                    <Route path="plan/create" element={<PlanCreator />}></Route>
                    <Route path="plan/:serverId" element={<PlanViewer />}></Route>

                    {/* history */}
                    <Route path="history/ssc-2026" element={<SealStoneChaos />}>
                        <Route index element={<SscDashboard />} />
                        <Route path="users" element={<TopwarSscPointViewer />} />
                    </Route>
                    <Route path="history/ssc-2027" element={<SealStoneChaos2027 />}>
                        <Route index element={<Ssc2ServerRank />} />
                        <Route path="train" element={<Ssc2TrainAnalyzer />} />
                        <Route path="users" element={<Ssc2PersonalRank />} />
                    </Route>
                    <Route path="history/liondance" element={<LionDanceRanking />} />

                    {/* event */}
                    <Route path="event/city-reward" element={<CityRewardEvent />}></Route>
                    <Route path="vip/:serverId" element={<ThiefFinder />}></Route>


                    <Route path="privacy" element={<Privacy />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="disclaimer" element={<Disclaimer />} />
                    <Route path="about" element={<About />} />

                    {/* 404 not found */}
                    <Route path="*" element={<PageNotFound />}></Route>
                </Routes>
            </div>
            <div className="col-lg-2 d-none d-lg-flex justify-content-center align-items-start">
                <GoogleAds key={`right-${adPageKey}`} vertical />
                {/* 기존 우측 광고 복원용
                {!isBelowSideAdWidth && visitorCountry && (useAdsterra
                    ? <AdsterraBanner key={`right-adsterra-${adPageKey}`} adKey="c122a76ecae2b7efdd6a5b10f03dd1f3" width={160} height={600} />
                    : <KakaoAds key={`right-kakao-${adPageKey}`} id="DAN-WwP4DvEIbCS6Wv93" width={160} height={600} />)}
                */}
            </div>
        </div>
    )
}
