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
    "/information/appearance",
    "/",
    "/post",
    "/information/job",
    "/information/kartz-statistics",
    "/information/el",
    "/information/el/darkforce",
    "/information/el/score",
    "/information/data",
    "/information/data/servers",
    "/information/data/server",
    "/information/data/alliance",
    "/information/data/move",
    "/information/data/nickname",
    "/information/data/player-detail",
    "/information/data/realpower",
    "/information/data/overall",
    "/information/kartz",
    "/information/kartz/rank",
    "/information/kartz/server",
    "/calculator/vital",
    "/calculator/skill",
    "/calculator/value-pack",
    "/calculator/cost",
    "/simulator/formation-perk",
    "/simulator/titan-research",
    "/simulator/titan-refine",
    "/developer",
    "/about",
    "/emoji/create",
    "/emoji/list",
    "/account/viewer",
    "/account/profile",
    "/account/creator",
    "/vote/create",
    "/history/ssc-2026",
    "/history/ssc-2026/users",
    "/history/liondance",
    "/event/city-reward",
    "/privacy",
    "/contact",
    "/disclaimer",
    "/vote/cast",
    "/vote/manage"
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
