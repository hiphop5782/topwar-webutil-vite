import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Footer() {
    const { t, i18n } = useTranslation("viewer");
    const currentLang = i18n.language || "ko";
    return (
        <footer className="border-top bg-body py-4 mt-5">
            <div className="container">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
                    <div className="small text-secondary">
                        © 2026 Progamer.info
                    </div>

                    <div className="d-flex flex-wrap justify-content-center gap-3 small">
                        <Link
                            to={`/${currentLang}/privacy`}
                            className="text-secondary text-decoration-none"
                        >
                            {t("footer.privacy")}
                        </Link>

                        <Link
                            to={`/${currentLang}/contact`}
                            className="text-secondary text-decoration-none"
                        >
                            {t("footer.contact")}
                        </Link>

                        <Link
                            to={`/${currentLang}/disclaimer`}
                            className="text-secondary text-decoration-none"
                        >
                            {t("footer.disclaimer")}
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;