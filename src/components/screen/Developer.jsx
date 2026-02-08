import NameCard from "@src/assets/images/developer.png";
import UtterancesComments from "../comments/UtterancesComments";

function Developer() {
    return (
        <>
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
            <div className="row mt-4">
                <div className="col-sm-6">
                    <div className="card mb-3">
                        <h3 className="card-header">KID³²²³</h3>
                        <div className="card-body">
                            <h5 className="card-title">탑워를 좋아하는 흔한 유저 중 하나</h5>
                            <h6 className="card-subtitle text-muted">주특기 - 시뮬레이션 만들기</h6>
                            <a href="https://open.kakao.com/o/glCbXJVg" class="btn btn-link">이전 문의</a>
                        </div>
                        <img src={NameCard}/>
                        {/* <div className="card-body">
                            <p className="card-text">사람 좋고 열정 가득한 2690 서버로 오세요!</p>
                        </div>
                        <ul className="list-group list-group-flush">
                            <li className="list-group-item"><a href="https://hiphop5782.gitbook.io/lpi-dubu" className="card-link">2690 서버 홍보글 보러가기</a></li>
                        </ul> */}
                    </div>
                </div>
            </div>
            <hr />
            <div className="row mt-4">
                <div className="col">
                    <UtterancesComments />
                </div>
            </div>
        </>
    );
}

export default Developer;