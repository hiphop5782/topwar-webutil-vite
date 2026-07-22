import {
    readFile,
    readdir,
    writeFile,
} from "node:fs/promises";

import path from "node:path";
import { loadEnv } from "vite";

import {
    supportedLngs,
} from "../src/config/languages.js";

const DIST_DIRECTORY = path.resolve("dist");

const env = loadEnv(
    process.env.NODE_ENV || "production",
    process.cwd(),
    ""
);

const publicUrl =
    env.VITE_PUBLIC_URL.startsWith("//")
        ? `https:${env.VITE_PUBLIC_URL}`
        : env.VITE_PUBLIC_URL;

const SITE_ORIGIN =
    new URL(publicUrl).origin;

/**
 * 사이트맵에서 제외할 URL입니다.
 *
 * 프리렌더되어 있어도 검색 결과에 노출할 필요가 없는
 * 사용자 작업·관리 페이지를 여기에 등록합니다.
 */
const EXCLUDED_PATH_PATTERNS = [
    /^\/404\/?$/,
    /^\/(?:ko|en|ja)\/404\/?$/,

    /^\/(?:ko|en|ja)\/vote\/manage\/?$/,
    /^\/(?:ko|en|ja)\/vote\/cast\/?$/,

    /^\/(?:ko|en|ja)\/account(?:\/|$)/,
];

/**
 * XML 특수문자를 이스케이프합니다.
 */
function escapeXml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

/**
 * Windows 경로 구분자를 URL 경로 구분자로 바꿉니다.
 */
function normalizeFilePath(filePath) {
    return filePath.replaceAll(path.sep, "/");
}

/**
 * dist 내부 index.html 경로를 실제 URL 경로로 변환합니다.
 *
 * dist/index.html
 * → /
 *
 * dist/ko/privacy/index.html
 * → /ko/privacy/
 */
function indexFileToPathname(filePath) {
    const relativePath = normalizeFilePath(
        path.relative(
            DIST_DIRECTORY,
            filePath
        )
    );

    if (relativePath === "index.html") {
        return "/";
    }

    const pathname = relativePath.replace(
        /\/index\.html$/,
        "/"
    );

    return `/${pathname}`;
}

/**
 * 디렉터리를 재귀적으로 탐색해 index.html을 찾습니다.
 */
