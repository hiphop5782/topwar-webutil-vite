import { useTranslation } from "react-i18next";

import NameCard from "@src/assets/images/developer.png";
import UtterancesComments from "../comments/UtterancesComments";

function Developer() {
    const { t } = useTranslation("viewer");

    return (
        <div className="container py-4 py-lg-5">
            {/* 상단 소개 */}
            <section
                className="position-relative overflow-hidden rounded-4 shadow-sm mb-5"
                style={{
                    background:
                        "linear-gradient(135deg, rgba(13,110,253,.16), rgba(111,66,193,.10), rgba(255,255,255,.02))",
                    border:
                        "1px solid rgba(13,110,253,.18)",
                }}
            >
                <div className="row align-items-center g-0">
                    <div className="col-12 col-lg-8">
                        <div className="p-4 p-md-5">
                            <div className="d-inline-flex align-items-center gap-2 mb-3">
                                <span className="badge rounded-pill text-bg-primary px-3 py-2">
                                    {t("Developer.badge")}
                                </span>

                                <span className="small text-secondary">
                                    {t(
                                        "Developer.personal-project"
                                    )}
                                </span>
                            </div>

                            <h1 className="display-6 fw-bold mb-3">
                                {t("Developer.title")}
                            </h1>

                            <p className="lead text-secondary mb-4">
                                {t(
                                    "Developer.description"
                                )}
                            </p>

                            <div className="d-flex flex-wrap gap-2">
                                <a
                                    href="#developer-profile"
                                    className="btn btn-primary px-4"
                                >
                                    {t(
                                        "Developer.btn-profile"
                                    )}
                                </a>

                                <a
                                    href="#developer-comments"
                                    className="btn btn-outline-primary px-4"
                                >
                                    {t(
                                        "Developer.btn-comments"
                                    )}
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-lg-4">
                        <div className="p-4 p-lg-5 text-center">
                            <div
                                className="d-inline-flex align-items-center justify-content-center rounded-circle shadow-sm"
                                style={{
                                    width: "150px",
                                    height: "150px",
                                    background:
                                        "linear-gradient(135deg, #0d6efd, #6f42c1)",
                                }}
                            >
                                <span
                                    className="fw-bold text-white"
                                    style={{
                                        fontSize: "2.2rem",
                                        letterSpacing:
                                            "0.08em",
                                    }}
                                >
                                    KID
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 서비스 안내 */}
            <section className="row g-3 mb-5">
                <div className="col-12 col-md-4">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body p-4">
                            <div
                                className="d-flex align-items-center justify-content-center rounded-3 mb-3"
                                style={{
                                    width: "52px",
                                    height: "52px",
                                    background:
                                        "rgba(13,110,253,.12)",
                                    fontSize: "1.6rem",
                                }}
                            >
                                🛠️
                            </div>

                            <h2 className="h5 fw-bold">
                                {t(
                                    "Developer.notice-personal-title"
                                )}
                            </h2>

                            <p className="text-secondary mb-0">
                                {t(
                                    "Developer.notice-personal-description"
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body p-4">
                            <div
                                className="d-flex align-items-center justify-content-center rounded-3 mb-3"
                                style={{
                                    width: "52px",
                                    height: "52px",
                                    background:
                                        "rgba(255,193,7,.16)",
                                    fontSize: "1.6rem",
                                }}
                            >
                                💡
                            </div>

                            <h2 className="h5 fw-bold">
                                {t(
                                    "Developer.notice-feature-title"
                                )}
                            </h2>

                            <p className="text-secondary mb-0">
                                {t(
                                    "Developer.notice-feature-description"
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body p-4">
                            <div
                                className="d-flex align-items-center justify-content-center rounded-3 mb-3"
                                style={{
                                    width: "52px",
                                    height: "52px",
                                    background:
                                        "rgba(25,135,84,.14)",
                                    fontSize: "1.6rem",
                                }}
                            >
                                💬
                            </div>

                            <h2 className="h5 fw-bold">
                                {t(
                                    "Developer.notice-chat-title"
                                )}
                            </h2>

                            <p className="text-secondary mb-0">
                                {t(
                                    "Developer.notice-chat-description-prefix"
                                )}{" "}
                                <strong className="text-primary">
                                    ＫＩＤ³²²³
                                </strong>{" "}
                                {t(
                                    "Developer.notice-chat-description-suffix"
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 개발자 프로필 */}
            <section
                id="developer-profile"
                className="mb-5"
            >
                <div className="mb-3">
                    <div className="small fw-bold text-primary mb-1">
                        {t(
                            "Developer.profile-section-label"
                        )}
                    </div>

                    <h2 className="h3 fw-bold mb-0">
                        {t(
                            "Developer.profile-title"
                        )}
                    </h2>
                </div>

                <div className="card border-0 shadow-sm overflow-hidden">
                    <div className="row g-0 align-items-stretch">
                        <div className="col-12 col-lg-5">
                            <div
                                className="h-100 d-flex align-items-center justify-content-center p-4"
                                style={{
                                    minHeight: "320px",
                                    background:
                                        "linear-gradient(135deg, rgba(13,110,253,.10), rgba(111,66,193,.10))",
                                }}
                            >
                                <img
                                    src={NameCard}
                                    alt={t(
                                        "Developer.image-alt"
                                    )}
                                    className="img-fluid rounded-4 shadow"
                                    style={{
                                        maxHeight: "420px",
                                        objectFit:
                                            "contain",
                                    }}
                                />
                            </div>
                        </div>

                        <div className="col-12 col-lg-7">
                            <div className="card-body p-4 p-md-5 h-100 d-flex flex-column">
                                <div className="mb-4">
                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                        <h3 className="h2 fw-bold mb-0">
                                            {t(
                                                "Developer.profile-name"
                                            )}
                                        </h3>

                                        <span className="badge rounded-pill text-bg-primary">
                                            {t(
                                                "Developer.profile-server"
                                            )}
                                        </span>
                                    </div>

                                    <p className="fs-5 text-secondary mb-0">
                                        {t(
                                            "Developer.profile-description"
                                        )}
                                    </p>
                                </div>

                                <div className="row g-3 mb-4">
                                    <div className="col-12 col-sm-6">
                                        <div className="border rounded-3 p-3 h-100">
                                            <div className="small text-secondary mb-1">
                                                {t(
                                                    "Developer.profile-specialty-label"
                                                )}
                                            </div>

                                            <div className="fw-bold">
                                                {t(
                                                    "Developer.profile-specialty-value"
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12 col-sm-6">
                                        <div className="border rounded-3 p-3 h-100">
                                            <div className="small text-secondary mb-1">
                                                {t(
                                                    "Developer.profile-interest-label"
                                                )}
                                            </div>

                                            <div className="fw-bold">
                                                {t(
                                                    "Developer.profile-interest-value"
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12 col-sm-6">
                                        <div className="border rounded-3 p-3 h-100">
                                            <div className="small text-secondary mb-1">
                                                {t(
                                                    "Developer.profile-game-server-label"
                                                )}
                                            </div>

                                            <div className="fw-bold">
                                                3223
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12 col-sm-6">
                                        <div className="border rounded-3 p-3 h-100">
                                            <div className="small text-secondary mb-1">
                                                {t(
                                                    "Developer.profile-nickname-label"
                                                )}
                                            </div>

                                            <div className="fw-bold text-primary">
                                                ＫＩＤ³²²³
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <div className="d-flex flex-wrap gap-2">
                                        <a
                                            href="https://open.kakao.com/o/glCbXJVg"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-warning px-4"
                                        >
                                            {t(
                                                "Developer.btn-kakao"
                                            )}
                                        </a>

                                        <a
                                            href="#developer-comments"
                                            className="btn btn-outline-secondary px-4"
                                        >
                                            {t(
                                                "Developer.btn-comment"
                                            )}
                                        </a>
                                    </div>

                                    <p className="small text-secondary mt-3 mb-0">
                                        {t(
                                            "Developer.github-required"
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 댓글 영역 */}
            <section
                id="developer-comments"
                className="pt-4 border-top"
            >
                <div className="mb-4">
                    <div className="small fw-bold text-primary mb-1">
                        {t(
                            "Developer.feedback-label"
                        )}
                    </div>

                    <h2 className="h3 fw-bold mb-2">
                        {t(
                            "Developer.feedback-title"
                        )}
                    </h2>

                    <p className="text-secondary mb-0">
                        {t(
                            "Developer.feedback-description"
                        )}
                    </p>
                </div>

                <div className="card border-0 shadow-sm">
                    <div className="card-body p-3 p-md-4">
                        <UtterancesComments />
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Developer;