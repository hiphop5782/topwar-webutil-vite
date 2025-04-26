import { NavLink } from "react-router-dom";

function Menu() {
    return (
        <nav className="navbar navbar-expand-lg bg-primary fixed-top" data-bs-theme="dark">
            <div className="container-fluid">
                <NavLink className="navbar-brand" to="/">Topwar Helper</NavLink>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarColor01" aria-controls="navbarColor01" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarColor01">
                    <ul className="navbar-nav me-auto"> 
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">정보</a>
                            <div className="dropdown-menu">
                                <NavLink className="dropdown-item" to="/information/base">기지 정보</NavLink>
                                {/* <NavLink className="dropdown-item" to="/information/decor">장식 정보</NavLink> */}
                                {/* <NavLink className="dropdown-item" to="/information/hero">영웅 정보</NavLink> */}
                                <div className="dropdown-divider"></div>
                                <NavLink className="dropdown-item" to="/information/job">전문 직업 강화</NavLink>
                                <NavLink className="dropdown-item" to="/information/formation-perk">군진 특성</NavLink>
                                <div className="dropdown-divider"></div>
                                <NavLink className="dropdown-item" to="/information/server-info">서버 비교 분석</NavLink>
                                <div className="dropdown-divider"></div>
                                <NavLink className="dropdown-item" to="/information/kartz-spec">카르츠 몬스터 정보</NavLink>
                                <NavLink className="dropdown-item" to="/information/kartz-rank">카르츠 순위 현황</NavLink>
                            </div>
                        </li>
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">계산기</a>
                            <div className="dropdown-menu">
                                <NavLink className="dropdown-item" to="/calculator/vital">체력 회복 속도 계산기</NavLink>
                                {/* <NavLink className="dropdown-item" to="/calculator/gathering">채집 속도 계산기</NavLink> */}
                                <NavLink className="dropdown-item" to="/calculator/skill">전속 조각 계산기</NavLink>
                                <NavLink className="dropdown-item" to="/calculator/value-pack">특별패키지 계산기</NavLink>
                                {/* <div className="dropdown-divider"></div>/ */}
                                {/* <a className="dropdown-item">Separated link</a> */}
                            </div>
                        </li>
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">시뮬레이터</a>
                            <div className="dropdown-menu">
                                <NavLink className="dropdown-item" to="/simulator/titan-research">타이탄제작</NavLink>
                                <NavLink className="dropdown-item" to="/simulator/titan-refine">타이탄재련</NavLink>
                                <div className="dropdown-divider"></div>
                                <NavLink className="dropdown-item" to="/simulator/random">랜덤추첨기</NavLink>
                                {/* <NavLink className="nav-link" to="/simulator/hero">데미지계산기</NavLink> */}
                            </div>
                        </li>
                        <li className="nav-item">
                            <NavLink className="nav-link" to="/emoji">이모티콘</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink className="nav-link" to="/developer">개발자</NavLink>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Menu;