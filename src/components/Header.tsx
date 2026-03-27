import { useEffect, useMemo, useRef, useState } from 'react';
import useMarketStore, { INDICATOR_COLORS, INDICATOR_LIBRARY, TIMEFRAMES } from '../store/useMarketStore';
import { changeTimeframe } from '../services/websocket';
import { TickerSearch } from './Chart';
import { useTheme } from '../store/ThemeContext';
import {
    Menu, BarChart3, BarChart2, Bell, RotateCcw,
    Search, Settings, ChevronDown, Maximize2, Sun, Moon
} from 'lucide-react';

export default function Header() {
    const { theme, toggleTheme } = useTheme();
    const currentPrice = useMarketStore((state) => state.lastPrice);
    const timeframe = useMarketStore((state) => state.timeframe);
    const priceChange24h = useMarketStore((state) => state.priceChange24h);
    const enabledIndicators = useMarketStore((state) => state.enabledIndicators);
    const setIndicatorEnabled = useMarketStore((state) => state.setIndicatorEnabled);
    const clearIndicators = useMarketStore((state) => state.clearIndicators);

    const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
    const [indicatorQuery, setIndicatorQuery] = useState('');
    const indicatorsRef = useRef<HTMLDivElement>(null);

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
        };

        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsIndicatorsOpen(false);
                setIsChartTypeOpen(false);
            }
        };

        document.addEventListener('mousedown', onOutsideClick);
        document.addEventListener('keydown', onEscape);

        return () => {
            document.removeEventListener('mousedown', onOutsideClick);
            document.removeEventListener('keydown', onEscape);
        };
    }, []);

    return (
        <header className="tv-header">
            {/* Left section */}
            <div className="tv-header-left">
                {/* Menu / Logo */}
                <button type="button" className="tv-header-btn" title="Menu">
                    <Menu size={18} />
                </button>

                <div className="tv-header-separator" />

                {/* Symbol selector — full TickerSearch modal */}
                <div className="flex items-center mx-1">
                    <TickerSearch />
                </div>

                <div className="tv-header-separator mx-1" />

                {/* Timeframe selector */}
                <div className="flex items-center gap-1 px-1">
                    {TIMEFRAMES.map(tf => (
                        <button
                            type="button"
                            key={tf.seconds}
                            className={`tv-header-tf-btn ${timeframe === tf.seconds ? 'active' : ''}`}
                            onClick={() => changeTimeframe(tf.seconds)}
                        >
                            {tf.label}
                        </button>
                    ))}
                    <button type="button" className="tv-header-tf-btn p-1">
                        <ChevronDown size={14} />
                    </button>
                </div>

                <div className="tv-header-separator" />

                {/* Chart Type selector */}
                <div className="tv-chart-types-wrap" ref={chartTypesRef} style={{ position: 'relative' }}>
                    <button
                        type="button"
                        className={`tv-header-btn icon-text ${isChartTypeOpen ? 'active' : ''}`}
                        onClick={() => setIsChartTypeOpen((prev) => !prev)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <BarChart2 size={16} />
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
                    >
                        <BarChart3 size={16} />
                        <span>Indicators</span>
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

                <div className="tv-header-separator" />

                <button type="button" className="tv-header-btn icon-text">
                    <Bell size={16} />
                    <span>Alert</span>
                </button>

                <button type="button" className="tv-header-btn icon-text">
                    <RotateCcw size={16} />
                    <span>Replay</span>
                </button>
            </div>

            {/* Right section */}
            <div className="tv-header-right">
                {/* Price info strip */}
                <div className="tv-price-strip">
                    <span className="tv-price-value">${currentPrice.toFixed(2)}</span>
                    <span className={`tv-price-change ${priceChange24h >= 0 ? 'up' : 'down'}`}>
                        {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                    </span>
                </div>

                <div className="tv-header-separator" />

                <button type="button" className="tv-header-btn" title="Search">
                    <Search size={16} />
                </button>
                <button type="button" className="tv-header-btn" title="Settings">
                    <Settings size={16} />
                </button>
                <button type="button" className="tv-header-btn" title="Fullscreen">
                    <Maximize2 size={16} />
                </button>

                <div className="tv-header-separator" />

                <button
                    className="tv-theme-toggle"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                </button>
            </div>
        </header>
    );
}
