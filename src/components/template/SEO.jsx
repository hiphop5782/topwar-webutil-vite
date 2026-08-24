import { Helmet } from "react-helmet-async";

export default function SEO({
    title,
    description,
    canonical,
    alternates = [],
    image,
    type = "website",
    noindex = false,
}) {
    const fullTitle = title
        ? `${title} | Progamer.info`
        : "Progamer.info";
    const robots = noindex
        ? "noindex, follow"
        : "index, follow";

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="robots" content={robots} />

            {description && (
                <meta name="description" content={description} />
            )}

            {canonical && (
                <link rel="canonical" href={canonical} />
            )}

            {alternates.map(({ language, href }) => (
                <link
                    key={language}
                    rel="alternate"
                    hrefLang={language}
                    href={href}
                />
            ))}

            <meta property="og:site_name" content="Progamer.info" />
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            {description && (
                <meta property="og:description" content={description} />
            )}
            {canonical && (
                <meta property="og:url" content={canonical} />
            )}
            {image && <meta property="og:image" content={image} />}

            <meta
                name="twitter:card"
                content={image ? "summary_large_image" : "summary"}
            />
            <meta name="twitter:title" content={fullTitle} />
            {description && (
                <meta name="twitter:description" content={description} />
            )}
            {image && <meta name="twitter:image" content={image} />}
        </Helmet>
    );
}
