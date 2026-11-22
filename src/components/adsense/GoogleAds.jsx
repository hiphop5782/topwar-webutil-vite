import { useEffect, useRef } from "react";

export default function GoogleAds({ vertical = false }) {
    const adRef = useRef(null);
    const requested = useRef(false);
    const building = window.__PRERENDER_INJECTED?.building === true;
    const enabled = import.meta.env.PROD && !building;

    useEffect(() => {
        if (!enabled) return;
        const element = adRef.current;
        const requestAd = () => {
            if (requested.current || !element.isConnected || element.getBoundingClientRect().width <= 0) return;
            requested.current = true;
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (error) {
                console.warn("AdSense request failed", error);
            }
        };
        const observer = new ResizeObserver(requestAd);
        observer.observe(element);
        requestAd();
        return () => observer.disconnect();
    }, [enabled]);

    const style = { display: "block", width: "100%", minHeight: vertical ? 600 : 100 };
    return (
        <div style={{ width: "100%", maxWidth: vertical ? 160 : "100%", minWidth: 0 }}>
            {enabled ? (
                <ins ref={adRef} className="adsbygoogle" style={style} data-ad-client="ca-pub-3737135009848849" data-ad-slot={vertical ? "4296267290" : "2847454256"} data-ad-format="auto" data-full-width-responsive="true" />
            ) : (
                <div aria-label="Advertisement" style={style} />
            )}
        </div>
    );
}
