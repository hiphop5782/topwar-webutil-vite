import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "vite";

const source = path.resolve("dist/ko/index.html");
const target = path.resolve("dist/index.html");
const env = loadEnv(process.env.NODE_ENV || "production", process.cwd(), "");
const publicUrl = env.VITE_PUBLIC_URL.startsWith("//")
    ? `https:${env.VITE_PUBLIC_URL}`
    : env.VITE_PUBLIC_URL;
const rootUrl = `${new URL(publicUrl).origin}/`;

let html = await readFile(source, "utf8");
let canonicalUpdated = false;
let openGraphUrlUpdated = false;

html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/\brel\s*=\s*["'][^"']*\bcanonical\b[^"']*["']/i.test(tag)) {
        return tag;
    }

    canonicalUpdated = true;
    return tag.replace(/\bhref\s*=\s*(["'])[^"']*\1/i, `href="${rootUrl}"`);
});

html = html.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (!/\bproperty\s*=\s*["']og:url["']/i.test(tag)) {
        return tag;
    }

    openGraphUrlUpdated = true;
    return tag.replace(/\bcontent\s*=\s*(["'])[^"']*\1/i, `content="${rootUrl}"`);
});

if (!canonicalUpdated || !openGraphUrlUpdated) {
    throw new Error("루트 페이지의 canonical 또는 og:url을 교정하지 못했습니다.");
}

await writeFile(target, html, "utf8");

console.log("기본 한국어 페이지를 루트 URL 메타데이터와 함께 복사했습니다.");
