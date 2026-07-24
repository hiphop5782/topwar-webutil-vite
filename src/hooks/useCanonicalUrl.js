import { useLocation } from "react-router-dom";

import {
    createSiteUrl,
} from "@src/utils/siteUrl";

export function useCanonicalUrl() {
    const { pathname } = useLocation();

    return createSiteUrl(pathname);
}