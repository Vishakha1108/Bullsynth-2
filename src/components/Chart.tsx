import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, createSeriesMarkers, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries, BaselineSeries, ColorType, CrosshairMode } from 'lightweight-charts';
import type { ISeriesApi, IChartApi, UTCTimestamp, MouseEventParams } from 'lightweight-charts';
import useMarketStore, { INDICATOR_COLORS, INDICATOR_LIBRARY, TIMEFRAMES } from '../store/useMarketStore';
import type { Candle } from '../store/useMarketStore';
import { requestHistory, isSymbolCached } from '../services/websocket';
import { useTheme } from '../store/ThemeContext';
import {
    Search, Plus, Type, Ruler,
    X, Pencil, Circle, MousePointer2, ChevronRight,
    MoveHorizontal, ZoomIn, Star, Trash2, Camera,
    Waves, Pentagon, Triangle, ArrowUpRight, Smile, Magnet, Navigation, Lock, EyeOff
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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl + K to toggle
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
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

        const handleOpenEvent = () => setIsOpen(true);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('open-ticker-search', handleOpenEvent);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('open-ticker-search', handleOpenEvent);
        };
    }, [isOpen]); // Depend on isOpen so we know whether to capture typing

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
                <div className="flex items-center gap-2">
                    <Search size={17} className="text-white" />
                    <span className="ticker-symbol text-white">{currentSymbol}</span>
                    <div className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors ml-1">
                        <Plus size={14} className="text-white" />
                    </div>
                </div>
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
    const c = rawData.close ?? 0;
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

// ─── Custom Icons ────────────────────────────────────────────────────────
const TrendLineIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="5" r="2" />
        <path d="M 6.4 17.6 L 17.6 6.4" />
    </svg>
);

