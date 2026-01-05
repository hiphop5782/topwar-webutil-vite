import { useCallback, useState, useRef, useEffect } from "react";
import { removeBackground } from '@imgly/background-removal';
import { Stage, Layer, Image as KonvaImage, Line, Circle, Group } from 'react-konva';
import { FaCircleLeft, FaFloppyDisk, FaMagnifyingGlassPlus } from "react-icons/fa6";
import { PropagateLoader } from "react-spinners";

import "./EmojiCreator.css";

export default function EmojiCreator() {
    const [originalImage, setOriginalImage] = useState(null);
    const [resultImage, setResultImage] = useState(null);
    const [lines, setLines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [brushSize, setBrushSize] = useState(30);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

    const [zoomScale, setZoomScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [displaySize, setDisplaySize] = useState({ width: 0, height: 0, fitScale: 1 });

    const stageRef = useRef(null);
    const containerRef = useRef(null);
    const isDrawing = useRef(false);
    const isDragging = useRef(false);

    // 1. 이미지 업로드 및 AI 배경 제거
    const handleImageUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        try {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await img.decode();
            setOriginalImage(img);

            const blob = await removeBackground(file);
            const resImg = new Image();
            resImg.src = URL.createObjectURL(blob);
            await resImg.decode();
            setResultImage(resImg);

            setLines([]);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, []);

    // 2. 초기 사이즈 설정 (정사각형 틀 & 중앙 정렬)
    useEffect(() => {
        if (originalImage && containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth;
            const squareSize = containerWidth; // 가로 너비를 기준으로 정사각형 크기 결정

            // 가로/세로 중 긴 쪽을 기준으로 배율 계산 (틀 안에 가두기)
            const fitScale = squareSize / Math.max(originalImage.width, originalImage.height);

            setDisplaySize({
                width: squareSize,
                height: squareSize, // 가로와 동일하게 1:1 설정
                fitScale: fitScale
            });

            // 이미지를 정사각형 중앙에 배치하기 위한 초기 위치값 계산
            setPosition({
                x: (squareSize - originalImage.width * fitScale) / 2,
                y: (squareSize - originalImage.height * fitScale) / 2
            });
            setZoomScale(1);
        }
    }, [originalImage, loading]);

    const handleUndo = useCallback(() => {
        setLines((prev) => prev.slice(0, -1));
    }, []);

    const handleWheel = (e) => {
        e.evt.preventDefault();
        const scaleBy = 1.1;
        if (e.evt.ctrlKey) {
            const stage = stageRef.current;
            const oldScale = zoomScale;
            const pointer = stage.getPointerPosition();
            const mousePointTo = {
                x: (pointer.x - position.x) / oldScale,
                y: (pointer.y - position.y) / oldScale,
            };
            const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
            setZoomScale(newScale);
            setPosition({
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale,
            });
        } else {
            const newSize = e.evt.deltaY < 0 ? brushSize * scaleBy : brushSize / scaleBy;
            setBrushSize(Math.min(Math.max(5, newSize), 400));
        }
    };

    const getRelativePointerPos = (stage) => {
        const pos = stage.getPointerPosition();
        return {
            x: (pos.x - position.x) / (displaySize.fitScale * zoomScale),
            y: (pos.y - position.y) / (displaySize.fitScale * zoomScale)
        };
    };

    const handleMouseDown = (e) => {
        if (e.evt.button === 1) { isDragging.current = true; return; }
        isDrawing.current = true;
        const pos = getRelativePointerPos(stageRef.current);
        const mode = e.evt.button === 2 ? 'restore' : 'eraser';
        setLines([...lines, {
            mode,
            points: [pos.x, pos.y, pos.x, pos.y],
            size: brushSize / (displaySize.fitScale * zoomScale)
        }]);
    };

    const handleMouseMove = (e) => {
        const stage = stageRef.current;
        const pointer = stage.getPointerPosition();
        setCursorPos(pointer);
        if (isDragging.current) {
            setPosition({ x: position.x + e.evt.movementX, y: position.y + e.evt.movementY });
            return;
        }
        if (!isDrawing.current) return;
        const pos = getRelativePointerPos(stage);
        const currentMode = e.evt.buttons === 2 ? 'restore' : 'eraser';
        let last = lines[lines.length - 1];
        if (last && last.mode === currentMode) {
            last.points = last.points.concat([pos.x, pos.y]);
            setLines([...lines]);
        }
    };

    const handleMouseUp = () => { isDrawing.current = false; isDragging.current = false; };

    return (
        <div className="container" style={{ userSelect: 'none', paddingBottom: '100px' }}>
            <h1>무료 이미지 배경 제거기 Pro</h1>

            <div className="row mt-4">
                <div className="col-12">
                    <h2>Step 1 : 이미지 선택하기</h2>
                    <input type="file" className="form-control mt-2" accept="image/*" onChange={handleImageUpload} />
                </div>
            </div>

            {loading && (
                <div className="row mt-4">
                    <div className="col-12">
                        <div
                            className="text-center py-5 border border-dashed rounded bg-light d-flex flex-column align-items-center justify-content-center"
                            style={{ minHeight: '250px' }} // 스피너가 움직일 충분한 공간 확보
                        >
                            {/* 1. 스피너 영역: 아래 텍스트와 겹치지 않게 여유 공간(margin-bottom) 부여 */}
                            <div style={{ marginBottom: '40px', display: 'block' }}>
                                <PropagateLoader color="#007bff" />
                            </div>

                            {/* 2. 텍스트 영역 */}
                            <h2 className="mt-4" style={{ fontWeight: 'bold', color: '#333' }}>
                                ⏳ AI 분석 중... 잠시만 기다려주세요.
                            </h2>
                            <p className="text-muted">배경을 정교하게 분리하고 있습니다.</p>
                        </div>
                    </div>
                </div>
            )}

            {!loading && resultImage && (
                <div className="row mt-5" ref={containerRef}>
                    <div className="col-12">
                        <h2>Step 2 : 이미지 편집하기 (정사각형 틀)</h2>
                        <div className="d-flex flex-wrap gap-2 mt-2 mb-3">
                            <span className="badge bg-secondary">Ctrl+휠: 줌</span>
                            <span className="badge bg-secondary">휠 클릭: 이동</span>
                            <span className="badge bg-dark">좌클릭: 지우기</span>
                            <span className="badge bg-dark">우클릭: 복구</span>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="btn-group">
                                <button onClick={handleUndo} disabled={lines.length === 0} className="btn btn-danger btn-sm">↩️ 되돌리기</button>
                                <button onClick={() => {
                                    const fitScale = displaySize.width / Math.max(originalImage.width, originalImage.height);
                                    setZoomScale(1);
                                    setPosition({
                                        x: (displaySize.width - originalImage.width * fitScale) / 2,
                                        y: (displaySize.height - originalImage.height * fitScale) / 2
                                    });
                                }} className="btn btn-outline-secondary btn-sm">🔄 중앙 정렬</button>
                            </div>
                            <span className="brush-info">브러시: {Math.round(brushSize)}px | 줌: {Math.round(zoomScale * 100)}%</span>
                        </div>

                        <div className="image-viewport">
                            <Stage
                                width={displaySize.width}
                                height={displaySize.height}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onWheel={handleWheel}
                                onContextMenu={(e) => e.evt.preventDefault()}
                                ref={stageRef}
                            >
                                <Layer>
                                    {/* 1:1 정사각형 마스크를 시각적으로 보여주기 위한 그룹 */}
                                    <Group
                                        x={position.x}
                                        y={position.y}
                                        scaleX={displaySize.fitScale * zoomScale}
                                        scaleY={displaySize.fitScale * zoomScale}
                                    >
                                        <Group name="maskGroup">
                                            <KonvaImage image={resultImage} />
                                            {lines.map((line, i) => (
                                                <Line
                                                    key={i}
                                                    points={line.points}
                                                    stroke="black"
                                                    strokeWidth={line.size}
                                                    tension={0.5}
                                                    lineCap="round"
                                                    lineJoin="round"
                                                    globalCompositeOperation={line.mode === 'restore' ? 'source-over' : 'destination-out'}
                                                />
                                            ))}
                                        </Group>
                                        <KonvaImage image={originalImage} globalCompositeOperation="source-in" />
                                    </Group>
                                </Layer>
                                <Layer listening={false}>
                                    <Circle x={cursorPos.x} y={cursorPos.y} radius={brushSize / 2}
                                        stroke={isDragging.current ? '#ffc107' : (isDrawing.current ? (lines[lines.length - 1]?.mode === 'restore' ? '#2ecc71' : '#e74c3c') : '#333')}
                                        strokeWidth={2} />
                                </Layer>
                            </Stage>
                        </div>

                        <button onClick={() => {
                            const stage = stageRef.current;
                            // 저장 시에는 현재 보이는 1:1 틀 그대로 저장 (pixelRatio를 높이면 고화질)
                            const dataURL = stage.toDataURL({ pixelRatio: 2 });
                            const link = document.createElement('a');
                            link.download = 'square_emoticon.png';
                            link.href = dataURL;
                            link.click();
                        }} className="btn btn-primary w-100 btn-lg mt-4 shadow">
                            <FaFloppyDisk className="me-2" /> 정사각형 이미지 저장하기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}