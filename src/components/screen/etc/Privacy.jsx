import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";

function Privacy() {
    const { t, i18n } = useTranslation("viewer");
    const { lang } = useParams();

    const currentLang = lang || i18n.language || "ko";

    const summaryItems = t("privacy.summary.items", {
        returnObjects: true,
    });

    const sections = t("privacy.sections", {
        returnObjects: true,
    });

    return (
        <main className="bg-body-tertiary min-vh-100">
            <section className="py-5 border-bottom bg-body">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-9 col-xl-8">
                            <span className="badge text-bg-primary mb-3 px-3 py-2">
                                {t("privacy.badge")}
                            </span>

                            <h1 className="display-6 fw-bold mb-3">
                                {t("privacy.title")}
                            </h1>

                            <p className="lead text-secondary mb-3">
                                {t("privacy.subtitle")}
                            </p>

                            <p className="small text-secondary mb-0">
                                {t("privacy.lastUpdated")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="container py-5">
                <div className="row justify-content-center g-4">
                    <div className="col-lg-9 col-xl-8">
                        <div className="alert alert-info border-0 shadow-sm mb-4">
                            <div className="fw-bold mb-1">
                                {t("privacy.notice.title")}
                            </div>
                            <div>
                                {t("privacy.notice.body")}
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-body p-4 p-md-5">
                                <h2 className="h4 fw-bold mb-4">
                                    {t("privacy.summary.title")}
                                </h2>

                                <ul className="mb-0 ps-3">
                                    {Array.isArray(summaryItems) &&
                                        summaryItems.map((item, index) => (
                                            <li
                                                key={index}
                                                className="text-secondary mb-2 lh-lg"
                                            >
                                                {item}
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm">
                            <div className="card-body p-4 p-md-5">
                                {Array.isArray(sections) &&
                                    sections.map((section, index) => (
                                        <section
                                            key={index}
                                            className={
                                                index === sections.length - 1
                                                    ? ""
                                                    : "pb-4 mb-4 border-bottom"
                                            }
                                        >
                                            <h2 className="h5 fw-bold mb-3">
                                                {section.title}
                                            </h2>

                                            <p className="text-secondary lh-lg mb-0">
                                                {section.body}
                                            </p>
                                        </section>
                                    ))}
                            </div>
                        </div>

                        <div className="d-flex flex-wrap gap-2 justify-content-center mt-4">
                            <LanguageRouterLink
                                to={`/contact`}
                                className="btn btn-primary"
                            >
                                {t("privacy.contactButton")}
                            </LanguageRouterLink>

                            <LanguageRouterLink
                                to={`/disclaimer`}
                                className="btn btn-outline-secondary"
                            >
                                {t("privacy.disclaimerButton")}
                            </LanguageRouterLink>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default Privacy;