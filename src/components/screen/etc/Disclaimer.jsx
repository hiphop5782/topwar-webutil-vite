import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    FaTriangleExclamation,
    FaCircleInfo,
    FaGamepad,
    FaScaleBalanced,
    FaShieldHalved,
} from "react-icons/fa6";

const iconMap = {
    unofficial: <FaCircleInfo />,
    game: <FaGamepad />,
    accuracy: <FaTriangleExclamation />,
    rights: <FaScaleBalanced />,
    responsibility: <FaShieldHalved />,
};

function Disclaimer() {
    const { t, i18n } = useTranslation("viewer");
    const { lang } = useParams();

    const currentLang = lang || i18n.language || "ko";

    const summaryItems = t("disclaimer.summary.items", {
        returnObjects: true,
    });

    const sections = t("disclaimer.sections", {
        returnObjects: true,
    });

    return (
        <main className="bg-body-tertiary min-vh-100">
            <section className="py-5 border-bottom bg-body">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-9 col-xl-8">
                            <span className="badge text-bg-warning mb-3 px-3 py-2">
                                {t("disclaimer.badge")}
                            </span>

                            <h1 className="display-6 fw-bold mb-3">
                                {t("disclaimer.title")}
                            </h1>

                            <p className="lead text-secondary mb-3">
                                {t("disclaimer.subtitle")}
                            </p>

                            <p className="small text-secondary mb-0">
                                {t("disclaimer.lastUpdated")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="container py-5">
                <div className="row justify-content-center">
                    <div className="col-lg-9 col-xl-8">
                        <div className="alert alert-warning border-0 shadow-sm mb-4">
                            <div className="d-flex gap-3">
                                <div className="fs-4">
                                    <FaTriangleExclamation />
                                </div>

                                <div>
                                    <div className="fw-bold mb-1">
                                        {t("disclaimer.notice.title")}
                                    </div>
                                    <div className="lh-lg">
                                        {t("disclaimer.notice.body")}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-body p-4 p-md-5">
                                <h2 className="h4 fw-bold mb-4">
                                    {t("disclaimer.summary.title")}
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

                        <div className="card border-0 shadow-sm mb-4">
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
                                            <div className="d-flex align-items-start gap-3">
                                                <div
                                                    className="rounded-circle bg-warning-subtle text-warning-emphasis d-flex align-items-center justify-content-center flex-shrink-0 fs-5"
                                                    style={{
                                                        width: "44px",
                                                        height: "44px",
                                                    }}
                                                >
                                                    {iconMap[section.icon] || <FaCircleInfo />}
                                                </div>

                                                <div>
                                                    <h2 className="h5 fw-bold mb-3">
                                                        {section.title}
                                                    </h2>

                                                    <p className="text-secondary lh-lg mb-0">
                                                        {section.body}
                                                    </p>
                                                </div>
                                            </div>
                                        </section>
                                    ))}
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm">
                            <div className="card-body p-4 p-md-5 text-center">
                                <h2 className="h5 fw-bold mb-3">
                                    {t("disclaimer.footer.title")}
                                </h2>

                                <p className="text-secondary lh-lg mb-4">
                                    {t("disclaimer.footer.body")}
                                </p>

                                <div className="d-flex flex-wrap gap-2 justify-content-center">
                                    <Link
                                        to={`/${currentLang}/privacy`}
                                        className="btn btn-outline-secondary"
                                    >
                                        {t("disclaimer.privacyButton")}
                                    </Link>

                                    <Link
                                        to={`/${currentLang}/contact`}
                                        className="btn btn-primary"
                                    >
                                        {t("disclaimer.contactButton")}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Disclaimer;