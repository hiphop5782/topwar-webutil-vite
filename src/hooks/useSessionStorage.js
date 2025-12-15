import { useEffect, useState } from "react";

export default function useSessionStorage(key, initialValue) {
    const [value, setValue] = useState(()=>{
        if(typeof window === 'undefined') {
            return initialValue;
        }

        try {
            const item = window.sessionStorage.getItem(key);
            if(item === "undefined") return initialValue;
            return item ? JSON.parse(item) : initialValue;
        }
        catch(error) {
            console.error(error);
            return initialValue;
        }
    });

    useEffect(()=>{
        try {
            if(typeof window !== 'undefined') {
                window.sessionStorage.setItem(key, JSON.stringify(value));
            }
        }
        catch(error) {
            console.error("Error : " + error);
        }

        return [value, setValue];
    }, [key, value]);
}