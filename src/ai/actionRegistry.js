export const allowedPaths = [
    { 
        path: "/", 
        label: "홈",
        examples: ["첫페이지", "메인", "홈"],
        chatbot: true,
    },
    { 
        path: "/information/base", 
        label: "기지",
        examples: ["기지", "베이스"],
        chatbot: true,
    },
    { 
        path: "/information/job", 
        label: "직업",
        examples: ["직업", "전투", "기계", "직상", "연구", "개발"],
        chatbot: true,
    },
    { 
        path: "/information/kartz", 
        label: "카르츠 정보",
        examples: ["카르츠 라운드", "카르츠 몬스터", "카르츠 보스"],
        chatbot: true,
        queryParams: {
            boss: {
                type: "boolean",
                required: false,
                description: "보스 라운드만 표시"
            },
        },
    },
    { 
        path: "/information/kartz/rank", 
        label: "카르츠 랭킹",
        examples: ["카르츠 전체 랭킹", "카르츠 등수"],
        chatbot: true,
        queryParams: {
            when: {
                type: "string",
                required: false,
                description: "조회할 연월. YYYY-MM 형식. 예: 2026-02",
                pattern: "2[0-9]{3}-(0[1-9]|1[0-2])"
            },
            server: {
                type: "number",
                required: false,
                description: "조회할 서버 번호"
            },
        }
    },
    { 
        path: "/information/kartz/server", 
        label: "카르츠 서버",
        examples: ["카르츠 서버별", "카르츠 서버랭킹", "카르츠 비교"],
        chatbot: true,
    },
    { 
        path: "/information/data", 
        label: "유저 정보",
        examples: ["Top 100", "서버별 유저 정보", "닉네임 검색", "닉네임 찾기", "유저 랭킹", "캐릭 랭킹", "캐릭터 랭킹"],
        chatbot: true,
        queryParams: {
            server: {
                type: "number",
                required: false,
                description: "조회할 서버 번호"
            },
            user: {
                type: "string",
                required: false,
                description: "조회할 유저 닉네임"
            },
        },
    },
    { 
        path: "/information/data/server", 
        label: "서버 정보",
        examples: ["서버 비교", "서버 인구"],
        chatbot: true,
        queryParams: {
            server: {
                type: "string",
                required: false,
                description: "조회하거나 비교할 서버 번호 목록. 여러 서버는 쉼표로 구분한다. 예: 3223 또는 3223,3224,3225",
                pattern: "^[1-9][0-9]*(,[1-9][0-9]*)*$",
                aliases: ["서버", "서버번호", "server", "serverNumber"]
            },
        },
    },
    { 
        path: "/information/ssc", 
        label: "봉인석",
        examples: ["봉인석", "SSC", "Seal Stone Chaos", "봉인된 성소", "봉인석 랭킹", "봉인석 전장 랭킹"],
        chatbot: true,
        queryParams: {
            server: {
                type: "number",
                required: false,
                description: "조회할 서버 번호"
            },
            min: {
                type: "number",
                required: false,
                description: "조회할 최소 점수"
            },
        },
    },
    { 
        path: "/information/realpower", 
        label: "서버 분석",
        examples: ["AI 서버 분석", "진짜 유저", "실제 유저", "서버 분석"],
        chatbot: true,
        queryParams: {
            server: {
                type: "number",
                required: false,
                description: "분석할 서버 번호"
            }
        },
    },
    { 
        path: "/simulator/titan-research", 
        label: "타이탄제작",
        examples: ["타이탄만들기", "타이탄생성"],
        chatbot: true,
    },
    { 
        path: "/simulator/titan-refine", 
        label: "타이탄재련",
        examples: ["타이탄제련", "타이탄개조"],
        chatbot: true,
    },
    { 
        path: "/simulator/formation-perk", 
        label: "군진",
        examples: ["군진특성", "군진", "샤크", "스콜", "스콜피온", "이글"],
        chatbot: true,
    },
    { 
        path: "/simulator/lotto", 
        label: "로또",
        examples: ["로또", "lotto"],
        chatbot: true,
    },
    { 
        path: "/post", 
        label: "공략",
        examples: ["블로그", "포스트", "공략"],
        chatbot: true,
    },
    { 
        path: "/developer", 
        label: "개발자",
        examples: ["제작자", "개발자", "만든사람"],
        chatbot: true,
    },
];

function createAllowedPathItems(paths) {
    return paths.map(item => {
        const result = {
            path: item.path,
            label: item.label,
            examples: item.examples || [],
        };

        if (item.queryParams && Object.keys(item.queryParams).length > 0) {
            result.queryParams = item.queryParams;
        }

        return result;
    });
}

export function createActionRegistry({ navigate }) {
    const chatbotPaths = allowedPaths.filter(item => item.chatbot === true);
    const allowedPathValues = chatbotPaths.map(item => item.path);

    return {
        navigate: {
            description: "허용된 일반 페이지로 이동한다",
            requiredParams: ["path"],
            examples: chatbotPaths.flatMap(item => item.examples || []),
            allowedValues: {
                path: createAllowedPathItems(chatbotPaths)
            },
            run: ({ path, query }) => {
                if (!allowedPathValues.includes(path)) {
                    throw new Error("허용되지 않은 이동 요청입니다");
                }

                const queryString =
                    query && Object.keys(query).length > 0
                        ? new URLSearchParams(query).toString()
                        : "";

                navigate(queryString ? `${path}?${queryString}` : path);
            },
        },
    };
}