import { useEffect, useRef, useState } from "react";

const AD_SCRIPT_URL = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

function loadAdScript() {
    if (document.querySelector(`script[src^="${AD_SCRIPT_URL}"]`)) return;
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `${AD_SCRIPT_URL}?client=ca-pub-3737135009848849`;
    document.head.appendChild(script);
}

export default function GoogleAds({ vertical = false }) {
    const containerRef = useRef(null);
    const adRef = useRef(null);
    const requested = useRef(false);
    const [visible, setVisible] = useState(false);
    const building = window.__PRERENDER_INJECTED?.building === true;
    const localHost = ["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"].includes(window.location.hostname) || window.location.hostname.endsWith(".localhost");
    const enabled = import.meta.env.PROD && !building && !localHost;

    useEffect(() => {
        if (!enabled) return;
        const container = containerRef.current;
        const checkWidth = () => {
            if (container.getBoundingClientRect().width > 0) setVisible(true);
        };
        const observer = new ResizeObserver(checkWidth);
        observer.observe(container);
        checkWidth();
        return () => observer.disconnect();
    }, [enabled]);

    useEffect(() => {
        if (!enabled || !visible) return;
        const element = adRef.current;
        const requestAd = () => {
            if (requested.current || !element.isConnected || element.getBoundingClientRect().width <= 0) return;
            requested.current = true;
            if (element.hasAttribute("data-adsbygoogle-status")) return;
            try {
                loadAdScript();
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (error) {
                console.warn("AdSense request failed", error);
            }
        };
        const observer = new ResizeObserver(requestAd);
        observer.observe(element);
        requestAd();
        return () => observer.disconnect();
    }, [enabled, visible]);

    const style = { display: "block", width: "100%", minHeight: vertical ? 600 : 100 };
    return (
        <div ref={containerRef} style={{ width: "100%", maxWidth: vertical ? 160 : "100%", minWidth: 0 }}>
            {enabled && visible ? (
                <ins ref={adRef} className="adsbygoogle" style={style} data-ad-client="ca-pub-3737135009848849" data-ad-slot={vertical ? "4296267290" : "2847454256"} data-ad-format="auto" data-full-width-responsive="true" />
            ) : (
                <div aria-label="Advertisement" style={style} />
            )}
        </div>
    );
}
