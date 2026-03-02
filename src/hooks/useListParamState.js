import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * 기존 파라미터를 보존하면서 리스트(배열) 상태를 관리하는 훅
 */
export const useListParamState = (key, defaultValue = []) => {
    const [searchParams, setSearchParams] = useSearchParams();

    // 1. 현재 URL에서 해당 키의 값을 읽어옴 (Getter)
    const value = useMemo(() => {
        const param = searchParams.get(key);
        return param ? param.split(",").filter(Boolean) : defaultValue;
    }, [searchParams, key, defaultValue]);

    // 2. 파라미터 업데이트 (Setter)
    const setValue = useCallback((newValue) => {
        setSearchParams((prev) => {
            // 핵심: 기존의 모든 파라미터(server, date, lang 등)를 그대로 복사
            const nextParams = new URLSearchParams(prev);
            
            // 함수형 업데이트(prev => ...) 대응
            const resolvedValue = typeof newValue === 'function' ? newValue(value) : newValue;

            if (resolvedValue && resolvedValue.length > 0) {
                // 해당 키값만 업데이트
                nextParams.set(key, resolvedValue.join(","));
            } else {
                // 데이터가 비었으면 해당 키만 삭제
                nextParams.delete(key);
            }
            
            return nextParams;
        }, { replace: true }); // 브라우저 기록 최적화
    }, [key, setSearchParams, value]);

    return [value, setValue];
};