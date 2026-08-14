import { Helmet } from "react-helmet-async";

export default function SEO({
    title,
    description,
    noindex = false
}) {
    const fullTitle = title
        ? `${title} | Progamer.info`
        : "Progamer.info";

    return (
        <Helmet>
            <title>{fullTitle}</title>

            {description && (
                <meta
                    name="description"
                    content={description}
                />
            )}

            {noindex && (
                <meta
                    name="robots"
                    content="noindex, follow"
                />
            )}
        </Helmet>
    );
}