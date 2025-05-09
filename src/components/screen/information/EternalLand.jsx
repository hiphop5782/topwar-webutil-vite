import ELmap from "@src/assets/images/el-map.jpg";
import Buildings from "@src/assets/json/el/buildings.json";
import { throttle } from "lodash";
import { useEffect, useRef, useState } from "react";

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
                }
            }>
                <div className="fs-6">{hoverObject.name}</div>
            </div>
            )}
        </div>
    </>);
}