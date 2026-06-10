import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * 기존 파라미터를 보존하면서 단일 query parameter 상태를 관리하는 훅
 */
export const useParamState = (key, defaultValue = "", options = {}) => {
    const {
        replace = true,
        validate,
        parse = (value) => value,
        serialize = (value) => String(value),
    } = options;

    const [searchParams, setSearchParams] = useSearchParams();

    const value = useMemo(() => {
        const param = searchParams.get(key);

        if (param === null) {
            return defaultValue;
        }

        return parse(param);
    }, [searchParams, key, defaultValue, parse]);

    const setValue = useCallback((newValue) => {
        setSearchParams((prev) => {
            const nextParams = new URLSearchParams(prev);

            const resolvedValue =
                typeof newValue === "function" ? newValue(value) : newValue;

            if (validate && !validate(resolvedValue)) {
                return nextParams;
            }

            if (
                resolvedValue === null ||
                resolvedValue === undefined ||
                resolvedValue === ""
            ) {
                nextParams.delete(key);
            } else {
                nextParams.set(key, serialize(resolvedValue));
            }

            return nextParams;
        }, { replace });
    }, [key, replace, serialize, setSearchParams, validate, value]);

    return [value, setValue];
};