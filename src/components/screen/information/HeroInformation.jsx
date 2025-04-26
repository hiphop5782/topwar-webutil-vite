import HeroListJson from "@src/assets/json/hero.json";
import "./HeroInformation.css"
import { useCallback, useEffect, useState } from "react";
import HeroViewer from "./HeroViewer";
import HeroComparator from "./HeroComparator";

function HeroInformation() {
    const [heroList, setHeroList] = useState(HeroListJson);
    const [firstHero, setFirstHero] = useState(null);
    const [secondHero, setSecondHero] = useState(null);

    const selectFirstHero = useCallback(e => {
        const value = e.target.value;
        setFirstHero(value ? JSON.parse(value) : null);
    }, []);

    const selectSecondHero = useCallback(e => {
        const value = e.target.value;
        setSecondHero(value ? JSON.parse(value) : null);
    }, []);

    return (
        <>
            <div className="row">
                <div className="col-12">
                    <h1>영웅 정보</h1>
                    <p>복잡한 영웅 비교를 조금 더 쉽게!</p>
                </div>
            </div>

            <hr />

            <div className="row mt-2">
                <label className="col-md-3 col-form-label">
                    첫 번째 영웅
                </label>
                <div className="col-md-9">
                    <select className="form-select" onChange={selectFirstHero}>
                        <option value="">선택하세요</option>
                        {heroList.map((hero, index) => (
                            <option key={index} value={JSON.stringify(hero)}>{hero.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="row mt-2">
                <label className="col-md-3 col-form-label">
                    두 번째 영웅
                </label>
                <div className="col-md-9">
                    <select className="form-select" onChange={selectSecondHero}>
                        <option value="">선택하세요</option>
                        {heroList.map((hero, index) => (
                            <option key={index} value={JSON.stringify(hero)}>{hero.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <hr />

            <div className="row mt-2">
                <div className="col-md-4 text-center">
                    <HeroViewer hero={firstHero}/>
                </div>

                <div className="col-md-4 text-center">
                    <HeroViewer hero={secondHero}/>
                </div>

                <div className="col-md-4 text-center">
                    <HeroComparator firstHero={firstHero} secondHero={secondHero}/>
                </div>
            </div>
        </>
    );
}

export default HeroInformation;