// ─── Alert Modal Component ──────────────────────────────────────────────────
function AlertModal({ onClose }: { onClose: () => void }) {
    const currentSymbol = useMarketStore(s => s.currentSymbol);
    const lastPrice = useMarketStore(s => s.lastPrice);
    const addAlert = useMarketStore(s => s.addAlert);
    const alerts = useMarketStore(s => s.alerts);
    const removeAlert = useMarketStore(s => s.removeAlert);
    const [price, setPrice] = useState(lastPrice.toFixed(2));
    const [type, setType] = useState<'crossing' | 'above' | 'below'>('crossing');
    const inputRef = useRef<HTMLInputElement>(null);

    const activeAlerts = alerts.filter(a => a.active);

    const handleCreate = () => {
        const targetPrice = parseFloat(price);
        if (isNaN(targetPrice) || targetPrice <= 0) return;
        addAlert({ symbol: currentSymbol, targetPrice, type });
        window.dispatchEvent(new CustomEvent('show-toast', {
            detail: `🔔 Alert set: ${currentSymbol} ${type === 'crossing' ? 'crosses' : type === 'above' ? '≥' : '≤'} $${targetPrice.toFixed(2)}`
        }));
        onClose();
    };

    const conditions: { value: 'crossing' | 'above' | 'below'; label: string; icon: string }[] = [
        { value: 'crossing', label: 'Crossing', icon: '⇅' },
        { value: 'above', label: 'Above', icon: '↑' },
        { value: 'below', label: 'Below', icon: '↓' },
    ];

    const diff = parseFloat(price) - lastPrice;
    const diffPct = lastPrice !== 0 ? (diff / lastPrice) * 100 : 0;

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
        >
            <div
                className="w-[380px] flex flex-col rounded-lg overflow-hidden shadow-2xl"
                style={{ background: '#131722', border: '1px solid #2a2e39' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header Section */}
                <div style={{ background: '#131722', borderBottom: '1px solid #2a2e39' }}
                    className="px-5 py-4 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#2a2e39] text-[#787b86] border border-[#363a45]/30">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[#d1d4dc] font-bold text-[14px] leading-tight">Create Alert</p>
                            <p className="text-[#787b86] text-[10px] mt-0.5 uppercase tracking-wider font-semibold">{currentSymbol} · <span className="font-mono">${lastPrice.toFixed(2)}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] transition-all">
                        <X size={14} />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    {/* Condition Options */}
                    <div className="flex flex-col gap-2">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-[#787b86]">Condition</p>
                        <div className="flex gap-2">
                            {conditions.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => setType(c.value)}
                                    className="flex-1 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all duration-150 flex flex-col items-center"
                                    style={type === c.value ? {
                                        background: '#2962ff',
                                        color: '#ffffff'
                                    } : {
                                        background: '#131722',
                                        border: '1px solid #2a2e39',
                                        color: '#787b86'
                                    }}
                                >
                                    <span className="text-[14px] leading-tight mb-0.5">{c.icon}</span>
                                    <span>{c.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price Setup */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-[#787b86]">Target Price</p>
                            {!isNaN(parseFloat(price)) && (
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${diff >= 0 ? 'text-[#26a69a] bg-[#26a69a]/10' : 'text-[#ef5350] bg-[#ef5350]/10'}`}>
                                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)} ({diffPct.toFixed(2)} %)
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#787b86] font-bold text-[12px]">$</span>
                            <input
                                ref={inputRef}
                                type="number"
                                step="0.01"
                                autoFocus
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') onClose(); }}
                                className="w-full pl-7 pr-20 py-2.5 rounded bg-[#131722] border border-[#2a2e39] text-[#d1d4dc] text-[16px] font-bold outline-none focus:border-[#2962ff] transition-all font-mono"
                            />
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                                <button onClick={() => setPrice((parseFloat(price) - 0.01).toFixed(2))}
                                    className="w-7 h-7 rounded text-[#787b86] hover:text-white hover:bg-[#2a2e39] flex items-center justify-center text-md font-bold transiton-all">−</button>
                                <button onClick={() => setPrice((parseFloat(price) + 0.01).toFixed(2))}
                                    className="w-7 h-7 rounded text-[#787b86] hover:text-white hover:bg-[#2a2e39] flex items-center justify-center text-md font-bold transiton-all">+</button>
                            </div>
                        </div>
                        <button
                            onClick={() => setPrice(lastPrice.toFixed(2))}
                            className="text-[10px] uppercase tracking-wider font-bold text-[#2962ff] hover:text-[#5c8fff] self-start transition-all"
                        >
                            ← Reset
                        </button>
                    </div>

                    {/* Existing Alerts */}
                    {activeAlerts.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-[#787b86]">Active Alerts ({activeAlerts.length})</p>
                            <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto styling-scrollbar">
                                {activeAlerts.map(a => (
                                    <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded bg-[#131722] border border-[#2a2e39]">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${a.type === 'above' ? 'bg-[#26a69a]' : a.type === 'below' ? 'bg-[#ef5350]' : 'bg-[#2962ff]'}`} />
                                            <span className="text-[#787b86] text-[11px]">{a.symbol}</span>
                                            <span className="text-[#4c525e] text-[11px]">{a.type === 'crossing' ? '⇅' : a.type === 'above' ? '↑' : '↓'}</span>
                                            <span className="text-[#d1d4dc] text-[12px] font-bold font-mono">${a.targetPrice.toFixed(2)}</span>
                                        </div>
                                        <button onClick={() => removeAlert(a.id)} className="text-[#787b86] hover:text-[#ef5350] transition-colors">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CTA Button */}
                    <button
                        onClick={handleCreate}
                        className="w-full py-2.5 rounded bg-[#2962ff] hover:bg-[#5c8fff] text-white font-bold text-[12px] uppercase tracking-[0.06em] transition-all flex items-center justify-center gap-2 active:scale-[0.98] mt-1 shadow-xl shadow-[#2962ff]/10"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        Set Alert
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Chart Toolbar (Left side, TradingView drawing tools) ───────────────────
function ChartToolbar() {
    const activeTool = useMarketStore(s => s.activeTool);
    const setActiveTool = useMarketStore(s => s.setActiveTool);
    const clearDrawings = useMarketStore(s => s.clearDrawings);

    const pointerTools = [
        { id: 'crosshair', icon: Plus, label: 'Cross' },
        { id: 'dot', icon: Circle, label: 'Dot' },
        { id: 'arrow', icon: MousePointer2, label: 'Arrow' },
    ];

    const activePointer = pointerTools.find(t => t.id === activeTool) || pointerTools[0];
    const isPointerGroupActive = pointerTools.some(t => t.id === activeTool);
    const [pointerMenuOpen, setPointerMenuOpen] = useState(false);

    const tools = [
        { id: 'trendline', icon: TrendLineIcon, label: 'Trend Line (Alt+T)' },
        null, // separator
        { id: 'ray', icon: MoveHorizontal, label: 'Horizontal Ray (Alt+H)' },
        null, // separator
        { id: 'text', icon: Type, label: 'Text' },
        null, // separator
        { id: 'measure', icon: Ruler, label: 'Measure (M)' },
        { id: 'zoom', icon: ZoomIn, label: 'Zoom In (Ctrl+↑)' },
        null, // separator
        { id: 'clear', icon: Trash2, label: 'Clear All (Alt+C)', action: () => { clearDrawings(); window.dispatchEvent(new CustomEvent('reset-chart-view')); } },
        { id: 'screenshot', icon: Camera, label: 'Screenshot (Ctrl+Shift+S)', action: () => window.dispatchEvent(new CustomEvent('take-chart-screenshot')) },

        null, // separator (Start of dummy icons)
        { id: 'pitchfork', icon: Waves, label: 'Gann & Fibonacci' },
        { id: 'shapes', icon: Pentagon, label: 'Geometric Shapes' },
        { id: 'patterns', icon: Triangle, label: 'Patterns' },
        { id: 'prediction', icon: ArrowUpRight, label: 'Prediction & Measure' },
        { id: 'icons', icon: Smile, label: 'Icons & Stickers' },
        null, // separator
        { id: 'magnet', icon: Magnet, label: 'Magnet' },
        { id: 'stay', icon: Navigation, label: 'Stay in Drawing Mode' },
        { id: 'lock-all', icon: Lock, label: 'Lock All Drawings' },
        { id: 'hide-all', icon: EyeOff, label: 'Hide All Drawings' },
        { id: 'pencil', icon: Pencil, label: 'Draw' },
    ];

    return (
        <div className="chart-toolbar">
            {/* Pointer Selection Group */}
            <div className="relative flex items-center w-full justify-center">
                <div className="flex items-center w-[42px] h-[38px] bg-[#131722] border border-transparent hover:border-[#363a45] rounded cursor-pointer relative overflow-hidden group">
                    <button
                        className={`flex-1 h-full flex items-center justify-center text-white hover:text-[#d1d4dc] ${isPointerGroupActive ? '!text-[#2962ff]' : ''}`}
                        title={activePointer.label}
                        onClick={() => setActiveTool(activePointer.id)}
                    >
                        <activePointer.icon size={22} />
                    </button>
                    <button
                        className={`w-[14px] h-full flex items-center justify-center text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] border-l border-[#2a2e39] ${pointerMenuOpen ? 'bg-[#2a2e39]' : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPointerMenuOpen(!pointerMenuOpen);
                        }}
                    >
                        <ChevronRight size={12} className={`transition-transform duration-200 ${pointerMenuOpen ? 'rotate-90' : ''}`} />
                    </button>
                </div>

                {pointerMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-[190]" onClick={() => setPointerMenuOpen(false)} />
                        <div className="absolute left-[38px] top-0 ml-1 bg-[#1e222d] border border-[#2a2e39] rounded shadow-2xl z-[200] py-1 min-w-[120px] animate-in fade-in slide-in-from-left-1 duration-200">
                            <div className="text-[10px] uppercase font-bold text-[#434651] px-3 py-1 mb-1 border-b border-[#2a2e39]">Cursor</div>
                            {pointerTools.map(pt => (
                                <button
                                    key={pt.id}
                                    className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-3 hover:bg-[#2a2e39] transition-colors ${activeTool === pt.id ? 'text-[#2962ff] bg-[#2962ff]/10' : 'text-[#d1d4dc]'}`}
                                    onClick={() => {
                                        setActiveTool(pt.id);
                                        setPointerMenuOpen(false);
                                    }}
                                >
                                    <pt.icon size={16} className={activeTool === pt.id ? 'text-[#2962ff]' : 'text-[#787b86]'} />
                                    {pt.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Main Tools (Working + Dummy + Reordered Bottom) */}
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
                        <tool.icon size={22} />
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
    const [screenshotFlash, setScreenshotFlash] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [alertModalOpen, setAlertModalOpen] = useState(false);

    useEffect(() => {
        const handleToast = (e: any) => {
            setToastMessage(e.detail);
            setTimeout(() => setToastMessage(null), 3000);
        };
        const handleAlertEvent = () => {
            setAlertModalOpen(true);
        };

        window.addEventListener('show-toast' as any, handleToast);
        window.addEventListener('open-alert-dialog', handleAlertEvent);

        return () => {
            window.removeEventListener('show-toast' as any, handleToast);
            window.removeEventListener('open-alert-dialog', handleAlertEvent);
        };
    }, []);

    const [textEntry, setTextEntry] = useState<{ x: number, y: number, time: number, price: number } | null>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const currentCrosshairRef = useRef<{ time: number, price: number } | null>(null);

    const drawingSeriesRef = useRef<ISeriesApi<"Line">[]>([]);
    const drawingPriceLinesRef = useRef<{ series: any; line: any }[]>([]);

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
        drawingSeriesRef.current.forEach(s => {
            try { chartRef.current?.removeSeries(s); } catch (e) { }
        });
        drawingSeriesRef.current = [];
        drawingPriceLinesRef.current.forEach(({ series, line }) => {
            try { series.removePriceLine(line); } catch (e) { }
        });
        drawingPriceLinesRef.current = [];
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
                mode: activeTool !== 'crosshair' ? CrosshairMode.Hidden : CrosshairMode.Normal,
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
            // Alt + H or Alt + R: Horizontal Line (Ray tool)
            else if (isAlt && (key === 'h' || key === 'r')) {
                e.preventDefault();
                e.stopPropagation();
                if (currentCrosshairRef.current) {
                    const currentDrawings = useMarketStore.getState().drawings;
                    setDrawings([...currentDrawings, { type: 'ray', points: [{ time: currentCrosshairRef.current.time, price: currentCrosshairRef.current.price }] }]);
                    setActiveTool('crosshair'); // Reset actively immediately
                } else {
                    setActiveTool('ray'); // Fallback to tool selection if mouse is outside chart
                }
            }
            // Alt + C: Clear All
            else if (isAlt && key === 'c') {
                e.preventDefault();
                clearDrawings();
                window.dispatchEvent(new CustomEvent('reset-chart-view'));
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
                setDrawingStatus(null);
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

            if (activeTool === 'ray') {
                setDrawings([...drawings, { type: 'ray', points: [{ time, price }] }]);
                return;
            }

            if (activeTool === 'zoom') {
                const visibleRange = chart.timeScale().getVisibleLogicalRange();
                if (visibleRange) {
                    const centerIdx = chart.timeScale().coordinateToLogical(param.point.x);
                    if (centerIdx !== null) {
                        const span = visibleRange.to - visibleRange.from;
                        const newSpan = span * 0.4; // 60% zoom in
                        chart.timeScale().setVisibleLogicalRange({
                            from: (centerIdx - newSpan / 2) as any,
                            to: (centerIdx + newSpan / 2) as any
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

            if (activeTool === 'text') {
                setTextEntry({ x: param.point.x, y: param.point.y, time, price });
                return;
            }

            // Pencil is handled by freehand drag listeners
            if (activeTool === 'pencil') return;

            if (!drawingStatus) {
                setDrawingStatus({ type: activeTool, points: [{ time, price }] });
            } else {
                // Finish drawing for 2-point tools
                setDrawings([...drawings, { ...drawingStatus, points: [...drawingStatus.points, { time, price }] }]);
                setDrawingStatus(null);
            }
        };

        chart.subscribeClick(handleMouseDown);
        return () => chart.unsubscribeClick(handleMouseDown);
    }, [activeTool, drawingStatus, drawings, setDrawings, setActiveTool]);

    // Pencil freehand drag support
    const isDraggingPencilRef = useRef(false);
    const pencilPointsRef = useRef<{ time: number, price: number }[]>([]);

    useEffect(() => {
        const container = chartContainerRef.current;
        if (!container) return;

        const handleMouseDown = () => {
            if (useMarketStore.getState().activeTool === 'pencil') {
                isDraggingPencilRef.current = true;
                pencilPointsRef.current = [];
            }
        };

        const handleMouseUp = () => {
            if (isDraggingPencilRef.current && useMarketStore.getState().activeTool === 'pencil') {
                isDraggingPencilRef.current = false;
                if (pencilPointsRef.current.length > 0) {
                    setDrawings(d => [...d, { type: 'pencil', points: pencilPointsRef.current }]);
                    pencilPointsRef.current = [];
                }
            }
        };

        container.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            container.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [setDrawings]);

    // Live preview during drawing
    const previewSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    useEffect(() => {
        if (!chartRef.current) return;
        const chart = chartRef.current;

        // Immediately clean up preview if drawing cancels or finishes
        if (!drawingStatus) {
            if (previewSeriesRef.current) {
                chart.removeSeries(previewSeriesRef.current);
                previewSeriesRef.current = null;
            }
        }

        const handleMouseMove = (param: MouseEventParams) => {
            if (!param.point || !param.time) return;
            const price = seriesRef.current?.candle.coordinateToPrice(param.point.y);
            if (price === undefined || price === null) return;

            const currentActiveTool = useMarketStore.getState().activeTool;

            // Handle Pencil preview
            if (isDraggingPencilRef.current && currentActiveTool === 'pencil') {
                const arr = pencilPointsRef.current.filter(p => p.time !== param.time);
                arr.push({ time: param.time as number, price });
                pencilPointsRef.current = arr;

                if (!previewSeriesRef.current) {
                    previewSeriesRef.current = chart.addSeries(LineSeries, {
                        color: '#2962ff',
                        lineWidth: 2,
                        lineStyle: 0,
                        priceLineVisible: false,
                        lastValueVisible: false,
                    });
                }
                const sorted = [...arr].sort((a, b) => a.time - b.time);
                previewSeriesRef.current.setData(sorted.map(p => ({ time: p.time as UTCTimestamp, value: p.price })));
                return;
            }

            // Handle 2-point preview tools
            if (!drawingStatus || !['trendline', 'ray', 'fibonacci', 'measure'].includes(drawingStatus.type)) {
                return;
            }

            if (!previewSeriesRef.current) {
                previewSeriesRef.current = chart.addSeries(LineSeries, {
                    color: '#2962ff',
                    lineWidth: 2,
                    lineStyle: 1, // Dashed
                    priceLineVisible: false,
                    lastValueVisible: false,
                });
            }

            const p1 = drawingStatus.points[0];
            const p2 = { time: param.time as number, price };
            let sorted = [p1, p2].sort((a, b) => a.time - b.time);

            if (sorted[0].time === sorted[1].time) {
                previewSeriesRef.current.setData([
                    { time: sorted[0].time as UTCTimestamp, value: sorted[1].price }
                ]);
            } else {
                previewSeriesRef.current.setData([
                    { time: sorted[0].time as UTCTimestamp, value: sorted[0].price },
                    { time: sorted[1].time as UTCTimestamp, value: sorted[1].price }
                ]);
            }
        };

        chart.subscribeCrosshairMove(handleMouseMove);
        return () => chart.unsubscribeCrosshairMove(handleMouseMove);
    }, [drawingStatus]);

    // Initial tool state: disable chart scroll/scale if pencil is active
    useEffect(() => {
        if (!chartRef.current) return;
        const isPencil = activeTool === 'pencil';
        chartRef.current.applyOptions({
            handleScroll: !isPencil,
            handleScale: !isPencil,
        });
    }, [activeTool]);

    // Render drawings
    useEffect(() => {
        if (!chartRef.current) return;
        removeAllDrawings();
        const chart = chartRef.current;

        // Render existing drawings
        const markers: any[] = [];

        drawings.forEach((d) => {
            if (d.type === 'ray') {
                if (seriesRef.current?.candle && d.points[0]) {
                    const priceLine = seriesRef.current.candle.createPriceLine({
                        price: d.points[0].price,
                        color: '#2962ff',
                        lineWidth: 2,
                        lineStyle: 0,
                        axisLabelVisible: false,
                    });
                    drawingPriceLinesRef.current.push({ series: seriesRef.current.candle, line: priceLine });
                }
            } else if (d.type === 'trendline') {
                const line = chart.addSeries(LineSeries, {
                    color: '#2962ff',
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });

                let p1 = d.points[0];
                let p2 = d.points[1];

                if (p1 && p2) {
                    if (p1.time === p2.time) {
                        line.setData([{ time: p1.time as UTCTimestamp, value: p1.price }]);
                    } else {
                        if (p1.time > p2.time) {
                            const temp = p1; p1 = p2; p2 = temp;
                        }
                        line.setData([
                            { time: p1.time as UTCTimestamp, value: p1.price },
                            { time: p2.time as UTCTimestamp, value: p2.price }
                        ]);
                    }
                    drawingSeriesRef.current.push(line);
                }
            } else if (d.type === 'pencil') {
                const line = chart.addSeries(LineSeries, {
                    color: '#2962ff',
                    lineWidth: 2,
                    lineStyle: 0,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });
                const sortedPoints = [...d.points].sort((a, b) => a.time - b.time);
                line.setData(sortedPoints.map(p => ({ time: p.time as UTCTimestamp, value: p.price })));
                drawingSeriesRef.current.push(line);
            } else if (d.type === 'measure') {
                let p1 = d.points[0];
                let p2 = d.points[1];
                if (p1 && p2) {
                    const priceDiff = p2.price - p1.price;
                    const percentDiff = (priceDiff / p1.price) * 100;
                    const line = chart.addSeries(LineSeries, {
                        color: 'rgba(41, 153, 255, 0.7)',
                        lineWidth: 2,
                        lineStyle: 1,
                        priceLineVisible: false,
                        lastValueVisible: false,
                    });
                    const sorted = [p1, p2].sort((a, b) => a.time - b.time);
                    if (sorted[0].time === sorted[1].time) {
                        line.setData([{ time: sorted[0].time as UTCTimestamp, value: sorted[1].price }]);
                    } else {
                        line.setData([
                            { time: sorted[0].time as UTCTimestamp, value: sorted[0].price },
                            { time: sorted[1].time as UTCTimestamp, value: sorted[1].price }
                        ]);
                    }
                    drawingSeriesRef.current.push(line);
                    markers.push({
                        time: p2.time as UTCTimestamp,
                        position: priceDiff >= 0 ? 'aboveBar' : 'belowBar',
                        color: priceDiff >= 0 ? '#26a69a' : '#ef5350',
                        shape: priceDiff >= 0 ? 'arrowUp' : 'arrowDown',
                        text: `${priceDiff > 0 ? '+' : ''}${percentDiff.toFixed(2)}%`,
                    });
                }
            } else if (d.type === 'fibonacci') {
                let p1 = d.points[0];
                let p2 = d.points[1];
                if (p1 && p2) {
                    if (p1.time > p2.time) {
                        const temp = p1; p1 = p2; p2 = temp;
                    }
                    const diff = p2.price - p1.price;
                    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
                    const colors = ['#787b86', '#ef5350', '#ff9800', '#4caf50', '#089981', '#2962ff', '#787b86'];
                    levels.forEach((level, i) => {
                        const line = chart.addSeries(LineSeries, {
                            color: colors[i],
                            lineWidth: 1,
                            lineStyle: 2,
                            priceLineVisible: false,
                            lastValueVisible: false,
                        });
                        const priceLevel = p1.price + (diff * level);
                        if (p1.time === p2.time) {
                            line.setData([{ time: p1.time as UTCTimestamp, value: priceLevel }]);
                        } else {
                            line.setData([
                                { time: p1.time as UTCTimestamp, value: priceLevel },
                                { time: p2.time as UTCTimestamp, value: priceLevel }
                            ]);
                        }
                        drawingSeriesRef.current.push(line);
                    });
                }
            } else if (d.type === 'text') {
                if (d.points[0]) {
                    markers.push({
                        time: d.points[0].time as UTCTimestamp,
                        position: 'aboveBar',
                        color: theme === 'dark' ? '#fff' : '#000',
                        shape: 'arrowUp',
                        text: d.text,
                    });
                }
            }
        });

        if (seriesRef.current?.candle) {
            createSeriesMarkers(seriesRef.current.candle, markers.sort((a, b) => a.time - b.time));
        }

    }, [drawings, candles, removeAllDrawings, theme]);

    // Real-time updates
    const latestCandle = useMarketStore(s => s.latestCandle);
    useEffect(() => {
        if (!seriesRef.current || !latestCandle || !chartRef.current) return;

        // Safety: Only update if the chart is already showing data for the current symbol
        // and if it's not in the middle of being cleared/reset.
        if (lastSymbolRef.current !== currentSymbol || candles.length === 0) {
            return;
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
                    <div
                        ref={chartContainerRef}
                        className={`chart-canvas ${screenshotFlash ? 'animate-flash' : ''} ${activeTool === 'arrow' ? 'cursor-arrow' :
                                activeTool === 'dot' ? 'cursor-dot' :
                                    activeTool === 'crosshair' ? 'cursor-cross' : ''
                            }`}
                    />

                    {/* Custom Text Entry Modal Overlay */}
                    {textEntry && (
                        <div
                            className="absolute z-[500] bg-[#1e222d] border border-[#2a2e39] rounded shadow-2xl p-2 flex flex-col gap-2 min-w-[200px]"
                            style={{
                                left: Math.min(textEntry.x + 10, (chartContainerRef.current?.clientWidth || 0) - 220),
                                top: Math.min(textEntry.y + 10, (chartContainerRef.current?.clientHeight || 0) - 80)
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
                                    } else if (e.key === 'Escape') {
                                        setTextEntry(null);
                                    }
                                }}
                            />
                            <div className="flex justify-end gap-2 px-1">
                                <button className="text-[10px] text-[#787b86] hover:text-white" onClick={() => setTextEntry(null)}>Cancel</button>
                                <button
                                    className="text-[10px] text-[#2962ff] font-bold"
                                    onClick={() => {
                                        const val = textInputRef.current?.value;
                                        if (val) {
                                            setDrawings([...drawings, { type: 'text', text: val, points: [{ time: textEntry.time, price: textEntry.price }] }]);
                                        }
                                        setTextEntry(null);
                                    }}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    )}

                    {alertModalOpen && <AlertModal onClose={() => setAlertModalOpen(false)} />}

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
