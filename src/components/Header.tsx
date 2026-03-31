import { useEffect, useMemo, useRef, useState } from 'react';
import useMarketStore, { INDICATOR_COLORS, INDICATOR_LIBRARY, TIMEFRAMES } from '../store/useMarketStore';
import { changeTimeframe } from '../services/websocket';
import { TickerSearch } from './Chart';
import { useTheme } from '../store/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
    Menu, RotateCcw,
    Search, Maximize2, Minimize2, Sun, Moon, LayoutDashboard, Bell, ChevronDown
} from 'lucide-react';

const CandlestickTypeIcon = ({ size = 21 }) => (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 1 }}>
        {/* Left filled bar */}
        <line x1="6" y1="3" x2="6" y2="15" />
        <rect x="4" y="6" width="4" height="6" fill="white" strokeWidth="0" />
        
        {/* Right hollow bar */}
        <line x1="12" y1="3" x2="12" y2="15" />
        <rect x="10" y="5" width="4" height="8" stroke="white" fill="none" />
    </svg>
);

export default function Header() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const currentPrice = useMarketStore((state) => state.lastPrice);
    const timeframe = useMarketStore((state) => state.timeframe);
    const priceChange24h = useMarketStore((state) => state.priceChange24h);
    const enabledIndicators = useMarketStore((state) => state.enabledIndicators);
    const setIndicatorEnabled = useMarketStore((state) => state.setIndicatorEnabled);
    const clearIndicators = useMarketStore((state) => state.clearIndicators);
    const activeTool = useMarketStore(state => state.activeTool);
    const setActiveTool = useMarketStore(state => state.setActiveTool);
    const isReplayMode = useMarketStore(state => state.isReplayMode);
    const stopReplay = useMarketStore(state => state.stopReplay);

    const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
    const [indicatorQuery, setIndicatorQuery] = useState('');
    const indicatorsRef = useRef<HTMLDivElement>(null);

    const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
    const timeframeRef = useRef<HTMLDivElement>(null);

    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    };

    const chartType = useMarketStore((state) => state.chartType);
    const setChartType = useMarketStore((state) => state.setChartType);
    const [isChartTypeOpen, setIsChartTypeOpen] = useState(false);
    const chartTypesRef = useRef<HTMLDivElement>(null);

    const filteredIndicators = useMemo(() => {
        const query = indicatorQuery.trim().toLowerCase();
        if (!query) return INDICATOR_LIBRARY;

        return INDICATOR_LIBRARY.filter((indicator) => (
            indicator.label.toLowerCase().includes(query)
            || indicator.description.toLowerCase().includes(query)
            || indicator.category.toLowerCase().includes(query)
        ));
    }, [indicatorQuery]);

    // Group filtered indicators by category for better visual hierarchy
    const groupedIndicators = useMemo(() => {
        const groups: Record<string, typeof INDICATOR_LIBRARY> = {};
        for (const ind of filteredIndicators) {
            if (!groups[ind.category]) groups[ind.category] = [];
            groups[ind.category].push(ind);
        }
        return groups;
    }, [filteredIndicators]);

    useEffect(() => {
        const onOutsideClick = (event: MouseEvent) => {
            if (!indicatorsRef.current?.contains(event.target as Node)) {
                setIsIndicatorsOpen(false);
            }
            if (!chartTypesRef.current?.contains(event.target as Node)) {
                setIsChartTypeOpen(false);
            }
            if (!timeframeRef.current?.contains(event.target as Node)) {
                setIsTimeframeOpen(false);
            }
        };

        const handleShortcuts = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsIndicatorsOpen(false);
                setIsChartTypeOpen(false);
            }

            // Toggle indicators menu with '/'
            if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
                // Don't trigger if user is typing in an input or textarea
                if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

                event.preventDefault();
                setIsIndicatorsOpen((prev) => !prev);
            }

            // Quick Search (Ctrl + K)
            if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                window.dispatchEvent(new CustomEvent('open-ticker-search'));
            }

            // Alert (Alt + A)
            if (event.key.toLowerCase() === 'a' && event.altKey) {
                event.preventDefault();
                window.dispatchEvent(new CustomEvent('open-alert-dialog'));
            }
        };

        document.addEventListener('mousedown', onOutsideClick);
        document.addEventListener('keydown', handleShortcuts);

        return () => {
            document.removeEventListener('mousedown', onOutsideClick);
            document.removeEventListener('keydown', handleShortcuts);
        };
    }, []);

    return (
        <header className="tv-header">
            {/* Left section */}
            <div className="tv-header-left">
                {/* Menu / Logo */}
                <button type="button" className="tv-header-btn text-white" title="Menu">
                    <Menu size={21} />
                </button>

                <div className="tv-header-separator" />

                {/* Symbol selector — full TickerSearch modal */}
                <div className="flex items-center mx-1">
                    <TickerSearch />
                </div>

                <div className="tv-header-separator mx-1" />

                {/* Timeframe selector Dropdown */}
                <div className="tv-timeframe-wrap" ref={timeframeRef} style={{ position: 'relative' }}>
                    <button
                        type="button"
                        className={`tv-header-btn icon-text ${isTimeframeOpen ? 'active' : ''}`}
                        onClick={() => setIsTimeframeOpen((prev) => !prev)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '60px' }}
                    >
                        <span style={{ fontWeight: 600, color: 'white', fontSize: '14px' }}>{TIMEFRAMES.find(t => t.seconds === timeframe)?.label || '1m'}</span>
                        <ChevronDown size={20} className={`transition-transform duration-200 ${isTimeframeOpen ? 'rotate-180 text-[#2962FF]' : 'text-white'}`} />
                    </button>

                    {isTimeframeOpen && (
                        <div className="tv-dropdown-menu" style={{
                            position: 'absolute', top: '100%', left: 0, marginTop: '8px',
                            background: theme === 'dark' ? '#1e222d' : '#ffffff',
                            border: `1px solid ${theme === 'dark' ? '#2a2e39' : '#e0e3eb'}`,
                            borderRadius: '6px', zIndex: 100, display: 'flex', flexDirection: 'column',
                            minWidth: '120px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}>
                            {TIMEFRAMES.map((tf) => (
                                <button
                                    key={tf.seconds}
                                    style={{
                                        padding: '10px 16px', textAlign: 'left',
                                        background: timeframe === tf.seconds ? (theme === 'dark' ? '#2a2e39' : '#f0f3fa') : 'transparent',
                                        color: timeframe === tf.seconds ? '#2962FF' : (theme === 'dark' ? '#d1d4dc' : '#131722'),
                                        border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: timeframe === tf.seconds ? 600 : 400
                                    }}
                                    onClick={() => { changeTimeframe(tf.seconds); setIsTimeframeOpen(false); }}
                                    onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? '#2a2e39' : '#f0f3fa'}
                                    onMouseLeave={e => e.currentTarget.style.background = timeframe === tf.seconds ? (theme === 'dark' ? '#2a2e39' : '#f0f3fa') : 'transparent'}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="tv-header-separator" />

                {/* Chart Type selector */}
                <div className="tv-chart-types-wrap" ref={chartTypesRef} style={{ position: 'relative' }}>
                    <button
                        type="button"
                        className={`tv-header-btn ${isChartTypeOpen ? 'active' : ''}`}
                        onClick={() => setIsChartTypeOpen((prev) => !prev)}
                        title="Chart Type"
                    >
                        <CandlestickTypeIcon size={20} />
                    </button>

                    {isChartTypeOpen && (
                        <div className="tv-chart-type-dropdown" style={{
                            position: 'absolute', top: '100%', left: 0, marginTop: '8px',
                            background: theme === 'dark' ? '#1e222d' : '#ffffff',
                            border: `1px solid ${theme === 'dark' ? '#2a2e39' : '#e0e3eb'}`,
                            borderRadius: '6px', zIndex: 100, display: 'flex', flexDirection: 'column',
                            minWidth: '160px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}>
                            {['Candles', 'Hollow candles', 'Line', 'Area', 'Baseline'].map((type) => (
                                <button
                                    key={type}
                                    style={{
                                        padding: '10px 16px', textAlign: 'left',
                                        background: chartType === type ? (theme === 'dark' ? '#2a2e39' : '#f0f3fa') : 'transparent',
                                        color: chartType === type ? '#2962FF' : (theme === 'dark' ? '#d1d4dc' : '#131722'),
                                        border: 'none', cursor: 'pointer', fontSize: '13px'
                                    }}
                                    onClick={() => { setChartType(type); setIsChartTypeOpen(false); }}
                                    onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? '#2a2e39' : '#f0f3fa'}
                                    onMouseLeave={e => e.currentTarget.style.background = chartType === type ? (theme === 'dark' ? '#2a2e39' : '#f0f3fa') : 'transparent'}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="tv-header-separator" />

                {/* Indicators panel */}
                <div className="tv-indicators-wrap" ref={indicatorsRef}>
                    <button
                        type="button"
                        className={`tv-header-btn icon-text ${isIndicatorsOpen ? 'active' : ''}`}
                        onClick={() => setIsIndicatorsOpen((prev) => !prev)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <div className="flex items-baseline gap-[1px] text-white">
                            <span className="text-[18px] font-serif italic font-bold">f</span>
                            <span className="text-[12px] font-bold">x</span>
                        </div>
                        <span style={{ marginLeft: '4px', color: 'white' }}>Indicators</span>
                        {enabledIndicators.length > 0 && (
                            <span className="tv-indicators-count">{enabledIndicators.length}</span>
                        )}
                    </button>

                    {isIndicatorsOpen && (
                        <div className="tv-indicators-modal">
                            <div className="tv-indicators-modal-head">
                                <div>
                                    <h3>Indicators</h3>
                                    <p>{enabledIndicators.length} active</p>
                                </div>
                                <button
                                    type="button"
                                    className="tv-indicators-clear"
                                    onClick={() => clearIndicators()}
                                    disabled={enabledIndicators.length === 0}
                                >
                                    Clear All
                                </button>
                            </div>

                            <div className="tv-indicators-search-wrap">
                                <Search size={14} />
                                <input
                                    className="tv-indicators-search"
                                    type="text"
                                    value={indicatorQuery}
                                    onChange={(event) => setIndicatorQuery(event.target.value)}
                                    placeholder="Search indicators"
                                />
                            </div>

                            <div className="tv-indicators-list styling-scrollbar">
                                {Object.entries(groupedIndicators).map(([category, indicators]) => (
                                    <div key={category}>
                                        <div className="tv-indicator-category-header">{category}</div>
                                        {indicators.map((indicator) => {
                                            const checked = enabledIndicators.includes(indicator.id);
                                            return (
                                                <label key={indicator.id} className={`tv-indicator-item ${checked ? 'active' : ''}`}>
                                                    <div className="tv-indicator-item-left">
                                                        <span
                                                            className="tv-indicator-color-dot"
                                                            style={{ background: INDICATOR_COLORS[indicator.id] }}
                                                        />
                                                        <div>
                                                            <span className="tv-indicator-item-label">{indicator.label}</span>
                                                            <span className="tv-indicator-item-desc">{indicator.description}</span>
                                                        </div>
                                                    </div>
                                                    <div className="tv-indicator-item-right">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={(event) => setIndicatorEnabled(indicator.id, event.target.checked)}
                                                        />
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>



                <button 
                    type="button" 
                    className={`tv-header-btn icon-text ${activeTool === 'replay' || isReplayMode ? 'active !text-[#2962ff]' : 'text-white'}`}
                    onClick={() => {
                        if (isReplayMode || activeTool === 'replay') {
                            stopReplay();
                            setActiveTool('crosshair');
                        } else {
                            setActiveTool('replay');
                        }
                    }}
                >
                    <RotateCcw size={21} />
                    <span className="text-white">Replay</span>
                </button>
            </div>

            {/* Right section */}
            <div className="tv-header-right">
                {/* Price info strip */}
                <div className="tv-price-strip">
                    <span className="tv-price-value text-white">${currentPrice.toFixed(2)}</span>
                    <span className={`tv-price-change ${priceChange24h >= 0 ? 'up' : 'down'}`}>
                        {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                    </span>
                </div>

                <div className="tv-header-separator" />

                <button type="button" className="tv-header-btn icon-text text-white" title="Quick Search (Ctrl+K)" onClick={() => window.dispatchEvent(new CustomEvent('open-ticker-search'))}>
                    <Search size={21} />
                    <span>Quick Search</span>
                </button>

                <button 
                    type="button" 
                    className="tv-header-btn icon-text text-white" 
                    title="Create Alert (Alt+A)"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-alert-dialog'))}
                >
                    <Bell size={21} />
                    <span>Alert</span>
                </button>

                <div className="tv-header-separator" />

                <button type="button" className="tv-header-btn text-white" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
                    {isFullscreen ? <Minimize2 size={21} /> : <Maximize2 size={21} />}
                </button>

                <div className="tv-header-separator" />

                <button
                    type="button"
                    className="tv-header-btn icon-text text-white"
                    title="Dashboard"
                    onClick={() => navigate('/user/dashboard')}
                >
                    <LayoutDashboard size={21} />
                    <span>Dashboard</span>
                </button>

                <div className="tv-header-separator" />

                <button
                    className="tv-theme-toggle text-white"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </header>
    );
}
