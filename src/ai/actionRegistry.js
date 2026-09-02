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
        label: "직업 정보",
        examples: ["직업", "직업 정보", "전투 직업", "기계 직업", "연구 직업", "직상"],
        chatbot: true,
    },
    {
        path: "/information/el",
        label: "영원의 땅",
        examples: ["영원의 땅", "영원의땅", "영땅"],
        chatbot: true,
    },
    {
        path: "/information/el/darkforce",
        label: "영원의 땅 암흑군단",
        examples: ["영원의 땅 암흑군단", "영땅 암흑군단"],
        chatbot: true,
    },
    {
        path: "/information/el/score",
        label: "영원의 땅 점수 계산기",
        examples: ["영원의 땅 점수", "영땅 점수 계산"],
        chatbot: true,
    },
    { 
        path: "/information/kartz", 
        label: "카르츠 정보",
        examples: ["카르츠 라운드", "카르츠 몬스터", "카르츠 보스", "카르츠 스펙"],
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
        path: "/information/kartz/user",
        label: "카르츠 유저 기록",
        examples: ["카르츠 유저 기록", "카르츠 개인 기록"],
        chatbot: true,
    },
    {
        path: "/information/kartz-statistics",
        label: "카르츠 통계",
        examples: ["카르츠 통계"],
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
        path: "/information/data/overall",
        label: "올인원 검색",
        examples: ["올인원 검색", "통합 데이터 검색", "전체 플레이어 검색", "서버 연맹 플레이어 통합 검색"],
        chatbot: true,
    },
    {
        path: "/information/data/player-detail",
        label: "플레이어 통합 조회",
        examples: [
            "플레이어 검색",
            "유저 검색",
            "캐릭터 검색",
            "유저 상세 정보",
            "닉네임으로 유저 찾기",
            "캐릭터 정보 조회",
            "플레이어 닉네임 변경 기록",
            "유저 서버 이동 기록",
            "닉네임으로 플레이어 조회"
        ],
        chatbot: true,
        queryParams: {
            nickname: {
                type: "string",
                required: false,
                description: "자동완성으로 조회할 플레이어 닉네임. 한글 자모·초성 및 Unicode 유사문자 검색을 지원한다.",
                aliases: ["닉네임", "유저", "사용자", "플레이어", "캐릭터", "nickname", "user"]
            }
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
        path: "/information/data/realpower",
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
        path: "/information/data/move",
        label: "서버 이동",
        examples: ["서버 이전", "서버 이동", "move server", "server transfer"],
        chatbot: true,
        queryParams: {
            in: {
                type: "number",
                required: false,
                description: "이동한 서버 번호"
            },
            out: {
                type: "number",
                required: false,
                description: "이동하기 전 서버 번호"
            },
            nickname: {
                type: "string",
                required: false,
                description: "유저 닉네임"
            },
            begin: {
                type: "string",
                required: false,
                description: "검색 시작일"
            },
            end: {
                type: "string",
                required: false,
                description: "검색 종료일"
            }
        },
    },
    {
        path: "/information/data/alliance",
        label: "연맹 정보",
        examples: ["연맹 정보", "동맹 정보", "길드 정보"],
        chatbot: true,
    },
    {
        path: "/information/data/nickname",
        label: "닉네임 변경 기록",
        examples: ["닉네임 변경", "닉네임 기록", "이름 변경 기록"],
        chatbot: true,
    },

    {
        path: "/calculator/vital",
        label: "생명력 계산기",
        examples: ["생명력 계산", "체력 계산", "생명력 계산기"],
        chatbot: true,
    },
    {
        path: "/calculator/skill",
        label: "스킬 조각 계산기",
        examples: ["스킬 조각", "스킬 계산기"],
        chatbot: true,
    },
    {
        path: "/calculator/value-pack",
        label: "가치 패키지 계산기",
        examples: ["가치 패키지", "패키지 효율", "과금 효율"],
        chatbot: true,
    },
    {
        path: "/calculator/cost",
        label: "아이템 레벨 비용 계산기",
        examples: ["아이템 레벨 비용", "강화 비용", "레벨업 비용"],
        chatbot: true,
    },


    { 
        path: "/simulator/titan-research", 
        label: "타이탄 제작 시뮬레이터",
        examples: ["타이탄 제작", "타이탄 만들기", "타이탄 생성", "타이탄 연구"],
        chatbot: true,
        queryParams: {
            type: {
                type: "string",
                required: false,
                description: "타이탄 종류",
                pattern: "^(pistol|backarmor|addon|headset|gps|boots)$",
                aliases: ["타이탄 종류", "타이탄 파츠", "타이탄 유형"]
            },
            catalyst: {
                type: "string",
                required: false,
                description: "촉매제",
                pattern: "^(top|advanced|mid)$",
                aliases: ["촉매제 종류", "타이탄 촉매제", "에픽촉매제", "노랑촉매제", "보라촉매제", "유니크촉매제", "매직촉매제", "파랑촉매제"]
            },
            count: {
                type: "number",
                required: false,
                description: "개수",
                pattern: "^[0-9]*$",
                aliases:["수량", "개수", "개", "ea"]
            }
        },
    },
    { 
        path: "/simulator/titan-refine", 
        label: "타이탄 재련 시뮬레이터",
        examples: ["타이탄 재련", "타이탄 제련", "타이탄 개조"],
        chatbot: true,
    },
    { 
        path: "/simulator/formation-perk", 
        label: "군진 특성 시뮬레이터",
        examples: ["군진 특성", "군진", "샤크 군진", "스콜피온 군진", "이글 군진"],
        chatbot: true,
    },
    {
        path: "/emoji/create",
        label: "이모지 만들기",
        examples: ["이모지 만들기", "이모티콘 만들기"],
        chatbot: true,
    },
    {
        path: "/emoji/list",
        label: "이모지 목록",
        examples: ["이모지 목록", "이모티콘 목록"],
        chatbot: true,
    },
    {
        path: "/vote/create",
        label: "출석 투표 만들기",
        examples: ["투표 만들기", "출석 투표 생성"],
        chatbot: true,
    },
    {
        path: "/vote/cast",
        label: "출석 투표 참여",
        examples: ["투표 참여", "출석 투표"],
        chatbot: true,
    },
    {
        path: "/vote/manage",
        label: "출석 투표 관리",
        examples: ["투표 관리", "출석 투표 관리"],
        chatbot: true,
    },
    {
        path: "/event/city-reward",
        label: "도시 보상 찾기",
        examples: ["도시 보상", "도시 보상 찾기"],
        chatbot: true,
    },
    {
        path: "/account/profile",
        label: "계정 프로필",
        examples: ["계정 프로필", "계정 분석"],
        chatbot: true,
    },
    {
        path: "/account/viewer",
        label: "계정 보기",
        examples: ["계정 보기", "계정 조회"],
        chatbot: true,
    },
    {
        path: "/account/creator",
        label: "계정 등록",
        examples: ["계정 등록", "계정 만들기"],
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
    {
        path: "/vip/3223",
        label: "3223 서버 VIP 라운지",
        examples: ["3223 VIP", "3223 도둑 찾기"],
        chatbot: true,
    },
    {
        path: "/vip/4369",
        label: "4369 서버 VIP 라운지",
        examples: ["4369 VIP", "4369 도둑 찾기"],
        chatbot: true,
    },

    { 
        path: "/history/ssc-2026", 
        label: "봉인석의 난",
        examples: ["봉인석", "ssc", "봉인석의난 2026", "봉인석 2026", "Seal Stone Chaos"],
        chatbot: true,
        queryParams: {
            server: {
                type: "string",
                required: false,
                description: "조회하거나 비교할 서버 번호 목록. 여러 서버는 쉼표로 구분한다. 예: 3223 또는 3223,3224,3225",
                pattern: "^[1-9][0-9]*(,[1-9][0-9]*)*$",
                aliases: ["서버", "서버번호", "server", "serverNumber"]
            },
            round: {
                type: "number",
                required: false,
                description: "라운드",
                pattern: "^[0-9]*$",
                aliases:["라운드", "round"]
            }
        },
    },
    { 
        path: "/history/ssc-2026/users", 
        label: "봉인석의난 개인랭킹",
        examples: ["봉인석 개인", "봉인석 랭킹", "봉인석 유저", "봉인석 점수", "ssc rank", "ssc user", "ssc player", "ssc point"],
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
        path: "/history/liondance", 
        label: "길드 대결",
        examples: ["lion dance", "alliance battle", "guild battle", "truck battle", "동맹 대결", "연맹 대결"],
        chatbot: true,
        queryParams: {
            server: {
                type: "string",
                required: false,
                description: "조회하거나 비교할 서버 번호 목록. 여러 서버는 쉼표로 구분한다. 예: 3223 또는 3223,3224,3225",
                pattern: "^[1-9][0-9]*(,[1-9][0-9]*)*$",
                aliases: ["서버", "서버번호", "server", "serverNumber"]
            },
            nickname: {
                type: "string",
                required: false,
                description: "유저의 닉네임을 의미하는 항목이다.",
                aliases: ["유저", "플레이어", "user", "player"]
            },
            alliance: {
                type: "string",
                required: false,
                description: "동맹 이름을 의미하는 항목이다.",
                aliases: ["동맹", "연맹", "길드", "guild", "alliance"]
            },
        },
    },
    {
        path: "/privacy",
        label: "개인정보처리방침",
        examples: ["개인정보처리방침", "개인정보"],
        chatbot: true,
    },
    {
        path: "/contact",
        label: "문의하기",
        examples: ["문의", "연락", "문의하기"],
        chatbot: true,
    },
    {
        path: "/disclaimer",
        label: "면책 조항",
        examples: ["면책", "면책 조항"],
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

const chatbotPaths = allowedPaths.filter(item => item.chatbot === true);

export const chatbotActions = [
    {
        name: "navigate",
        description: "사용자의 요청과 가장 잘 맞는 Topwar Helper 페이지로 이동한다. query에는 선택한 path에 정의된 queryParams만 넣는다.",
        requiredParams: ["path"],
        allowedValues: {
            path: createAllowedPathItems(chatbotPaths),
        },
    },
];

function createQueryString(pathItem, query) {
    if (!query || typeof query !== "object" || Array.isArray(query)) {
        return "";
    }

    const queryParams = pathItem.queryParams || {};
    const searchParams = new URLSearchParams();

    Object.entries(query).forEach(([key, rawValue]) => {
        const definition = queryParams[key];

        if (!definition || rawValue === undefined || rawValue === null || rawValue === "") {
            return;
        }

        const value = Array.isArray(rawValue)
            ? rawValue.join(",")
            : String(rawValue).trim();

        if (definition.type === "number" && !Number.isFinite(Number(value))) {
            throw new Error(`${key} 값은 숫자여야 합니다`);
        }

        if (definition.type === "boolean" && !["true", "false"].includes(value)) {
            throw new Error(`${key} 값은 true 또는 false여야 합니다`);
        }

        if (definition.pattern && !new RegExp(definition.pattern).test(value)) {
            throw new Error(`${key} 값의 형식이 올바르지 않습니다`);
        }

        searchParams.set(key, value);
    });

    return searchParams.toString();
}

export function createActionRegistry({ navigate }) {
    const chatbotPathMap = new Map(
        chatbotPaths.map(item => [item.path, item])
    );
    const navigateAction = chatbotActions[0];

    return {
        navigate: {
            ...navigateAction,
            examples: chatbotPaths.flatMap(item => item.examples || []),
            run: ({ path, query }) => {
                const pathItem = chatbotPathMap.get(path);

                if (!pathItem) {
                    throw new Error("허용되지 않은 이동 요청입니다");
                }

                const queryString = createQueryString(pathItem, query);

                navigate(queryString ? `${path}?${queryString}` : path);
            },
        },
    };
}
