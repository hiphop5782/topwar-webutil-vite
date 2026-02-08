import { atom } from "recoil";

export const userState = atom({
    key: "userState",
    default: {
        vip: 16,
        cp: 100,
        baseSkins: [],
        mastery: {
            army: 15,
            navy: 15,
            airforce: 15,
        },
        troop: [

        ],
        ht:[
            {
                chip1:{
                    type:"자이스톤",
                    grade:"에픽",
                    options:[
                        {title:"메카 데미지 증가", value:10.0},
                        {title:"메카 데미지 감면", value:10.0},
                        {title:"메카 공격 속도", value:3.0},
                        {title:"메카 실드", value:10.0}
                    ]
                },
                chip2:{
                    type:"자이스톤",
                    grade:"에픽",
                    options:[
                        {title:"메카 데미지 증가", value:10.0},
                        {title:"메카 데미지 감면", value:10.0},
                        {title:"메카 공격 속도", value:3.0},
                        {title:"메카 실드", value:10.0}
                    ]
                },
                chip3:{
                    type:"자이스톤",
                    grade:"에픽",
                    options:[
                        {title:"메카 데미지 증가", value:10.0},
                        {title:"메카 데미지 감면", value:10.0},
                        {title:"메카 공격 속도", value:3.0},
                        {title:"메카 실드", value:10.0}
                    ]
                },
                core:{
                    type:"자이스톤",
                    grade:"에픽",
                    options:[
                        {title:"전체 방어도 증가", value:30.0},
                        {title:"전체 데미지 증가", value:30.0}
                    ]
                },
                chip4:{
                    type:"자이스톤",
                    grade:"에픽",
                    options:[
                        {title:"전체 방어도 증가", value:10.0},
                        {title:"전체 데미지 증가", value:10.0},
                        {title:"전체 데미지 감면", value:10.0},
                        {title:"전체 공격력 증가", value:10.0}
                    ]
                },
                chip5:{
                    type:"자이스톤",
                    grade:"에픽",
                    options:[
                        {title:"전체 방어도 증가", value:10.0},
                        {title:"전체 데미지 증가", value:10.0},
                        {title:"전체 데미지 감면", value:10.0},
                        {title:"전체 공격력 증가", value:10.0}
                    ]
                },
                chip6:{
                    type:"자이스톤",
                    grade:"에픽",
                    options:[
                        {title:"전체 방어도 증가", value:10.0},
                        {title:"전체 데미지 증가", value:10.0},
                        {title:"전체 데미지 감면", value:10.0},
                        {title:"전체 공격력 증가", value:10.0}
                    ]
                }
            }
        ],
        remold: {
            army: {
                use: true,
                equip1: { use: true, grade: "에픽", level: 12 },
                equip2: { use: true, grade: "에픽", level: 12 },
                equip3: { use: true, grade: "에픽", level: 12 },
                equip4: { use: true, grade: "에픽", level: 12 },
                equip5: { use: true, grade: "에픽" },
            },
            navy: {
                use: true,
                equip1: { use: true, grade: "에픽", level: 12 },
                equip2: { use: true, grade: "에픽", level: 12 },
                equip3: { use: true, grade: "에픽", level: 12 },
                equip4: { use: true, grade: "에픽", level: 12 },
                equip5: { use: true, grade: "유니크" },
            },
            airforce: {
                use: true,
                equip1: { use: true, grade: "에픽", level: 12 },
                equip2: { use: true, grade: "에픽", level: 12 },
                equip3: { use: true, grade: "에픽", level: 12 },
                equip4: { use: true, grade: "에픽", level: 12 },
                equip5: { use: true, grade: "유니크" },
            }
        },
        formation: {
            shark: { tier: 5, slot: [3, 3, 3, 3, 3], level: 50 },
            scorpion: { tier: 5, slot: [3, 3, 3, 3, 3], level: 50 },
            eagle: { tier: 5, slot: [3, 3, 3, 3, 3], level: 50 },
        },
        enigmaField: {
            first:[10,10,10,10,10],
            second:[10,5,5,5,5,5,5],
            third:[3,3,3,3,3,3]
        },
        enigmaBeast: [
            {
                type: "사슴",
                grade: "에픽",
                level: 5,
                potential: 16000,
                main: "출정 최대치",
                sub1: "전체 데미지 증가",
                sub2: "전체 데미지 감면",
                sub3: "전체 공격력 증가"
            }
        ],
        memo: "",
    },
});