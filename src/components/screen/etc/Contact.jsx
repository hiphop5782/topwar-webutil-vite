import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaEnvelope, FaUser, FaCircleInfo, FaListCheck } from "react-icons/fa6";
import LanguageRouterLink from "@src/components/template/LanguageRouterLink";
const iconMap = {
    email: <FaEnvelope />,
    operator: <FaUser />,
};

function Contact() {
    const { t, i18n } = useTranslation("viewer");
    const { lang } = useParams();

    const currentLang = lang || i18n.language || "ko";

    const methods = t("contact.methods", {
        returnObjects: true,
    });

    const noteItems = t("contact.notes.items", {
        returnObjects: true,
    });

    return (
        <main className="bg-body-tertiary min-vh-100">
            <section className="py-5 border-bottom bg-body">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-9 col-xl-8">
                            <span className="badge text-bg-primary mb-3 px-3 py-2">
                                {t("contact.badge")}
                            </span>

                            <h1 className="display-6 fw-bold mb-3">
                                {t("contact.title")}
                            </h1>

                            <p className="lead text-secondary mb-3">
                                {t("contact.subtitle")}
                            </p>

                            <p className="small text-secondary mb-0">
                                {t("contact.lastUpdated")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="container py-5">
                <div className="row justify-content-center">
                    <div className="col-lg-9 col-xl-8">
                        <div className="alert alert-info border-0 shadow-sm mb-4">
                            <div className="d-flex gap-3">
                                <div className="fs-4">
                                    <FaCircleInfo />
                                </div>

                                <div>
                                    <div className="fw-bold mb-1">
                                        {t("contact.notice.title")}
                                    </div>
                                    <div className="lh-lg">
                                        {t("contact.notice.body")}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-body p-4 p-md-5">
                                <h2 className="h4 fw-bold mb-4">
                                    {t("contact.methodsTitle")}
                                </h2>

                                <div className="row g-3">
                                    {Array.isArray(methods) &&
                                        methods.map((method, index) => (
                                            <div className="col-md-6" key={index}>
                                                <div className="border rounded-4 p-4 h-100 bg-body">
                                                    <div className="d-flex align-items-start gap-3 mb-3">
                                                        <div
                                                            className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0 fs-5"
                                                            style={{
                                                                width: "44px",
                                                                height: "44px",
                                                            }}
                                                        >
                                                            {iconMap[method.icon] || <FaInfoCircle />}
                                                        </div>

                                                        <div>
                                                            <h3 className="h6 fw-bold mb-1">
                                                                {method.title}
                                                            </h3>

                                                            <p className="small text-secondary mb-0 lh-lg">
                                                                {method.description}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {method.url ? (
                                                        <a
                                                            href={method.url}
                                                            className="btn btn-outline-primary btn-sm"
                                                        >
                                                            {method.button}
                                                        </a>
                                                    ) : (
                                                        <div className="small text-secondary">
                                                            {method.value}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-body p-4 p-md-5">
                                <div className="d-flex align-items-center gap-2 mb-4">
                                    <span className="text-primary fs-4">
                                        <FaListCheck />
                                    </span>

                                    <h2 className="h4 fw-bold mb-0">
                                        {t("contact.notes.title")}
                                    </h2>
                                </div>

                                <ul className="mb-0 ps-3">
                                    {Array.isArray(noteItems) &&
                                        noteItems.map((item, index) => (
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
                            <div className="card-body p-4 p-md-5 text-center">
                                <h2 className="h5 fw-bold mb-3">
                                    {t("contact.footer.title")}
                                </h2>

                                <p className="text-secondary lh-lg mb-4">
                                    {t("contact.footer.body")}
                                </p>

                                <div className="d-flex flex-wrap gap-2 justify-content-center">
                                    <LanguageRouterLink
                                        to={`/privacy`}
                                        className="btn btn-outline-secondary"
                                    >
                                        {t("contact.privacyButton")}
                                    </LanguageRouterLink>

                                    <LanguageRouterLink
                                        to={`/disclaimer`}
                                        className="btn btn-outline-secondary"
                                    >
                                        {t("contact.disclaimerButton")}
                                    </LanguageRouterLink>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Contact;