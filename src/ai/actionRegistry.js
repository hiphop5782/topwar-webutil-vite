
export const allowedPaths = [
    { 
        path: "/", 
        label: "홈" ,
        examples: ["첫페이지","메인","홈"]
    },
    { 
        path: "/information/base", 
        label: "기지" ,
        examples: ["기지","베이스"]
    },
    { 
        path: "/information/job", 
        label: "직업",
        examples: ["직업","전투","기계", "직상", "연구", "개발"]
     },
    { 
        path: "/information/kartz", 
        label: "카르츠 정보" ,
        examples: ["카르츠 라운드", "카르츠 몬스터"]
    },
    { 
        path: "/information/kartz/rank", 
        label: "카르츠 랭킹" ,
        examples: ["카르츠 전체 랭킹", "카르츠 등수"]
    },
    { 
        path: "/information/kartz/server", 
        label: "카르츠 서버" ,
        examples: ["카르츠 서버별", "카르츠 서버랭킹", "카르츠 비교"]
    },
    { 
        path: "/information/data", 
        label: "유저 정보" ,
        examples: ["Top 100", "서버별 유저 정보", "닉네임 검색", "닉네임 찾기"]
    },
    { 
        path: "/information/data/server", 
        label: "서버 정보" ,
        examples: ["서버 비교", "서버 인구"]
    },
    { 
        path: "/information/ssc", 
        label: "봉인석" ,
        examples: ["봉인석", "SSC", "Seal Stone Chaos", "봉인된 성소", "봉인석 랭킹"]
    },
    { 
        path: "/information/realpower", 
        label: "서버 분석" ,
        examples: ["AI 서버 분석", "진짜 유저", "실제 유저"]
    },

    { 
        path: "/simulator/titan-research", 
        label: "타이탄제작" ,
        examples: ["타이탄만들기", "타이탄생성"]
    },
    { 
        path: "/simulator/titan-refine", 
        label: "타이탄재련" ,
        examples: ["타이탄제련", "타이탄개조"]
    },
    { 
        path: "/simulator/formation-perk", 
        label: "군진" ,
        examples: ["군진특성", "군진", "샤크", "스콜", "스콜피온", "이글"]
    },
    { 
        path: "/simulator/lotto", 
        label: "로또" ,
        examples: ["로또", "lotto"]
    },

    { 
        path: "/post", 
        label: "공략" ,
        examples: ["블로그","포스트","공략"]
    },
    { 
        path: "/developer", 
        label: "개발자" ,
        examples: ["제작자","개발자","만든사람"]
    },
];

export function createActionRegistry({ navigate }) {
    return {
        navigate: {
            description: "허용된 일반 페이지로 이동한다",
            requiredParams: ["path"],
            examples: allowedPaths.flatMap(item=>item.examples),
            allowedValues: {
                path: allowedPaths.map(item => item.path)
            },
            run: ({ path }) => {
                const allowedPathValues = allowedPaths.map(item => item.path);
                if (!allowedPathValues.includes(path)) {
                    throw new Error("허용되지 않은 이동 요청입니다");
                }
                navigate(path);
            },
        },
    };
}