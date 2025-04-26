import { useEffect } from "react";

const GoogleAdsVertical = ({
    className="adsbygoogle",
    width=120,
    height=400,
    dataAdClient,
    dataAdSlot,
}) => {

    useEffect(()=>{
        if (typeof window !== "undefined") {
            if (!window.adsbygoogle) {
                // AdSense 스크립트 동적으로 추가
                const script = document.createElement("script");
                script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5256661935690588";
                script.async = true;
                document.head.appendChild(script);
            } else {
                try {
                    window.adsbygoogle.push({});
                } catch (e) {
                    console.error("AdSense push error:", e);
                }
            }
        }
    }, []);

    if(process.env.NODE_ENV !== "production") {
        return (
            <div style={{
                backgroundColor:"#2d3436",
                color:"white",
                fontSize:"20px",
                fontWeight:"bold",
                width:`${width}px`,
                height:`${height}px`,
                display:"flex",
                justifyContent:"center",
                alignItems:"center",
                margin:"auto",
            }}>
                Ads
            </div>
        )
    }

    return (
        <ins class={className}
            style={{
                display:"inline-block",
                width:`${width}px`,
                height:`${height}px`,
                margin:"auto",
            }}
            data-ad-client={dataAdClient}
            data-ad-slot={dataAdSlot}></ins>
    );
};

export default GoogleAdsVertical;