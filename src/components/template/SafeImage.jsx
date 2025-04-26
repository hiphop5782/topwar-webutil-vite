import { useEffect, useState } from "react";

const SafeImage = ({src, alt, ...props})=>{
    const [error, setError] = useState(false);
    useEffect(()=>{
        setError(false);
    }, [src]);


    if(error || !src) return null;
    return (
        <img src={src} alt={alt} onError={()=>setError(true)} {...props}/>
    )
};

export default SafeImage;