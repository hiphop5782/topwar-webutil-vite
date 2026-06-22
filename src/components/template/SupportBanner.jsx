import { useTranslation } from "react-i18next";

const KOFI_URL = "https://ko-fi.com/progamerinfo";

function SupportBanner({ className = "" }) {
    const { t } = useTranslation("viewer");

    return (
        <div
            className={`d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 border rounded-3 px-3 py-2 ${className}`}
        >
            <div className="small text-secondary">
                <span className="me-2" aria-hidden="true">
                    ☕
                </span>

                {t("SupportBanner.message", {
                    defaultValue:
                        "이 도구가 도움이 되셨다면 개발을 응원해 주세요.",
                })}
            </div>

            <a
                href={KOFI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-primary btn-sm flex-shrink-0"
            >
                {t("SupportBanner.button", {
                    defaultValue: "개발 응원하기",
                })}
            </a>
        </div>
    );
}

export default SupportBanner;