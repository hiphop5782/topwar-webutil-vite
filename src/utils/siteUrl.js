const DEFAULT_SITE_ORIGIN =
    "https://www.progamer.info";

function resolveSiteOrigin() {
    const publicUrl =
        import.meta.env.VITE_PUBLIC_URL ||
        DEFAULT_SITE_ORIGIN;

    /*
     * //www.progamer.info 형태를
     * https://www.progamer.info로 변환
     */
    const absoluteUrl =
        publicUrl.startsWith("//")
            ? `https:${publicUrl}`
            : publicUrl;

    return new URL(absoluteUrl).origin;
}

export const SITE_ORIGIN =
    resolveSiteOrigin();

/**
 * 운영 도메인 기준 절대 URL을 생성합니다.
 *
 * /en/information/data
 * →
 * https://www.progamer.info/en/information/data/
 */
export function createSiteUrl(pathname) {
    const normalizedPath =
        pathname.startsWith("/")
            ? pathname
            : `/${pathname}`;

    const url = new URL(
        normalizedPath,
        SITE_ORIGIN
    );

    /*
     * 확장자가 없는 일반 페이지에는
     * trailing slash를 붙입니다.
     */
    const hasFileExtension =
        /\/[^/]+\.[^/]+$/.test(url.pathname);

    if (
        url.pathname !== "/" &&
        !url.pathname.endsWith("/") &&
        !hasFileExtension
    ) {
        url.pathname += "/";
    }

    url.search = "";
    url.hash = "";

    return url.href;
}