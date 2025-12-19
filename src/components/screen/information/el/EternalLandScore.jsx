import ELmap from "@src/assets/images/el-map.jpg";
import Buildings from "@src/assets/json/el/buildings.json";
import { reverse, throttle } from "lodash";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./EternalLandScore.css";
import { GrRadialSelected } from "react-icons/gr";

export default function EternalLandScore() {

    const map = useRef();
    const [mapWidth, setMapWidth] = useState(0);
    const [mapHeight, setMapHeight] = useState(0);
    const [hoverObject, setHoverObject] = useState(null);
    const [facilities, setFacilities] = useState([]);

    useEffect(()=>{
        setFacilities(Buildings.map(building=>({
            ...building,
            selected:false,
        })))
    }, []);

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
        // if(building.x > 70) x = -115; 
        // else if(building.x > 30) x = -50;
        
        // if(building.y > 70) y = -115;
        // else if(building.y > 30) y = -50;

        if(building.x > 30) x = -115;
        y = -50;

        return `translate(${x}%, ${y}%)`;
    }, []);

    const toggleObject = useCallback((target)=>{
        setFacilities(facilities.map(facility=>{
            if(facility.name === target.name) {
                return {...facility, selected : !facility.selected};
            }
            return facility;
        }));
    }, [facilities]);

    const selectedFacilities = useMemo(()=>{
        return facilities.filter(facility=>facility.selected);
    }, [facilities]);

    const selectedFacilitiesPoint = useMemo(()=>{
        return selectedFacilities.reduce((acc, facility)=>acc + facility.point, 0);
    }, [selectedFacilities]);

    return (<>
        <div className="position-relative" ref={map}>
            <img src={ELmap} width={"100%"} height={500} alt="eternel land map"/>
            {facilities.map((facility, index)=>(
            <div key={index} className="position-absolute" style={
                    {
                        top: `${facility.y}%`,
                        left: `${facility.x}%`,
                        transform: `translate(-50%, -50%) rotate(-45deg) skew(15deg, 15deg)`,
                        backgroundColor : `${facility.color}`,
                        width: `${mapWidth*0.015}px`,
                        height: `${mapWidth*0.015}px`,
                        cursor: `pointer`,
                        boxShadow:`${facility.selected ? '0 0 5px 5px rgb(255, 234, 167)' : ''}`
                    }
                }
                onMouseEnter={e=>setHoverObject(facility)}
                onMouseLeave={e=>setHoverObject(null)}
                onClick={e=>toggleObject(facility)}
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

        <div className="row mt-4">
            <div className="col">
                {selectedFacilities.map((facility, index)=>(
                <div key={index}>
                    {facility.name} / 1분당 {facility.point.toLocaleString()}점
                </div>
                ))}
            </div>
        </div>

        <div className="row mt-4 mb-4 pb-4">
            <div className="col">
                <div className="fs-2"><span className="fw-bold text-primary">1분</span> 당 총 <span className="fw-bold text-danger">{selectedFacilitiesPoint.toLocaleString()}</span> 점 획득 가능</div>
                <div className="fs-2"><span className="fw-bold text-primary">1시간</span> 당 총 <span className="fw-bold text-danger">{(selectedFacilitiesPoint * 60).toLocaleString()}</span> 점 획득 가능</div>
                <div className="fs-2"><span className="fw-bold text-primary">1일</span> 당 총 <span className="fw-bold text-danger">{(selectedFacilitiesPoint * 60 * 24).toLocaleString()}</span> 점 획득 가능</div>
            </div>
        </div>
    </>);
}