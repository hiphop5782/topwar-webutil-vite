import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const EMPTY_LIST = [];

export const useListParamState = (key, defaultValue = EMPTY_LIST) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const value = useMemo(() => {
        const param = searchParams.get(key);

        if (!param) {
            return defaultValue;
        }

        return [...new Set(
            param
                .split(",")
                .map(item => item.trim())
                .filter(Boolean)
        )];
    }, [searchParams, key, defaultValue]);

    const setValue = useCallback((newValue) => {
        setSearchParams((prev) => {
            const nextParams = new URLSearchParams(prev);

            const currentParam = prev.get(key);
            const currentValue = currentParam
                ? currentParam.split(",").map(item => item.trim()).filter(Boolean)
                : defaultValue;

            const resolvedValue =
                typeof newValue === "function" ? newValue(currentValue) : newValue;

            if (resolvedValue && resolvedValue.length > 0) {
                nextParams.set(key, resolvedValue.join(","));
            } else {
                nextParams.delete(key);
            }

            return nextParams;
        }, { replace: true });
    }, [key, setSearchParams, defaultValue]);

    return [value, setValue];
};