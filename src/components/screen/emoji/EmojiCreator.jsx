import {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
    Trans,
    useTranslation
} from "react-i18next";
import { removeBackground } from "@imgly/background-removal";
import {
    Stage,
    Layer,
    Image as KonvaImage,
    Line,
    Circle,
    Group
} from "react-konva";
import { FaFloppyDisk } from "react-icons/fa6";
import { PropagateLoader } from "react-spinners";

import "./EmojiCreator.css";

const RAW_SITE_ORIGIN =
    import.meta.env.VITE_PUBLIC_URL ||
    "https://www.progamer.info";

const SITE_ORIGIN = RAW_SITE_ORIGIN.startsWith("//")
    ? `https:${RAW_SITE_ORIGIN}`
    : RAW_SITE_ORIGIN;

const SUPPORTED_LANGUAGE_CODES = [
    "ko",
    "en",
    "ja"
];

const FEATURE_KEYS = [
    "automaticRemoval",
    "manualEditing",
    "pngExport"
];

const USAGE_STEP_KEYS = [
    "selectImage",
    "checkResult",
    "editMask",
    "adjustView",
    "download"
];

const LIMITATION_KEYS = [
    "complexEdges",
    "lowContrast",
    "lowResolution",
    "overlappingSubjects"
];

const FAQ_KEYS = [
    "storage",
    "firstRun",
    "formats",
    "transparency",
    "mobile"
];

function createPageUrl(pathname) {
    const normalizedPath =
        pathname === "/"
            ? "/"
            : `${pathname.replace(/\/+$/, "")}/`;

    return new URL(
        normalizedPath,
        SITE_ORIGIN
    ).href;
}

function resolveLanguage(pathname, i18n) {
    const routeLanguage =
        pathname.match(
            /^\/(ko|en|ja)(?:\/|$)/
        )?.[1];

    if (
        routeLanguage &&
        SUPPORTED_LANGUAGE_CODES.includes(
            routeLanguage
        )
    ) {
        return routeLanguage;
    }

    const i18nLanguage = (
        i18n.resolvedLanguage ??
        i18n.language ??
        "ko"
    ).split("-")[0];

    return SUPPORTED_LANGUAGE_CODES.includes(
        i18nLanguage
    )
        ? i18nLanguage
        : "ko";
}

