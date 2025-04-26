import "./HeroViewer.css";
import { useCallback } from "react";

function HeroViewer({hero}) {

    const highlight = useCallback(str=>{
        const str2 = highlightNumber(str);
        const str3 = highlightSkill(str2);
        return str3;
    }, []);
    const highlightNumber = useCallback(str=>{
        return str.replace(/(\d+(\.\d+)?)/g, "<span class='highlight-number'>$1</span>");
    }, []);
    const highlightSkill = useCallback(str=>{
        return str.replace(/(\[[가-힣\s]+\])/g, "<span class='highlight-skill'>$1</span>")
    }, []);

    return (
        <>
            {hero === null ? (
                <>영웅을 선택하세요</>
            ) : (
                <>
                    <div className="card mb-3">
                        <h3 className="card-header">{hero.name}</h3>
                        <div className="card-body">
                            <p className="card-text">
                                {hero.types.map((type,index)=>(
                                    <span className="badge bg-secondary mx-1" key={index}>{type}</span>
                                ))}
                            </p>
                        </div>
                        <ul className="list-group list-group-flush text-start">
                            <li className="list-group-item">{hero.skill.name}</li>
                            {hero.skill.internal && 
                            <li className="list-group-item">
                                <span className="badge bg-secondary">내정</span><br/>
                                <p dangerouslySetInnerHTML={{__html:highlight(hero.skill.internal)}}></p>
                            </li>}
                            {hero.skill.ready && 
                            <li className="list-group-item">
                                <span className="badge bg-primary">준비</span><br/>
                                <p dangerouslySetInnerHTML={{__html:highlight(hero.skill.ready)}}></p>
                            </li>}
                            {hero.skill.active && 
                            <li className="list-group-item">
                                <span className="badge bg-danger">액티브</span><br/>
                                <p dangerouslySetInnerHTML={{__html:highlight(hero.skill.active)}}></p>
                            </li>}
                            {hero.skill.passive && 
                            <li className="list-group-item">
                                <span className="badge bg-success">패시브</span><br/>
                                <p dangerouslySetInnerHTML={{__html:highlight(hero.skill.passive)}}></p>
                            </li>}
                            {hero.skill.level3 && 
                            <li className="list-group-item">
                                <span className="badge bg-secondary">전속 3레벨</span><br/>
                                <p dangerouslySetInnerHTML={{__html:highlight(hero.skill.level3)}}></p>
                            </li>}
                            {hero.skill.level5 && 
                            <li className="list-group-item">
                                <span className="badge bg-secondary">전속 5레벨</span><br/>
                                <p dangerouslySetInnerHTML={{__html:highlight(hero.skill.level5)}}></p>
                            </li>}
                            {hero.skill.level7 && 
                            <li className="list-group-item">
                                <span className="badge bg-secondary">전속 7레벨</span><br/>
                                <p dangerouslySetInnerHTML={{__html:highlight(hero.skill.level7)}}></p>
                            </li>}
                        </ul>
                    </div>
                </>
            )}
        </>
    );
}

export default HeroViewer;