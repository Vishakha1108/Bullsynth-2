import React, { useEffect, useState, useRef, useCallback } from 'react';
import useMarketStore from '../store/useMarketStore';
import type { Drawing } from '../store/useMarketStore';
import type { IChartApi, ISeriesApi, Logical, UTCTimestamp } from 'lightweight-charts';
import {
    calculateFibonacciLevels,
    calculateFibonacciExtension,
    getRayExtension,
    getExtendedLineEnds,
    getSnappedCoordinates,
    getParallelChannelOffset,
    getGannFanLines,
    calculateRegressionLine,
    TOOL_POINT_COUNTS,
} from '../lib/drawingUtils';

interface DrawingOverlayProps {
    chartRef: React.MutableRefObject<IChartApi | null>;
    seriesRef: React.MutableRefObject<{
        candle: ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area"> | ISeriesApi<"Baseline">;
        volume: ISeriesApi<"Histogram">;
    } | null>;
    hideDrawings?: boolean;
    paneId?: string;
}

const EMPTY_DRAWINGS: Drawing[] = [];
const NON_DRAWING_TOOLS = ['crosshair', 'dot', 'arrow', 'zoom', 'eraser'];

export function DrawingOverlay({ chartRef, seriesRef, hideDrawings = false, paneId }: DrawingOverlayProps) {
    const layoutId = useMarketStore(s => s.layoutId);
    const drawings = useMarketStore(s => (layoutId !== 'l1' && paneId ? s.paneDrawings[paneId] || EMPTY_DRAWINGS : s.drawings));
    const setGlobalDrawings = useMarketStore(s => s.setDrawings);
    const clearGlobalDrawings = useMarketStore(s => s.clearDrawings);
    const setPaneDrawings = useMarketStore(s => s.setPaneDrawings);
    const clearPaneDrawings = useMarketStore(s => s.clearPaneDrawings);
    const activeTool = useMarketStore(s => s.activeTool);
    const setActiveTool = useMarketStore(s => s.setActiveTool);
    const magnetMode = useMarketStore(s => s.magnetMode);
    const timeframe = useMarketStore(s => s.timeframe);

    const writeDrawings = useCallback((nextDrawings: Drawing[] | ((prev: Drawing[]) => Drawing[])) => {
        if (layoutId !== 'l1' && paneId) {
            setPaneDrawings(paneId, nextDrawings);
            return;
        }
        setGlobalDrawings(nextDrawings);
    }, [layoutId, paneId, setPaneDrawings, setGlobalDrawings]);

    const removeDrawings = useCallback(() => {
        if (layoutId !== 'l1' && paneId) {
            clearPaneDrawings(paneId);
            return;
        }
        clearGlobalDrawings();
    }, [layoutId, paneId, clearPaneDrawings, clearGlobalDrawings]);

    const [, setTrigger] = useState(0);
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

    const [mousePos, setMousePos] = useState<{ x: number, y: number, time: number, price: number } | null>(null);
    const [activeDrawing, setActiveDrawing] = useState<{ type: string, points: { time: number, price: number }[] } | null>(null);

    // Pencil state
    const [isDraggingPencil, setIsDraggingPencil] = useState(false);
    const [pencilPoints, setPencilPoints] = useState<{ time: number, price: number }[]>([]);

    // Text entry state for text-like tools
    const [textEntry, setTextEntry] = useState<{ x: number, y: number, time: number, price: number, type: string } | null>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const previousTimeframeRef = useRef<number | null>(null);

    // Delete state
    const deleteLastDrawing = useCallback(() => {
        if (drawings.length === 0) return;
        writeDrawings(drawings.slice(0, -1));
    }, [drawings, writeDrawings]);

    // Sync dimensions
    useEffect(() => {
        if (!svgRef.current) return;
        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                setDimensions({ w: width, h: height });
            }
        });
        resizeObserver.observe(svgRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Keep drawings locked to chart transforms (pan/zoom/resize/price-scale changes).
    useEffect(() => {
        const chart = chartRef.current;
        const candleSeries = seriesRef.current?.candle;
        if (!chart || !candleSeries) return;

        let frameId: number | null = null;
        let lastSignature = '';

        const forceRerender = () => {
            setTrigger((t) => t + 1);
        };

        const getSignature = () => {
            try {
                const logicalRange = chart.timeScale().getVisibleLogicalRange();
                const priceRange = candleSeries.priceScale().getVisibleRange();

                // Keep raw precision so tiny pans/zoom deltas repaint immediately.
                const logicalFrom = logicalRange?.from ?? 0;
                const logicalX0 = chart.timeScale().logicalToCoordinate(logicalFrom as Logical);
                const logicalX1 = chart.timeScale().logicalToCoordinate((logicalFrom + 1) as Logical);
                const barSpacing = logicalX0 != null && logicalX1 != null
                    ? (logicalX1 - logicalX0)
                    : null;

                return [
                    logicalRange?.from ?? 'na',
                    logicalRange?.to ?? 'na',
                    priceRange?.from ?? 'na',
                    priceRange?.to ?? 'na',
                    barSpacing ?? 'na',
                    dimensions.w,
                    dimensions.h,
                ].join('|');
            } catch {
                return lastSignature;
            }
        };

        const tick = () => {
            const signature = getSignature();
            if (signature !== lastSignature) {
                lastSignature = signature;
                forceRerender();
            }
            frameId = window.requestAnimationFrame(tick);
        };

        chart.timeScale().subscribeVisibleLogicalRangeChange(forceRerender);
        chart.timeScale().subscribeVisibleTimeRangeChange(forceRerender);
        window.addEventListener('resize', forceRerender);

        frameId = window.requestAnimationFrame(tick);

        return () => {
            chart.timeScale().unsubscribeVisibleLogicalRangeChange(forceRerender);
            chart.timeScale().unsubscribeVisibleTimeRangeChange(forceRerender);
            window.removeEventListener('resize', forceRerender);
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [chartRef, seriesRef, dimensions.w, dimensions.h]);

    // Clear drawings when timeframe changes (e.g. 1s -> 5s).
    useEffect(() => {
        if (previousTimeframeRef.current === null) {
            previousTimeframeRef.current = timeframe;
            return;
        }

        if (previousTimeframeRef.current !== timeframe) {
            removeDrawings();
            setActiveDrawing(null);
            setPencilPoints([]);
            setTextEntry(null);
            setMousePos(null);
        }

        previousTimeframeRef.current = timeframe;
    }, [timeframe, removeDrawings]);

    // Clear UI state when drawings are cleared globally or via Event
    useEffect(() => {
        const handleClear = () => {
            setActiveDrawing(null);
            setPencilPoints([]);
            setTextEntry(null);
        };
        window.addEventListener('reset-chart-view', handleClear);
        return () => window.removeEventListener('reset-chart-view', handleClear);
    }, []);

    useEffect(() => {
        if (!chartRef.current) return;
        const isDrawing = !NON_DRAWING_TOOLS.includes(activeTool) || activeTool === 'eraser';
        chartRef.current.applyOptions({
            handleScroll: !isDrawing,
            handleScale: !isDrawing,
        });
    }, [activeTool, chartRef]);

    // Handle Delete key to remove the latest drawing quickly
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement as HTMLElement | null;
            const isTypingTarget =
                activeEl?.tagName === 'INPUT' ||
                activeEl?.tagName === 'TEXTAREA' ||
                activeEl?.tagName === 'SELECT' ||
                activeEl?.isContentEditable;

            if (isTypingTarget) {
                return;
            }

            if ((e.key === 'Delete' || e.key === 'Backspace') && !textEntry && !activeDrawing) {
                e.preventDefault();
                deleteLastDrawing();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeDrawing, textEntry, deleteLastDrawing]);

    const getTimePrice = (e: React.MouseEvent | React.TouchEvent) => {
        if (!chartRef.current || !seriesRef.current || !svgRef.current) return null;
        const rect = svgRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        let time = chartRef.current.timeScale().coordinateToTime(x as number) as number;
        let price = seriesRef.current.candle.coordinateToPrice(y) as number;

        if (time === null || price === null) return null;

        if (magnetMode !== 'off') {
            const snapped = getSnappedCoordinates(time, price, useMarketStore.getState().candles, magnetMode, 10, 300);
            if (snapped.snapped) {
                time = snapped.time;
                price = snapped.price;
            }
        }
        return { x, y, time, price };
    };

    const requiredPoints = TOOL_POINT_COUNTS[activeTool] ?? 2;

    const finishDrawing = (type: string, points: { time: number, price: number }[], text?: string, data?: Record<string, unknown>) => {
        writeDrawings([...drawings, { type, points, text, data }]);
        setActiveDrawing(null);
        setActiveTool('crosshair');
    };

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (textEntry || (NON_DRAWING_TOOLS.includes(activeTool) && activeTool !== 'eraser')) return;

        const pt = getTimePrice(e);
        if (!pt) return;

        // Eraser: find and remove nearest drawing within threshold
        if (isEraserActive && drawings.length > 0) {
            const HIT_THRESHOLD = 15; // pixels
            let closestIdx = -1;
            let closestDist = Infinity;
            for (let i = 0; i < drawings.length; i++) {
                const dist = getDrawingDistance(drawings[i], pt.x, pt.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestIdx = i;
                }
            }
            if (closestIdx >= 0 && closestDist <= HIT_THRESHOLD) {
                writeDrawings(drawings.filter((_, idx) => idx !== closestIdx));
            }
            return;
        }

        if (activeTool === 'replay') {
            const allCandles = useMarketStore.getState().candles;
            const index = allCandles.findIndex(c => c.time === pt.time);
            if (index !== -1) {
                useMarketStore.getState().startReplay(index, allCandles);
            }
            return;
        }

        if (activeTool === 'pencil') {
            setIsDraggingPencil(true);
            setPencilPoints([{ time: pt.time, price: pt.price }]);
            return;
        }

        // Text-like tools (1-point with text input)
        if (activeTool === 'text' || activeTool === 'note' || activeTool === 'callout' || activeTool === 'anchored_note') {
            if (activeTool === 'callout' && !activeDrawing) {
                // Callout is 2-point: first point is anchor, second is text position
                setActiveDrawing({ type: activeTool, points: [{ time: pt.time, price: pt.price }] });
                return;
            }
            if (activeTool === 'callout' && activeDrawing) {
                setTextEntry({ x: pt.x, y: pt.y, time: pt.time, price: pt.price, type: 'callout' });
                return;
            }
            setTextEntry({ x: pt.x, y: pt.y, time: pt.time, price: pt.price, type: activeTool });
            return;
        }

        // 1-point tools (finish immediately)
        if (requiredPoints === 1) {
            finishDrawing(activeTool, [{ time: pt.time, price: pt.price }]);
            return;
        }

        // Multi-click tools
        if (requiredPoints === -1) {
            if (!activeDrawing) {
                setActiveDrawing({ type: activeTool, points: [{ time: pt.time, price: pt.price }] });
            } else {
                setActiveDrawing({
                    ...activeDrawing,
                    points: [...activeDrawing.points, { time: pt.time, price: pt.price }]
                });
            }
            return;
        }

        // N-point tools (2, 3, 5, 7)
        if (!activeDrawing) {
            setActiveDrawing({ type: activeTool, points: [{ time: pt.time, price: pt.price }] });
        } else {
            const newPoints = [...activeDrawing.points, { time: pt.time, price: pt.price }];
            if (newPoints.length >= requiredPoints) {
                finishDrawing(activeDrawing.type, newPoints);
            } else {
                setActiveDrawing({ ...activeDrawing, points: newPoints });
            }
        }
    };

    const handleDoubleClick = () => {
        // Finish multi-click tools on double-click
        if (activeDrawing && requiredPoints === -1 && activeDrawing.points.length >= 2) {
            finishDrawing(activeDrawing.type, activeDrawing.points);
        }
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (NON_DRAWING_TOOLS.includes(activeTool) && !activeDrawing && activeTool !== 'replay') return;

        const pt = getTimePrice(e);
        if (!pt) {
            setMousePos(null);
            return;
        }

        setMousePos(pt);

        if (isDraggingPencil && activeTool === 'pencil') {
            setPencilPoints(prev => [...prev, { time: pt.time, price: pt.price }]);
        }
    };

    const handlePointerUp = () => {
        if (isDraggingPencil && activeTool === 'pencil') {
            setIsDraggingPencil(false);
            if (pencilPoints.length > 2) {
                writeDrawings([...drawings, { type: 'pencil', points: pencilPoints }]);
            }
            setPencilPoints([]);
            // Removed setActiveTool('crosshair') so the user can keep brushing without clicking the tool again
        }
    };

    // Map logic
    const mapPoint = (time: number, price: number) => {
        if (!chartRef.current || !seriesRef.current) return { x: -1000, y: -1000 };
        const x = chartRef.current.timeScale().timeToCoordinate(time as UTCTimestamp) ?? -1000;
        const y = seriesRef.current.candle.priceToCoordinate(price) ?? -1000;
        return { x, y };
    };

    // Combine active states
    const allDrawings = hideDrawings ? [] : [...drawings];
    if (!hideDrawings && activeDrawing && mousePos) {
        allDrawings.push({
            type: activeDrawing.type,
            points: [...activeDrawing.points, { time: mousePos.time, price: mousePos.price }]
        });
    }
    if (!hideDrawings && pencilPoints.length > 0) {
        allDrawings.push({ type: 'pencil', points: pencilPoints });
    }

    const isInteractive = !NON_DRAWING_TOOLS.includes(activeTool) || activeTool === 'eraser';
    const isEraserActive = activeTool === 'eraser';
    const W = dimensions.w || 2000;
    const H = dimensions.h || 1000;

    // Distance from point to line segment
    const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    };

    const getDrawingDistance = (d: typeof drawings[0], clickX: number, clickY: number): number => {
        const pts = d.points.map(p => mapPoint(p.time, p.price));
        if (pts.length === 0) return Infinity;
        // Horizontal/vertical lines span the chart — only measure perpendicular distance
        if (d.type === 'horizontal_line' && pts.length >= 1) {
            return Math.abs(clickY - pts[0].y);
        }
        if (d.type === 'vertical_line' && pts.length >= 1) {
            return Math.abs(clickX - pts[0].x);
        }
        // Single-point drawings: distance to that point
        if (pts.length === 1) return Math.hypot(clickX - pts[0].x, clickY - pts[0].y);
        // Multi-point: minimum distance to any segment
        let minDist = Infinity;
        for (let j = 0; j < pts.length - 1; j++) {
            minDist = Math.min(minDist, distToSegment(clickX, clickY, pts[j].x, pts[j].y, pts[j + 1].x, pts[j + 1].y));
        }
        return minDist;
    };

    // Render a single drawing
    const renderDrawing = (d: { type: string; points: { time: number; price: number }[]; text?: string; data?: Record<string, unknown> }, i: number) => {
        const pts = d.points;

        // --- Pencil ---
        if (d.type === 'pencil') {
            if (pts.length < 2) return null;
            const polyPts = pts.map(p => { const pt = mapPoint(p.time, p.price); return `${pt.x},${pt.y}`; }).join(' ');
            return <polyline key={i} points={polyPts} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />;
        }

        // --- Horizontal Line (1-point) ---
        if (d.type === 'horizontal_line') {
            if (pts.length < 1) return null;
            const p = mapPoint(pts[0].time, pts[0].price);
            const priceText = pts[0].price.toFixed(2);
            const boxWidth = priceText.length * 6 + 10;
            return (
                <g key={i}>
                    <line x1={0} y1={p.y} x2={W} y2={p.y} stroke="#6366f1" strokeWidth="1.5" />
                    <rect x={W - boxWidth - 4} y={p.y - 10} width={boxWidth} height="20" fill="rgba(99, 102, 241, 0.92)" rx="3" />
                    <text x={W - boxWidth/2 - 4} y={p.y + 3} fill="#fff" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="600">{priceText}</text>
                </g>
            );
        }

        // --- Vertical Line (1-point) ---
        if (d.type === 'vertical_line') {
            if (pts.length < 1) return null;
            const p = mapPoint(pts[0].time, pts[0].price);
            return <line key={i} x1={p.x} y1={0} x2={p.x} y2={H} stroke="#6366f1" strokeWidth="1.5" />;
        }

        // --- Price Label (1-point) ---
        if (d.type === 'price_label') {
            if (pts.length < 1) return null;
            const p = mapPoint(pts[0].time, pts[0].price);
            return (
                <g key={i}>
                    <rect x={p.x - 40} y={p.y - 12} width="80" height="24" fill="rgba(41,98,255,0.9)" rx="4" />
                    <text x={p.x} y={p.y + 4} fill="#fff" fontSize="11" textAnchor="middle" fontFamily="monospace">{pts[0].price.toFixed(2)}</text>
                </g>
            );
        }

        // --- Arrow Marker (1-point) ---
        if (d.type === 'arrow_marker') {
            if (pts.length < 1) return null;
            const p = mapPoint(pts[0].time, pts[0].price);
            return (
                <g key={i}>
                    <polygon points={`${p.x},${p.y - 16} ${p.x - 8},${p.y} ${p.x + 8},${p.y}`} fill="#6366f1" />
                    <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + 12} stroke="#6366f1" strokeWidth="2" />
                </g>
            );
        }

        // --- Anchored Note (1-point) ---
        if (d.type === 'anchored_note') {
            if (pts.length < 1) return null;
            const p = mapPoint(pts[0].time, pts[0].price);
            const noteText = d.text || 'Note';
            const boxW = Math.max(60, noteText.length * 7 + 16);
            return (
                <g key={i}>
                    <rect x={p.x} y={p.y - 24} width={boxW} height="22" fill="rgba(30,34,45,0.9)" rx="4" stroke="#f59e0b" strokeWidth="1" />
                    <text x={p.x + 8} y={p.y - 8} fill="#f59e0b" fontSize="11" fontFamily="sans-serif">{noteText}</text>
                    <circle cx={p.x} cy={p.y} r="3" fill="#f59e0b" />
                </g>
            );
        }

        // --- Note (1-point) ---
        if (d.type === 'note') {
            if (pts.length < 1) return null;
            const p = mapPoint(pts[0].time, pts[0].price);
            const noteText = d.text || 'Note';
            const boxW = Math.max(80, noteText.length * 7 + 18);
            return (
                <g key={i}>
                    <rect x={p.x} y={p.y - 26} width={boxW} height="24" fill="rgba(245, 158, 11, 0.18)" rx="4" stroke="#f59e0b" strokeWidth="1" />
                    <text x={p.x + 8} y={p.y - 10} fill="#fbbf24" fontSize="11" fontFamily="sans-serif">{noteText}</text>
                    <circle cx={p.x} cy={p.y} r="3" fill="#f59e0b" />
                </g>
            );
        }

        // --- Trendline / Measure ---
        if (d.type === 'trendline' || d.type === 'measure') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            return (
                <g key={i}>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#6366f1" strokeWidth="2" strokeDasharray={d.type === 'measure' ? "4 4" : "0"} />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                    {d.type === 'measure' && (
                        <>
                            <rect x={p2.x + 10} y={p2.y - 12} width="80" height="24" fill="rgba(30,34,45,0.8)" rx="4" stroke="#2a2e39" />
                            <text x={p2.x + 16} y={p2.y + 4} fill="#d1d4dc" fontSize="12" fontFamily="'JetBrains Mono', monospace">
                                {(((pts[1].price - pts[0].price) / pts[0].price) * 100).toFixed(2)}%
                            </text>
                        </>
                    )}
                </g>
            );
        }

        // --- Extended Line ---
        if (d.type === 'extended_line') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const ends = getExtendedLineEnds(p1.x, p1.y, p2.x, p2.y, W, H);
            return (
                <g key={i}>
                    <line x1={ends.start.x} y1={ends.start.y} x2={ends.end.x} y2={ends.end.y} stroke="#6366f1" strokeWidth="1.5" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                </g>
            );
        }

        // --- Regression Trend ---
        if (d.type === 'regression_trend') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            // Simple linear regression between the two endpoints
            const candles = useMarketStore.getState().candles;
            const t1 = pts[0].time, t2 = pts[1].time;
            const startIdx = candles.findIndex(c => c.time >= Math.min(t1, t2));
            const endIdx = candles.findIndex(c => c.time > Math.max(t1, t2));
            const slice = candles.slice(startIdx, endIdx === -1 ? candles.length : endIdx);
            if (slice.length >= 2) {
                const regData = slice.map((c, idx) => ({ x: idx, y: c.close }));
                const { slope, intercept } = calculateRegressionLine(regData);
                const regP1 = mapPoint(slice[0].time, intercept);
                const regP2 = mapPoint(slice[slice.length - 1].time, intercept + slope * (slice.length - 1));
                return (
                    <g key={i}>
                        <line x1={regP1.x} y1={regP1.y} x2={regP2.x} y2={regP2.y} stroke="#ff9800" strokeWidth="2" />
                        <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                        <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                    </g>
                );
            }
            return (
                <g key={i}>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#ff9800" strokeWidth="2" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                </g>
            );
        }

        // --- Rectangle ---
        if (d.type === 'rectangle') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const x = Math.min(p1.x, p2.x);
            const y = Math.min(p1.y, p2.y);
            const w = Math.abs(p2.x - p1.x);
            const h = Math.abs(p2.y - p1.y);
            return (
                <g key={i}>
                    <rect x={x} y={y} width={w} height={h} fill="rgba(41, 98, 255, 0.2)" stroke="#6366f1" strokeWidth="2" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                </g>
            );
        }

        // --- Circle ---
        if (d.type === 'circle') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const r = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            return (
                <g key={i}>
                    <circle cx={p1.x} cy={p1.y} r={r} fill="rgba(41, 98, 255, 0.1)" stroke="#6366f1" strokeWidth="2" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                </g>
            );
        }

        // --- Ellipse ---
        if (d.type === 'ellipse') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const rx = Math.abs(p2.x - p1.x);
            const ry = Math.abs(p2.y - p1.y);
            return (
                <g key={i}>
                    <ellipse cx={p1.x} cy={p1.y} rx={rx} ry={ry} fill="rgba(41, 98, 255, 0.1)" stroke="#6366f1" strokeWidth="2" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                </g>
            );
        }

        // --- Triangle (3-point) ---
        if (d.type === 'triangle') {
            if (pts.length < 3) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const p3 = mapPoint(pts[2].time, pts[2].price);
            return (
                <g key={i}>
                    <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill="rgba(41, 98, 255, 0.15)" stroke="#6366f1" strokeWidth="2" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                    <circle cx={p3.x} cy={p3.y} r="3" fill="#6366f1" />
                </g>
            );
        }

        // --- Polyline (multi-click) ---
        if (d.type === 'polyline') {
            if (pts.length < 2) return null;
            const polyPts = pts.map(p => { const pt = mapPoint(p.time, p.price); return `${pt.x},${pt.y}`; }).join(' ');
            return (
                <g key={i}>
                    <polyline points={polyPts} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
                    {pts.map((p, j) => { const pt = mapPoint(p.time, p.price); return <circle key={j} cx={pt.x} cy={pt.y} r="3" fill="#6366f1" />; })}
                </g>
            );
        }

        // --- Ray ---
        if (d.type === 'ray') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const rayEnd = getRayExtension(p1.x, p1.y, p2.x, p2.y, W, H);
            return (
                <g key={i}>
                    <line x1={p1.x} y1={p1.y} x2={rayEnd.x} y2={rayEnd.y} stroke="#6366f1" strokeWidth="2" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                </g>
            );
        }

        // --- Vertical Ray ---
        if (d.type === 'vertical_ray') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const targetY = p2.y >= p1.y ? H : 0;
            return (
                <g key={i}>
                    <line x1={p1.x} y1={p1.y} x2={p1.x} y2={targetY} stroke="#6366f1" strokeWidth="2" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                </g>
            );
        }

        // --- Fibonacci Retracement ---
        if (d.type === 'fibonacci') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            
            // Reverse logic: first click is treated as 1, second as 0
            const price1 = pts[0].price; // Will be treated as level 1 (high)
            const price2 = pts[1].price; // Will be treated as level 0 (low)
            
            // Calculate fibonacci levels from price2 to price1 (reversed order)
            const allLevels = calculateFibonacciLevels(price2, price1);
            // Filter to only standard retracement levels (0 to 1, excluding 1.618)
            const levels = allLevels.filter(lvl => lvl.level <= 1).reverse(); // Reverse to go from 1 to 0
            
            const colors = ['#00d7ff', '#009688', '#4caf50', '#ff9800', '#ef5350', '#616161'];
            const bgColors = ['rgba(0, 139, 123, 0.25)', 'rgba(0, 150, 136, 0.25)', 'rgba(120, 168, 60, 0.25)', 'rgba(183, 76, 44, 0.25)', 'rgba(71, 40, 40, 0.25)'];
            
            return (
                <g key={i}>
                    {/* Draw background rectangles between levels */}
                    {levels.map((lvl, idx) => {
                        if (idx === levels.length - 1) return null; // Skip last level for bg
                        const y1 = seriesRef.current?.candle.priceToCoordinate(lvl.price) ?? -1000;
                        const y2 = seriesRef.current?.candle.priceToCoordinate(levels[idx + 1].price) ?? -1000;
                        const bgColor = bgColors[idx % bgColors.length];
                        return (
                            <rect
                                key={`bg-${idx}`}
                                x={Math.min(p1.x, p2.x)}
                                y={Math.min(y1, y2)}
                                width={Math.abs(Math.max(p1.x, p2.x) - Math.min(p1.x, p2.x))}
                                height={Math.abs(y1 - y2)}
                                fill={bgColor}
                            />
                        );
                    })}
                    
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#787b86" strokeWidth="1" strokeDasharray="4 4" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#787b86" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#787b86" />
                    
                    {levels.map((lvl, idx) => {
                        const y = seriesRef.current?.candle.priceToCoordinate(lvl.price) ?? -1000;
                        const color = colors[idx] || '#787b86';
                        return (
                            <g key={idx}>
                                {/* Only draw line between the two points' x-coordinates */}
                                <line x1={Math.min(p1.x, p2.x)} y1={y} x2={Math.max(p1.x, p2.x)} y2={y} stroke={color} strokeWidth="2" opacity="1" />
                                <text x={Math.max(p1.x, p2.x) + 5} y={y - 4} fill={color} fontSize="12" textAnchor="start" fontFamily="'JetBrains Mono', monospace">
                                    {lvl.level} ({lvl.price.toFixed(2)})
                                </text>
                            </g>
                        );
                    })}
                </g>
            );
        }

        // --- Fibonacci Extension (3-point) ---
        if (d.type === 'fib_extension') {
            if (pts.length < 3) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const p3 = mapPoint(pts[2].time, pts[2].price);
            const levels = calculateFibonacciExtension(pts[0].price, pts[1].price, pts[2].price);
            const colors = ['#787b86', '#ef5350', '#ff9800', '#4caf50', '#6366f1', '#9c27b0'];
            return (
                <g key={i}>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#787b86" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1={p2.x} y1={p2.y} x2={p3.x} y2={p3.y} stroke="#787b86" strokeWidth="1" strokeDasharray="4 4" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#787b86" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#787b86" />
                    <circle cx={p3.x} cy={p3.y} r="3" fill="#787b86" />
                    {levels.map((lvl, idx) => {
                        const y = seriesRef.current?.candle.priceToCoordinate(lvl.price) ?? -1000;
                        const color = colors[idx] || '#787b86';
                        return (
                            <g key={idx}>
                                <line x1={0} y1={y} x2={W} y2={y} stroke={color} strokeWidth="1" opacity="0.6" />
                                <text x={W - 5} y={y - 4} fill={color} fontSize="10" textAnchor="end" fontFamily="monospace">
                                    {lvl.level} ({lvl.price.toFixed(2)})
                                </text>
                            </g>
                        );
                    })}
                </g>
            );
        }

        // --- Fibonacci Fan (2-point) ---
        if (d.type === 'fib_fan') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const fanLevels = [0.236, 0.382, 0.5, 0.618, 0.786];
            const colors = ['#ef5350', '#ff9800', '#4caf50', '#6366f1', '#9c27b0'];
            return (
                <g key={i}>
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#787b86" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#787b86" />
                    {fanLevels.map((lvl, idx) => {
                        const fanY = p1.y + (p2.y - p1.y) * lvl;
                        const ext = getRayExtension(p1.x, p1.y, p2.x, fanY, W, H);
                        return (
                            <g key={idx}>
                                <line x1={p1.x} y1={p1.y} x2={ext.x} y2={ext.y} stroke={colors[idx]} strokeWidth="1" opacity="0.7" />
                                <text x={ext.x - 5} y={ext.y - 4} fill={colors[idx]} fontSize="9" textAnchor="end" fontFamily="monospace">{lvl}</text>
                            </g>
                        );
                    })}
                </g>
            );
        }

        // --- Fibonacci Time Zone (2-point) ---
        if (d.type === 'fib_timezone') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const dx = p2.x - p1.x;
            const fibs = [1, 2, 3, 5, 8, 13, 21];
            return (
                <g key={i}>
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                    {fibs.map((f, idx) => {
                        const x = p1.x + dx * f;
                        return <line key={idx} x1={x} y1={0} x2={x} y2={H} stroke="#6366f1" strokeWidth="1" opacity="0.5" strokeDasharray="4 4" />;
                    })}
                </g>
            );
        }

        // --- Parallel Channel (3-point) ---
        if (d.type === 'parallel_channel') {
            if (pts.length < 3) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const p3 = mapPoint(pts[2].time, pts[2].price);
            const offset = getParallelChannelOffset(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = len === 0 ? 0 : -dy / len;
            const ny = len === 0 ? 0 : dx / len;
            return (
                <g key={i}>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#6366f1" strokeWidth="2" />
                    <line x1={p1.x + nx * offset} y1={p1.y + ny * offset} x2={p2.x + nx * offset} y2={p2.y + ny * offset} stroke="#6366f1" strokeWidth="2" />
                    <rect
                        x={Math.min(p1.x, p2.x, p1.x + nx * offset, p2.x + nx * offset)}
                        y={Math.min(p1.y, p2.y, p1.y + ny * offset, p2.y + ny * offset)}
                        width={Math.abs(p2.x - p1.x) || 2}
                        height={Math.abs(offset) || 2}
                        fill="rgba(41, 98, 255, 0.1)"
                    />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                    <circle cx={p3.x} cy={p3.y} r="3" fill="#6366f1" />
                </g>
            );
        }

        // --- Pitchfork (3-point) ---
        if (d.type === 'pitchfork') {
            if (pts.length < 3) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const p3 = mapPoint(pts[2].time, pts[2].price);
            const midX = (p2.x + p3.x) / 2;
            const midY = (p2.y + p3.y) / 2;
            const medianEnd = getRayExtension(p1.x, p1.y, midX, midY, W, H);
            const upperEnd = getRayExtension(p1.x, p1.y, p2.x, p2.y, W, H);
            const lowerEnd = getRayExtension(p1.x, p1.y, p3.x, p3.y, W, H);
            return (
                <g key={i}>
                    <line x1={p1.x} y1={p1.y} x2={medianEnd.x} y2={medianEnd.y} stroke="#6366f1" strokeWidth="2" />
                    <line x1={p2.x} y1={p2.y} x2={upperEnd.x} y2={upperEnd.y} stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1={p3.x} y1={p3.y} x2={lowerEnd.x} y2={lowerEnd.y} stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                    <circle cx={p3.x} cy={p3.y} r="3" fill="#6366f1" />
                </g>
            );
        }

        // --- Gann Box (2-point) ---
        if (d.type === 'gann_box') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const x = Math.min(p1.x, p2.x);
            const y = Math.min(p1.y, p2.y);
            const w = Math.abs(p2.x - p1.x);
            const h = Math.abs(p2.y - p1.y);
            const divs = [0, 0.25, 0.333, 0.5, 0.667, 0.75, 1];
            return (
                <g key={i}>
                    <rect x={x} y={y} width={w} height={h} fill="none" stroke="#6366f1" strokeWidth="1.5" />
                    {divs.map((d, idx) => (
                        <g key={`gann-${idx}`}>
                            <line x1={x} y1={y + h * d} x2={x + w} y2={y + h * d} stroke="#787b86" strokeWidth="0.5" opacity="0.5" />
                            <line x1={x + w * d} y1={y} x2={x + w * d} y2={y + h} stroke="#787b86" strokeWidth="0.5" opacity="0.5" />
                        </g>
                    ))}
                    <line x1={x} y1={y} x2={x + w} y2={y + h} stroke="#ef5350" strokeWidth="1" />
                    <line x1={x + w} y1={y} x2={x} y2={y + h} stroke="#4caf50" strokeWidth="1" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                </g>
            );
        }

        // --- Gann Square (2-point) ---
        if (d.type === 'gann_square') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const side = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
            const x = Math.min(p1.x, p2.x);
            const y = Math.min(p1.y, p2.y);
            const divs = [0.25, 0.5, 0.75];
            return (
                <g key={i}>
                    <rect x={x} y={y} width={side} height={side} fill="none" stroke="#6366f1" strokeWidth="1.5" />
                    {divs.map((d, idx) => (
                        <g key={`gs-${idx}`}>
                            <line x1={x} y1={y + side * d} x2={x + side} y2={y + side * d} stroke="#787b86" strokeWidth="0.5" opacity="0.6" />
                            <line x1={x + side * d} y1={y} x2={x + side * d} y2={y + side} stroke="#787b86" strokeWidth="0.5" opacity="0.6" />
                        </g>
                    ))}
                    <line x1={x} y1={y} x2={x + side} y2={y + side} stroke="#ef5350" strokeWidth="1" />
                    <line x1={x + side} y1={y} x2={x} y2={y + side} stroke="#4caf50" strokeWidth="1" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                </g>
            );
        }

        // --- Gann Fan (2-point) ---
        if (d.type === 'gann_fan') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const lines = getGannFanLines(p1.x, p1.y, p2.x, p2.y, W, H);
            const colors = ['#ef5350', '#ff9800', '#ff9800', '#4caf50', '#6366f1', '#4caf50', '#ff9800', '#ff9800', '#ef5350'];
            return (
                <g key={i}>
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                    {lines.map((line, idx) => (
                        <g key={idx}>
                            <line x1={p1.x} y1={p1.y} x2={line.endX} y2={line.endY} stroke={colors[idx] || '#787b86'} strokeWidth="1" opacity="0.7" />
                            <text x={line.endX - 5} y={line.endY - 4} fill={colors[idx] || '#787b86'} fontSize="8" textAnchor="end" fontFamily="monospace">{line.label}</text>
                        </g>
                    ))}
                </g>
            );
        }

        // --- Long/Short Position ---
        if (d.type === 'long_position' || d.type === 'short_position') {
            if (pts.length < 2) return null;
            const entryPt = mapPoint(pts[0].time, pts[0].price);
            const exitPt = mapPoint(pts[1].time, pts[1].price);
            const isLong = d.type === 'long_position';
            const entryY = entryPt.y;
            const exitY = exitPt.y;
            const distance = Math.abs(entryY - exitY);
            const tpY = isLong ? entryY - distance : entryY + distance;
            const slY = isLong ? entryY + distance / 2 : entryY - distance / 2;
            const width = 120;
            const left = entryPt.x;
            const right = left + width;
            return (
                <g key={i}>
                    <rect x={left} y={Math.min(entryY, tpY)} width={width} height={Math.abs(entryY - tpY)} fill={isLong ? "rgba(38, 166, 154, 0.2)" : "rgba(239, 83, 80, 0.2)"} stroke={isLong ? "rgba(38, 166, 154, 1)" : "rgba(239, 83, 80, 1)"} strokeWidth="1" />
                    <rect x={left} y={Math.min(entryY, slY)} width={width} height={Math.abs(entryY - slY)} fill={isLong ? "rgba(239, 83, 80, 0.2)" : "rgba(38, 166, 154, 0.2)"} stroke={isLong ? "rgba(239, 83, 80, 1)" : "rgba(38, 166, 154, 1)"} strokeWidth="1" />
                    <line x1={left} y1={entryY} x2={right} y2={entryY} stroke="#787b86" strokeWidth="2" />
                    <circle cx={entryPt.x} cy={entryY} r="4" fill="#6366f1" />
                </g>
            );
        }

        // --- Price Range (2-point vertical measurement) ---
        if (d.type === 'price_range') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const diff = pts[1].price - pts[0].price;
            const pct = ((diff / pts[0].price) * 100).toFixed(2);
            return (
                <g key={i}>
                    <line x1={p1.x} y1={p1.y} x2={p1.x} y2={p2.y} stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1={p1.x - 10} y1={p1.y} x2={p1.x + 10} y2={p1.y} stroke="#6366f1" strokeWidth="2" />
                    <line x1={p1.x - 10} y1={p2.y} x2={p1.x + 10} y2={p2.y} stroke="#6366f1" strokeWidth="2" />
                    <rect x={p1.x + 14} y={(p1.y + p2.y) / 2 - 12} width="90" height="24" fill="rgba(30,34,45,0.8)" rx="4" stroke="#2a2e39" />
                    <text x={p1.x + 20} y={(p1.y + p2.y) / 2 + 4} fill="#d1d4dc" fontSize="11" fontFamily="monospace">{diff.toFixed(2)} ({pct}%)</text>
                </g>
            );
        }

        // --- Date Range (2-point horizontal measurement) ---
        if (d.type === 'date_range') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const bars = Math.abs(pts[1].time - pts[0].time);
            return (
                <g key={i}>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p1.y} stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1={p1.x} y1={p1.y - 10} x2={p1.x} y2={p1.y + 10} stroke="#6366f1" strokeWidth="2" />
                    <line x1={p2.x} y1={p1.y - 10} x2={p2.x} y2={p1.y + 10} stroke="#6366f1" strokeWidth="2" />
                    <rect x={(p1.x + p2.x) / 2 - 30} y={p1.y + 14} width="60" height="20" fill="rgba(30,34,45,0.8)" rx="4" stroke="#2a2e39" />
                    <text x={(p1.x + p2.x) / 2} y={p1.y + 28} fill="#d1d4dc" fontSize="11" textAnchor="middle" fontFamily="monospace">{bars}s</text>
                </g>
            );
        }

        // --- Date & Price Range (2-point) ---
        if (d.type === 'date_price_range') {
            if (pts.length < 2) return null;
            const p1 = mapPoint(pts[0].time, pts[0].price);
            const p2 = mapPoint(pts[1].time, pts[1].price);
            const x = Math.min(p1.x, p2.x);
            const y = Math.min(p1.y, p2.y);
            const w = Math.abs(p2.x - p1.x);
            const h = Math.abs(p2.y - p1.y);

            const priceDiff = pts[1].price - pts[0].price;
            const pct = pts[0].price !== 0 ? (priceDiff / pts[0].price) * 100 : 0;
            const bars = Math.abs(pts[1].time - pts[0].time);

            return (
                <g key={i}>
                    <rect x={x} y={y} width={w} height={h} fill="rgba(41, 98, 255, 0.12)" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 4" />
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#6366f1" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#6366f1" />
                    <rect x={x + 8} y={y + 8} width="148" height="38" fill="rgba(30,34,45,0.86)" rx="4" stroke="#2a2e39" />
                    <text x={x + 14} y={y + 23} fill="#d1d4dc" fontSize="11" fontFamily="monospace">
                        {priceDiff.toFixed(2)} ({pct.toFixed(2)}%)
                    </text>
                    <text x={x + 14} y={y + 37} fill="#d1d4dc" fontSize="11" fontFamily="monospace">
                        {bars}s
                    </text>
                </g>
            );
        }

        // --- Callout (2-point with text) ---
        if (d.type === 'callout') {
            if (pts.length < 2) return null;
            const anchor = mapPoint(pts[0].time, pts[0].price);
            const textPt = mapPoint(pts[1].time, pts[1].price);
            const calloutText = d.text || 'Callout';
            const boxW = Math.max(80, calloutText.length * 7 + 20);
            return (
                <g key={i}>
                    <line x1={anchor.x} y1={anchor.y} x2={textPt.x} y2={textPt.y} stroke="#6366f1" strokeWidth="1" />
                    <circle cx={anchor.x} cy={anchor.y} r="3" fill="#6366f1" />
                    <rect x={textPt.x} y={textPt.y - 20} width={boxW} height="24" fill="rgba(30,34,45,0.9)" rx="4" stroke="#6366f1" strokeWidth="1" />
                    <text x={textPt.x + 10} y={textPt.y - 3} fill="#d1d4dc" fontSize="12" fontFamily="sans-serif">{calloutText}</text>
                </g>
            );
        }

        // --- XABCD Pattern (5-point) ---
        if (d.type === 'xabcd_pattern') {
            if (pts.length < 5) return null;
            const mapped = pts.map(p => mapPoint(p.time, p.price));
            const labels = ['X', 'A', 'B', 'C', 'D'];
            return (
                <g key={i}>
                    {mapped.map((p, j) => j > 0 ? <line key={`l${j}`} x1={mapped[j - 1].x} y1={mapped[j - 1].y} x2={p.x} y2={p.y} stroke="#9c27b0" strokeWidth="2" /> : null)}
                    <line x1={mapped[0].x} y1={mapped[0].y} x2={mapped[3].x} y2={mapped[3].y} stroke="#9c27b0" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                    <line x1={mapped[1].x} y1={mapped[1].y} x2={mapped[4].x} y2={mapped[4].y} stroke="#9c27b0" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                    {mapped.map((p, j) => (
                        <g key={`p${j}`}>
                            <circle cx={p.x} cy={p.y} r="4" fill="#9c27b0" />
                            <text x={p.x + 8} y={p.y - 6} fill="#d1d4dc" fontSize="12" fontWeight="bold" fontFamily="sans-serif">{labels[j]}</text>
                        </g>
                    ))}
                </g>
            );
        }

        // --- Elliott Wave (multi-click) ---
        if (d.type === 'elliott_wave') {
            if (pts.length < 2) return null;
            const mapped = pts.map(p => mapPoint(p.time, p.price));
            const waveLabels = ['1', '2', '3', '4', '5', 'A', 'B', 'C'];
            return (
                <g key={i}>
                    {mapped.map((p, j) => j > 0 ? <line key={`l${j}`} x1={mapped[j - 1].x} y1={mapped[j - 1].y} x2={p.x} y2={p.y} stroke="#6366f1" strokeWidth="2" /> : null)}
                    {mapped.map((p, j) => (
                        <g key={`p${j}`}>
                            <circle cx={p.x} cy={p.y} r="4" fill="#6366f1" />
                            <text x={p.x + 6} y={p.y - 6} fill="#d1d4dc" fontSize="11" fontWeight="bold" fontFamily="sans-serif">{waveLabels[j] || j + 1}</text>
                        </g>
                    ))}
                </g>
            );
        }

        // --- Head & Shoulders (multi-click, typically 7 points) ---
        if (d.type === 'head_shoulders') {
            if (pts.length < 2) return null;
            const mapped = pts.map(p => mapPoint(p.time, p.price));
            const hsLabels = ['LS', 'N', 'H', 'N', 'RS', 'N', 'B'];
            return (
                <g key={i}>
                    {mapped.map((p, j) => j > 0 ? <line key={`l${j}`} x1={mapped[j - 1].x} y1={mapped[j - 1].y} x2={p.x} y2={p.y} stroke="#ff9800" strokeWidth="2" /> : null)}
                    {/* Neckline between point 1 and 3 (if available) */}
                    {mapped.length >= 4 && (
                        <line x1={mapped[1].x} y1={mapped[1].y} x2={mapped[3].x} y2={mapped[3].y} stroke="#ff9800" strokeWidth="1" strokeDasharray="6 3" />
                    )}
                    {mapped.map((p, j) => (
                        <g key={`p${j}`}>
                            <circle cx={p.x} cy={p.y} r="4" fill="#ff9800" />
                            <text x={p.x + 6} y={p.y - 6} fill="#d1d4dc" fontSize="10" fontWeight="bold" fontFamily="sans-serif">{hsLabels[j] || ''}</text>
                        </g>
                    ))}
                </g>
            );
        }

        // --- Text ---
        if (d.type === 'text') {
            if (pts.length < 1) return null;
            const pt = mapPoint(pts[0].time, pts[0].price);
            return (
                <g key={i}>
                    <text x={pt.x} y={pt.y} fill="#d1d4dc" fontSize="14" fontWeight="bold" fontFamily="-apple-system, sans-serif">
                        {d.text}
                    </text>
                    <circle cx={pt.x} cy={pt.y} r="2" fill="#2a2e39" />
                </g>
            );
        }

        return null;
    };

    const handleTextSubmit = (text: string) => {
        if (!textEntry) return;
        if (text) {
            if (textEntry.type === 'callout' && activeDrawing) {
                writeDrawings([
                    ...drawings,
                    {
                        type: 'callout',
                        points: [...activeDrawing.points, { time: textEntry.time, price: textEntry.price }],
                        text,
                    }
                ]);
                setActiveDrawing(null);
            } else if (textEntry.type === 'anchored_note') {
                writeDrawings([...drawings, { type: 'anchored_note', text, points: [{ time: textEntry.time, price: textEntry.price }] }]);
            } else if (textEntry.type === 'note') {
                writeDrawings([...drawings, { type: 'note', text, points: [{ time: textEntry.time, price: textEntry.price }] }]);
            } else {
                writeDrawings([...drawings, { type: 'text', text, points: [{ time: textEntry.time, price: textEntry.price }] }]);
            }
        }
        setTextEntry(null);
        setActiveTool('crosshair');
    };

    return (
        <>
            <svg
                ref={svgRef}
                className={`absolute top-0 left-0 z-30 w-full h-full ${isInteractive ? (isEraserActive ? 'pointer-events-auto cursor-pointer' : 'pointer-events-auto cursor-crosshair') : 'pointer-events-none'}`}
                style={{ overflow: 'hidden' }}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onDoubleClick={handleDoubleClick}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                onTouchCancel={handlePointerUp}
            >
                {/* eslint-disable react-hooks/refs -- SVG overlay must synchronously map chart coordinates during render */}
                {allDrawings.map((d, i) => renderDrawing(d, i))}

                {activeTool === 'replay' && mousePos && (
                    <g>
                        <line
                            x1={mapPoint(mousePos.time!, mousePos.price!).x}
                            y1={0}
                            x2={mapPoint(mousePos.time!, mousePos.price!).x}
                            y2={H}
                            stroke="#6366f1"
                            strokeWidth="2"
                        />
                        <rect
                            x={mapPoint(mousePos.time!, mousePos.price!).x}
                            y={0}
                            width={Math.max(0, W - mapPoint(mousePos.time!, mousePos.price!).x)}
                            height={H}
                            fill="rgba(41, 98, 255, 0.1)"
                        />
                    </g>
                )}

                {mousePos && isInteractive && magnetMode !== 'off' && activeTool !== 'replay' && (
                    <circle cx={mapPoint(mousePos.time!, mousePos.price!).x} cy={mapPoint(mousePos.time!, mousePos.price!).y} r="4" fill="none" stroke="#6366f1" strokeWidth="2" />
                )}
                {/* eslint-enable react-hooks/refs */}
            </svg>

            {textEntry && (
                <div
                    className="absolute z-[500] bg-[#1e222d] border border-[#2a2e39] rounded shadow-2xl p-2 flex flex-col gap-2 min-w-[200px]"
                    style={{
                        left: Math.min(textEntry.x + 10, dimensions.w - 220),
                        top: Math.min(textEntry.y + 10, dimensions.h - 80)
                    }}
                >
                    <div className="text-[10px] uppercase font-bold text-[#787b86] px-1">
                        {textEntry.type === 'callout' ? 'Callout Text' : (textEntry.type === 'anchored_note' || textEntry.type === 'note') ? 'Note' : 'Text Settings'}
                    </div>
                    <input
                        autoFocus
                        ref={textInputRef}
                        className="bg-[#131722] border border-[#363a45] text-[#d1d4dc] text-sm px-2 py-1.5 rounded outline-none focus:border-[#6366f1]"
                        placeholder={(textEntry.type === 'anchored_note' || textEntry.type === 'note') ? 'Enter note...' : 'Enter label text...'}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTextSubmit(e.currentTarget.value);
                            else if (e.key === 'Escape') { setTextEntry(null); setActiveDrawing(null); setActiveTool('crosshair'); }
                        }}
                    />
                    <div className="flex justify-end gap-2 px-1">
                        <button className="text-[10px] text-[#787b86] hover:text-white" onClick={() => { setTextEntry(null); setActiveDrawing(null); setActiveTool('crosshair'); }}>Cancel</button>
                        <button
                            className="text-[10px] text-[#6366f1] font-bold"
                            onClick={() => handleTextSubmit(textInputRef.current?.value || '')}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
