import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, ColorType, CrosshairMode } from 'lightweight-charts';
import type { ISeriesApi, IChartApi } from 'lightweight-charts';
import useMarketStore, { INDICATOR_COLORS, INDICATOR_LIBRARY, TIMEFRAMES, type IndicatorId } from '../store/useMarketStore';
import { changeTimeframe, candleWorker } from '../services/websocket';
import { fetchTickers, type Ticker } from '../services/api';
import { useTheme } from '../store/ThemeContext';
import {
    Search, Crosshair, TrendingUp, Minus, Type, Ruler,
    ChevronDown, X, Pencil, MousePointer2, Hash,
    MoveHorizontal, ZoomIn
} from 'lucide-react';
import {
    calculateBollingerBands,
    calculateEMA,
    calculateMACD,
    calculateRSI,
    calculateSMA,
    calculateVWAP,
} from '../lib/indicators';

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
    const [tickers, setTickers] = useState<Ticker[]>([]);

    const currentSymbol = useMarketStore(s => s.currentSymbol);
    const setCurrentSymbol = useMarketStore(s => s.setCurrentSymbol);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchTickers().then(setTickers);
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery('');
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

        const timeframeSec = useMarketStore.getState().timeframe;
        candleWorker.postMessage({
            type: 'INIT',
            payload: { timeframeSec }
        });
    }, [setCurrentSymbol]);

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
    const { theme } = useTheme();
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<{
        candle: ISeriesApi<"Candlestick">;
        volume: ISeriesApi<"Histogram">;
    } | null>(null);

    const candles = useMarketStore(s => s.candles);
    const enabledIndicators = useMarketStore((s) => s.enabledIndicators);
    const setCrosshairData = useMarketStore(s => s.setCrosshairData);

    const indicatorSeriesRef = useRef<IndicatorSeriesBucket>({ line: [], histogram: [] });

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

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current) return;
        const p = DARK_CHART; // start dark; theme effect will override if needed

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

        // Init with existing candles if component mounts after websocket already received them
        const existingCandles = useMarketStore.getState().candles;
        if (existingCandles.length > 0) {
            candleSeries.setData(existingCandles as any[]);
            volumeSeries.setData(existingCandles.map(c => ({
                time: c.time as any,
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
    }, [removeAllIndicatorSeries, setCrosshairData]);

    // When candles array is cleared (timeframe/symbol change), reset chart data
    useEffect(() => {
        if (seriesRef.current && candles.length === 0) {
            seriesRef.current.candle.setData([]);
            seriesRef.current.volume.setData([]);
        }
    }, [candles.length === 0]);

    // Keep base candle + volume data in sync
    useEffect(() => {
        if (!seriesRef.current) return;

        seriesRef.current.candle.setData(
            candles.map((candle) => ({
                time: candle.time as any,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
            }))
        );
        seriesRef.current.volume.setData(
            candles.map((candle) => ({
                time: candle.time as any,
                value: candle.volume,
                color: candle.close >= candle.open
                    ? 'rgba(38,166,154,0.35)'
                    : 'rgba(239,83,80,0.35)',
            }))
        );
    }, [candles]);

    // Recalculate and redraw indicator series whenever candles or enabled indicators change
    useEffect(() => {
        if (!chartRef.current) return;

        removeAllIndicatorSeries();
        if (!candles.length || enabledIndicators.length === 0) return;

        const chart = chartRef.current;
        const closeValues = candles.map((candle) => candle.close);

        const lineDataFromValues = (values: Array<number | null>) => (
            values
                .map((value, idx) => (value == null ? null : { time: candles[idx].time as any, value }))
                .filter((point): point is { time: any; value: number } => point !== null)
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
                                time: candles[idx].time as any,
                                value,
                                color: value >= 0 ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
                            }
                    ))
                    .filter((point): point is { time: any; value: number; color: string } => point !== null)
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
                </div>
            </div>
        </div>
    );
}
