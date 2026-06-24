import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import prerender from "@prerenderer/rollup-plugin";

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    supportedLngs,
} from "./src/config/languages.js";

import {
    prerenderRoutes,
} from "./src/config/prerenderRoutes.js";

/*
 * vite.config.js는 ESM으로 실행되므로
 * __dirname을 직접 만들고 사용합니다.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
 * 언어가 없는 공통 경로를 언어별 실제 경로로 변환합니다.
 *
 * "/"  -> "/ko", "/en", "/ja"
 * "/post" -> "/ko/post", "/en/post", "/ja/post"
 */
const localizedPrerenderRoutes = supportedLngs.flatMap(
    (language) =>
        prerenderRoutes.map((route) =>
            route === "/"
                ? `/${language}`
                : `/${language}${route}`
        )
);

export default defineConfig({
    base: "/",

    server: {
        host: "0.0.0.0",
        port: 5173,
        allowedHosts: true,
    },

    plugins: [
        react(),

        prerender({
            routes: localizedPrerenderRoutes,

            renderer:
                "@prerenderer/renderer-puppeteer",

            rendererOptions: {
                /*
                 * LanguageRouter에서 번역과 렌더링이 끝난 뒤
                 * 발생시키는 이벤트를 기다립니다.
                 */
                renderAfterDocumentEvent:
                    "prerender-ready",

                /*
                 * i18n 전역 상태가 언어별 렌더링 과정에서
                 * 섞이지 않도록 하나씩 처리합니다.
                 */
                maxConcurrentRoutes: 1,

                timeout: 30000,

                launchOptions: {
                    args: [
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                    ],
                },

                consoleHandler(route, message) {
                    console.log(
                        `[prerender:${route}]`,
                        message.type(),
                        message.text()
                    );
                },
            },
        }),
    ],

    optimizeDeps: {
        /*
         * 브라우저 환경에서 직접 처리해야 하는 라이브러리이므로
         * Vite 의존성 사전 번들링에서 제외합니다.
         */
        exclude: [
            "@imgly/background-removal",
        ],
    },

    resolve: {
        alias: {
            "@src": path.resolve(
                __dirname,
                "src"
            ),
        },
    },
});
