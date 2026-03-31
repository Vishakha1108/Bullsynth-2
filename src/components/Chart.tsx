import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, createSeriesMarkers, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries, BaselineSeries, ColorType, CrosshairMode } from 'lightweight-charts';
import type { ISeriesApi, IChartApi, UTCTimestamp, MouseEventParams } from 'lightweight-charts';
import useMarketStore, { INDICATOR_COLORS, INDICATOR_LIBRARY, TIMEFRAMES } from '../store/useMarketStore';
import type { Candle } from '../store/useMarketStore';
import { requestHistory, isSymbolCached } from '../services/websocket';
import { useTheme } from '../store/ThemeContext';
import {
    Search, Crosshair, TrendingUp, Minus, Type, Ruler,
    ChevronDown, X, Pencil, MousePointer2, Hash,
    MoveHorizontal, ZoomIn, Star, Trash2, Camera
} from 'lucide-react';
import {
    calculateBollingerBands,
    calculateEMA,
    calculateMACD,
    calculateRSI,
    calculateSMA,
    calculateVWAP,
} from '../lib/indicators';
import ReplayControls from './ReplayControls';

type IndicatorSeriesBucket = {
    line: ISeriesApi<'Line'>[];
    histogram: ISeriesApi<'Histogram'>[];
};

// ─── Chart colour palettes ──────────────────────────────────────────────────
const DARK_CHART = {
    bg: '#131722',
    text: '#787b86',
    gridLine: '#1e222d',
    crosshair: '#758696',
    crosshairLabel: '#2a2e39',
    border: '#2a2e39',
};

const LIGHT_CHART = {
    bg: '#f8f9fc',
    text: '#5d606b',
    gridLine: '#e0e3eb',
    crosshair: '#9598a1',
    crosshairLabel: '#d1d4dc',
    border: '#d1d4dc',
};

