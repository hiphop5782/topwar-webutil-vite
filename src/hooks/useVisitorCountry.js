import { useEffect, useState } from "react";

const COUNTRY_COOKIE_NAME = "pg_country";
const COUNTRY_STATUS_URL =
    import.meta.env.VITE_COUNTRY_STATUS_URL ||
    "https://datahub.progamer.info/status";
const COUNTRY_REQUEST_TIMEOUT = 4000;
const FALLBACK_COUNTRY = "KR";

let countryRequest = null;

function readCountryOverride(search) {
    const country = new URLSearchParams(search)
        .get("adCountry")
        ?.trim()
        .toUpperCase();

    return country && /^[A-Z0-9]{2}$/.test(country)
        ? country
        : null;
}

function readCountryCookie() {
    if (typeof document === "undefined") return null;

    const prefix = `${COUNTRY_COOKIE_NAME}=`;
    const cookie = document.cookie
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith(prefix));

    if (!cookie) return null;

    const country = decodeURIComponent(cookie.slice(prefix.length))
        .trim()
        .toUpperCase();

    // Cloudflare는 일반 국가 코드 외에 Tor 트래픽을 T1로 표시할 수 있다.
    return /^[A-Z0-9]{2}$/.test(country) ? country : null;
}

async function requestCountry() {
    const cachedCountry = readCountryCookie();
    if (cachedCountry) return cachedCountry;

    const controller = new AbortController();
    const timeout = window.setTimeout(
        () => controller.abort(),
        COUNTRY_REQUEST_TIMEOUT
    );

    try {
        const response = await fetch(COUNTRY_STATUS_URL, {
            cache: "no-store",
            credentials: "include",
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Country lookup failed: HTTP ${response.status}`);
        }

        return readCountryCookie() || FALLBACK_COUNTRY;
    } catch (error) {
        console.warn(
            "Country lookup failed; using Kakao AdFit fallback",
            error
        );
        return FALLBACK_COUNTRY;
    } finally {
        window.clearTimeout(timeout);
    }
}

export function useVisitorCountry(search = "") {
    const building = typeof window !== "undefined" &&
        window.__PRERENDER_INJECTED?.building === true;
    const countryOverride = readCountryOverride(search);
    const [country, setCountry] = useState(() => (
        building
            ? null
            : countryOverride || readCountryCookie()
    ));

    useEffect(() => {
        if (building) return undefined;

        if (countryOverride) {
            setCountry(countryOverride);
            return undefined;
        }

        const cachedCountry = readCountryCookie();
        if (cachedCountry) {
            setCountry(cachedCountry);
            return undefined;
        }

        setCountry(null);
        let active = true;
        countryRequest ??= requestCountry();

        countryRequest.then((resolvedCountry) => {
            if (active) setCountry(resolvedCountry);
        });

        return () => {
            active = false;
        };
    }, [building, countryOverride]);

    return country;
}