async function findIndexFiles(directory) {
    const entries = await readdir(
        directory,
        {
            withFileTypes: true,
        }
    );

    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(
            directory,
            entry.name
        );

        if (entry.isDirectory()) {
            files.push(
                ...await findIndexFiles(
                    fullPath
                )
            );

            continue;
        }

        if (
            entry.isFile() &&
            entry.name === "index.html"
        ) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * robots 메타 태그에 noindex가 포함되었는지 검사합니다.
 */
function hasNoindex(html) {
    const metaTags =
        html.match(/<meta\b[^>]*>/gi) ?? [];

    return metaTags.some((tag) => {
        const isRobotsTag =
            /\bname\s*=\s*["']robots["']/i
                .test(tag) ||
            /\bname\s*=\s*["']googlebot["']/i
                .test(tag);

        const containsNoindex =
            /\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["']/i
                .test(tag);

        return (
            isRobotsTag &&
            containsNoindex
        );
    });
}

/**
 * 프리렌더 HTML의 canonical 주소를 읽습니다.
 */
function extractCanonical(html) {
    const linkTags =
        html.match(/<link\b[^>]*>/gi) ?? [];

    for (const tag of linkTags) {
        const isCanonical =
            /\brel\s*=\s*["'][^"']*\bcanonical\b[^"']*["']/i
                .test(tag);

        if (!isCanonical) {
            continue;
        }

        const hrefMatch = tag.match(
            /\bhref\s*=\s*["']([^"']+)["']/i
        );

        if (hrefMatch) {
            return hrefMatch[1];
        }
    }

    return null;
}

/**
 * URL이 사이트맵 제외 대상인지 검사합니다.
 */
function isExcluded(pathname) {
    return EXCLUDED_PATH_PATTERNS.some(
        (pattern) =>
            pattern.test(pathname)
    );
}

/**
 * canonical 주소를 정규화합니다.
 *
 * /privacy 주소가 301을 거쳐 /privacy/가 되므로
 * 최종 URL인 trailing slash 형태를 사용합니다.
 */
function normalizeCanonicalUrl(
    canonical,
    pathname
) {
    const fallbackUrl = new URL(
        pathname,
        SITE_ORIGIN
    );

    const url = canonical
        ? new URL(
            canonical,
            SITE_ORIGIN
        )
        : fallbackUrl;

    if (url.origin !== SITE_ORIGIN) {
        throw new Error(
            `외부 canonical URL은 사이트맵에 포함할 수 없습니다: ${url.href}`
        );
    }

    if (
        !url.pathname.endsWith("/") &&
        !path.posix.extname(url.pathname)
    ) {
        url.pathname += "/";
    }

    url.hash = "";
    url.search = "";

    return url.href;
}

/**
 * /ko/privacy/에서 언어와 공통 경로를 분리합니다.
 */
function parseLocalizedPath(pathname) {
    const match = pathname.match(
        /^\/(ko|en|ja)(\/.*)?$/
    );

    if (!match) {
        return null;
    }

    const language = match[1];

    let localizedPath =
        match[2] || "/";

    if (!localizedPath.startsWith("/")) {
        localizedPath =
            `/${localizedPath}`;
    }

    if (
        localizedPath !== "/" &&
        !localizedPath.endsWith("/")
    ) {
        localizedPath += "/";
    }

    return {
        language,
        localizedPath,
    };
}

/**
 * 한 URL의 XML 요소를 생성합니다.
 */
function createUrlElement(
    page,
    languageGroups
) {
    const localized =
        parseLocalizedPath(
            page.pathname
        );

    const lines = [
        "  <url>",
        `    <loc>${escapeXml(page.url)}</loc>`,
    ];

    if (localized) {
        const variants =
            languageGroups.get(
                localized.localizedPath
            );

        if (variants) {
            for (
                const language
                of supportedLngs
            ) {
                const alternateUrl =
                    variants.get(language);

                if (!alternateUrl) {
                    continue;
                }

                lines.push(
                    "    " +
                    `<xhtml:link rel="alternate" hreflang="${language}" href="${escapeXml(alternateUrl)}" />`
                );
            }

            /*
             * 루트 페이지가 언어 선택 또는 자동 이동 페이지라면
             * 언어별 홈에만 x-default를 추가합니다.
             */
            if (
                localized.localizedPath === "/"
            ) {
                lines.push(
                    "    " +
                    `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/" />`
                );
            }
        }
    }

    lines.push("  </url>");

    return lines.join("\n");
}

async function generateSitemap() {
    const indexFiles =
        await findIndexFiles(
            DIST_DIRECTORY
        );

    const pages = [];

    for (const filePath of indexFiles) {
        const pathname =
            indexFileToPathname(
                filePath
            );

        if (isExcluded(pathname)) {
            console.log(
                `[sitemap] 제외 경로: ${pathname}`
            );

            continue;
        }

        const html = await readFile(
            filePath,
            "utf8"
        );

        if (hasNoindex(html)) {
            console.log(
                `[sitemap] noindex 제외: ${pathname}`
            );

            continue;
        }

        const canonical =
            extractCanonical(html);

        console.log(
            "[sitemap] canonical 확인",
            {
                filePath,
                pathname,
                canonical,
            }
        );

        const url =
            normalizeCanonicalUrl(
                canonical,
                pathname
            );

        const normalizedUrl =
            new URL(url);

        pages.push({
            pathname:
                normalizedUrl.pathname,
            url,
        });
    }

    /*
     * canonical 중복 제거
     */
    const uniquePageMap = new Map();

    for (const page of pages) {
        uniquePageMap.set(
            page.url,
            page
        );
    }

    const uniquePages = [
        ...uniquePageMap.values(),
    ].sort((left, right) =>
        left.url.localeCompare(
            right.url
        )
    );

    /*
     * 동일한 언어별 경로를 그룹화합니다.
     *
     * /ko/privacy/
     * /en/privacy/
     * /ja/privacy/
     *
     * → 공통 그룹 /privacy/
     */
    const languageGroups = new Map();

    for (const page of uniquePages) {
        const localized =
            parseLocalizedPath(
                page.pathname
            );

        if (!localized) {
            continue;
        }

        if (
            !languageGroups.has(
                localized.localizedPath
            )
        ) {
            languageGroups.set(
                localized.localizedPath,
                new Map()
            );
        }

        languageGroups
            .get(
                localized.localizedPath
            )
            .set(
                localized.language,
                page.url
            );
    }

    const urlElements =
        uniquePages.map((page) =>
            createUrlElement(
                page,
                languageGroups
            )
        );

    const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        ...urlElements,
        "</urlset>",
        "",
    ].join("\n");

    await writeFile(
        path.join(
            DIST_DIRECTORY,
            "sitemap.xml"
        ),
        sitemap,
        "utf8"
    );

    const robotsPath = path.join(
        DIST_DIRECTORY,
        "robots.txt"
    );

    let robotsContent;

    try {
        robotsContent = await readFile(
            robotsPath,
            "utf8"
        );
    }
    catch {
        robotsContent = [
            "User-agent: *",
            "Allow: /",
            "",
        ].join("\n");
    }

    const sitemapDirective =
        `Sitemap: ${SITE_ORIGIN}/sitemap.xml`;

    const robotsLines =
        robotsContent
            .split(/\r?\n/)
            .filter(
                (line) =>
                    !/^Sitemap:/i.test(
                        line.trim()
                    )
            );

    robotsLines.push(
        sitemapDirective,
        ""
    );

    await writeFile(
        robotsPath,
        robotsLines.join("\n"),
        "utf8"
    );

    console.log(
        `[sitemap] ${uniquePages.length}개 URL 생성 완료`
    );

    console.log(
        `[sitemap] ${path.join(
            DIST_DIRECTORY,
            "sitemap.xml"
        )}`
    );

    for (const page of uniquePages) {
        console.log(
            `  - ${page.url}`
        );
    }
}

generateSitemap().catch((error) => {
    console.error(
        "[sitemap] 생성 실패"
    );

    console.error(error);

    process.exit(1);
});