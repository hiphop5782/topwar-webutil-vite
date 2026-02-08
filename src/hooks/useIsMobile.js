import { throttle } from "lodash";
import { useEffect, useState } from "react";

export function useIsMobile(breakpoint=768) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);

    useEffect(()=>{
        const handleResize = throttle(()=>{
            setIsMobile(window.innerWidth <= breakpoint);
        }, 250);
        window.addEventListener("resize", handleResize);

        return ()=>window.removeEventListener("resize", handleResize);
    }, [breakpoint]);

    return isMobile;
}