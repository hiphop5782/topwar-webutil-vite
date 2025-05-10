import ELmap from "@src/assets/images/el-map.jpg";
import Buildings from "@src/assets/json/el/buildings.json";
import { throttle } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";

import "./EternalLand.css";

export default function EternalLand() {

    const map = useRef();
    const [mapWidth, setMapWidth] = useState(0);
    const [mapHeight, setMapHeight] = useState(0);
    const [hoverObject, setHoverObject] = useState(null);

    useEffect(()=>{
        const updateSize = throttle(()=>{
            if(map.current) {
                setMapWidth(map.current.offsetWidth);
                setMapHeight(map.current.offsetHeight);
            }
        }, 100);

        window.addEventListener("resize", updateSize);
        updateSize();

        return ()=>window.removeEventListener("resize", updateSize);
    }, [map]);
    
    const calculateTranslate = useCallback((building)=>{
        let x = 15, y = 15;
        if(building.x > 70) x = -115; 
        else if(building.x > 30) x = -50;

        if(building.y > 70) y = -115;
        else if(building.y > 30) y = -50;

        return `translate(${x}%, ${y}%)`;
    }, []);

    return (<>
        <h1>영원의 땅</h1>

        <div className="position-relative" ref={map}>
            <img src={ELmap} width={"100%"} alt="eternel land map"/>
            {Buildings.map(building=>(
            <div className="position-absolute" style={
                    {
                        top: `${building.y}%`,
                        left: `${building.x}%`,
                        transform: `translate(-50%, -50%) rotate(-45deg) skew(15deg, 15deg)`,
                        // transform: "translate(-50%, -50%)",
                        backgroundColor : `${building.color}`,
                        width: `${mapWidth*0.015}px`,
                        height: `${mapWidth*0.015}px`,
                        cursor: `pointer`
                    }
                }
                onMouseEnter={e=>setHoverObject(building)}
                onMouseLeave={e=>setHoverObject(null)}
            ></div>
            ))}
            {hoverObject !== null && (
            <div className="building-information" style={
                {
                    top:`${hoverObject.y + 0.5}%`,
                    left:`${hoverObject.x + 0.5}%`,
                    width: 150,
                    transform: `${calculateTranslate(hoverObject)}`
                }
            }>
                <div className="fs-6 text-nowrap">{hoverObject.name}</div>
                <hr/>
                <div className="row text-nowrap">
                    <div className="col-5 text-start">
                        <span className="fw-bold text-primary me-1">1 분</span>당 
                    </div>
                    <div className="col-7 text-end">
                        <span className="fw-bold text-danger">
                            {hoverObject.point.toLocaleString()}
                        </span> 점  
                    </div>
                </div>
                <div className="row text-nowrap">
                    <div className="col-5 text-start">
                        <span className="fw-bold text-primary me-1">1 시간</span>당 
                    </div>
                    <div className="col-7 text-end">
                        <span className="fw-bold text-danger">
                            {(hoverObject.point * 60).toLocaleString()}
                        </span> 점  
                    </div>
                </div>
                <div className="row text-nowrap">
                    <div className="col-5 text-start">
                        <span className="fw-bold text-primary me-1">1 일</span>당 
                    </div>
                    <div className="col-7 text-end">
                        <span className="fw-bold text-danger">
                            {(hoverObject.point * 60 * 24).toLocaleString()}
                        </span> 점  
                    </div>
                </div>
            </div>
            )}
        </div>
    </>);
}