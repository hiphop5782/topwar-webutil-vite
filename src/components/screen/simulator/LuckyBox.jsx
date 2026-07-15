import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslation } from "react-i18next";

import BoxImage from "@src/assets/images/box.png";
import BoxOpenImage from "@src/assets/images/box-open.png";

const REWARD_LIMIT = 28;
const MIN_REWARD_COUNT = 1;
const MAX_REWARD_COUNT = 3;
const OPEN_ANIMATION_MS = 650;

const getRandomInteger = (max) => {
    if (max <= 0) {
        return 0;
    }

    if (
        typeof crypto !== "undefined" &&
        typeof crypto.getRandomValues === "function"
    ) {
        const randomBuffer = new Uint32Array(1);
        const maxValidValue =
            Math.floor(0x100000000 / max) * max;

        let randomValue;

        do {
            crypto.getRandomValues(randomBuffer);
            randomValue = randomBuffer[0];
        } while (randomValue >= maxValidValue);

        return randomValue % max;
    }

    return Math.floor(Math.random() * max);
};

const sampleRewards = (limit, count) => {
    const rewardNumbers = Array.from(
        { length: limit },
        (_, index) => index + 1
    );

    for (
        let index = rewardNumbers.length - 1;
        index > 0;
        index--
    ) {
        const randomPosition = getRandomInteger(index + 1);

        [
            rewardNumbers[index],
            rewardNumbers[randomPosition],
        ] = [
            rewardNumbers[randomPosition],
            rewardNumbers[index],
        ];
    }

    return rewardNumbers.slice(0, count);
};