// ─── Ticker Search Component ────────────────────────────────────────────────
export function TickerSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState('All');

    const currentSymbol = useMarketStore(s => s.currentSymbol);
    const setCurrentSymbol = useMarketStore(s => s.setCurrentSymbol);
    const watchlist = useMarketStore(s => s.watchlist);
    const addToWatchlist = useMarketStore(s => s.addToWatchlist);
    const removeFromWatchlist = useMarketStore(s => s.removeFromWatchlist);
    const storeTickers = useMarketStore(s => s.tickers);
    const storeSymbols = useMarketStore(s => s.symbols);
    const inputRef = useRef<HTMLInputElement>(null);

    const closeSearch = useCallback(() => {
        setIsOpen(false);
        setQuery('');
    }, []);

    // Derive tickers list from store - use tickers if available, fall back to symbols
    const tickers = useMemo(() => {
        if (storeTickers.length > 0) return storeTickers;
        return storeSymbols.map(s => ({ symbol: s, name: s, category: 'Stocks' }));
    }, [storeTickers, storeSymbols]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const filtered = useMemo(() => {
        return tickers.filter(t => {
            const matchesQuery = t.symbol.toLowerCase().includes(query.toLowerCase()) ||
                t.name.toLowerCase().includes(query.toLowerCase());
            const matchesTab = tab === 'All' || t.category === tab;
            return matchesQuery && matchesTab;
        });
    }, [query, tab, tickers]);

    const handleSelect = useCallback((symbol: string) => {
        setCurrentSymbol(symbol);
        closeSearch();

        // Immediately clear stale chart data before zustand subscription triggers worker INIT
        useMarketStore.getState().clearCandles();

        if (!isSymbolCached(symbol)) {
            requestHistory(symbol);
        }
    }, [setCurrentSymbol, closeSearch]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeSearch();
        };
        if (isOpen) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, closeSearch]);

    return (
        <div className="ticker-search-container">
            <button
                className="ticker-search-trigger"
                onClick={() => setIsOpen(true)}
            >
                <span className="ticker-symbol">{currentSymbol}</span>
                <ChevronDown size={14} className="ticker-chevron" />
            </button>

            {isOpen && (
                <div className="tv-modal-overlay" onClick={() => closeSearch()}>
                    <div className="tv-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="tv-modal-header">
                            <div className="tv-modal-title-row">
                                <span className="tv-modal-title">Symbol Search</span>
                                <button className="tv-modal-close" onClick={() => closeSearch()}>
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="tv-modal-search">
                                <Search size={16} className="ticker-search-icon" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search symbol or name..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                                {query && (
                                    <button className="ticker-clear-btn" onClick={() => setQuery('')}>
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="tv-modal-tabs">
                            {['All', 'Stocks', 'Crypto', 'Synthetic'].map(t => (
                                <button
                                    key={t}
                                    className={`tv-modal-tab ${tab === t ? 'active' : ''}`}
                                    onClick={() => setTab(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        <div className="tv-modal-list styling-scrollbar">
                            {filtered.length === 0 ? (
                                <div className="tv-modal-empty">No symbols match your criteria</div>
                            ) : (
                                filtered.map(t => {
                                    const isWatched = watchlist.includes(t.symbol);
                                    return (
                                        <div key={t.symbol} className="tv-modal-item-wrapper flex items-center group">
                                            <button
                                                className="tv-modal-item flex-1"
                                                onClick={() => handleSelect(t.symbol)}
                                            >
                                                <div className="tv-modal-item-left">
                                                    <div className="tv-modal-item-symbol">
                                                        {t.symbol}
                                                        {t.symbol === currentSymbol && (
                                                            <span className="tv-modal-item-check">✓</span>
                                                        )}
                                                    </div>
                                                    <div className="tv-modal-item-name">{t.name}</div>
                                                </div>
                                                <div className="tv-modal-item-right">
                                                    <span className="tv-modal-item-category">{t.category}</span>
                                                    <span className="tv-modal-item-exchange">SIMULATOR</span>
                                                </div>
                                            </button>
                                            <button
                                                className={`p-2 mr-2 rounded hover:bg-border-subtle transition-colors ${isWatched ? 'text-yellow-500' : 'text-text-secondary opacity-0 group-hover:opacity-100'}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isWatched) {
                                                        removeFromWatchlist(t.symbol);
                                                    } else {
                                                        addToWatchlist(t.symbol);
                                                    }
                                                }}
                                                title={isWatched ? "Remove from Watchlist" : "Add to Watchlist"}
                                            >
                                                <Star size={16} fill={isWatched ? "currentColor" : "none"} />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── OHLCV Info Overlay ─────────────────────────────────────────────────────
function OHLCVOverlay() {
    const crosshairData = useMarketStore(s => s.crosshairData);
    const currentSymbol = useMarketStore(s => s.currentSymbol);
    const timeframe = useMarketStore(s => s.timeframe);
    const latestCandle = useMarketStore(s => s.latestCandle);

    const tf = TIMEFRAMES.find(t => t.seconds === timeframe);
    const rawData = crosshairData || latestCandle;

    if (!rawData) return null;

    const o = rawData.open ?? rawData.close ?? 0;
    const h = rawData.high ?? rawData.close ?? 0;
    const l = rawData.low ?? rawData.close ?? 0;
    const c = rawData.close ?? (rawData as any).value ?? 0;
    const v = rawData.volume ?? 0;

    const isUp = c >= o;
    const color = isUp ? '#26a69a' : '#ef5350';

    return (
        <div className="ohlcv-overlay">
            <span className="ohlcv-symbol">{currentSymbol}</span>
            <span className="ohlcv-timeframe">{tf?.label || '1m'}</span>
            <span className="ohlcv-label">O</span>
            <span className="ohlcv-value" style={{ color }}>{o.toFixed(2)}</span>
            <span className="ohlcv-label">H</span>
            <span className="ohlcv-value" style={{ color }}>{h.toFixed(2)}</span>
            <span className="ohlcv-label">L</span>
            <span className="ohlcv-value" style={{ color }}>{l.toFixed(2)}</span>
            <span className="ohlcv-label">C</span>
            <span className="ohlcv-value" style={{ color }}>{c.toFixed(2)}</span>
            <span className="ohlcv-label">Vol</span>
            <span className="ohlcv-value ohlcv-vol">{v.toLocaleString()}</span>
        </div>
    );
}

function IndicatorsOverlay() {
    const enabledIndicators = useMarketStore((s) => s.enabledIndicators);
    if (!enabledIndicators.length) return null;

    const labels = INDICATOR_LIBRARY.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.label;
        return acc;
    }, {});

    return (
        <div className="chart-indicators-overlay">
            {enabledIndicators.map((id) => (
                <span key={id} className="chart-indicator-tag" style={{ borderColor: INDICATOR_COLORS[id] }}>
                    {labels[id] || id.toUpperCase()}
                </span>
            ))}
        </div>
    );
}

// ─── Chart Toolbar (Left side, TradingView drawing tools) ───────────────────
function ChartToolbar() {
    const activeTool = useMarketStore(s => s.activeTool);
    const setActiveTool = useMarketStore(s => s.setActiveTool);
    const clearDrawings = useMarketStore(s => s.clearDrawings);

    const tools = [
        { id: 'crosshair', icon: Crosshair, label: 'Crosshair' },
        { id: 'pointer', icon: MousePointer2, label: 'Pointer' },
        null, // separator
        { id: 'trendline', icon: TrendingUp, label: 'Trend Line' },
        { id: 'horzline', icon: Minus, label: 'Horizontal Line' },
        { id: 'ray', icon: MoveHorizontal, label: 'Ray' },
        null, // separator
        { id: 'text', icon: Type, label: 'Text' },
        { id: 'pencil', icon: Pencil, label: 'Draw' },
        null, // separator
        { id: 'fibonacci', icon: Hash, label: 'Fibonacci' },
        { id: 'measure', icon: Ruler, label: 'Measure (M)' },
        { id: 'zoom', icon: ZoomIn, label: 'Zoom In' },
        null, // separator
        { id: 'clear', icon: Trash2, label: 'Clear All (Alt+C)', action: clearDrawings },
        { id: 'screenshot', icon: Camera, label: 'Screenshot (Alt+S)' },
    ];

    return (
        <div className="chart-toolbar">
            {tools.map((tool, idx) => {
                if (!tool) return <div key={`sep-${idx}`} className="chart-toolbar-sep" />;
                return (
                    <button
                        key={tool.id}
                        className={`chart-toolbar-btn ${activeTool === tool.id ? 'active' : ''}`}
                        onClick={() => {
                            if (tool.action) tool.action();
                            else setActiveTool(tool.id);
                        }}
                        title={tool.label}
                    >
                        <tool.icon size={16} />
                    </button>
                );
            })}
        </div>
    );
}

class ChartErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
    render() {
        if (this.state.hasError) {
            return <div className="text-red-500 p-10 font-mono text-xs whitespace-pre-wrap flex flex-col h-full bg-slate-900 border overflow-auto">
                <h1 className="text-xl mb-4 font-bold text-white">Chart Crash</h1>
                {this.state.error?.toString()}
                {'\n'}
                {this.state.error?.stack}
            </div>;
        }
        return this.props.children;
    }
}

export default function ChartContainer() {
    return <ChartErrorBoundary><Chart /></ChartErrorBoundary>;
}

// ─── Main Chart Component ───────────────────────────────────────────────────
function Chart() {
    const { theme } = useTheme();
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<{
        candle: ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area"> | ISeriesApi<"Baseline">;
        volume: ISeriesApi<"Histogram">;
    } | null>(null);

    const candles = useMarketStore(s => s.candles);
    const historySequence = useMarketStore(s => s.historySequence);
    const enabledIndicators = useMarketStore((s) => s.enabledIndicators);
    const chartType = useMarketStore(s => s.chartType);
    const currentSymbol = useMarketStore(s => s.currentSymbol);
    const setCrosshairData = useMarketStore(s => s.setCrosshairData);
    const activeTool = useMarketStore(s => s.activeTool);
    const setActiveTool = useMarketStore(s => s.setActiveTool);
    const drawings = useMarketStore(s => s.drawings);
    const setDrawings = useMarketStore(s => s.setDrawings);
    const clearDrawings = useMarketStore(s => s.clearDrawings);

    const [drawingStatus, setDrawingStatus] = useState<{
        points: { time: number; price: number }[];
        type: string;
    } | null>(null);

    const drawingSeriesRef = useRef<ISeriesApi<"Line">[]>([]);

    const indicatorSeriesRef = useRef<IndicatorSeriesBucket>({ line: [], histogram: [] });
    const lastSymbolRef = useRef<string>('');

    const removeAllIndicatorSeries = useCallback(() => {
        if (!chartRef.current) return;
        indicatorSeriesRef.current.line.forEach((series) => chartRef.current?.removeSeries(series));
        indicatorSeriesRef.current.histogram.forEach((series) => chartRef.current?.removeSeries(series));
        indicatorSeriesRef.current = { line: [], histogram: [] };
    }, []);

    const addLineIndicator = useCallback((series: ISeriesApi<'Line'>) => {
        indicatorSeriesRef.current.line.push(series);
    }, []);

    const addHistogramIndicator = useCallback((series: ISeriesApi<'Histogram'>) => {
        indicatorSeriesRef.current.histogram.push(series);
    }, []);

    const removeAllDrawings = useCallback(() => {
        if (!chartRef.current) return;
        drawingSeriesRef.current.forEach(s => chartRef.current?.removeSeries(s));
        drawingSeriesRef.current = [];
    }, []);

    // Apply chart colours based on theme
    useEffect(() => {
        if (!chartRef.current) return;
        const p = theme === 'dark' ? DARK_CHART : LIGHT_CHART;
        chartRef.current.applyOptions({
            layout: {
                background: { type: ColorType.Solid, color: p.bg },
                textColor: p.text,
            },
            grid: {
                vertLines: { color: p.gridLine },
                horzLines: { color: p.gridLine },
            },
            crosshair: {
                vertLine: { color: p.crosshair, labelBackgroundColor: p.crosshairLabel },
                horzLine: { color: p.crosshair, labelBackgroundColor: p.crosshairLabel },
            },
            rightPriceScale: { borderColor: p.border },
            timeScale: { borderColor: p.border },
        });
    }, [theme]);

    const formatCandleData = useCallback((c: Candle) => {
        if (chartType.toLowerCase().includes('line') || chartType === 'Area' || chartType === 'Baseline') {
            return { time: c.time as UTCTimestamp, value: c.close };
        }
        return {
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        };
    }, [chartType]);

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current) return;
        const p = theme === 'dark' ? DARK_CHART : LIGHT_CHART;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: p.bg },
                textColor: p.text,
                fontSize: 11,
            },
            grid: {
                vertLines: { color: p.gridLine, style: 0 },
                horzLines: { color: p.gridLine, style: 0 },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    color: p.crosshair,
                    style: 0,
                    width: 1,
                    labelBackgroundColor: p.crosshairLabel,
                },
                horzLine: {
                    color: p.crosshair,
                    style: 0,
                    width: 1,
                    labelBackgroundColor: p.crosshairLabel,
                },
            },
            rightPriceScale: {
                borderColor: p.border,
                scaleMargins: { top: 0.08, bottom: 0.32 },
            },
            timeScale: {
                borderColor: p.border,
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 5,
                barSpacing: 8,
            },
        });

        let mainSeries: ISeriesApi<"Candlestick" | "Line" | "Area" | "Baseline" | "Histogram">;

        switch (chartType) {
            case 'Line':
                mainSeries = chart.addSeries(LineSeries, {
                    color: '#2962FF',
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });
                break;
            case 'Area':
                mainSeries = chart.addSeries(AreaSeries, {
                    topColor: 'rgba(41, 98, 255, 0.3)',
                    bottomColor: 'rgba(41, 98, 255, 0)',
                    lineColor: '#2962FF',
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });
                break;
            case 'Baseline':
                mainSeries = chart.addSeries(BaselineSeries, {
                    baseValue: { type: 'price', price: 0 },
                    topFillColor1: 'rgba(38, 166, 154, 0.28)',
                    topFillColor2: 'rgba(38, 166, 154, 0.05)',
                    topLineColor: 'rgba(38, 166, 154, 1)',
                    bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
                    bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
                    bottomLineColor: 'rgba(239, 83, 80, 1)',
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });
                break;
            case 'Hollow candles':
                mainSeries = chart.addSeries(CandlestickSeries, {
                    upColor: 'transparent',
                    downColor: 'transparent',
                    borderVisible: true,
                    borderUpColor: '#26a69a',
                    borderDownColor: '#ef5350',
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350',
                });
                break;
            case 'Candles':
            default:
                mainSeries = chart.addSeries(CandlestickSeries, {
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderUpColor: '#26a69a',
                    borderDownColor: '#ef5350',
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350',
                    priceLineColor: '#f59e0b',
                    priceLineStyle: 2,
                    priceLineWidth: 1,
                });
                break;
        }

        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
        });

        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        // Subscribe to crosshair move for OHLCV overlay
        chart.subscribeCrosshairMove((param) => {
            if (!param || !param.time || !param.seriesData) {
                setCrosshairData(null);
                return;
            }
            const candleData = param.seriesData.get(mainSeries) as { open?: number; high?: number; low?: number; close?: number; value?: number } | undefined;
            if (candleData) {
                const volData = param.seriesData.get(volumeSeries) as { value?: number } | undefined;
                setCrosshairData({
                    open: candleData.open ?? candleData.value ?? 0,
                    high: candleData.high ?? candleData.value ?? 0,
                    low: candleData.low ?? candleData.value ?? 0,
                    close: candleData.close ?? candleData.value ?? 0,
                    volume: volData?.value ?? 0,
                    time: param.time as number,
                });
            }
        });

        chartRef.current = chart;
        seriesRef.current = { candle: mainSeries as ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area"> | ISeriesApi<"Baseline">, volume: volumeSeries };

        // Init with existing candles if component mounts after websocket already received them
        const existingCandles = useMarketStore.getState().candles;
        if (existingCandles.length > 0 && Array.isArray(existingCandles)) {
            mainSeries.setData(existingCandles.map(formatCandleData) as Parameters<typeof mainSeries.setData>[0]);
            volumeSeries.setData(existingCandles.map(c => ({
                time: c.time as UTCTimestamp,
                value: c.volume,
                color: c.close >= c.open ? 'rgba(38,166,154,0.35)' : 'rgba(239,83,80,0.35)'
            })));
        }

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            removeAllIndicatorSeries();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, [removeAllIndicatorSeries, setCrosshairData, theme, chartType, formatCandleData]);

    // Batch data sync — triggers only on history load/clear (historySequence), not individual candle updates
    useEffect(() => {
        if (!seriesRef.current) return;
        const currentCandles = useMarketStore.getState().candles;

        if (currentCandles.length === 0) {
            seriesRef.current.candle.setData([]);
            seriesRef.current.volume.setData([]);
            return;
        }

        seriesRef.current.candle.setData(currentCandles.map(formatCandleData));
        seriesRef.current.volume.setData(currentCandles.map(c => ({
            time: c.time as UTCTimestamp,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
        })));

        // Scroll to latest candle — prevents "replay from start" on initial load
        chartRef.current?.timeScale().scrollToRealTime();
        lastSymbolRef.current = currentSymbol;
    }, [historySequence, formatCandleData, currentSymbol]);

    // Shortcuts implementation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts if user is typing in an input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            const isAlt = e.altKey;
            const isCtrl = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();

            // Alt + T: Trendline
            if (isAlt && key === 't') {
                e.preventDefault();
                setActiveTool('trendline');
            }
            // Alt + H: Horizontal Line
            else if (isAlt && key === 'h') {
                e.preventDefault();
                setActiveTool('horzline');
            }
            // Alt + R: Ray
            else if (isAlt && key === 'r') {
                e.preventDefault();
                setActiveTool('ray');
            }
            // Alt + C: Clear All
            else if (isAlt && key === 'c') {
                e.preventDefault();
                clearDrawings();
            }
            // T: Text
            else if (key === 't' && !isAlt && !isCtrl) {
                e.preventDefault();
                setActiveTool('text');
            }
            // M: Measure
            else if (key === 'm' && !isAlt && !isCtrl) {
                e.preventDefault();
                setActiveTool('measure');
            }
            // Escape: Reset to crosshair
            else if (key === 'escape') {
                setActiveTool('crosshair');
                setDrawingStatus(null);
            }
            // Alt + S: Screenshot
            else if (isAlt && key === 's') {
                e.preventDefault();
                if (chartRef.current) {
                    const canvas = chartRef.current.takeScreenshot();
                    const link = document.createElement('a');
                    link.download = `chart-${new Date().getTime()}.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setActiveTool, clearDrawings]);

    // Drawing Logic - Mouse Handlers
    useEffect(() => {
        if (!chartRef.current || activeTool === 'crosshair' || activeTool === 'pointer') return;

        const chart = chartRef.current;
        const container = chartContainerRef.current;
        if (!container) return;

        const handleMouseDown = (param: MouseEventParams) => {
            if (!param.time || !param.point) return;
            const price = seriesRef.current?.candle.coordinateToPrice(param.point.y);
            if (price === null || price === undefined) return;

            const time = param.time as number;

            if (activeTool === 'horzline') {
                setDrawings([...drawings, { type: 'horzline', points: [{ time, price }] }]);
                setActiveTool('crosshair'); // Reset after one click
                return;
            }

            if (activeTool === 'replay') {
                const state = useMarketStore.getState();
                const startIndex = state.candles.findIndex(c => c.time >= time);
                if (startIndex > -1) {
                    state.startReplay(startIndex, [...state.candles]);
                } else {
                    state.startReplay(0, [...state.candles]);
                }
                return;
            }

            if (activeTool === 'text') {
                const text = prompt("Enter text label:");
                if (text) {
                    setDrawings([...drawings, { type: 'text', text, points: [{ time, price }] }]);
                }
                setActiveTool('crosshair');
                return;
            }

            if (!drawingStatus) {
                setDrawingStatus({ type: activeTool, points: [{ time, price }] });
            } else {
                // Finish drawing
                setDrawings([...drawings, { ...drawingStatus, points: [...drawingStatus.points, { time, price }] }]);
                setDrawingStatus(null);
                if (activeTool !== 'measure') setActiveTool('crosshair');
            }
        };

        chart.subscribeClick(handleMouseDown);
        return () => chart.unsubscribeClick(handleMouseDown);
    }, [activeTool, drawingStatus, drawings, setDrawings, setActiveTool]);

    // Render drawings
    useEffect(() => {
        if (!chartRef.current) return;
        removeAllDrawings();

        const chart = chartRef.current;

        // Render existing drawings
        drawings.forEach((d) => {
            if (d.type === 'horzline') {
                const line = chart.addSeries(LineSeries, {
                    color: '#2962ff',
                    lineWidth: 2,
                    lineStyle: 0,
                    lastValueVisible: false,
                    priceLineVisible: false,
                });
                if (candles.length > 0 && d.points[0]) {
                    line.setData([
                        { time: candles[0].time as UTCTimestamp, value: d.points[0].price },
                        { time: candles[candles.length - 1].time as UTCTimestamp, value: d.points[0].price },
                    ]);
                }
                drawingSeriesRef.current.push(line);
            } else if (d.type === 'trendline' || d.type === 'ray') {
                const line = chart.addSeries(LineSeries, {
                    color: '#2962ff',
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });
                // Simple 2-point line
                const sortedPoints = [...d.points].sort((a, b) => a.time - b.time);
                line.setData(sortedPoints.map(p => ({ time: p.time as UTCTimestamp, value: p.price })));
                drawingSeriesRef.current.push(line);
            } else if (d.type === 'text') {
                // Use markers for text labels (v5 API: createSeriesMarkers)
                const candleSeries = seriesRef.current?.candle;
                if (candleSeries && d.points[0]) {
                    createSeriesMarkers(candleSeries, [
                        {
                            time: d.points[0].time as UTCTimestamp,
                            position: 'aboveBar',
                            color: theme === 'dark' ? '#fff' : '#000',
                            shape: 'arrowUp',
                            text: d.text,
                        }
                    ]);
                }
            }
        });

    }, [drawings, candles, removeAllDrawings, theme]);

    // Real-time updates
    const latestCandle = useMarketStore(s => s.latestCandle);
    useEffect(() => {
        if (!seriesRef.current || !latestCandle || !chartRef.current) return;

        if (candles.length === 0) {
            return;
        }

        // Bootstrap the visible series from current store candles if initial data
        // arrived through live candle messages before a history-sequence sync.
        if (lastSymbolRef.current !== currentSymbol) {
            seriesRef.current.candle.setData(candles.map(formatCandleData));
            seriesRef.current.volume.setData(candles.map(c => ({
                time: c.time as UTCTimestamp,
                value: c.volume,
                color: c.close >= c.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
            })));
            lastSymbolRef.current = currentSymbol;
            chartRef.current.timeScale().scrollToRealTime();
        }

        try {
            const formatted = formatCandleData(latestCandle);
            seriesRef.current.candle.update(formatted);
            seriesRef.current.volume.update({
                time: latestCandle.time as UTCTimestamp,
                value: latestCandle.volume,
                color: latestCandle.close >= latestCandle.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
            });
        } catch (e) {
            console.warn('Silent chart update failure:', e);
        }
    }, [latestCandle, formatCandleData, currentSymbol, candles.length]);

    // Recalculate and redraw indicator series whenever candles or enabled indicators change
    useEffect(() => {
        if (!chartRef.current) return;

        removeAllIndicatorSeries();
        if (!candles.length || enabledIndicators.length === 0) return;

        const chart = chartRef.current;
        const closeValues = candles.map((candle) => candle.close);

        const lineDataFromValues = (values: Array<number | null>) => (
            values
                .map((value, idx) => (value == null ? null : { time: candles[idx].time as UTCTimestamp, value }))
                .filter((point): point is { time: UTCTimestamp; value: number } => point !== null)
        );

        if (enabledIndicators.includes('sma20')) {
            const series = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.sma20, lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
            series.setData(lineDataFromValues(calculateSMA(closeValues, 20)));
            addLineIndicator(series);
        }

        if (enabledIndicators.includes('sma50')) {
            const series = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.sma50, lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
            series.setData(lineDataFromValues(calculateSMA(closeValues, 50)));
            addLineIndicator(series);
        }

        if (enabledIndicators.includes('sma100')) {
            const series = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.sma100, lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
            series.setData(lineDataFromValues(calculateSMA(closeValues, 100)));
            addLineIndicator(series);
        }

        if (enabledIndicators.includes('ema20')) {
            const series = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.ema20, lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
            series.setData(lineDataFromValues(calculateEMA(closeValues, 20)));
            addLineIndicator(series);
        }

        if (enabledIndicators.includes('ema50')) {
            const series = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.ema50, lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
            series.setData(lineDataFromValues(calculateEMA(closeValues, 50)));
            addLineIndicator(series);
        }

        if (enabledIndicators.includes('ema100')) {
            const series = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.ema100, lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
            series.setData(lineDataFromValues(calculateEMA(closeValues, 100)));
            addLineIndicator(series);
        }

        if (enabledIndicators.includes('vwap')) {
            const series = chart.addSeries(LineSeries, {
                color: INDICATOR_COLORS.vwap,
                lineWidth: 1,
                lineStyle: 2,
                priceLineVisible: false,
                lastValueVisible: true,
            });
            series.setData(lineDataFromValues(calculateVWAP(candles)));
            addLineIndicator(series);
        }

        if (enabledIndicators.includes('bb20')) {
            const bands = calculateBollingerBands(closeValues, 20, 2);
            const middle = chart.addSeries(LineSeries, { color: '#94a3b8', lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false });
            const upper = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.bb20, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
            const lower = chart.addSeries(LineSeries, { color: INDICATOR_COLORS.bb20, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });

            middle.setData(lineDataFromValues(bands.middle));
            upper.setData(lineDataFromValues(bands.upper));
            lower.setData(lineDataFromValues(bands.lower));

            addLineIndicator(middle);
            addLineIndicator(upper);
            addLineIndicator(lower);
        }

        if (enabledIndicators.includes('rsi14')) {
            const series = chart.addSeries(LineSeries, {
                color: INDICATOR_COLORS.rsi14,
                lineWidth: 1,
                priceScaleId: 'rsi',
                priceLineVisible: false,
                lastValueVisible: true,
            });
            chart.priceScale('rsi').applyOptions({
                borderColor: '#2a2e39',
                scaleMargins: { top: 0.78, bottom: 0.1 },
            });
            series.setData(lineDataFromValues(calculateRSI(closeValues, 14)));
            addLineIndicator(series);
        }

        if (enabledIndicators.includes('macd')) {
            const macdValues = calculateMACD(closeValues, 12, 26, 9);
            const macdLine = chart.addSeries(LineSeries, {
                color: INDICATOR_COLORS.macd,
                lineWidth: 1,
                priceScaleId: 'macd',
                priceLineVisible: false,
                lastValueVisible: false,
            });
            const signalLine = chart.addSeries(LineSeries, {
                color: '#fb7185',
                lineWidth: 1,
                priceScaleId: 'macd',
                priceLineVisible: false,
                lastValueVisible: false,
            });
            const histogram = chart.addSeries(HistogramSeries, {
                priceScaleId: 'macd',
                priceLineVisible: false,
                lastValueVisible: false,
            });

            chart.priceScale('macd').applyOptions({
                borderColor: '#2a2e39',
                scaleMargins: { top: 0.84, bottom: 0.02 },
            });

            macdLine.setData(lineDataFromValues(macdValues.macd));
            signalLine.setData(lineDataFromValues(macdValues.signal));
            histogram.setData(
                macdValues.histogram
                    .map((value, idx) => (
                        value == null
                            ? null
                            : {
                                time: candles[idx].time as UTCTimestamp,
                                value,
                                color: value >= 0 ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
                            }
                    ))
                    .filter((point): point is { time: UTCTimestamp; value: number; color: string } => point !== null)
            );

            addLineIndicator(macdLine);
            addLineIndicator(signalLine);
            addHistogramIndicator(histogram);
        }
    }, [addHistogramIndicator, addLineIndicator, candles, enabledIndicators, removeAllIndicatorSeries]);

    return (
        <div className="chart-root">
            {/* Main chart area */}
            <div className="chart-body">
                <ChartToolbar />
                <div className="chart-canvas-wrap">
                    {/* OHLCV overlay floats on top of chart */}
                    <OHLCVOverlay />
                    <IndicatorsOverlay />
                    <div ref={chartContainerRef} className="chart-canvas" />
                    <ReplayControls />
                </div>
            </div>
        </div>
    );
}
