import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const parseListParam = value => {
    if (!value?.trim()) return [];

    return [...new Set(
        value
            .split(",")
            .map(item => item.trim())
            .filter(Boolean)
    )];
};

export const useListParamState = key => {
    const [searchParams, setSearchParams] = useSearchParams();

    const value = useMemo(() => {
        return parseListParam(searchParams.get(key));
    }, [searchParams, key]);

    const setValue = useCallback(newValue => {
        setSearchParams(prev => {
            const nextParams = new URLSearchParams(prev);
            const currentValue = parseListParam(prev.get(key));
            const resolvedValue = typeof newValue === "function"
                ? newValue(currentValue)
                : newValue;

            const normalizedValue = [...new Set(
                (resolvedValue ?? [])
                    .map(item => String(item).trim())
                    .filter(Boolean)
            )];

            if (normalizedValue.length > 0) {
                nextParams.set(key, normalizedValue.join(","));
            } else {
                nextParams.delete(key);
            }

            return nextParams;
        }, { replace: true });
    }, [key, setSearchParams]);

    return [value, setValue];
};
