import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";

import { supportedLngs } from "@src/config/languages";
import { trackAnalyticsEvent } from "@src/db/firebase";

function describeRoute(pathname) {
    const parts = pathname.split("/").filter(Boolean);
    const language = supportedLngs.includes(parts[0]) ? parts.shift() : "default";
    const route = parts.length ? `/${parts.join("/")}` : "/";
    const first = parts[0] ?? "home";
    const pageGroup = first === "information"
        ? parts[1] === "data" ? "data" : parts[1] === "kartz" ? "kartz" : "information"
        : ["calculator", "simulator", "vote", "emoji", "post", "history", "event", "account", "vip"].includes(first)
            ? first
            : first === "home" ? "home" : "other";
    return {
        language,
        pageGroup,
        route,
        toolName: parts.join("_") || "home",
    };
}

export default function RouteAnalytics() {
    const { pathname } = useLocation();
    const route = useMemo(() => describeRoute(pathname), [pathname]);
    const startedRoutesRef = useRef(new Set());
    const isToolPage = ["calculator", "simulator", "data", "kartz", "emoji"].includes(route.pageGroup);

    useEffect(() => {
        trackAnalyticsEvent("virtual_page_view", {
            page_path: route.route,
            page_group: route.pageGroup,
            tool_name: route.toolName,
            content_language: route.language,
        });
    }, [route]);

    useEffect(() => {
        const trackStart = () => {
            if (startedRoutesRef.current.has(route.route)) return;
            startedRoutesRef.current.add(route.route);
            trackAnalyticsEvent("tool_start", {
                page_group: route.pageGroup,
                tool_name: route.toolName,
            });
        };

        const handleChange = (event) => {
            if (!event.target.closest("input, select, textarea")) return;
            trackStart();
        };
        const handleClick = (event) => {
            const tracked = event.target.closest("[data-analytics-action]");
            const download = event.target.closest("a[download]");
            if (download && isToolPage) {
                trackAnalyticsEvent("download_result", {
                    page_group: route.pageGroup,
                    tool_name: route.toolName,
                });
            }
            if (!tracked) return;
            trackStart();
            trackAnalyticsEvent("tool_action", {
                page_group: route.pageGroup,
                tool_name: route.toolName,
                action: tracked.dataset.analyticsAction,
            });
        };
        const handleCopy = () => {
            if (!isToolPage) return;
            trackAnalyticsEvent("copy_result", {
                page_group: route.pageGroup,
                tool_name: route.toolName,
            });
        };

        document.addEventListener("change", handleChange);
        document.addEventListener("click", handleClick);
        document.addEventListener("copy", handleCopy);
        return () => {
            document.removeEventListener("change", handleChange);
            document.removeEventListener("click", handleClick);
            document.removeEventListener("copy", handleCopy);
        };
    }, [route, isToolPage]);

    return null;
}
