import NameCard from "@src/assets/images/developer.png";

function Developer() {
    return (
        <>
            <div className="row">
                <div className="col">
                    <h1>개발자 정보</h1>
                    <hr/>
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
        </>
    );
}

export default Developer;