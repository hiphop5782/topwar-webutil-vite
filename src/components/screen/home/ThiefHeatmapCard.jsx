import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import ServerMapImage from "@src/assets/images/map/servermap-realview.png";


const INITIAL_SUMMARY = Object.freeze({
    totalEvents: 0,
    coordinateCount: 0,
});


export default function ThiefHeatmapCard() {
    const { t, i18n } = useTranslation("viewer");
    const pointsRef = useRef(null);
    const closeButtonRef = useRef(null);
    const previousFocusedElementRef = useRef(null);
    const [status, setStatus] = useState("loading");
    const [summary, setSummary] = useState(INITIAL_SUMMARY);
    const [isExpanded, setIsExpanded] = useState(false);

    const locale = {
        ko: "ko-KR",
        ja: "ja-JP",
        en: "en-US",
    }[i18n.resolvedLanguage] ?? "en-US";

    const formatNumber = useCallback(
        value => new Intl.NumberFormat(locale).format(value),
        [locale]
    );

    useEffect(() => {
        if (typeof Worker === "undefined") {
            setStatus("error");
            return undefined;
        }

        const worker = new Worker(
            new URL("../../../workers/thiefHeatmap.worker.js", import.meta.url),
            { type: "module" }
        );

        worker.onmessage = event => {
            const message = event.data;

            if (message?.type === "loaded") {
                pointsRef.current = new Float32Array(message.points);
                setSummary({
                    totalEvents: message.totalEvents,
                    coordinateCount: message.coordinateCount,
                });
                setStatus("success");
                return;
            }

            if (message?.type === "error") {
                setStatus("error");
            }
        };

        worker.onerror = () => setStatus("error");
        worker.postMessage({ type: "load" });

        return () => worker.terminate();
    }, []);

    useEffect(() => {
        if (!isExpanded) return undefined;

        const previousOverflow = document.body.style.overflow;
        const focusFrame = window.requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });
        const handleKeyDown = event => {
            if (event.key === "Escape") setIsExpanded(false);
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.cancelAnimationFrame(focusFrame);
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            previousFocusedElementRef.current?.focus?.();
        };
    }, [isExpanded]);

    const openExpandedMap = useCallback(() => {
        previousFocusedElementRef.current = document.activeElement;
        setIsExpanded(true);
    }, []);

    const closeExpandedMap = useCallback(() => setIsExpanded(false), []);

    const formattedEvents = formatNumber(summary.totalEvents);
    const formattedCoordinates = formatNumber(summary.coordinateCount);

    return (
        <>
            <aside className="home-thief-map-card" aria-labelledby="home-thief-map-title">
                <MapHeader
                    id="home-thief-map-title"
                    t={t}
                    status={status}
                    formattedEvents={formattedEvents}
                />

                <HeatmapStage
                    points={pointsRef.current}
                    status={status}
                    mapAlt={t("home.thiefMap.mapAlt")}
                    statusText={t(`home.thiefMap.${status}`)}
                    expandLabel={t("home.thiefMap.expand")}
                    onOpen={openExpandedMap}
                />

                <MapFooter
                    t={t}
                    status={status}
                    formattedCoordinates={formattedCoordinates}
                />
            </aside>

            {isExpanded && typeof document !== "undefined" && createPortal(
                <div
                    className="home-thief-map-modal-backdrop"
                    onMouseDown={event => {
                        if (event.target === event.currentTarget) closeExpandedMap();
                    }}
                >
                    <section
                        className="home-thief-map-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="home-thief-map-modal-title"
                    >
                        <MapHeader
                            id="home-thief-map-modal-title"
                            t={t}
                            status={status}
                            formattedEvents={formattedEvents}
                        >
                            <button
                                ref={closeButtonRef}
                                type="button"
                                className="home-thief-map-modal-close"
                                onClick={closeExpandedMap}
                                aria-label={t("home.thiefMap.close")}
                            >
                                <span aria-hidden="true">×</span>
                            </button>
                        </MapHeader>

                        <HeatmapStage
                            points={pointsRef.current}
                            status={status}
                            mapAlt={t("home.thiefMap.mapAlt")}
                            statusText={t(`home.thiefMap.${status}`)}
                        />

                        <MapFooter
                            t={t}
                            status={status}
                            formattedCoordinates={formattedCoordinates}
                        />
                    </section>
                </div>,
                document.body
            )}
        </>
    );
}


function MapHeader({ id, t, status, formattedEvents, children }) {
    return (
        <header className="home-thief-map-header">
            <div>
                <span>{t("home.thiefMap.eyebrow")}</span>
                <h2 id={id}>{t("home.thiefMap.title")}</h2>
            </div>

            <div className="home-thief-map-header-actions">
                {status === "success" && (
                    <strong title={t("home.thiefMap.events", { count: formattedEvents })}>
                        {formattedEvents}
                    </strong>
                )}
                {children}
            </div>
        </header>
    );
}


