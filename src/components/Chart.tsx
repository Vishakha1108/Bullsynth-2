import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries, BaselineSeries, ColorType, CrosshairMode, PriceScaleMode } from 'lightweight-charts';
import type { ISeriesApi, IChartApi, UTCTimestamp, MouseEventParams } from 'lightweight-charts';
import useMarketStore, { INDICATOR_COLORS, INDICATOR_LIBRARY, TIMEFRAMES } from '../store/useMarketStore';
import type { Candle } from '../store/useMarketStore';
import { requestHistory, requestCompareHistory, isSymbolCached } from '../services/websocket';
import { useTheme } from '../store/ThemeContext';
import { Search, X, Star, Bell } from 'lucide-react';
import {
    calculateBollingerBands,
    calculateEMA,
    calculateMACD,
    calculateRSI,
    calculateSMA,
    executeCustomIndicatorScript,
    calculateVWAP,
    calculateWMA,
    calculateHMA,
    calculateALMA,
    calculateTEMA,
    calculateDEMA,
    calculateATR,
    calculateSupertrend,
    calculateParabolicSAR,
    calculateIchimoku,
    calculateADX,
    calculateAroon,
    calculateKeltnerChannels,
    calculateDonchianChannels,
    calculateStdDev,
    calculateChoppinessIndex,
    calculateOBV,
    calculateAD,
    calculateCMF,
    calculateVolumeOscillator,
    calculatePVT,
    calculateStochastic,
    calculateStochRSI,
    calculateCCI,
    calculateMomentum,
    calculateWilliamsR,
    calculateAwesomeOscillator,
    calculatePPO,
    calculateROC,
    calculateTRIX,
    calculateUltimateOscillator,
} from '../lib/indicators';
import ReplayControls from './ReplayControls';
import { ChartToolbar } from './ChartToolbar';
import { AlertModal } from './AlertModal';
import { DrawingOverlay } from './DrawingOverlay';

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
    const [mode, setMode] = useState<'search' | 'compare'>('search');
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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/Cmd + K always opens symbol search.
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setMode('search');
                setIsOpen(true);
                return;
            }

            // Global alphanumeric typing to search (like TradingView)
            if (
                !isOpen &&
                e.key.length === 1 &&
                /^[a-z0-9]$/i.test(e.key) &&
                !e.ctrlKey && !e.metaKey && !e.altKey &&
                document.activeElement?.tagName !== 'INPUT' &&
                document.activeElement?.tagName !== 'TEXTAREA'
            ) {
                setQuery(e.key);
                setIsOpen(true);
            }
        };

        const handleOpenEvent = (e: any) => {
            setMode(e.detail?.mode || 'search');
            setIsOpen(true);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('open-ticker-search', handleOpenEvent);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('open-ticker-search', handleOpenEvent);
        };
    }, [isOpen]); // Depend on isOpen so we know whether to capture typing

    const addCompareSymbol = useMarketStore(s => s.addCompareSymbol);
    const removeCompareSymbol = useMarketStore(s => s.removeCompareSymbol);
    const compareSymbols = useMarketStore(s => s.compareSymbols);

    const closeSearch = useCallback(() => {
        setIsOpen(false);
        setQuery('');
    }, []);

    // Derive tickers list from store and normalize categories so tabs are useful.
    const tickers = useMemo(() => {
        const baseTickers = storeTickers.length > 0
            ? storeTickers
            : storeSymbols.map(s => ({ symbol: s, name: s, category: 'Stocks' }));

        const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'DOT', 'AVAX', 'MATIC']);
        const SYNTHETIC_SYMBOLS = new Set(['US30', 'NAS100', 'SPX500', 'VIX', 'XAUUSD', 'XAGUSD', 'WTI', 'BRENT', 'SYNTH1', 'SYNTH2']);

        const inferCategory = (symbol: string, rawCategory?: string) => {
            const sym = symbol.toUpperCase();
            const cat = (rawCategory || '').toLowerCase();

            if (CRYPTO_SYMBOLS.has(sym) || cat.includes('crypto')) return 'Crypto';
            if (SYNTHETIC_SYMBOLS.has(sym) || cat.includes('synthetic')) return 'Synthetic';
            return 'Stocks';
        };

        const normalized = baseTickers.map((t) => ({
            ...t,
            category: inferCategory(t.symbol, t.category),
        }));

        // If backend data has no synthetic group, expose a couple of broad-market symbols there.
        if (!normalized.some((t) => t.category === 'Synthetic')) {
            const preferredSynthetic = ['SPY', 'QQQ', 'DIA', 'IWM', 'AAPL', 'TSLA'];
            const fallbackSymbols = normalized
                .filter((t) => t.category === 'Stocks')
                .map((t) => t.symbol.toUpperCase());

            const symbolsToPromote = preferredSynthetic.filter((s) => fallbackSymbols.includes(s)).slice(0, 2);
            const finalPromotions = symbolsToPromote.length > 0 ? symbolsToPromote : fallbackSymbols.slice(0, 2);

            if (finalPromotions.length > 0) {
                return normalized.map((t) => (
                    finalPromotions.includes(t.symbol.toUpperCase())
                        ? { ...t, category: 'Synthetic' }
                        : t
                ));
            }
        }

        return normalized;
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
        if (mode === 'compare') {
            if (compareSymbols.includes(symbol)) {
                removeCompareSymbol(symbol);
            } else {
                addCompareSymbol(symbol);
                if (!isSymbolCached(symbol)) {
                    requestHistory(symbol);
                    requestCompareHistory(symbol);
                } else {
                    requestCompareHistory(symbol);
                }
            }
        } else {
            closeSearch();
            if (symbol === currentSymbol) return;
            setCurrentSymbol(symbol);
            useMarketStore.getState().clearCandles();
            if (!isSymbolCached(symbol)) {
                requestHistory(symbol);
            }
        }
    }, [mode, currentSymbol, compareSymbols, addCompareSymbol, setCurrentSymbol, closeSearch]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeSearch();
        };
        if (isOpen) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, closeSearch]);

    return (
        <>
            {isOpen && (
                <div className="tv-modal-overlay" onClick={() => closeSearch()}>
                    <div className="tv-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="tv-modal-header">
                            <div className="tv-modal-title-row">
                                <span className="tv-modal-title">{mode === 'compare' ? 'Compare Symbol' : 'Symbol Search'}</span>
                                <button className="tv-modal-close" onClick={() => closeSearch()}>
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="tv-modal-search">
                                <Search size={16} className="ticker-search-icon" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search stocks, crypto, or synthetic..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                                {query && (
                                    <button className="tv-modal-clear-btn" onClick={() => setQuery('')}>
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
                                                        {mode === 'compare' && compareSymbols.includes(t.symbol) ? (
                                                            <span className="tv-modal-item-check text-red-500 text-xs ml-2">Remove</span>
                                                        ) : t.symbol === currentSymbol ? (
                                                            <span className="tv-modal-item-check">✓</span>
                                                        ) : null}
                                                    </div>
                                                    <div className="tv-modal-item-name">{t.name}</div>
                                                </div>
                                                <div className="tv-modal-item-right">
                                                    <span className="tv-modal-item-category">{t.category}</span>
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
        </>
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
    // rawData can be Candle or { value: number }
    const c = rawData.close ?? (rawData as { value?: number }).value ?? 0;
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

function CompareOverlay() {
    const compareSymbols = useMarketStore((s) => s.compareSymbols);
    const compareCandles = useMarketStore((s) => s.compareCandles);
    const removeCompareSymbol = useMarketStore((s) => s.removeCompareSymbol);

    if (!compareSymbols.length) return null;
    const compareColors = ['#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#3b82f6'];

    return (
        <div className="absolute top-[32px] left-[8px] z-10 flex flex-col gap-1 pointer-events-none text-[12px] font-semibold">
            {compareSymbols.map((sym, idx) => {
                const candles = compareCandles[sym];
                const lastPrice = candles?.length ? candles[candles.length - 1].close.toFixed(2) : 'Loading...';
                return (
                    <div key={sym} className="flex items-center gap-2 group pointer-events-auto" style={{ color: compareColors[idx % compareColors.length] }}>
                        <span>{sym}</span>
                        <span className="opacity-80 font-mono">{lastPrice}</span>
                        <button 
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-primary ml-1"
                            onClick={(e) => { e.stopPropagation(); removeCompareSymbol(sym); }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

function IndicatorsOverlay() {
    const enabledIndicators = useMarketStore((s) => s.enabledIndicators);
    const customIndicatorScripts = useMarketStore((s) => s.customIndicatorScripts);
    const enabledCustomScripts = customIndicatorScripts.filter((script) => script.enabled);
    if (!enabledIndicators.length && !enabledCustomScripts.length) return null;

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
            {enabledCustomScripts.map((script) => (
                <span key={script.id} className="chart-indicator-tag" style={{ borderColor: '#2962ff' }}>
                    {script.name}
                </span>
            ))}
        </div>
    );
}

// ─── Custom Icons ────────────────────────────────────────────────────────


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
    const customIndicatorScripts = useMarketStore((s) => s.customIndicatorScripts);
    const chartType = useMarketStore(s => s.chartType);
    const currentSymbol = useMarketStore(s => s.currentSymbol);
    const setCrosshairData = useMarketStore(s => s.setCrosshairData);
    const activeTool = useMarketStore(s => s.activeTool);
    const setActiveTool = useMarketStore(s => s.setActiveTool);
    const drawings = useMarketStore(s => s.drawings);
    const setDrawings = useMarketStore(s => s.setDrawings);
    const clearDrawings = useMarketStore(s => s.clearDrawings);

    // Refs to avoid stale closures and unnecessary effect resubscriptions
    const drawingsRef = useRef(drawings);
    drawingsRef.current = drawings;
    const [screenshotFlash, setScreenshotFlash] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [alertModalOpen, setAlertModalOpen] = useState(false);
    const [activeTrigger, setActiveTrigger] = useState<any | null>(null);
    const [drawingsHidden, setDrawingsHidden] = useState(false);

    useEffect(() => {
        const handleToast = (e: CustomEvent) => {
            setToastMessage((e as CustomEvent).detail);
            setTimeout(() => setToastMessage(null), 3000);
        };
        const handleAlertEvent = () => {
            setAlertModalOpen(true);
        };
        const handleTrigger = (e: any) => {
            setActiveTrigger(e.detail);
        };

        window.addEventListener('show-toast', handleToast as EventListener);
        window.addEventListener('open-alert-dialog', handleAlertEvent);
        window.addEventListener('alert-triggered', handleTrigger);

        return () => {
            window.removeEventListener('show-toast', handleToast as EventListener);
            window.removeEventListener('open-alert-dialog', handleAlertEvent);
            window.removeEventListener('alert-triggered', handleTrigger);
        };
    }, []);

    const currentCrosshairRef = useRef<{ time: number, price: number } | null>(null);

    const indicatorSeriesRef = useRef<IndicatorSeriesBucket>({ line: [], histogram: [] });
    const customIndicatorErrorRef = useRef<Record<string, string>>({});
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

    // Apply chart colours based on theme
    useEffect(() => {
        if (!chartRef.current) return;
        const p = theme === 'dark' ? DARK_CHART : LIGHT_CHART;
        const showAxisCrosshair = ['crosshair', 'dot', 'arrow'].includes(activeTool);
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
                mode: showAxisCrosshair ? CrosshairMode.Normal : CrosshairMode.Hidden,
                vertLine: {
                    color: p.crosshair,
                    labelBackgroundColor: p.crosshairLabel,
                    style: 3, // LargeDashed
                },
                horzLine: {
                    color: p.crosshair,
                    labelBackgroundColor: p.crosshairLabel,
                    style: 3, // LargeDashed
                },
            },
            rightPriceScale: { borderColor: p.border },
            timeScale: { borderColor: p.border },
        });
    }, [theme, activeTool]);

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
                    style: 3, // LargeDashed
                    width: 1,
                    labelBackgroundColor: p.crosshairLabel,
                },
                horzLine: {
                    color: p.crosshair,
                    style: 3, // LargeDashed
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
                });
                break;
            case 'Area':
                mainSeries = chart.addSeries(AreaSeries, {
                    topColor: 'rgba(41, 98, 255, 0.3)',
                    bottomColor: 'rgba(41, 98, 255, 0)',
                    lineColor: '#2962FF',
                    lineWidth: 2,
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
                    priceLineColor: '#7c3aed', // Purple
                    priceLineStyle: 3, // LargeDashed
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
            if (!param || !param.time || !param.seriesData || !param.point) {
                setCrosshairData(null);
                currentCrosshairRef.current = null;
                return;
            }

            const price = mainSeries.coordinateToPrice(param.point.y);
            if (price !== null) {
                currentCrosshairRef.current = { time: param.time as number, price };
            } else {
                currentCrosshairRef.current = null;
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
            compareSeriesMapRef.current = {};
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

    // Render compare symbols
    const compareSymbols = useMarketStore(s => s.compareSymbols);
    const compareCandles = useMarketStore(s => s.compareCandles);
    const compareSeriesMapRef = useRef<Record<string, ISeriesApi<"Line">>>({});

    useEffect(() => {
        if (!chartRef.current) return;
        const chart = chartRef.current;

        // Remove detached series
        Object.keys(compareSeriesMapRef.current).forEach(sym => {
            if (!compareSymbols.includes(sym)) {
                try {
                    chart.removeSeries(compareSeriesMapRef.current[sym]);
                } catch { /* ignore */ }
                delete compareSeriesMapRef.current[sym];
            }
        });

        // Switch main scale to percentage mode when comparing, normal otherwise
        if (compareSymbols.length > 0) {
            chart.priceScale('right').applyOptions({ mode: PriceScaleMode.Percentage });
        } else {
            chart.priceScale('right').applyOptions({ mode: PriceScaleMode.Normal });
        }

        const compareColors = ['#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#3b82f6'];

        // Add or update series
        compareSymbols.forEach((sym, idx) => {
            let series = compareSeriesMapRef.current[sym];
            if (!series) {
                series = chart.addSeries(LineSeries, {
                    color: compareColors[idx % compareColors.length],
                    lineWidth: 2,
                    priceScaleId: 'right',
                    title: sym,
                });
                compareSeriesMapRef.current[sym] = series;
            }

            const compareCandlesData = compareCandles[sym];
            if (compareCandlesData && compareCandlesData.length > 0) {
                const lineData = compareCandlesData.map(c => ({ time: c.time as UTCTimestamp, value: c.close }));
                // Eliminate duplicates by time
                const deduped: { time: UTCTimestamp, value: number }[] = [];
                for (const point of lineData) {
                    if (deduped.length === 0 || deduped[deduped.length - 1].time !== point.time) {
                        deduped.push(point);
                    } else {
                        deduped[deduped.length - 1] = point; // Replace if duplicate
                    }
                }
                series.setData(deduped);
            }
        });

    }, [compareSymbols, compareCandles, theme, candles, chartType]);

    // Shortcuts and Custom Events implementation
    useEffect(() => {
        const performScreenshot = async () => {
            if (chartRef.current) {
                const canvas = chartRef.current.takeScreenshot();

                // 1. Visual feedback (Flash)
                setScreenshotFlash(true);
                setTimeout(() => setScreenshotFlash(false), 300);

                // 2. Copy to Clipboard (like PrtSc)
                try {
                    canvas.toBlob(async (blob) => {
                        if (blob) {
                            const item = new ClipboardItem({ "image/png": blob });
                            await navigator.clipboard.write([item]);
                            setToastMessage("chart image copied to clipoard");
                            setTimeout(() => setToastMessage(null), 3000);
                        }
                    });
                } catch (err) {
                    console.warn("Clipboard copy failed:", err);
                }
            }
        };

        const handleScreenshotEvent = () => performScreenshot();
        window.addEventListener('take-chart-screenshot', handleScreenshotEvent);

        const handleResetChart = () => {
            if (chartRef.current) {
                chartRef.current.timeScale().resetTimeScale();
                chartRef.current.timeScale().scrollToRealTime();
            }
        };
        window.addEventListener('reset-chart-view', handleResetChart);

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts if user is typing in an editable control
            const activeEl = document.activeElement as HTMLElement | null;
            if (
                activeEl?.tagName === 'INPUT'
                || activeEl?.tagName === 'TEXTAREA'
                || activeEl?.tagName === 'SELECT'
                || activeEl?.isContentEditable
            ) {
                return;
            }

            const isAlt = e.altKey;
            const isCtrl = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();

            // Let the shortcuts modal own keyboard input while it is open.
            if (document.querySelector('[data-keyboard-shortcuts-modal="true"]')) {
                if (key !== 'escape') return;
            }

            const cycleWatchlistSymbol = (direction: 1 | -1) => {
                const state = useMarketStore.getState();
                const symbols = (state.watchlist.length > 0 ? state.watchlist : state.symbols).filter(Boolean);
                if (symbols.length < 2) return;

                const idx = symbols.indexOf(state.currentSymbol);
                const baseIndex = idx === -1 ? 0 : idx;
                const nextIndex = (baseIndex + direction + symbols.length) % symbols.length;
                const nextSymbol = symbols[nextIndex];

                if (!nextSymbol || nextSymbol === state.currentSymbol) return;

                state.setCurrentSymbol(nextSymbol);
                state.clearCandles();
                if (!isSymbolCached(nextSymbol)) {
                    requestHistory(nextSymbol);
                }
                window.dispatchEvent(new CustomEvent('show-toast', { detail: `Switched to ${nextSymbol}` }));
            };

            // Alt + T: Trendline
            if (isAlt && key === 't') {
                e.preventDefault();
                setActiveTool('trendline');
            }
            // Alt + H or Alt + R: Horizontal Line (Ray tool)
            else if (isAlt && (key === 'h' || key === 'r')) {
                e.preventDefault();
                e.stopPropagation();
                if (currentCrosshairRef.current) {
                    const currentDrawings = useMarketStore.getState().drawings;
                    setDrawings([...currentDrawings, { type: 'horizontal_line', points: [{ time: currentCrosshairRef.current.time, price: currentCrosshairRef.current.price }] }]);
                    setActiveTool('crosshair'); // Reset actively immediately
                } else {
                    setActiveTool('horizontal_line'); // Fallback to tool selection if mouse is outside chart
                }
            }
            // Alt + V: Vertical Line
            else if (isAlt && key === 'v') {
                e.preventDefault();
                e.stopPropagation();
                if (currentCrosshairRef.current) {
                    const currentDrawings = useMarketStore.getState().drawings;
                    setDrawings([...currentDrawings, { type: 'vertical_line', points: [{ time: currentCrosshairRef.current.time, price: currentCrosshairRef.current.price }] }]);
                    setActiveTool('crosshair');
                } else {
                    setActiveTool('vertical_line');
                }
            }
            // Alt + L: Add Alert
            else if (isAlt && key === 'l') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('open-alert-dialog'));
            }
            // Alt + C: Clear All
            else if (isAlt && key === 'c') {
                e.preventDefault();
                clearDrawings();
                window.dispatchEvent(new CustomEvent('reset-chart-view'));
            }
            // Ctrl + H: Hide/Show drawings
            else if (isCtrl && key === 'h') {
                e.preventDefault();
                e.stopPropagation();
                setDrawingsHidden((prev) => {
                    const next = !prev;
                    window.dispatchEvent(new CustomEvent('show-toast', { detail: next ? 'Drawings hidden' : 'Drawings shown' }));
                    return next;
                });
            }
            // Space / Shift+Space: Watchlist navigation
            else if ((e.code === 'Space' || e.key === ' ') && !isAlt && !isCtrl && !e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                if (e.shiftKey) {
                    cycleWatchlistSymbol(-1);
                } else {
                    cycleWatchlistSymbol(1);
                }
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
            // Ctrl + ArrowUp: Zoom In
            else if (isCtrl && key === 'arrowup') {
                e.preventDefault();
                e.stopPropagation();
                setActiveTool('zoom');

                if (chartRef.current) {
                    const visibleRange = chartRef.current.timeScale().getVisibleLogicalRange();
                    if (visibleRange) {
                        const span = visibleRange.to - visibleRange.from;
                        const centerIdx = visibleRange.from + span / 2;
                        const newSpan = span * 0.5; // Zoom in by 50%
                        chartRef.current.timeScale().setVisibleLogicalRange({
                            from: centerIdx - newSpan / 2,
                            to: centerIdx + newSpan / 2,
                        });
                    }
                }
            }
            // Escape: Reset to crosshair
            else if (key === 'escape') {
                setActiveTool('crosshair');
            }
            // Shift + Ctrl + S: Screenshot
            else if (e.shiftKey && isCtrl && key === 's') {
                e.preventDefault();
                e.stopPropagation();
                performScreenshot();
            }
        };

        // Use capture phase to intercept keys BEFORE they reach the chart container (which might stop propagation)
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            window.removeEventListener('take-chart-screenshot', handleScreenshotEvent);
            window.removeEventListener('reset-chart-view', handleResetChart);
        };
    }, [setActiveTool, clearDrawings, setDrawings]);

    // Drawing Logic - Mouse Handlers
    useEffect(() => {
        // Pointer tools should not enter drawing workflow.
        if (!chartRef.current || activeTool === 'crosshair' || activeTool === 'dot' || activeTool === 'arrow' || activeTool === 'pointer') return;

        const chart = chartRef.current;
        const container = chartContainerRef.current;
        if (!container) return;

        const handleMouseDown = (param: MouseEventParams) => {
            if (!param.time || !param.point) return;
            const time = param.time as number;



            if (activeTool === 'zoom') {
                const visibleRange = chart.timeScale().getVisibleLogicalRange();
                if (visibleRange) {
                    const centerIdx = chart.timeScale().coordinateToLogical(param.point.x);
                    if (centerIdx !== null) {
                        const span = visibleRange.to - visibleRange.from;
                        const newSpan = span * 0.4; // 60% zoom in
                        chart.timeScale().setVisibleLogicalRange({
                            from: centerIdx - newSpan / 2,
                            to: centerIdx + newSpan / 2
                        });
                    }
                }
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

        };

        chart.subscribeClick(handleMouseDown);
        return () => chart.unsubscribeClick(handleMouseDown);
    }, [activeTool]);


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
        if (!candles.length || (enabledIndicators.length === 0 && !customIndicatorScripts.some((script) => script.enabled))) return;

        const chart = chartRef.current;
        const closeValues = candles.map((candle) => candle.close);

        const lineDataFromValues = (values: Array<number | null>) => (
            values
                .map((value, idx) => {
                    const candle = candles[idx];
                    if (value == null || !candle) return null;
                    return { time: candle.time as UTCTimestamp, value };
                })
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

        customIndicatorScripts
            .filter((script) => script.enabled)
            .forEach((script) => {
                try {
                    const result = executeCustomIndicatorScript(script.source, candles);

                    result.plots.forEach((plot) => {
                        if (plot.style === 'histogram') {
                            const series = chart.addSeries(HistogramSeries, {
                                priceLineVisible: false,
                                lastValueVisible: true,
                            });

                            series.setData(
                                lineDataFromValues(plot.values).map((point) => ({
                                    ...point,
                                    color: plot.color || '#2962ff',
                                }))
                            );
                            addHistogramIndicator(series);
                            return;
                        }

                        const series = chart.addSeries(LineSeries, {
                            color: plot.color || '#2962ff',
                            lineWidth: plot.lineWidth || 2,
                            priceLineVisible: false,
                            lastValueVisible: true,
                        });

                        series.setData(lineDataFromValues(plot.values));
                        addLineIndicator(series);
                    });

                    delete customIndicatorErrorRef.current[script.id];
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Unknown script error';
                    if (customIndicatorErrorRef.current[script.id] !== message) {
                        customIndicatorErrorRef.current[script.id] = message;
                        window.dispatchEvent(new CustomEvent('show-toast', {
                            detail: `Script \"${script.name}\" failed: ${message}`,
                        }));
                    }
                }
            });
    }, [addHistogramIndicator, addLineIndicator, candles, customIndicatorScripts, enabledIndicators, removeAllIndicatorSeries]);

    return (
        <div className="chart-root">
            {/* Main chart area */}
            <div className="chart-body">
                <ChartToolbar />
                <div className="chart-canvas-wrap">
                    {/* OHLCV overlay floats on top of chart */}
                    <OHLCVOverlay />
                    <CompareOverlay />
                    <IndicatorsOverlay />
                    <DrawingOverlay chartRef={chartRef} seriesRef={seriesRef} hideDrawings={drawingsHidden} />
                    <div
                        ref={chartContainerRef}
                        className={`chart-canvas ${screenshotFlash ? 'animate-flash' : ''} ${activeTool === 'arrow' ? 'cursor-arrow' :
                                activeTool === 'dot' ? 'cursor-dot' :
                                    activeTool === 'crosshair' ? 'cursor-cross' : ''
                            }`}
                    />

                    {alertModalOpen && <AlertModal onClose={() => setAlertModalOpen(false)} />}

                    {activeTrigger && (
                        <div className="absolute inset-0 bg-black/60 z-[300] flex items-center justify-center">
                            <div className="bg-bg-elevated p-8 rounded-xl border-2 border-bull text-center shadow-2xl shadow-bull/20 text-text-primary min-w-[350px]">
                                <div className="text-bull mb-4 flex justify-center">
                                    <Bell size={48} className="animate-bounce" />
                                </div>
                                <h2 className="text-3xl font-bold mb-3">Alert Triggered!</h2>
                                <p className="text-xl mb-6">
                                    <span className="font-bold text-white">{activeTrigger.symbol}</span> has {activeTrigger.type === 'crossing' ? 'crossed' : activeTrigger.type} <span className="font-bold text-white">${activeTrigger.targetPrice.toFixed(2)}</span>!
                                </p>
                                <button className="tv-alert-cta text-lg w-full" onClick={() => setActiveTrigger(null)}>
                                    Acknowledge
                                </button>
                            </div>
                        </div>
                    )}

                    {toastMessage && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#2962ff] text-white text-sm font-medium rounded-lg shadow-lg z-[200]">
                            {toastMessage}
                        </div>
                    )}
                    <ReplayControls />
                </div>
            </div>
        </div>
    );
}
