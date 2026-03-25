import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode } from 'lightweight-charts';
import type { ISeriesApi, IChartApi } from 'lightweight-charts';
import useMarketStore, { TIMEFRAMES } from '../store/useMarketStore';
import { changeTimeframe, candleWorker } from '../services/websocket';
import { fetchTickers, type Ticker } from '../services/api';
import {
    Search, Crosshair, TrendingUp, Minus, Type, Ruler,
    ChevronDown, X, Pencil, MousePointer2, Hash,
    MoveHorizontal, Move, ZoomIn, Undo2, Redo2
} from 'lucide-react';

// ─── Ticker Search Component ────────────────────────────────────────────────
export function TickerSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState('All');
    const [tickers, setTickers] = useState<Ticker[]>([]);

    const currentSymbol = useMarketStore(s => s.currentSymbol);
    const setCurrentSymbol = useMarketStore(s => s.setCurrentSymbol);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch rich ticker data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchTickers().then(setTickers);
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery(''); // reset search on close
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
        setIsOpen(false);
        setQuery('');

        // Reset worker history to avoid mixing symbols
        const timeframeSec = useMarketStore.getState().timeframe;
        candleWorker.postMessage({
            type: 'INIT',
            payload: { timeframeSec }
        });
    }, [setCurrentSymbol]);

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen]);

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
                <div className="tv-modal-overlay" onClick={() => setIsOpen(false)}>
                    <div className="tv-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="tv-modal-header">
                            <div className="tv-modal-title-row">
                                <span className="tv-modal-title">Symbol Search</span>
                                <button className="tv-modal-close" onClick={() => setIsOpen(false)}>
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
                            {filtered.length === 0 && (
                                <div className="tv-modal-empty">No symbols match your criteria</div>
                            )}
                            {filtered.map(t => (
                                <button
                                    key={t.symbol}
                                    className="tv-modal-item"
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
                            ))}
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
    const data = crosshairData || latestCandle;

    if (!data) return null;

    const isUp = data.close >= data.open;
    const color = isUp ? '#26a69a' : '#ef5350';

    return (
        <div className="ohlcv-overlay">
            <span className="ohlcv-symbol">{currentSymbol}</span>
            <span className="ohlcv-timeframe">{tf?.label || '1m'}</span>
            <span className="ohlcv-label">O</span>
            <span className="ohlcv-value" style={{ color }}>{data.open.toFixed(2)}</span>
            <span className="ohlcv-label">H</span>
            <span className="ohlcv-value" style={{ color }}>{data.high.toFixed(2)}</span>
            <span className="ohlcv-label">L</span>
            <span className="ohlcv-value" style={{ color }}>{data.low.toFixed(2)}</span>
            <span className="ohlcv-label">C</span>
            <span className="ohlcv-value" style={{ color }}>{data.close.toFixed(2)}</span>
            <span className="ohlcv-label">Vol</span>
            <span className="ohlcv-value ohlcv-vol">{data.volume.toLocaleString()}</span>
        </div>
    );
}

// ─── Chart Toolbar (Left side, TradingView drawing tools) ───────────────────
function ChartToolbar() {
    const [activeTool, setActiveTool] = useState('crosshair');

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
        { id: 'measure', icon: Ruler, label: 'Measure' },
        { id: 'zoom', icon: ZoomIn, label: 'Zoom In' },
    ];

    return (
        <div className="chart-toolbar">
            {tools.map((tool, idx) => {
                if (!tool) return <div key={`sep-${idx}`} className="chart-toolbar-sep" />;
                return (
                    <button
                        key={tool.id}
                        className={`chart-toolbar-btn ${activeTool === tool.id ? 'active' : ''}`}
                        onClick={() => setActiveTool(tool.id)}
                        title={tool.label}
                    >
                        <tool.icon size={16} />
                    </button>
                );
            })}
        </div>
    );
}

// ─── Main Chart Component ───────────────────────────────────────────────────
export default function Chart() {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<{
        candle: ISeriesApi<"Candlestick">;
        volume: ISeriesApi<"Histogram">;
    } | null>(null);

    const candles = useMarketStore(s => s.candles);
    const latestCandle = useMarketStore(s => s.latestCandle);
    const timeframe = useMarketStore(s => s.timeframe);
    const setCrosshairData = useMarketStore(s => s.setCrosshairData);

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#131722' },
                textColor: '#787b86',
                fontSize: 11,
            },
            grid: {
                vertLines: { color: '#1e222d', style: 0 },
                horzLines: { color: '#1e222d', style: 0 },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    color: '#758696',
                    style: 0,
                    width: 1,
                    labelBackgroundColor: '#2a2e39',
                },
                horzLine: {
                    color: '#758696',
                    style: 0,
                    width: 1,
                    labelBackgroundColor: '#2a2e39',
                },
            },
            rightPriceScale: {
                borderColor: '#2a2e39',
                scaleMargins: { top: 0.1, bottom: 0.2 },
            },
            timeScale: {
                borderColor: '#2a2e39',
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 5,
                barSpacing: 8,
            },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
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
            const candleData = param.seriesData.get(candleSeries) as any;
            if (candleData) {
                const volData = param.seriesData.get(volumeSeries) as any;
                setCrosshairData({
                    open: candleData.open,
                    high: candleData.high,
                    low: candleData.low,
                    close: candleData.close,
                    volume: volData?.value ?? 0,
                    time: param.time as number,
                });
            }
        });

        chartRef.current = chart;
        seriesRef.current = { candle: candleSeries, volume: volumeSeries };

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
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, []);

    // When candles array is cleared (timeframe change), reset chart data
    useEffect(() => {
        if (seriesRef.current && candles.length === 0) {
            seriesRef.current.candle.setData([]);
            seriesRef.current.volume.setData([]);
        }
    }, [candles.length === 0]);

    // Update candle on latest update
    useEffect(() => {
        if (seriesRef.current && latestCandle) {
            // @ts-ignore
            seriesRef.current.candle.update(latestCandle);

            seriesRef.current.volume.update({
                time: latestCandle.time as any,
                value: latestCandle.volume,
                color: latestCandle.close >= latestCandle.open
                    ? 'rgba(38,166,154,0.35)'
                    : 'rgba(239,83,80,0.35)',
            });
        }
    }, [latestCandle]);

    return (
        <div className="chart-root">
            {/* Main chart area */}
            <div className="chart-body">
                <ChartToolbar />
                <div className="chart-canvas-wrap">
                    {/* OHLCV overlay floats on top of chart */}
                    <OHLCVOverlay />
                    <div ref={chartContainerRef} className="chart-canvas" />
                </div>
            </div>
        </div>
    );
}
