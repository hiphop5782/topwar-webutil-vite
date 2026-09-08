import { useTranslation } from "react-i18next";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";

export default function About() {
    const { t } = useTranslation("viewer");
    const sections = t("About.sections", { returnObjects: true });

    return (
        <main className="container py-4 py-lg-5" style={{ maxWidth: "900px" }}>
            <header className="mb-5">
                <span className="badge text-bg-primary mb-3">{t("About.badge")}</span>
                <h1 className="display-6 fw-bold">{t("About.title")}</h1>
                <p className="lead text-secondary mb-0">{t("About.intro")}</p>
            </header>
            <div className="row g-4">
                {Array.isArray(sections) && sections.map((section) => (
                    <section className="col-12 col-md-6" key={section.title}>
                        <div className="card h-100 border-0 shadow-sm">
                            <div className="card-body p-4">
                                <h2 className="h5 fw-bold">{section.title}</h2>
                                <p className="text-secondary mb-0">{section.body}</p>
                            </div>
                        </div>
                    </section>
                ))}
            </div>
            <section className="mt-5 p-4 rounded-4 bg-light border">
                <h2 className="h4 fw-bold">{t("About.transparencyTitle")}</h2>
                <p className="text-secondary">{t("About.transparencyBody")}</p>
                <div className="d-flex flex-wrap gap-2">
                    <LanguageRouterLink className="btn btn-primary" to="/information/data">{t("About.dataButton")}</LanguageRouterLink>
                    <LanguageRouterLink className="btn btn-outline-secondary" to="/contact">{t("About.contactButton")}</LanguageRouterLink>
                </div>
            </section>
        </main>
    );
}
