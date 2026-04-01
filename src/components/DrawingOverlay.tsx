import React, { useEffect, useState, useRef } from 'react';
import useMarketStore from '../store/useMarketStore';
import type { IChartApi } from 'lightweight-charts';
import { calculateFibonacciLevels, getRayExtension, getSnappedCoordinates } from '../lib/drawingUtils';

interface DrawingOverlayProps {
    chartRef: React.MutableRefObject<IChartApi | null>;
    seriesRef: React.MutableRefObject<any | null>;
}

export function DrawingOverlay({ chartRef, seriesRef }: DrawingOverlayProps) {
    const drawings = useMarketStore(s => s.drawings);
    const setDrawings = useMarketStore(s => s.setDrawings);
    const activeTool = useMarketStore(s => s.activeTool);
    const setActiveTool = useMarketStore(s => s.setActiveTool);
    const magnetMode = useMarketStore(s => s.magnetMode);

    const [, setTrigger] = useState(0); 
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

    const [mousePos, setMousePos] = useState<{ x: number, y: number, time: number, price: number } | null>(null);
    const [activeDrawing, setActiveDrawing] = useState<{ type: string, points: { time: number, price: number }[] } | null>(null);
    
    // Pencil state
    const [isDraggingPencil, setIsDraggingPencil] = useState(false);
    const [pencilPoints, setPencilPoints] = useState<{ time: number, price: number }[]>([]);

    // Text state
    const [textEntry, setTextEntry] = useState<{ x: number, y: number, time: number, price: number } | null>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

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

    // Force re-render on chart moves (pan/zoom) so drawings stick to grid
    useEffect(() => {
        if (!chartRef.current) return;
        const chart = chartRef.current;
        const updateTrigger = () => setTrigger(t => t + 1);
        chart.timeScale().subscribeVisibleTimeRangeChange(updateTrigger);
        chart.timeScale().subscribeVisibleLogicalRangeChange(updateTrigger);
        return () => {
            chart.timeScale().unsubscribeVisibleTimeRangeChange(updateTrigger);
            chart.timeScale().unsubscribeVisibleLogicalRangeChange(updateTrigger);
        };
    }, [chartRef]);

    useEffect(() => {
        if (!chartRef.current) return;
        const isDrawing = !['crosshair', 'dot', 'arrow', 'zoom'].includes(activeTool);
        chartRef.current.applyOptions({
            handleScroll: !isDrawing,
            handleScale: !isDrawing,
        });
    }, [activeTool, chartRef]);

    const getTimePrice = (e: React.MouseEvent | React.TouchEvent) => {
        if (!chartRef.current || !seriesRef.current || !svgRef.current) return null;
        const rect = svgRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        let time = chartRef.current.timeScale().coordinateToTime(x as any) as number;
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

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (textEntry || ['crosshair', 'dot', 'arrow', 'zoom'].includes(activeTool)) return;
        
        const pt = getTimePrice(e);
        if (!pt) return;

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
        } else if (activeTool === 'text') {
            setTextEntry({ x: pt.x, y: pt.y, time: pt.time, price: pt.price });
        } else {
            // 2-point tools
            if (!activeDrawing) {
                setActiveDrawing({ type: activeTool, points: [{ time: pt.time, price: pt.price }] });
            } else {
                // Finish 2-point tool
                const newPoints = [...activeDrawing.points, { time: pt.time, price: pt.price }];
                setDrawings([...drawings, { type: activeDrawing.type, points: newPoints }]);
                setActiveDrawing(null);
                setActiveTool('crosshair');
            }
        }
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (['crosshair', 'dot', 'arrow', 'zoom'].includes(activeTool) && !activeDrawing && activeTool !== 'replay') return;
        
        const pt = getTimePrice(e);
        if (!pt) {
            setMousePos(null);
            return;
        }

        setMousePos(pt);

        if (isDraggingPencil && activeTool === 'pencil') {
            setPencilPoints(prev => [...prev.filter(p => Math.abs(p.time - pt.time) > 100), { time: pt.time, price: pt.price }]);
        }
    };

    const handlePointerUp = () => {
        if (isDraggingPencil && activeTool === 'pencil') {
            setIsDraggingPencil(false);
            if (pencilPoints.length > 1) {
                setDrawings([...drawings, { type: 'pencil', points: pencilPoints }]);
            }
            setPencilPoints([]);
            setActiveTool('crosshair');
        }
    };

    // Map logic
    const mapPoint = (time: number, price: number) => {
        if (!chartRef.current || !seriesRef.current) return { x: -1000, y: -1000 };
        const x = chartRef.current.timeScale().timeToCoordinate(time as any) ?? -1000;
        const y = seriesRef.current.candle.priceToCoordinate(price) ?? -1000;
        return { x, y };
    };

    // Combine active states
    const allDrawings = [...drawings];
    if (activeDrawing && mousePos) {
        allDrawings.push({
            type: activeDrawing.type,
            points: [...activeDrawing.points, { time: mousePos.time, price: mousePos.price }]
        });
    }
    if (pencilPoints.length > 0) {
        allDrawings.push({ type: 'pencil', points: pencilPoints });
    }

    const isInteractive = !['crosshair', 'dot', 'arrow', 'zoom'].includes(activeTool);

    return (
        <>
            <svg 
                ref={svgRef}
                className={`absolute top-0 left-0 z-30 w-full h-full ${isInteractive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
                style={{ overflow: 'hidden' }}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                onTouchCancel={handlePointerUp}
            >
                {allDrawings.map((d, i) => {
                    if (d.type === 'pencil') {
                        if (d.points.length < 2) return null;
                        const pts = d.points.map(p => {
                            const pt = mapPoint(p.time, p.price);
                            return `${pt.x},${pt.y}`;
                        }).join(' ');
                        return (
                            <polyline key={i} points={pts} fill="none" stroke="#2962ff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                        );
                    }

                    if (d.type === 'trendline' || d.type === 'measure') {
                        if (d.points.length < 2) return null;
                        const p1 = mapPoint(d.points[0].time, d.points[0].price);
                        const p2 = mapPoint(d.points[1].time, d.points[1].price);
                        return (
                            <g key={i}>
                                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#2962ff" strokeWidth="2" strokeDasharray={d.type === 'measure' ? "4 4" : "0"} />
                                <circle cx={p1.x} cy={p1.y} r="3" fill="#2962ff" />
                                <circle cx={p2.x} cy={p2.y} r="3" fill="#2962ff" />
                                {d.type === 'measure' && (
                                    <rect x={p2.x + 10} y={p2.y - 12} width="80" height="24" fill="rgba(30,34,45,0.8)" rx="4" stroke="#2a2e39" />
                                )}
                                {d.type === 'measure' && (
                                    <text x={p2.x + 16} y={p2.y + 4} fill="#d1d4dc" fontSize="12" fontFamily="'JetBrains Mono', monospace">
                                        {(((d.points[1].price - d.points[0].price) / d.points[0].price) * 100).toFixed(2)}%
                                    </text>
                                )}
                            </g>
                        );
                    }

                    if (d.type === 'rectangle') {
                        if (d.points.length < 2) return null;
                        const p1 = mapPoint(d.points[0].time, d.points[0].price);
                        const p2 = mapPoint(d.points[1].time, d.points[1].price);
                        const x = Math.min(p1.x, p2.x);
                        const y = Math.min(p1.y, p2.y);
                        const w = Math.abs(p2.x - p1.x);
                        const h = Math.abs(p2.y - p1.y);
                        return (
                            <g key={i}>
                                <rect x={x} y={y} width={w} height={h} fill="rgba(41, 98, 255, 0.2)" stroke="#2962ff" strokeWidth="2" />
                                <circle cx={p1.x} cy={p1.y} r="3" fill="#2962ff" />
                                <circle cx={p2.x} cy={p2.y} r="3" fill="#2962ff" />
                            </g>
                        );
                    }

                    if (d.type === 'circle') {
                        if (d.points.length < 2) return null;
                        const p1 = mapPoint(d.points[0].time, d.points[0].price);
                        const p2 = mapPoint(d.points[1].time, d.points[1].price);
                        const r = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                        return (
                            <g key={i}>
                                <circle cx={p1.x} cy={p1.y} r={r} fill="rgba(41, 98, 255, 0.1)" stroke="#2962ff" strokeWidth="2" />
                                <circle cx={p1.x} cy={p1.y} r="3" fill="#2962ff" />
                                <circle cx={p2.x} cy={p2.y} r="3" fill="#2962ff" />
                            </g>
                        );
                    }

                    if (d.type === 'ray') {
                        if (d.points.length < 2) return null;
                        const p1 = mapPoint(d.points[0].time, d.points[0].price);
                        const p2 = mapPoint(d.points[1].time, d.points[1].price);
                        const rayEnd = getRayExtension(p1.x, p1.y, p2.x, p2.y, dimensions.w || 2000, dimensions.h || 1000);
                        return (
                            <g key={i}>
                                <line x1={p1.x} y1={p1.y} x2={rayEnd.x} y2={rayEnd.y} stroke="#2962ff" strokeWidth="2" />
                                <circle cx={p1.x} cy={p1.y} r="3" fill="#2962ff" />
                                <circle cx={p2.x} cy={p2.y} r="3" fill="#2962ff" />
                            </g>
                        );
                    }

                    if (d.type === 'fibonacci') {
                        if (d.points.length < 2) return null;
                        const p1 = mapPoint(d.points[0].time, d.points[0].price);
                        const p2 = mapPoint(d.points[1].time, d.points[1].price);
                        const levels = calculateFibonacciLevels(d.points[0].price, d.points[1].price);
                        const colors = ['#787b86', '#ef5350', '#ff9800', '#4caf50', '#089981', '#2962ff', '#787b86', '#2a2e39'];
                        
                        return (
                            <g key={i}>
                                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#787b86" strokeWidth="1" strokeDasharray="4 4" />
                                <circle cx={p1.x} cy={p1.y} r="3" fill="#787b86" />
                                <circle cx={p2.x} cy={p2.y} r="3" fill="#787b86" />
                                {levels.map((lvl, idx) => {
                                    const y = seriesRef.current?.candle.priceToCoordinate(lvl.price) ?? -1000;
                                    const color = colors[idx] || '#787b86';
                                    return (
                                        <g key={idx}>
                                            <line x1={0} y1={y} x2={dimensions.w || 2000} y2={y} stroke={color} strokeWidth="1" opacity="0.6" />
                                            <text x={dimensions.w ? dimensions.w - 5 : 0} y={y - 4} fill={color} fontSize="10" textAnchor="end" fontFamily="'JetBrains Mono', monospace">
                                                {lvl.level} ({lvl.price.toFixed(2)})
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    }

                    if (d.type === 'long_position' || d.type === 'short_position') {
                        if (d.points.length < 2) return null;
                        const entryPt = mapPoint(d.points[0].time, d.points[0].price);
                        const exitPt = mapPoint(d.points[1].time, d.points[1].price); 
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
                                <circle cx={entryPt.x} cy={entryY} r="4" fill="#2962ff" />
                            </g>
                        );
                    }

                    if (d.type === 'text') {
                        if (d.points.length < 1) return null;
                        const pt = mapPoint(d.points[0].time, d.points[0].price);
                        return (
                            <g key={i}>
                                <text x={pt.x} y={pt.y} fill="#d1d4dc" fontSize="14" fontWeight="bold" fontFamily="-apple-system, sans-serif">
                                    {d.text}
                                </text>
                                <circle cx={pt.x} cy={pt.y} r="2" fill="#2a2e39" />
                            </g>
                        )
                    }

                    return null;
                })}

                {activeTool === 'replay' && mousePos && (
                    <g>
                        <line 
                            x1={mapPoint(mousePos.time!, mousePos.price!).x} 
                            y1={0} 
                            x2={mapPoint(mousePos.time!, mousePos.price!).x} 
                            y2={dimensions.h || 1000} 
                            stroke="#2962ff" 
                            strokeWidth="2" 
                        />
                        <rect 
                            x={mapPoint(mousePos.time!, mousePos.price!).x} 
                            y={0} 
                            width={Math.max(0, (dimensions.w || 2000) - mapPoint(mousePos.time!, mousePos.price!).x)} 
                            height={dimensions.h || 1000} 
                            fill="rgba(41, 98, 255, 0.1)" 
                        />
                    </g>
                )}

                {mousePos && isInteractive && magnetMode !== 'off' && activeTool !== 'replay' && (
                    <circle cx={mapPoint(mousePos.time!, mousePos.price!).x} cy={mapPoint(mousePos.time!, mousePos.price!).y} r="4" fill="none" stroke="#2962ff" strokeWidth="2" />
                )}
            </svg>

            {textEntry && (
                <div
                    className="absolute z-[500] bg-[#1e222d] border border-[#2a2e39] rounded shadow-2xl p-2 flex flex-col gap-2 min-w-[200px]"
                    style={{
                        left: Math.min(textEntry.x + 10, dimensions.w - 220),
                        top: Math.min(textEntry.y + 10, dimensions.h - 80)
                    }}
                >
                    <div className="text-[10px] uppercase font-bold text-[#787b86] px-1">Text Settings</div>
                    <input
                        autoFocus
                        ref={textInputRef}
                        className="bg-[#131722] border border-[#363a45] text-[#d1d4dc] text-sm px-2 py-1.5 rounded outline-none focus:border-[#2962ff]"
                        placeholder="Enter label text..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const text = e.currentTarget.value;
                                if (text) {
                                    setDrawings([...drawings, { type: 'text', text, points: [{ time: textEntry.time, price: textEntry.price }] }]);
                                }
                                setTextEntry(null);
                                setActiveTool('crosshair');
                            } else if (e.key === 'Escape') {
                                setTextEntry(null);
                                setActiveTool('crosshair');
                            }
                        }}
                    />
                    <div className="flex justify-end gap-2 px-1">
                        <button className="text-[10px] text-[#787b86] hover:text-white" onClick={() => { setTextEntry(null); setActiveTool('crosshair'); }}>Cancel</button>
                        <button
                            className="text-[10px] text-[#2962ff] font-bold"
                            onClick={() => {
                                const val = textInputRef.current?.value;
                                if (val) {
                                    setDrawings([...drawings, { type: 'text', text: val, points: [{ time: textEntry.time, price: textEntry.price }] }]);
                                }
                                setTextEntry(null);
                                setActiveTool('crosshair');
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
