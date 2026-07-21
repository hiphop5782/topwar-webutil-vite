import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
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

const PAGE_URL = "https://www.progamer.info/ko/emoji/create/";

const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "무료 AI 이미지 배경 제거 및 정사각형 편집기",
    url: PAGE_URL,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web Browser",
    offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KRW"
    },
    description:
        "이미지 배경을 자동으로 제거하고, 브러시로 결과를 수정한 뒤 1:1 정사각형 PNG로 저장하는 무료 웹 도구입니다."
};

export default function EmojiCreator() {
    const [originalImage, setOriginalImage] = useState(null);
    const [resultImage, setResultImage] = useState(null);
    const [lines, setLines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [brushSize, setBrushSize] = useState(30);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

    const [zoomScale, setZoomScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [displaySize, setDisplaySize] = useState({
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
            URL.revokeObjectURL(originalUrlRef.current);
            originalUrlRef.current = null;
        }

        if (resultUrlRef.current) {
            URL.revokeObjectURL(resultUrlRef.current);
            resultUrlRef.current = null;
        }
    }, []);

    useEffect(() => revokeImageUrls, [revokeImageUrls]);

    // 1. 이미지 업로드 및 브라우저 내 배경 제거
    const handleImageUpload = useCallback(
        async (e) => {
            const file = e.target.files?.[0];

            if (!file) {
                return;
            }

            if (!file.type.startsWith("image/")) {
                setErrorMessage("PNG, JPG, JPEG, WebP 등의 이미지 파일을 선택해 주세요.");
                e.target.value = "";
                return;
            }

            setLoading(true);
            setErrorMessage("");
            setOriginalImage(null);
            setResultImage(null);
            setLines([]);
            revokeImageUrls();

            try {
                const originalUrl = URL.createObjectURL(file);
                originalUrlRef.current = originalUrl;

                const img = new Image();
                img.src = originalUrl;
                await img.decode();
                setOriginalImage(img);

                const blob = await removeBackground(file);
                const resultUrl = URL.createObjectURL(blob);
                resultUrlRef.current = resultUrl;

                const resImg = new Image();
                resImg.src = resultUrl;
                await resImg.decode();
                setResultImage(resImg);
            } catch (error) {
                console.error(error);
                setErrorMessage(
                    "배경 제거 중 오류가 발생했습니다. 다른 이미지나 최신 브라우저로 다시 시도해 주세요."
                );
                setOriginalImage(null);
                setResultImage(null);
                revokeImageUrls();
            } finally {
                setLoading(false);
                e.target.value = "";
            }
        },
        [revokeImageUrls]
    );

    // 2. 정사각형 편집 영역 크기와 이미지 중앙 정렬
    useEffect(() => {
        if (!originalImage || !containerRef.current) {
            return;
        }

        const updateDisplaySize = () => {
            const containerWidth = containerRef.current?.offsetWidth ?? 0;

            if (containerWidth <= 0) {
                return;
            }

            const squareSize = containerWidth;
            const fitScale =
                squareSize / Math.max(originalImage.width, originalImage.height);

            setDisplaySize({
                width: squareSize,
                height: squareSize,
                fitScale
            });

            setPosition({
                x: (squareSize - originalImage.width * fitScale) / 2,
                y: (squareSize - originalImage.height * fitScale) / 2
            });
            setZoomScale(1);
        };

        updateDisplaySize();
        window.addEventListener("resize", updateDisplaySize);

        return () => window.removeEventListener("resize", updateDisplaySize);
    }, [originalImage]);

    const handleUndo = useCallback(() => {
        setLines((prev) => prev.slice(0, -1));
    }, []);

    const handleWheel = (e) => {
        e.evt.preventDefault();
        const scaleBy = 1.1;

        if (e.evt.ctrlKey) {
            const stage = stageRef.current;
            const oldScale = zoomScale;
            const pointer = stage?.getPointerPosition();

            if (!pointer) {
                return;
            }

            const mousePointTo = {
                x: (pointer.x - position.x) / oldScale,
                y: (pointer.y - position.y) / oldScale
            };

            const newScale =
                e.evt.deltaY < 0
                    ? Math.min(oldScale * scaleBy, 8)
                    : Math.max(oldScale / scaleBy, 0.25);

            setZoomScale(newScale);
            setPosition({
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale
            });
        } else {
            const newSize =
                e.evt.deltaY < 0
                    ? brushSize * scaleBy
                    : brushSize / scaleBy;

            setBrushSize(Math.min(Math.max(5, newSize), 400));
        }
    };

    const getRelativePointerPos = (stage) => {
        const pointer = stage?.getPointerPosition();

        if (!pointer) {
            return null;
        }

        return {
            x:
                (pointer.x - position.x) /
                (displaySize.fitScale * zoomScale),
            y:
                (pointer.y - position.y) /
                (displaySize.fitScale * zoomScale)
        };
    };

    const handleMouseDown = (e) => {
        if (e.evt.button === 1) {
            isDragging.current = true;
            return;
        }

        const pos = getRelativePointerPos(stageRef.current);

        if (!pos) {
            return;
        }

        isDrawing.current = true;
        const mode = e.evt.button === 2 ? "restore" : "eraser";

        setLines((prev) => [
            ...prev,
            {
                mode,
                points: [pos.x, pos.y, pos.x, pos.y],
                size: brushSize / (displaySize.fitScale * zoomScale)
            }
        ]);
    };

    const handleMouseMove = (e) => {
        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition();

        if (pointer) {
            setCursorPos(pointer);
        }

        if (isDragging.current) {
            setPosition((prev) => ({
                x: prev.x + e.evt.movementX,
                y: prev.y + e.evt.movementY
            }));
            return;
        }

        if (!isDrawing.current) {
            return;
        }

        const pos = getRelativePointerPos(stage);

        if (!pos) {
            return;
        }

        const currentMode = e.evt.buttons === 2 ? "restore" : "eraser";

        setLines((prev) => {
            if (prev.length === 0) {
                return prev;
            }

            const last = prev[prev.length - 1];

            if (last.mode !== currentMode) {
                return prev;
            }

            return [
                ...prev.slice(0, -1),
                {
                    ...last,
                    points: [...last.points, pos.x, pos.y]
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
            Math.max(originalImage.width, originalImage.height);

        setZoomScale(1);
        setPosition({
            x: (displaySize.width - originalImage.width * fitScale) / 2,
            y: (displaySize.height - originalImage.height * fitScale) / 2
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

            const link = document.createElement("a");
            link.download = "square-emoticon.png";
            link.href = dataURL;
            link.click();
        } finally {
            cursorLayer?.show();
        }
    };

    return (
        <>
            <Helmet>
                <title>
                    무료 AI 이미지 배경 제거 및 정사각형 편집기 | Topwar Helper
                </title>
                <meta
                    name="description"
                    content="이미지 배경을 브라우저에서 자동으로 제거하고, 지우기·복구 브러시로 수정한 뒤 1:1 정사각형 PNG로 저장하는 무료 웹 도구입니다."
                />
                <meta
                    name="robots"
                    content="index, follow, max-image-preview:large"
                />
                <link rel="canonical" href={PAGE_URL} />
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>

            <main
                className="container"
                style={{ userSelect: "none", paddingBottom: "100px" }}
            >
                <header className="py-4">
                    <h1>무료 AI 이미지 배경 제거 및 정사각형 편집기</h1>
                    <p className="lead mt-3 mb-2">
                        사진의 배경을 자동으로 제거하고, 잘못 제거된 부분을
                        브러시로 직접 지우거나 복구한 뒤 정사각형 PNG 이미지로
                        저장할 수 있습니다.
                    </p>
                    <p className="text-muted mb-0">
                        프로필 이미지, 게임 커뮤니티 이모티콘, 상품 이미지처럼
                        배경이 투명한 1:1 이미지를 만들 때 사용할 수 있습니다.
                    </p>
                </header>

                <section
                    className="card shadow-sm mb-4"
                    aria-labelledby="image-upload-title"
                >
                    <div className="card-body">
                        <h2 id="image-upload-title" className="h4">
                            1단계: 이미지 선택
                        </h2>
                        <p className="text-muted">
                            배경을 제거할 PNG, JPG, JPEG 또는 WebP 이미지를
                            선택하세요. 첫 실행은 AI 모델을 준비하느라 조금 더
                            오래 걸릴 수 있습니다.
                        </p>

                        <label
                            htmlFor="emoji-image-input"
                            className="form-label fw-bold"
                        >
                            편집할 이미지 파일
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
                            선택한 이미지 파일은 이 도구의 배경 제거 작업을 위해
                            브라우저에서 처리되며, 이 페이지의 코드에서는 이미지
                            파일을 별도 서버로 업로드하지 않습니다.
                        </div>
                    </div>
                </section>

                {errorMessage && (
                    <div className="alert alert-danger" role="alert">
                        {errorMessage}
                    </div>
                )}

                {loading && (
                    <section
                        className="text-center py-5 border rounded bg-light d-flex flex-column align-items-center justify-content-center mb-4"
                        style={{ minHeight: "250px" }}
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
                            AI가 이미지의 배경을 분석하고 있습니다
                        </h2>
                        <p className="text-muted mb-0">
                            이미지 크기와 기기 성능에 따라 처리 시간이 달라질 수
                            있습니다.
                        </p>
                    </section>
                )}

                {!loading && resultImage && (
                    <section
                        className="card shadow-sm mb-5"
                        aria-labelledby="image-editor-title"
                    >
                        <div className="card-body" ref={containerRef}>
                            <h2 id="image-editor-title" className="h4">
                                2단계: 제거 결과 수정 및 정사각형 배치
                            </h2>
                            <p className="text-muted">
                                자동 제거 결과를 확인한 뒤 가장자리나 남은 배경을
                                브러시로 다듬으세요. 저장 결과는 현재 보이는 1:1
                                편집 영역을 기준으로 생성됩니다.
                            </p>

                            <div className="d-flex flex-wrap gap-2 mt-2 mb-3">
                                <span className="badge bg-secondary">
                                    Ctrl + 휠: 확대·축소
                                </span>
                                <span className="badge bg-secondary">
                                    휠 클릭: 이미지 이동
                                </span>
                                <span className="badge bg-dark">
                                    왼쪽 클릭: 지우기
                                </span>
                                <span className="badge bg-dark">
                                    오른쪽 클릭: 복구
                                </span>
                            </div>

                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                                <div className="btn-group" role="group">
                                    <button
                                        type="button"
                                        onClick={handleUndo}
                                        disabled={lines.length === 0}
                                        className="btn btn-danger btn-sm"
                                    >
                                        되돌리기
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetPosition}
                                        className="btn btn-outline-secondary btn-sm"
                                    >
                                        중앙 정렬
                                    </button>
                                </div>
                                <span className="brush-info">
                                    브러시: {Math.round(brushSize)}px · 줌:{" "}
                                    {Math.round(zoomScale * 100)}%
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
                                                displaySize.fitScale * zoomScale
                                            }
                                            scaleY={
                                                displaySize.fitScale * zoomScale
                                            }
                                        >
                                            <Group name="maskGroup">
                                                <KonvaImage image={resultImage} />
                                                {lines.map((line, index) => (
                                                    <Line
                                                        key={`${line.mode}-${index}`}
                                                        points={line.points}
                                                        stroke="black"
                                                        strokeWidth={line.size}
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
                                                ))}
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
                                                            lines.length - 1
                                                        ]?.mode === "restore"
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
                                정사각형 PNG 저장
                            </button>
                        </div>
                    </section>
                )}

                <article className="emoji-guide">
                    <section className="mb-5" aria-labelledby="features-title">
                        <h2 id="features-title">이 도구에서 할 수 있는 작업</h2>
                        <div className="row g-3 mt-1">
                            <div className="col-md-4">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <h3 className="h5">자동 배경 제거</h3>
                                        <p className="mb-0">
                                            이미지 속 주요 대상을 분석하여 배경을
                                            투명하게 만듭니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <h3 className="h5">수동 지우기와 복구</h3>
                                        <p className="mb-0">
                                            자동 처리에서 남은 배경은 지우고,
                                            사라진 대상 부분은 다시 복구할 수
                                            있습니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <h3 className="h5">정사각형 PNG 저장</h3>
                                        <p className="mb-0">
                                            위치와 확대 비율을 조절한 뒤 투명
                                            배경을 유지한 PNG 파일로 저장합니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-5" aria-labelledby="usage-title">
                        <h2 id="usage-title">사용 방법</h2>
                        <ol className="lh-lg">
                            <li>
                                배경을 제거할 이미지 파일을 선택합니다.
                            </li>
                            <li>
                                자동 분석이 끝나면 대상의 가장자리와 투명 처리
                                결과를 확인합니다.
                            </li>
                            <li>
                                왼쪽 클릭으로 불필요한 부분을 지우고, 오른쪽
                                클릭으로 잘못 지운 부분을 복구합니다.
                            </li>
                            <li>
                                Ctrl 키와 마우스 휠로 확대·축소하고, 마우스 휠
                                버튼을 누른 채 이미지를 이동합니다.
                            </li>
                            <li>
                                원하는 구도가 완성되면 정사각형 PNG 저장 버튼을
                                누릅니다.
                            </li>
                        </ol>
                    </section>

                    <section className="mb-5" aria-labelledby="privacy-title">
                        <h2 id="privacy-title">이미지 처리와 개인정보 안내</h2>
                        <p>
                            이 페이지는 <code>@imgly/background-removal</code>{" "}
                            라이브러리를 사용해 사용자의 브라우저에서 배경 제거를
                            실행합니다. 현재 구현에는 선택한 이미지 파일을
                            Progamer.info 서버로 전송하거나 저장하는 업로드 코드가
                            없습니다.
                        </p>
                        <p className="mb-0">
                            다만 사이트 운영에 필요한 일반적인 접속 로그, 쿠키 및
                            분석 도구의 처리 여부는 사이트 개인정보처리방침을 함께
                            확인해 주세요.
                        </p>
                    </section>

                    <section className="mb-5" aria-labelledby="limitations-title">
                        <h2 id="limitations-title">결과가 정확하지 않을 수 있는 경우</h2>
                        <ul className="lh-lg">
                            <li>
                                머리카락, 털, 반투명 소재처럼 경계가 매우 복잡한
                                이미지
                            </li>
                            <li>
                                대상과 배경의 색상 또는 밝기 차이가 거의 없는
                                이미지
                            </li>
                            <li>
                                해상도가 너무 낮거나 심하게 흔들린 이미지
                            </li>
                            <li>
                                한 장에 여러 대상이 겹쳐 있어 주요 대상을 구분하기
                                어려운 이미지
                            </li>
                        </ul>
                        <p className="mb-0">
                            자동 처리 결과는 보조 기능이므로, 중요한 이미지라면
                            저장 전에 가장자리를 확대해 직접 확인하세요.
                        </p>
                    </section>

                    <section className="mb-5" aria-labelledby="copyright-title">
                        <h2 id="copyright-title">저작권 및 이용 시 주의사항</h2>
                        <p className="mb-0">
                            본인이 촬영하거나 편집 권한을 가진 이미지만 사용하세요.
                            타인의 사진, 캐릭터, 상표 또는 저작물을 편집·배포할
                            경우에는 해당 권리자의 이용 조건을 확인해야 합니다.
                        </p>
                    </section>

                    <section aria-labelledby="faq-title">
                        <h2 id="faq-title">자주 묻는 질문</h2>

                        <div className="accordion mt-3" id="emojiCreatorFaq">
                            <div className="accordion-item">
                                <h3 className="accordion-header">
                                    <button
                                        className="accordion-button"
                                        type="button"
                                        data-bs-toggle="collapse"
                                        data-bs-target="#emoji-faq-1"
                                        aria-expanded="true"
                                        aria-controls="emoji-faq-1"
                                    >
                                        이미지가 서버에 저장되나요?
                                    </button>
                                </h3>
                                <div
                                    id="emoji-faq-1"
                                    className="accordion-collapse collapse show"
                                    data-bs-parent="#emojiCreatorFaq"
                                >
                                    <div className="accordion-body">
                                        이 페이지의 배경 제거 작업은 브라우저에서
                                        실행되며, 현재 컴포넌트에는 이미지 파일을
                                        별도 서버로 업로드하거나 저장하는 코드가
                                        없습니다.
                                    </div>
                                </div>
                            </div>

                            <div className="accordion-item">
                                <h3 className="accordion-header">
                                    <button
                                        className="accordion-button collapsed"
                                        type="button"
                                        data-bs-toggle="collapse"
                                        data-bs-target="#emoji-faq-2"
                                        aria-expanded="false"
                                        aria-controls="emoji-faq-2"
                                    >
                                        처음 사용할 때 왜 오래 걸리나요?
                                    </button>
                                </h3>
                                <div
                                    id="emoji-faq-2"
                                    className="accordion-collapse collapse"
                                    data-bs-parent="#emojiCreatorFaq"
                                >
                                    <div className="accordion-body">
                                        브라우저가 배경 제거에 필요한 AI 모델과
                                        실행 파일을 준비해야 하기 때문입니다. 이후
                                        실행은 브라우저 캐시와 기기 상태에 따라 더
                                        빨라질 수 있습니다.
                                    </div>
                                </div>
                            </div>

                            <div className="accordion-item">
                                <h3 className="accordion-header">
                                    <button
                                        className="accordion-button collapsed"
                                        type="button"
                                        data-bs-toggle="collapse"
                                        data-bs-target="#emoji-faq-3"
                                        aria-expanded="false"
                                        aria-controls="emoji-faq-3"
                                    >
                                        어떤 이미지 형식을 사용할 수 있나요?
                                    </button>
                                </h3>
                                <div
                                    id="emoji-faq-3"
                                    className="accordion-collapse collapse"
                                    data-bs-parent="#emojiCreatorFaq"
                                >
                                    <div className="accordion-body">
                                        일반적으로 PNG, JPG, JPEG, WebP 형식을
                                        사용할 수 있습니다. 브라우저가 해당 이미지
                                        형식을 해석할 수 있어야 합니다.
                                    </div>
                                </div>
                            </div>

                            <div className="accordion-item">
                                <h3 className="accordion-header">
                                    <button
                                        className="accordion-button collapsed"
                                        type="button"
                                        data-bs-toggle="collapse"
                                        data-bs-target="#emoji-faq-4"
                                        aria-expanded="false"
                                        aria-controls="emoji-faq-4"
                                    >
                                        저장된 이미지의 배경은 투명한가요?
                                    </button>
                                </h3>
                                <div
                                    id="emoji-faq-4"
                                    className="accordion-collapse collapse"
                                    data-bs-parent="#emojiCreatorFaq"
                                >
                                    <div className="accordion-body">
                                        네. 저장 형식은 투명 배경을 지원하는 PNG이며,
                                        편집 화면의 1:1 정사각형 영역을 기준으로
                                        저장됩니다.
                                    </div>
                                </div>
                            </div>

                            <div className="accordion-item">
                                <h3 className="accordion-header">
                                    <button
                                        className="accordion-button collapsed"
                                        type="button"
                                        data-bs-toggle="collapse"
                                        data-bs-target="#emoji-faq-5"
                                        aria-expanded="false"
                                        aria-controls="emoji-faq-5"
                                    >
                                        모바일에서도 사용할 수 있나요?
                                    </button>
                                </h3>
                                <div
                                    id="emoji-faq-5"
                                    className="accordion-collapse collapse"
                                    data-bs-parent="#emojiCreatorFaq"
                                >
                                    <div className="accordion-body">
                                        이미지 선택과 자동 배경 제거는 가능할 수
                                        있지만, 현재 수동 편집 조작은 마우스를 기준으로
                                        설계되어 데스크톱 브라우저 사용을 권장합니다.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </article>
            </main>
        </>
    );
}