export default function LuckyBox() {
    const { t } = useTranslation("viewer");

    const [status, setStatus] = useState("idle");
    const [reward, setReward] = useState([]);
    const timeoutRef = useRef(null);

    const publicUrl = useMemo(
        () =>
            (
                import.meta.env.VITE_PUBLIC_URL ?? ""
            ).replace(/\/$/, ""),
        []
    );

    const isDrawing = status === "drawing";
    const isFinished = status === "finished";

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const getRewardImageUrl = (rewardNo) =>
        `${publicUrl}/images/lucky/${rewardNo}.png`;

    const openBox = () => {
        if (isDrawing || isFinished) {
            return;
        }

        const rewardCount =
            getRandomInteger(
                MAX_REWARD_COUNT -
                    MIN_REWARD_COUNT +
                    1
            ) + MIN_REWARD_COUNT;

        setReward(
            sampleRewards(REWARD_LIMIT, rewardCount)
        );
        setStatus("drawing");

        timeoutRef.current = window.setTimeout(() => {
            setStatus("finished");
            timeoutRef.current = null;
        }, OPEN_ANIMATION_MS);
    };

    const resetBox = () => {
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        setReward([]);
        setStatus("idle");
    };

    const statusMessage = useMemo(() => {
        if (isDrawing) {
            return t("LuckyBox.result.drawing");
        }

        if (isFinished) {
            return t("LuckyBox.result.completed", {
                count: reward.length,
            });
        }

        return t("LuckyBox.result.ready");
    }, [isDrawing, isFinished, reward.length, t]);

    return (
        <main className="container py-4">
            <header className="row mb-4">
                <div className="col-12">
                    <div className="border-bottom pb-3">
                        <span className="badge text-bg-primary mb-2">
                            {t("LuckyBox.header.badge")}
                        </span>

                        <h1 className="fw-bold mb-2">
                            {t("LuckyBox.header.title")}
                        </h1>

                        <p className="text-secondary mb-0">
                            {t(
                                "LuckyBox.header.description"
                            )}
                        </p>
                    </div>
                </div>
            </header>

            <div className="row justify-content-center">
                <div className="col-12 col-lg-8">
                    <section
                        className="card border-0 shadow-sm"
                        aria-labelledby="lucky-box-title"
                    >
                        <div className="card-body p-4 p-lg-5">
                            <div className="text-center mb-4">
                                <h2
                                    id="lucky-box-title"
                                    className="h4 fw-bold mb-2"
                                >
                                    {t(
                                        "LuckyBox.game.title"
                                    )}
                                </h2>

                                <p className="text-secondary mb-0">
                                    {t(
                                        "LuckyBox.game.description"
                                    )}
                                </p>
                            </div>

                            <div
                                className="row mt-4"
                                aria-live="polite"
                                aria-atomic="true"
                            >
                                <div
                                    className="col text-center reward-wrapper d-flex justify-content-center align-items-center flex-wrap gap-2"
                                    style={{
                                        minHeight: 116,
                                    }}
                                >
                                    {reward.length === 0 ? (
                                        <div className="text-secondary">
                                            {t(
                                                "LuckyBox.result.empty"
                                            )}
                                        </div>
                                    ) : (
                                        reward.map(
                                            (
                                                rewardNo,
                                                index
                                            ) => (
                                                <figure
                                                    className="mb-0"
                                                    key={
                                                        rewardNo
                                                    }
                                                >
                                                    <img
                                                        src={getRewardImageUrl(
                                                            rewardNo
                                                        )}
                                                        className={`reward-item ${
                                                            isFinished
                                                                ? "finish"
                                                                : ""
                                                        }`}
                                                        width="100"
                                                        height="100"
                                                        loading="eager"
                                                        alt={t(
                                                            "LuckyBox.reward.alt",
                                                            {
                                                                number: rewardNo,
                                                            }
                                                        )}
                                                    />

                                                    <figcaption className="small text-secondary mt-1">
                                                        {t(
                                                            "LuckyBox.reward.label",
                                                            {
                                                                number: rewardNo,
                                                            }
                                                        )}
                                                    </figcaption>
                                                </figure>
                                            )
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="row mt-3">
                                <div className="col text-center">
                                    <button
                                        type="button"
                                        className="btn border-0 bg-transparent p-0"
                                        onClick={openBox}
                                        disabled={
                                            isDrawing ||
                                            isFinished
                                        }
                                        aria-label={
                                            isFinished
                                                ? t(
                                                      "LuckyBox.aria.opened"
                                                  )
                                                : t(
                                                      "LuckyBox.aria.open"
                                                  )
                                        }
                                    >
                                        <img
                                            src={
                                                isFinished
                                                    ? BoxOpenImage
                                                    : BoxImage
                                            }
                                            className={`random-box ${
                                                isFinished
                                                    ? "finish"
                                                    : ""
                                            }`}
                                            alt={
                                                isFinished
                                                    ? t(
                                                          "LuckyBox.game.openBoxAlt"
                                                      )
                                                    : t(
                                                          "LuckyBox.game.closedBoxAlt"
                                                      )
                                            }
                                            style={{
                                                maxWidth:
                                                    "260px",
                                                width: "100%",
                                                cursor:
                                                    isDrawing ||
                                                    isFinished
                                                        ? "default"
                                                        : "pointer",
                                            }}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div
                                className={`alert mt-4 mb-0 text-center ${
                                    isFinished
                                        ? "alert-success"
                                        : isDrawing
                                          ? "alert-warning"
                                          : "alert-light border"
                                }`}
                                role="status"
                            >
                                <strong>
                                    {statusMessage}
                                </strong>
                            </div>

                            <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
                                {!isFinished && (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={openBox}
                                        disabled={isDrawing}
                                    >
                                        {isDrawing
                                            ? t(
                                                  "LuckyBox.buttons.opening"
                                              )
                                            : t(
                                                  "LuckyBox.buttons.open"
                                              )}
                                    </button>
                                )}

                                {isFinished && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        onClick={resetBox}
                                    >
                                        {t(
                                            "LuckyBox.buttons.retry"
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <section className="card border-0 shadow-sm mt-5">
                <div className="card-body p-4 p-lg-5">
                    <h2 className="h3 fw-bold mb-3">
                        {t(
                            "LuckyBox.guide.introductionTitle"
                        )}
                    </h2>

                    <p>
                        {t(
                            "LuckyBox.guide.introduction1"
                        )}
                    </p>

                    <p>
                        {t(
                            "LuckyBox.guide.introduction2"
                        )}
                    </p>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t("LuckyBox.guide.usageTitle")}
                    </h2>

                    <ol className="lh-lg">
                        <li>
                            {t("LuckyBox.guide.usage1")}
                        </li>
                        <li>
                            {t("LuckyBox.guide.usage2")}
                        </li>
                        <li>
                            {t("LuckyBox.guide.usage3")}
                        </li>
                    </ol>

                    <hr className="my-4" />

                    <h2 className="h4 fw-bold">
                        {t(
                            "LuckyBox.guide.ruleTitle"
                        )}
                    </h2>

                    <ul className="lh-lg">
                        <li>
                            {t("LuckyBox.guide.rule1", {
                                min: MIN_REWARD_COUNT,
                                max: MAX_REWARD_COUNT,
                            })}
                        </li>
                        <li>
                            {t("LuckyBox.guide.rule2", {
                                limit: REWARD_LIMIT,
                            })}
                        </li>
                        <li>
                            {t("LuckyBox.guide.rule3")}
                        </li>
                    </ul>

                    <div className="alert alert-warning mb-0">
                        <strong className="d-block mb-1">
                            {t(
                                "LuckyBox.guide.noticeTitle"
                            )}
                        </strong>

                        {t("LuckyBox.guide.notice")}
                    </div>
                </div>
            </section>

            <section className="card border-0 shadow-sm mt-4">
                <div className="card-body p-4 p-lg-5">
                    <h2 className="h3 fw-bold mb-4">
                        {t("LuckyBox.faq.title")}
                    </h2>

                    <div className="accordion" id="luckyBoxFaq">
                        {[1, 2, 3].map((number) => (
                            <div
                                className="accordion-item"
                                key={number}
                            >
                                <h3
                                    className="accordion-header"
                                    id={`lucky-box-faq-heading-${number}`}
                                >
                                    <button
                                        className={`accordion-button ${
                                            number === 1
                                                ? ""
                                                : "collapsed"
                                        }`}
                                        type="button"
                                        data-bs-toggle="collapse"
                                        data-bs-target={`#lucky-box-faq-${number}`}
                                        aria-expanded={
                                            number === 1
                                        }
                                        aria-controls={`lucky-box-faq-${number}`}
                                    >
                                        {t(
                                            `LuckyBox.faq.question${number}`
                                        )}
                                    </button>
                                </h3>

                                <div
                                    id={`lucky-box-faq-${number}`}
                                    className={`accordion-collapse collapse ${
                                        number === 1
                                            ? "show"
                                            : ""
                                    }`}
                                    aria-labelledby={`lucky-box-faq-heading-${number}`}
                                    data-bs-parent="#luckyBoxFaq"
                                >
                                    <div className="accordion-body">
                                        {t(
                                            `LuckyBox.faq.answer${number}`
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}