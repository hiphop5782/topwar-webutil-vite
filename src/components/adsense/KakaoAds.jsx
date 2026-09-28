import { useEffect, useRef } from "react";

export default function KakaoAds({ id, width=160, height=600, display="none" }) {
    //ref
    const adRef = useRef(null);

    //effect
    useEffect(()=>{
        const container = adRef.current;
        const script = document.createElement("script");
        script.async = true;
        script.type = "text/javascript";
        script.src = "//t1.daumcdn.net/kas/static/ba.min.js";

        const ins = document.createElement("ins");
        ins.className = "kakao_ad_area";
        ins.style.display = display;
        ins.setAttribute("data-ad-unit", id);
        ins.setAttribute("data-ad-width", `${width}`);
        ins.setAttribute("data-ad-height", `${height}`);

        if(container) {
            container.appendChild(ins);
            container.appendChild(script);
        }

        //clean-up
        return ()=>{
            if(container) {
                container.innerHTML = "";
            }
        };
    }, [id, width, height, display]);

    //render
    return <div ref={adRef} style={{position:"sticky", top:100}}/>;
}
