import { useLocation } from "react-router-dom";

import {
    createSiteUrl,
} from "@src/utils/siteUrl";

import { getRoutePolicy } from '@src/config/routePolicy';

export function useCanonicalUrl() {
    const { pathname } = useLocation();

    return createSiteUrl(getRoutePolicy(pathname).canonicalPath);
}