export default function EmojiCreator() {
    const { pathname } = useLocation();
    const { i18n } = useTranslation("viewer");

    const currentLanguage = resolveLanguage(
        pathname,
        i18n
    );

    const t = i18n.getFixedT(
        currentLanguage,
        "viewer"
    );

    const pageUrl = createPageUrl(pathname);

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: t(
            "emojiCreator.seo.structuredName"
        ),
        url: pageUrl,
        inLanguage: currentLanguage,
        applicationCategory:
            "MultimediaApplication",
        operatingSystem: "Web Browser",
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "KRW"
        },
        description: t(
            "emojiCreator.seo.description"
        )
    };

    const [originalImage, setOriginalImage] =
        useState(null);
    const [resultImage, setResultImage] =
        useState(null);
    const [lines, setLines] = useState([]);
    const [loading, setLoading] =
        useState(false);
    const [errorKey, setErrorKey] =
        useState("");
    const [brushSize, setBrushSize] =
        useState(30);
    const [cursorPos, setCursorPos] =
        useState({
            x: 0,
            y: 0
        });

    const [zoomScale, setZoomScale] =
        useState(1);
    const [position, setPosition] =
        useState({
            x: 0,
            y: 0
        });
    const [displaySize, setDisplaySize] =
        useState({
            width: 0,
            height: 0,
            fitScale: 1
        });

    const stageRef = useRef(null);
    const containerRef = useRef(null);
    const isDrawing = useRef(false);
    const isDragging = useRef(false);
    const originalUrlRef = useRef(null);
    const resultUrlRef = useRef(null);

    const revokeImageUrls = useCallback(() => {
        if (originalUrlRef.current) {
            URL.revokeObjectURL(
                originalUrlRef.current
            );
            originalUrlRef.current = null;
        }

        if (resultUrlRef.current) {
            URL.revokeObjectURL(
                resultUrlRef.current
            );
            resultUrlRef.current = null;
        }
    }, []);

    useEffect(
        () => revokeImageUrls,
        [revokeImageUrls]
    );

    const handleImageUpload = useCallback(
        async (e) => {
            const file = e.target.files?.[0];

            if (!file) {
                return;
            }

            if (!file.type.startsWith("image/")) {
                setErrorKey(
                    "emojiCreator.errors.invalidFileType"
                );
                e.target.value = "";
                return;
            }

            setLoading(true);
            setErrorKey("");
            setOriginalImage(null);
            setResultImage(null);
            setLines([]);
            revokeImageUrls();

            try {
                const originalUrl =
                    URL.createObjectURL(file);
                originalUrlRef.current =
                    originalUrl;

                const img = new Image();
                img.src = originalUrl;
                await img.decode();
                setOriginalImage(img);

                const blob =
                    await removeBackground(file);
                const resultUrl =
                    URL.createObjectURL(blob);
                resultUrlRef.current =
                    resultUrl;

                const resImg = new Image();
                resImg.src = resultUrl;
                await resImg.decode();
                setResultImage(resImg);
            }
            catch (error) {
                console.error(error);
                setErrorKey(
                    "emojiCreator.errors.backgroundRemovalFailed"
                );
                setOriginalImage(null);
                setResultImage(null);
                revokeImageUrls();
            }
            finally {
                setLoading(false);
                e.target.value = "";
            }
        },
        [revokeImageUrls]
    );

    useEffect(() => {
        if (
            !originalImage ||
            !containerRef.current
        ) {
            return;
        }

        const updateDisplaySize = () => {
            const containerWidth =
                containerRef.current
                    ?.offsetWidth ?? 0;

            if (containerWidth <= 0) {
                return;
            }

            const squareSize = containerWidth;
            const fitScale =
                squareSize /
                Math.max(
                    originalImage.width,
                    originalImage.height
                );

            setDisplaySize({
                width: squareSize,
                height: squareSize,
                fitScale
            });

            setPosition({
                x:
                    (
                        squareSize -
                        originalImage.width *
                            fitScale
                    ) / 2,
                y:
                    (
                        squareSize -
                        originalImage.height *
                            fitScale
                    ) / 2
            });
            setZoomScale(1);
        };

        updateDisplaySize();
        window.addEventListener(
            "resize",
            updateDisplaySize
        );

        return () =>
            window.removeEventListener(
                "resize",
                updateDisplaySize
            );
    }, [
        originalImage,
        resultImage,
        loading
    ]);

    const handleUndo = useCallback(() => {
        setLines((prev) => prev.slice(0, -1));
    }, []);

    const handleWheel = (e) => {
        e.evt.preventDefault();
        const scaleBy = 1.1;

        if (e.evt.ctrlKey) {
            const stage = stageRef.current;
            const oldScale = zoomScale;
            const pointer =
                stage?.getPointerPosition();

            if (!pointer) {
                return;
            }

            const mousePointTo = {
                x:
                    (pointer.x - position.x) /
                    oldScale,
                y:
                    (pointer.y - position.y) /
                    oldScale
            };

            const newScale =
                e.evt.deltaY < 0
                    ? Math.min(
                          oldScale * scaleBy,
                          8
                      )
                    : Math.max(
                          oldScale / scaleBy,
                          0.25
                      );

            setZoomScale(newScale);
            setPosition({
                x:
                    pointer.x -
                    mousePointTo.x *
                        newScale,
                y:
                    pointer.y -
                    mousePointTo.y *
                        newScale
            });
        }
        else {
            const newSize =
                e.evt.deltaY < 0
                    ? brushSize * scaleBy
                    : brushSize / scaleBy;

            setBrushSize(
                Math.min(
                    Math.max(5, newSize),
                    400
                )
            );
        }
    };

    const getRelativePointerPos = (stage) => {
        const pointer =
            stage?.getPointerPosition();

        if (!pointer) {
            return null;
        }

        return {
            x:
                (pointer.x - position.x) /
                (
                    displaySize.fitScale *
                    zoomScale
                ),
            y:
                (pointer.y - position.y) /
                (
                    displaySize.fitScale *
                    zoomScale
                )
        };
    };

    const handleMouseDown = (e) => {
        if (e.evt.button === 1) {
            isDragging.current = true;
            return;
        }

        const pos = getRelativePointerPos(
            stageRef.current
        );

        if (!pos) {
            return;
        }

        isDrawing.current = true;
        const mode =
            e.evt.button === 2
                ? "restore"
                : "eraser";

        setLines((prev) => [
            ...prev,
            {
                mode,
                points: [
                    pos.x,
                    pos.y,
                    pos.x,
                    pos.y
                ],
                size:
                    brushSize /
                    (
                        displaySize.fitScale *
                        zoomScale
                    )
            }
        ]);
    };

    const handleMouseMove = (e) => {
        const stage = stageRef.current;
        const pointer =
            stage?.getPointerPosition();

        if (pointer) {
            setCursorPos(pointer);
        }

        if (isDragging.current) {
            setPosition((prev) => ({
                x:
                    prev.x +
                    e.evt.movementX,
                y:
                    prev.y +
                    e.evt.movementY
            }));
            return;
        }

        if (!isDrawing.current) {
            return;
        }

        const pos =
            getRelativePointerPos(stage);

        if (!pos) {
            return;
        }

        const currentMode =
            e.evt.buttons === 2
                ? "restore"
                : "eraser";

        setLines((prev) => {
            if (prev.length === 0) {
                return prev;
            }

            const last =
                prev[prev.length - 1];

            if (last.mode !== currentMode) {
                return prev;
            }

            return [
                ...prev.slice(0, -1),
                {
                    ...last,
                    points: [
                        ...last.points,
                        pos.x,
                        pos.y
                    ]
                }
            ];
        });
    };

    const handleMouseUp = () => {
        isDrawing.current = false;
        isDragging.current = false;
    };

    const resetPosition = () => {
        if (!originalImage) {
            return;
        }

        const fitScale =
            displaySize.width /
            Math.max(
                originalImage.width,
                originalImage.height
            );

        setZoomScale(1);
        setPosition({
            x:
                (
                    displaySize.width -
                    originalImage.width *
                        fitScale
                ) / 2,
            y:
                (
                    displaySize.height -
                    originalImage.height *
                        fitScale
                ) / 2
        });
    };

    const handleDownload = () => {
        const stage = stageRef.current;

        if (!stage) {
            return;
        }

        const layers = stage.getLayers();
        const cursorLayer = layers[1];

        try {
            cursorLayer?.hide();

            const dataURL = stage.toDataURL({
                pixelRatio: 2,
                mimeType: "image/png"
            });

            const link =
                document.createElement("a");
            link.download =
                "square-emoticon.png";
            link.href = dataURL;
            link.click();
        }
        finally {
            cursorLayer?.show();
        }
    };

    return (
        <>
            <Helmet>
                <title>
                    {t("emojiCreator.seo.title")}
                </title>
                <meta
                    name="description"
                    content={t(
                        "emojiCreator.seo.description"
                    )}
                />
                <meta
                    name="robots"
                    content="index, follow, max-image-preview:large"
                />
                <link
                    rel="canonical"
                    href={pageUrl}
                />
                <script type="application/ld+json">
                    {JSON.stringify(
                        structuredData
                    )}
                </script>
            </Helmet>

            <main
                className="container"
                style={{
                    userSelect: "none",
                    paddingBottom: "100px"
                }}
            >
                <header className="py-4">
                    <h1>
                        {t(
                            "emojiCreator.header.title"
                        )}
                    </h1>
                    <p className="lead mt-3 mb-2">
                        {t(
                            "emojiCreator.header.lead"
                        )}
                    </p>
                    <p className="text-muted mb-0">
                        {t(
                            "emojiCreator.header.note"
                        )}
                    </p>
                </header>

                <section
                    className="card shadow-sm mb-4"
                    aria-labelledby="image-upload-title"
                >
                    <div className="card-body">
                        <h2
                            id="image-upload-title"
                            className="h4"
                        >
                            {t(
                                "emojiCreator.upload.title"
                            )}
                        </h2>
                        <p className="text-muted">
                            {t(
                                "emojiCreator.upload.description"
                            )}
                        </p>

                        <label
                            htmlFor="emoji-image-input"
                            className="form-label fw-bold"
                        >
                            {t(
                                "emojiCreator.upload.label"
                            )}
                        </label>
                        <input
                            id="emoji-image-input"
                            type="file"
                            className="form-control"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleImageUpload}
                            disabled={loading}
                        />
                        <div className="form-text">
                            {t(
                                "emojiCreator.upload.privacyNote"
                            )}
                        </div>
                    </div>
                </section>

                {errorKey && (
                    <div
                        className="alert alert-danger"
                        role="alert"
                    >
                        {t(errorKey)}
                    </div>
                )}

                {loading && (
                    <section
                        className="text-center py-5 border rounded bg-light d-flex flex-column align-items-center justify-content-center mb-4"
                        style={{
                            minHeight: "250px"
                        }}
                        aria-live="polite"
                        aria-busy="true"
                    >
                        <div
                            style={{
                                marginBottom: "40px",
                                display: "block"
                            }}
                        >
                            <PropagateLoader color="#007bff" />
                        </div>
                        <h2 className="h4 mt-4 fw-bold">
                            {t(
                                "emojiCreator.loading.title"
                            )}
                        </h2>
                        <p className="text-muted mb-0">
                            {t(
                                "emojiCreator.loading.description"
                            )}
                        </p>
                    </section>
                )}

                {!loading && resultImage && (
                    <section
                        className="card shadow-sm mb-5"
                        aria-labelledby="image-editor-title"
                    >
                        <div
                            className="card-body"
                            ref={containerRef}
                        >
                            <h2
                                id="image-editor-title"
                                className="h4"
                            >
                                {t(
                                    "emojiCreator.editor.title"
                                )}
                            </h2>
                            <p className="text-muted">
                                {t(
                                    "emojiCreator.editor.description"
                                )}
                            </p>

                            <div className="d-flex flex-wrap gap-2 mt-2 mb-3">
                                <span className="badge bg-secondary">
                                    {t(
                                        "emojiCreator.editor.controls.zoom"
                                    )}
                                </span>
                                <span className="badge bg-secondary">
                                    {t(
                                        "emojiCreator.editor.controls.move"
                                    )}
                                </span>
                                <span className="badge bg-dark">
                                    {t(
                                        "emojiCreator.editor.controls.erase"
                                    )}
                                </span>
                                <span className="badge bg-dark">
                                    {t(
                                        "emojiCreator.editor.controls.restore"
                                    )}
                                </span>
                            </div>

                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                                <div
                                    className="btn-group"
                                    role="group"
                                >
                                    <button
                                        type="button"
                                        onClick={handleUndo}
                                        disabled={
                                            lines.length === 0
                                        }
                                        className="btn btn-danger btn-sm"
                                    >
                                        {t(
                                            "emojiCreator.editor.buttons.undo"
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetPosition}
                                        className="btn btn-outline-secondary btn-sm"
                                    >
                                        {t(
                                            "emojiCreator.editor.buttons.center"
                                        )}
                                    </button>
                                </div>
                                <span className="brush-info">
                                    {t(
                                        "emojiCreator.editor.status",
                                        {
                                            brush:
                                                Math.round(
                                                    brushSize
                                                ),
                                            zoom:
                                                Math.round(
                                                    zoomScale *
                                                        100
                                                )
                                        }
                                    )}
                                </span>
                            </div>

                            <div className="image-viewport">
                                <Stage
                                    width={displaySize.width}
                                    height={displaySize.height}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    onWheel={handleWheel}
                                    onContextMenu={(e) =>
                                        e.evt.preventDefault()
                                    }
                                    ref={stageRef}
                                >
                                    <Layer>
                                        <Group
                                            x={position.x}
                                            y={position.y}
                                            scaleX={
                                                displaySize.fitScale *
                                                zoomScale
                                            }
                                            scaleY={
                                                displaySize.fitScale *
                                                zoomScale
                                            }
                                        >
                                            <Group name="maskGroup">
                                                <KonvaImage
                                                    image={resultImage}
                                                />
                                                {lines.map(
                                                    (
                                                        line,
                                                        index
                                                    ) => (
                                                        <Line
                                                            key={`${line.mode}-${index}`}
                                                            points={
                                                                line.points
                                                            }
                                                            stroke="black"
                                                            strokeWidth={
                                                                line.size
                                                            }
                                                            tension={0.5}
                                                            lineCap="round"
                                                            lineJoin="round"
                                                            globalCompositeOperation={
                                                                line.mode ===
                                                                "restore"
                                                                    ? "source-over"
                                                                    : "destination-out"
                                                            }
                                                        />
                                                    )
                                                )}
                                            </Group>
                                            <KonvaImage
                                                image={originalImage}
                                                globalCompositeOperation="source-in"
                                            />
                                        </Group>
                                    </Layer>
                                    <Layer listening={false}>
                                        <Circle
                                            x={cursorPos.x}
                                            y={cursorPos.y}
                                            radius={brushSize / 2}
                                            stroke={
                                                isDragging.current
                                                    ? "#ffc107"
                                                    : isDrawing.current
                                                      ? lines[
                                                            lines.length -
                                                                1
                                                        ]?.mode ===
                                                        "restore"
                                                          ? "#2ecc71"
                                                          : "#e74c3c"
                                                      : "#333"
                                            }
                                            strokeWidth={2}
                                        />
                                    </Layer>
                                </Stage>
                            </div>

                            <button
                                type="button"
                                onClick={handleDownload}
                                className="btn btn-primary w-100 btn-lg mt-4 shadow"
                            >
                                <FaFloppyDisk className="me-2" />
                                {t(
                                    "emojiCreator.editor.buttons.download"
                                )}
                            </button>
                        </div>
                    </section>
                )}

                <article className="emoji-guide">
                    <section
                        className="mb-5"
                        aria-labelledby="features-title"
                    >
                        <h2 id="features-title">
                            {t(
                                "emojiCreator.guide.features.title"
                            )}
                        </h2>
                        <div className="row g-3 mt-1">
                            {FEATURE_KEYS.map(
                                (featureKey) => (
                                    <div
                                        className="col-md-4"
                                        key={featureKey}
                                    >
                                        <div className="card h-100">
                                            <div className="card-body">
                                                <h3 className="h5">
                                                    {t(
                                                        `emojiCreator.guide.features.items.${featureKey}.title`
                                                    )}
                                                </h3>
                                                <p className="mb-0">
                                                    {t(
                                                        `emojiCreator.guide.features.items.${featureKey}.description`
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </section>

                    <section
                        className="mb-5"
                        aria-labelledby="usage-title"
                    >
                        <h2 id="usage-title">
                            {t(
                                "emojiCreator.guide.usage.title"
                            )}
                        </h2>
                        <ol className="lh-lg">
                            {USAGE_STEP_KEYS.map(
                                (stepKey) => (
                                    <li key={stepKey}>
                                        {t(
                                            `emojiCreator.guide.usage.steps.${stepKey}`
                                        )}
                                    </li>
                                )
                            )}
                        </ol>
                    </section>

                    <section
                        className="mb-5"
                        aria-labelledby="privacy-title"
                    >
                        <h2 id="privacy-title">
                            {t(
                                "emojiCreator.guide.privacy.title"
                            )}
                        </h2>
                        <p>
                            <Trans
                                t={t}
                                i18nKey="emojiCreator.guide.privacy.body1"
                                components={{
                                    library: <code />
                                }}
                            />
                        </p>
                        <p className="mb-0">
                            {t(
                                "emojiCreator.guide.privacy.body2"
                            )}
                        </p>
                    </section>

                    <section
                        className="mb-5"
                        aria-labelledby="limitations-title"
                    >
                        <h2 id="limitations-title">
                            {t(
                                "emojiCreator.guide.limitations.title"
                            )}
                        </h2>
                        <ul className="lh-lg">
                            {LIMITATION_KEYS.map(
                                (limitationKey) => (
                                    <li key={limitationKey}>
                                        {t(
                                            `emojiCreator.guide.limitations.items.${limitationKey}`
                                        )}
                                    </li>
                                )
                            )}
                        </ul>
                        <p className="mb-0">
                            {t(
                                "emojiCreator.guide.limitations.note"
                            )}
                        </p>
                    </section>

                    <section
                        className="mb-5"
                        aria-labelledby="copyright-title"
                    >
                        <h2 id="copyright-title">
                            {t(
                                "emojiCreator.guide.copyright.title"
                            )}
                        </h2>
                        <p className="mb-0">
                            {t(
                                "emojiCreator.guide.copyright.body"
                            )}
                        </p>
                    </section>

                    <section aria-labelledby="faq-title">
                        <h2 id="faq-title">
                            {t(
                                "emojiCreator.guide.faq.title"
                            )}
                        </h2>

                        <div
                            className="accordion mt-3"
                            id="emojiCreatorFaq"
                        >
                            {FAQ_KEYS.map(
                                (faqKey, index) => {
                                    const faqId =
                                        `emoji-faq-${index + 1}`;
                                    const isFirst =
                                        index === 0;

                                    return (
                                        <div
                                            className="accordion-item"
                                            key={faqKey}
                                        >
                                            <h3 className="accordion-header">
                                                <button
                                                    className={
                                                        isFirst
                                                            ? "accordion-button"
                                                            : "accordion-button collapsed"
                                                    }
                                                    type="button"
                                                    data-bs-toggle="collapse"
                                                    data-bs-target={`#${faqId}`}
                                                    aria-expanded={
                                                        isFirst
                                                    }
                                                    aria-controls={
                                                        faqId
                                                    }
                                                >
                                                    {t(
                                                        `emojiCreator.guide.faq.items.${faqKey}.question`
                                                    )}
                                                </button>
                                            </h3>
                                            <div
                                                id={faqId}
                                                className={
                                                    isFirst
                                                        ? "accordion-collapse collapse show"
                                                        : "accordion-collapse collapse"
                                                }
                                                data-bs-parent="#emojiCreatorFaq"
                                            >
                                                <div className="accordion-body">
                                                    {t(
                                                        `emojiCreator.guide.faq.items.${faqKey}.answer`
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    </section>
                </article>
            </main>
        </>
    );
}