function MapFooter({ t, status, formattedCoordinates }) {
    if (status !== "success") return null;

    return (
        <footer className="home-thief-map-footer">
            <span className="home-thief-map-legend">
                <i aria-hidden="true" />
                {t("home.thiefMap.legend")}
            </span>
            <span>
                {t("home.thiefMap.coordinates", { count: formattedCoordinates })}
            </span>
        </footer>
    );
}


function HeatmapStage({ points, status, mapAlt, statusText, expandLabel, onOpen }) {
    const canvasRef = useRef(null);
    const stageRef = useRef(null);
    const rendererRef = useRef(null);

    const renderPoints = useCallback(() => {
        const canvas = canvasRef.current;
        const stage = stageRef.current;

        if (!canvas || !stage || !points) return;

        const width = stage.clientWidth;
        const height = stage.clientHeight;
        if (!width || !height) return;

        let renderer = rendererRef.current;

        if (!renderer) {
            renderer = createPointRenderer(canvas);
            rendererRef.current = renderer;
        }

        renderer?.draw(points, width, height);
    }, [points]);

    useEffect(() => {
        renderPoints();
    }, [renderPoints, status]);

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage || typeof ResizeObserver === "undefined") return undefined;

        const observer = new ResizeObserver(renderPoints);
        observer.observe(stage);

        return () => observer.disconnect();
    }, [renderPoints]);

    useEffect(() => () => {
        rendererRef.current?.destroy();
        rendererRef.current = null;
    }, []);

    const Stage = onOpen ? "button" : "div";

    return (
        <Stage
            ref={stageRef}
            className={`home-thief-map-stage${onOpen ? " home-thief-map-stage-trigger" : ""}`}
            {...(onOpen ? {
                type: "button",
                onClick: onOpen,
                title: expandLabel,
                "aria-label": expandLabel,
                "aria-haspopup": "dialog",
            } : {})}
        >
            <img
                src={ServerMapImage}
                alt={mapAlt}
                draggable={false}
                onLoad={renderPoints}
            />
            <canvas ref={canvasRef} aria-hidden="true" />

            {status !== "success" && (
                <span className="home-thief-map-status" role="status">
                    {statusText}
                </span>
            )}

            {onOpen && (
                <span className="home-thief-map-expand-hint" aria-hidden="true">
                    <b>⛶</b>
                    {expandLabel}
                </span>
            )}
        </Stage>
    );
}


function createPointRenderer(canvas) {
    const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        preserveDrawingBuffer: false,
    });

    if (!gl) return null;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
        attribute vec2 a_position;
        attribute float a_weight;
        uniform float u_base_size;
        uniform float u_pixel_ratio;
        varying float v_alpha;

        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            gl_PointSize = (u_base_size + min(a_weight, 6.0) * 1.1) * u_pixel_ratio;
            v_alpha = min(0.54 + a_weight * 0.07, 0.86);
        }
    `);

    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying float v_alpha;

        void main() {
            vec2 point = gl_PointCoord * 2.0 - 1.0;
            float distanceSquared = dot(point, point);
            if (distanceSquared > 1.0) discard;

            float edge = 1.0 - smoothstep(0.78, 1.0, distanceSquared);
            gl_FragColor = vec4(1.0, 0.015, 0.07, v_alpha * edge);
        }
    `);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
    }

    const buffer = gl.createBuffer();
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const weightLocation = gl.getAttribLocation(program, "a_weight");
    const baseSizeLocation = gl.getUniformLocation(program, "u_base_size");
    const pixelRatioLocation = gl.getUniformLocation(program, "u_pixel_ratio");
    let uploadedPoints = null;

    return {
        draw(points, cssWidth, cssHeight) {
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            const width = Math.max(1, Math.round(cssWidth * pixelRatio));
            const height = Math.max(1, Math.round(cssHeight * pixelRatio));

            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }

            gl.viewport(0, 0, width, height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.useProgram(program);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            if (uploadedPoints !== points) {
                gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
                uploadedPoints = points;
            }

            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 12, 0);
            gl.enableVertexAttribArray(weightLocation);
            gl.vertexAttribPointer(weightLocation, 1, gl.FLOAT, false, 12, 8);

            gl.uniform1f(baseSizeLocation, Math.min(11, Math.max(5, cssWidth * 0.022)));
            gl.uniform1f(pixelRatioLocation, pixelRatio);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.drawArrays(gl.POINTS, 0, points.length / 3);
        },

        destroy() {
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);
        },
    };
}


function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}
