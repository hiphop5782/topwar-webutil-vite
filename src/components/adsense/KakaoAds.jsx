import { useEffect, useRef } from "react";

export default function KakaoAds({ id , width , height }) {
    //ref
    const adRef = useRef(null);

    //effect
    useEffect(()=>{
        const script = document.createElement("script");
        script.async = true;
        script.type = "text/javascript";
        script.src = "//t1/daumcdn.net/kas/static/ba.min.js";

        const ins = document.createElement("ins");
        ins.className = "kakao_ad_area";
        ins.style.display = "none";
        ins.setAttribute("data-ad-unit", id);
        ins.setAttribute("data-ad-width", `${width}`);
        ins.setAttribute("data-ad-height", `${height}`);

        if(adRef.current) {
            adRef.current.appendChild(ins);
            adRef.current.appendChild(script);
        }

        //clean-up
        return ()=>{
            if(adRef.current) {
                adRef.current.innerHTML = "";
            }
        };
    }, [id]);

    //render
    return <div ref={adRef}/>;
}