import {
    existsSync,
    readdirSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const markdownDirectory = path.resolve(
    __dirname,
    "../assets/md",
);

const fixedRoutes = [
    "/",
    "/post",

    "/information/base",
    "/information/job",
    "/information/el",
    "/information/data",
    "/information/kartz",
    "/information/ssc",
    "/information/realpower",

    "/calculator/vital",
    "/calculator/skill",
    "/calculator/value-pack",
    "/calculator/cost",

    "/simulator/titan-research",
    "/simulator/titan-refine",
    "/simulator/formation-perk",
    "/simulator/random",
    "/simulator/slot",
    "/simulator/luckybox",
    "/simulator/lotto",

    "/emoji/create",
    "/emoji/list",

    "/history/ssc-2026",

    "/vote/create",
    "/vote/cast",
    "/vote/manage",
];

const postRoutes = readdirSync(markdownDirectory, {
    withFileTypes: true,
})
    // 폴더만 선택
    .filter((entry) => entry.isDirectory())

    // 임시·비공개 게시물 제외
    .filter((entry) => !entry.name.startsWith("9999-99-99"))

    // 실제 readme.md가 있는 폴더만 선택
    .filter((entry) =>
        existsSync(
            path.join(
                markdownDirectory,
                entry.name,
                "readme.md",
            ),
        ),
    )

    // /post/:folder 형식으로 생성
    .map((entry) => `/post/${entry.name}`);

export const prerenderRoutes = [
    ...new Set([
        ...fixedRoutes,
        ...postRoutes,
    ]),
];

console.log("프리렌더 고정 경로:", fixedRoutes);
console.log("프리렌더 게시물 경로:", postRoutes);