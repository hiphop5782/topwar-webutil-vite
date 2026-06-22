import { useTranslation } from "react-i18next";

import ProfileImage from "@src/assets/images/kid.png";

const KAKAO_URL = "https://open.kakao.com/o/glCbXJVg";
const KO_FI_URL = "https://ko-fi.com/kid3223";
const DISCORD_URL = "https://discord.com/users/1352828216179429377";

function Developer() {
    const { t } = useTranslation("viewer");

    return (
        <div className="container py-4 py-lg-5">
            {/* 상단 소개 */}
            <section
                className="position-relative overflow-hidden rounded-4 shadow-sm mb-4"
                style={{
                    background:
                        "linear-gradient(135deg, rgba(13,110,253,.16), rgba(111,66,193,.10), rgba(255,255,255,.02))",
                    border: "1px solid rgba(13,110,253,.18)",
                }}
            >
                <div className="p-4 p-md-5">
                    <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-4">
                        <div>
                            <div className="d-inline-flex align-items-center gap-2 mb-3">
                                <span className="badge rounded-pill text-bg-primary px-3 py-2">
                                    {t("Developer.badge")}
                                </span>

                                <span className="small text-secondary">
                                    {t("Developer.personal-project")}
                                </span>
                            </div>

                            <h1 className="display-6 fw-bold mb-3">
                                {t("Developer.title")}
                            </h1>

                            <p className="lead text-secondary mb-4">
                                {t("Developer.description")}
                            </p>

                            <div className="d-flex flex-wrap gap-2">
                                <a
                                    href="#developer-profile"
                                    className="btn btn-primary px-4"
                                >
                                    {t("Developer.btn-profile")}
                                </a>

                                <a
                                    href="#developer-contact"
                                    className="btn btn-outline-primary px-4"
                                >
                                    {t("Developer.btn-contact")}
                                </a>
                            </div>
                        </div>

                        <img
                            src={ProfileImage}
                            alt={t("Developer.image-alt")}
                            className="img-fluid flex-shrink-0"
                            style={{
                                width: "clamp(88px, 14vw, 138px)",
                                maxHeight: "138px",
                                objectFit: "contain",
                            }}
                        />
                    </div>
                </div>
            </section>

            {/* 서비스 안내 */}
            <section className="row g-3 mb-4">
                <div className="col-12 col-md-4">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body p-4">
                            <div className="fs-3 mb-3">🛠️</div>

                            <h2 className="h5 fw-bold">
                                {t("Developer.notice-personal-title")}
                            </h2>

                            <p className="text-secondary mb-0">
                                {t("Developer.notice-personal-description")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body p-4">
                            <div className="fs-3 mb-3">💡</div>

                            <h2 className="h5 fw-bold">
                                {t("Developer.notice-feature-title")}
                            </h2>

                            <p className="text-secondary mb-0">
                                {t("Developer.notice-feature-description")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body p-4">
                            <div className="fs-3 mb-3">💬</div>

                            <h2 className="h5 fw-bold">
                                {t("Developer.notice-chat-title")}
                            </h2>

                            <p className="text-secondary mb-0">
                                {t("Developer.notice-chat-description-prefix")}{" "}
                                <strong className="text-primary">
                                    ＫＩＤ³²²³
                                </strong>{" "}
                                {t("Developer.notice-chat-description-suffix")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 개발자 프로필 */}
            <section id="developer-profile">
                <div className="mb-3">
                    <div className="small fw-bold text-primary mb-1">
                        {t("Developer.profile-section-label")}
                    </div>

                    <h2 className="h3 fw-bold mb-0">
                        {t("Developer.profile-title")}
                    </h2>
                </div>

                <div className="card border-0 shadow-sm">
                    <div className="card-body p-4 p-md-5">
                        <div className="d-flex flex-column flex-md-row align-items-md-start gap-4">
                            <div
                                className="d-flex align-items-center justify-content-center rounded-4 flex-shrink-0"
                                style={{
                                    width: "132px",
                                    height: "132px",
                                    background:
                                        "linear-gradient(135deg, rgba(13,110,253,.10), rgba(111,66,193,.10))",
                                }}
                            >
                                <img
                                    src={ProfileImage}
                                    alt={t("Developer.image-alt")}
                                    className="img-fluid"
                                    style={{
                                        width: "112px",
                                        height: "112px",
                                        objectFit: "contain",
                                    }}
                                />
                            </div>

                            <div className="flex-grow-1 min-w-0">
                                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                    <h3 className="h2 fw-bold mb-0">
                                        {t("Developer.profile-name")}
                                    </h3>

                                    <span className="badge rounded-pill text-bg-primary">
                                        {t("Developer.profile-server")}
                                    </span>
                                </div>

                                <p className="text-secondary mb-4">
                                    {t("Developer.profile-description")}
                                </p>

                                <div className="row g-2 mb-4">
                                    <div className="col-6 col-lg-3">
                                        <div className="border rounded-3 p-3 h-100">
                                            <div className="small text-secondary mb-1">
                                                {t("Developer.profile-specialty-label")}
                                            </div>
                                            <div className="fw-semibold small">
                                                {t("Developer.profile-specialty-value")}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-6 col-lg-3">
                                        <div className="border rounded-3 p-3 h-100">
                                            <div className="small text-secondary mb-1">
                                                {t("Developer.profile-interest-label")}
                                            </div>
                                            <div className="fw-semibold small">
                                                {t("Developer.profile-interest-value")}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-6 col-lg-3">
                                        <div className="border rounded-3 p-3 h-100">
                                            <div className="small text-secondary mb-1">
                                                {t("Developer.profile-game-server-label")}
                                            </div>
                                            <div className="fw-semibold">3223</div>
                                        </div>
                                    </div>

                                    <div className="col-6 col-lg-3">
                                        <div className="border rounded-3 p-3 h-100">
                                            <div className="small text-secondary mb-1">
                                                {t("Developer.profile-nickname-label")}
                                            </div>
                                            <div className="fw-semibold text-primary">
                                                ＫＩＤ³²²³
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 문의 */}
                                <div
                                    id="developer-contact"
                                    className="border-top pt-3"
                                >
                                    <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
                                        <div>
                                            <h4 className="h6 fw-bold mb-1">
                                                {t("Developer.contact-title")}
                                            </h4>

                                            <p className="small text-secondary mb-0">
                                                {t("Developer.contact-description")}
                                            </p>
                                        </div>

                                        <div className="d-flex flex-wrap gap-2 flex-shrink-0">
                                            <a
                                                href={KAKAO_URL}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-warning btn-sm"
                                            >
                                                {t("Developer.btn-kakao")}
                                            </a>

                                            <a
                                                href={DISCORD_URL}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-primary btn-sm"
                                            >
                                                {t("Developer.btn-discord")}
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* 후원 */}
                                <div
                                    className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mt-3 px-3 py-2 rounded-3"
                                    style={{
                                        background: "rgba(33,37,41,.04)",
                                        border: "1px solid rgba(33,37,41,.10)",
                                    }}
                                >
                                    <div className="small text-secondary">
                                        {t("Developer.support-note")}
                                    </div>

                                    <a
                                        href={KO_FI_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-dark btn-sm flex-shrink-0"
                                    >
                                        {t("Developer.btn-support")}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Developer;
