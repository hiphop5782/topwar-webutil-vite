import { use, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createActionRegistry } from "./actionRegistry"
import { useTranslation } from "react-i18next";

//AI 에이전트 적용을 위한 훅
export function useChatActions() {
    const navigate = useNavigate();
    const { i18n } = useTranslation();

    const lang = i18n.language || "ko";

    const navigateWithLang = useCallback((path) => {
        if (path === "/") {
            navigate(`/${lang}`);
            return;
        }

        navigate(`/${lang}${path}`);
    }, [navigate, lang]);

    const actionRegistry = useMemo(()=>{
        return createActionRegistry({navigate : navigateWithLang});
    }, [navigate, lang]);

    return useMemo(() => {
        //check validation and run actions
        const runAction = (actionName, params = {}) => {
            const action = actionRegistry[actionName];

            if (!action) {
                console.warn("허용되지 않은 액션", actionName);
                return { success: false, message: "지원하지 않는 기능입니다" };
            }

            const requiredParams = action.requiredParams || [];

            for (const key of requiredParams) {
                if (params[key] === undefined || params[key] === null || params[key] === "") {
                    console.log("필수 파라미터 누락", key);
                    return { success: false, message: `${key} 값이 필요합니다` };
                }
            }

            action.run(params);

            return { success: true, message: `${actionName}을 실행합니다` };
        };

        const getActionDescriptions = () => {
            return Object.entries(actionRegistry)
                .map(([name, action]) => {
                    const params =
                        action.requiredParams?.length > 0
                            ? action.requiredParams.join(", ")
                            : "없음";

                    return `- ${name}: ${action.description} / requiredParams: ${params}`;
                })
                .join("\n");
        };

        return { actionRegistry, runAction, getActionDescriptions };
    }, [navigate]);
}