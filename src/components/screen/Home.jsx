import BannerImage from "@src/assets/images/topwar-helper-banner.jpg";
import "./Home.css";

import UtterancesComments from "../comments/UtterancesComments";

function Home() {

    return (<>
        <div className="row">
            <div className="col">
                <h1 className="mb-4">Topwar 유틸리티 페이지 입니다</h1>
                <p>
                    개인이 운영하는 홈페이지여서 항상 최신 정보가 아닐 수도 있습니다<br/>
                    필요한 기능이 있거나 문의사항 등은 댓글로 남겨주세요.
                    <span className="text-muted ms-2">(Github 계정이 필요합니다)</span>

                    <br/><br/>
                    아니면 3223 서버의 
                    <b className="text-primary mx-2">ＫＩＤ³²²³</b>
                    에게 채팅 보내주세요!
                </p>
            </div>
        </div>
        <hr />
        <div className="row mt-4">
            <div className="col">
                <UtterancesComments />
            </div>
        </div>
    </>);
}

export default Home;