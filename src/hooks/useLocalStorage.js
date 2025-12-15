import { useEffect, useState } from "react";

export default function useLocalStorage(key, initialValue) {
    const [value, setValue] = useState(()=>{
        if(typeof window === 'undefined') {
            return initialValue;
        }

        try {
            const item = window.localStorage.getItem(key);
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
                window.localStorage.setItem(key, JSON.stringify(value));
            }
        }
        catch(error) {
            console.error("Error : " + error);
        }
    }, [key, value]);


    return [value, setValue];
}