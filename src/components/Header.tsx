import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import useMarketStore, { INDICATOR_COLORS, INDICATOR_LIBRARY, TIMEFRAMES } from '../store/useMarketStore';
import { changeTimeframe } from '../services/websocket';
import { TickerSearch } from './Chart';
import { useTheme } from '../store/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
    Menu, RotateCcw,
    Search, Maximize2, Minimize2, Sun, Moon, LayoutDashboard, X,
    UserRound, UserPlus, Wallet, ChartNoAxesColumn, Sigma, Bookmark, Trophy, Flame, ShoppingBag, ChevronDown,
    Bell, CandlestickChart as CandlestickTypeIcon
} from 'lucide-react';

type StaticIndicator = {
    id: string;
    label: string;
    category: string;
    description: string;
    color: string;
};

const TV_HARDCODED_INDICATORS: StaticIndicator[] = [
    { id: 'wma', label: 'Weighted Moving Average', category: 'Trend', description: 'Weighted average with recent price emphasis', color: '#f97316' },
    { id: 'hma', label: 'Hull Moving Average', category: 'Trend', description: 'Low-lag moving average smoothing', color: '#c084fc' },
    { id: 'alma', label: 'Arnaud Legoux Moving Average', category: 'Trend', description: 'Gaussian-weighted adaptive moving average', color: '#22d3ee' },
    { id: 'tema', label: 'Triple Exponential Moving Average', category: 'Trend', description: 'Triple-smoothed EMA for trend detection', color: '#2dd4bf' },
    { id: 'dema', label: 'Double Exponential Moving Average', category: 'Trend', description: 'Reduced-lag EMA smoothing', color: '#f43f5e' },
    { id: 'supertrend', label: 'Supertrend', category: 'Trend', description: 'ATR-based trend following overlay', color: '#4ade80' },
    { id: 'psar', label: 'Parabolic SAR', category: 'Trend', description: 'Stop-and-reverse trend tracking points', color: '#facc15' },
    { id: 'ichimoku', label: 'Ichimoku Cloud', category: 'Trend', description: 'Cloud-based support and resistance system', color: '#60a5fa' },
    { id: 'adx', label: 'Average Directional Index (14)', category: 'Trend', description: 'Trend strength without direction bias', color: '#94a3b8' },
    { id: 'aroon', label: 'Aroon', category: 'Trend', description: 'Measures trend changes and momentum', color: '#fb7185' },

    { id: 'atr', label: 'Average True Range (14)', category: 'Volatility', description: 'Volatility measurement over 14 periods', color: '#9ca3af' },
    { id: 'kc', label: 'Keltner Channels', category: 'Volatility', description: 'EMA channel using ATR envelope', color: '#67e8f9' },
    { id: 'dc', label: 'Donchian Channels (20)', category: 'Volatility', description: 'High-low breakout channel', color: '#86efac' },
    { id: 'stddev', label: 'Standard Deviation', category: 'Volatility', description: 'Dispersion of prices around average', color: '#a78bfa' },
    { id: 'chop', label: 'Choppiness Index (14)', category: 'Volatility', description: 'Ranging versus trending market filter', color: '#fda4af' },

    { id: 'obv', label: 'On Balance Volume', category: 'Volume', description: 'Cumulative volume flow indicator', color: '#fde047' },
    { id: 'ad', label: 'Accumulation/Distribution', category: 'Volume', description: 'Price and volume accumulation pressure', color: '#fbbf24' },
    { id: 'cmf', label: 'Chaikin Money Flow (20)', category: 'Volume', description: 'Volume-weighted buying and selling pressure', color: '#f59e0b' },
    { id: 'vo', label: 'Volume Oscillator', category: 'Volume', description: 'Difference between fast and slow volume averages', color: '#eab308' },
    { id: 'pvt', label: 'Price Volume Trend', category: 'Volume', description: 'Trend line combining price move and volume', color: '#fcd34d' },

    { id: 'stoch', label: 'Stochastic (14, 3, 3)', category: 'Oscillator', description: 'Momentum oscillator for overbought and oversold', color: '#818cf8' },
    { id: 'stochrsi', label: 'Stochastic RSI (14)', category: 'Oscillator', description: 'RSI transformed into stochastic oscillator', color: '#6366f1' },
    { id: 'cci', label: 'Commodity Channel Index (20)', category: 'Oscillator', description: 'Deviation of price from statistical mean', color: '#7c3aed' },
    { id: 'mom', label: 'Momentum (10)', category: 'Oscillator', description: 'Measures price change speed', color: '#2dd4bf' },
    { id: 'wpr', label: 'Williams %R (14)', category: 'Oscillator', description: 'Momentum oscillator from 0 to -100', color: '#34d399' },
    { id: 'ao', label: 'Awesome Oscillator', category: 'Oscillator', description: 'Market momentum around median price', color: '#10b981' },
    { id: 'ppo', label: 'Percentage Price Oscillator', category: 'Oscillator', description: 'EMA momentum as percentage difference', color: '#14b8a6' },
    { id: 'roc', label: 'Rate of Change (9)', category: 'Oscillator', description: 'Percent change over selected periods', color: '#06b6d4' },
    { id: 'trix', label: 'TRIX (15)', category: 'Oscillator', description: 'Triple-smoothed momentum oscillator', color: '#0ea5e9' },
    { id: 'uo', label: 'Ultimate Oscillator', category: 'Oscillator', description: 'Multi-period momentum pressure oscillator', color: '#38bdf8' },
];

type IndicatorSidebarItem = {
    label: string;
    icon: ComponentType<{ size?: number; className?: string }>;
};

const INDICATOR_SIDEBAR_GROUPS: Array<{ section: string; items: IndicatorSidebarItem[] }> = [
    {
        section: 'Personal',
        items: [
            { label: 'My scripts', icon: UserRound },
            { label: 'Invite-only', icon: UserPlus },
            { label: 'Purchased', icon: Wallet },
        ],
    },
    {
        section: 'Built-in',
        items: [
            { label: 'Technicals', icon: ChartNoAxesColumn },
            { label: 'Fundamentals', icon: Sigma },
        ],
    },
    {
        section: 'Community',
        items: [
            { label: "Editors' picks", icon: Bookmark },
            { label: 'Top', icon: Trophy },
            { label: 'Trending', icon: Flame },
            { label: 'Store', icon: ShoppingBag },
        ],
    },
];

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
    const [activeIndicatorSection, setActiveIndicatorSection] = useState('Technicals');
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

    const groupedWorkingIndicators = useMemo(() => {
        const groups: Record<string, typeof INDICATOR_LIBRARY> = {};
        for (const ind of INDICATOR_LIBRARY) {
            if (!groups[ind.category]) groups[ind.category] = [];
            groups[ind.category].push(ind);
        }
        return groups;
    }, []);

    const groupedStaticIndicators = useMemo(() => {
        const query = indicatorQuery.trim().toLowerCase();
        const filtered = query
            ? TV_HARDCODED_INDICATORS.filter((indicator) => (
                indicator.label.toLowerCase().includes(query)
                || indicator.description.toLowerCase().includes(query)
                || indicator.category.toLowerCase().includes(query)
            ))
            : TV_HARDCODED_INDICATORS;

        const groups: Record<string, StaticIndicator[]> = {};
        for (const ind of filtered) {
            if (!groups[ind.category]) groups[ind.category] = [];
            groups[ind.category].push(ind);
        }
        return groups;
    }, [indicatorQuery]);

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
                <button type="button" className="tv-header-btn" title="Menu">
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
                        <span className="text-sm font-semibold text-text-primary">{TIMEFRAMES.find(t => t.seconds === timeframe)?.label || '1m'}</span>
                        <ChevronDown size={20} className={`transition-transform duration-200 ${isTimeframeOpen ? 'rotate-180 text-[#2962FF]' : 'text-text-primary'}`} />
                    </button>

                    {isTimeframeOpen && (
                        <div className="tv-dropdown-surface tv-timeframe-dropdown">
                            {TIMEFRAMES.map((tf) => (
                                <button
                                    key={tf.seconds}
                                    className={`tv-dropdown-option ${timeframe === tf.seconds ? 'active' : ''}`}
                                    onClick={() => { changeTimeframe(tf.seconds); setIsTimeframeOpen(false); }}
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
                        <div className="tv-dropdown-surface tv-charttype-dropdown">
                            {['Candles', 'Hollow candles', 'Line', 'Area', 'Baseline'].map((type) => (
                                <button
                                    key={type}
                                    className={`tv-dropdown-option ${chartType === type ? 'active' : ''}`}
                                    onClick={() => { setChartType(type); setIsChartTypeOpen(false); }}
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
                        onClick={() => {
                            setIsIndicatorsOpen((prev) => {
                                const next = !prev;
                                if (next) {
                                    setActiveIndicatorSection('Technicals');
                                    setIndicatorQuery('');
                                }
                                return next;
                            });
                        }}
                    >
                        <div className="flex items-baseline gap-px text-text-primary">
                            <span className="text-[18px] font-serif italic font-bold">f</span>
                            <span className="text-[12px] font-bold">x</span>
                        </div>
                        <span className="ml-1 text-text-primary">Indicators</span>
                        {enabledIndicators.length > 0 && (
                            <span className="tv-indicators-count">{enabledIndicators.length}</span>
                        )}
                    </button>

                    {isIndicatorsOpen && (
                        <div className="tv-indicators-modal">
                            <div className="tv-indicators-modal-head">
                                <div>
                                    <h3>Indicators, metrics, and strategies</h3>
                                </div>
                                <button type="button" className="tv-indicators-close" onClick={() => setIsIndicatorsOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="tv-indicators-modal-layout">
                                <aside className="tv-indicators-sidebar">
                                    {INDICATOR_SIDEBAR_GROUPS.map((group) => (
                                        <div key={group.section} className="tv-indicators-sidebar-group">
                                            <div className="tv-indicators-sidebar-title">{group.section}</div>
                                            {group.items.map((item) => {
                                                const Icon = item.icon;
                                                const isActive = activeIndicatorSection === item.label;
                                                return (
                                                <button
                                                    key={item.label}
                                                    type="button"
                                                    className={`tv-indicators-sidebar-item ${isActive ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setActiveIndicatorSection(item.label);
                                                        if (item.label !== 'Technicals') {
                                                            setIndicatorQuery('');
                                                        }
                                                    }}
                                                >
                                                    <Icon size={20} className="tv-indicators-sidebar-item-icon" />
                                                    <span>{item.label}</span>
                                                </button>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </aside>

                                <section className="tv-indicators-content">
                                    {activeIndicatorSection === 'Technicals' ? (
                                        <>
                                            <div className="tv-indicators-search-wrap">
                                                <Search size={20} />
                                                <input
                                                    className="tv-indicators-search"
                                                    type="text"
                                                    value={indicatorQuery}
                                                    onChange={(event) => setIndicatorQuery(event.target.value)}
                                                    placeholder="Search"
                                                />
                                            </div>

                                            <div className="tv-indicators-content-toolbar">
                                                <p>{enabledIndicators.length} active</p>
                                                <button
                                                    type="button"
                                                    className="tv-indicators-clear"
                                                    onClick={() => clearIndicators()}
                                                    disabled={enabledIndicators.length === 0}
                                                >
                                                    Clear All
                                                </button>
                                            </div>

                                            <div className="tv-indicators-list styling-scrollbar">
                                                {Object.entries(groupedWorkingIndicators).map(([category, indicators]) => (
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

                                                {Object.entries(groupedStaticIndicators).map(([category, indicators]) => (
                                                    <div key={`static-${category}`}>
                                                        <div className="tv-indicator-category-header">{category}</div>
                                                        {indicators.map((indicator) => (
                                                            <label key={indicator.id} className="tv-indicator-item">
                                                                <div className="tv-indicator-item-left">
                                                                    <span
                                                                        className="tv-indicator-color-dot"
                                                                        style={{ background: indicator.color }}
                                                                    />
                                                                    <div>
                                                                        <span className="tv-indicator-item-label">{indicator.label}</span>
                                                                        <span className="tv-indicator-item-desc">{indicator.description}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="tv-indicator-item-right">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={false}
                                                                        onChange={() => undefined}
                                                                    />
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="tv-indicators-empty-state">
                                            <div className="tv-indicators-empty-logo" />
                                            <h4>No personal scripts, yet</h4>
                                            <p>Start creating your own indicators and strategies with Pine Script®, or remix an existing one to make it yours.</p>
                                            <button type="button" className="tv-indicators-empty-button">Create script</button>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    )}
                </div>



                <button 
                    type="button" 
                    className={`tv-header-btn icon-text ${activeTool === 'replay' || isReplayMode ? 'active text-[#2962ff]!' : 'text-text-primary'}`}
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

                <button type="button" className="tv-header-btn icon-text" title="Quick Search (Ctrl+K)" onClick={() => window.dispatchEvent(new CustomEvent('open-ticker-search'))}>
                    <Search size={21} />
                    <span>Quick Search</span>
                </button>

                <button 
                    type="button" 
                    className="tv-header-btn icon-text" 
                    title="Create Alert (Alt+A)"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-alert-dialog'))}
                >
                    <Bell size={21} />
                    <span>Alert</span>
                </button>

                <div className="tv-header-separator" />

                <button type="button" className="tv-header-btn" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
                    {isFullscreen ? <Minimize2 size={21} /> : <Maximize2 size={21} />}
                </button>

                <div className="tv-header-separator" />

                <button
                    type="button"
                    className="tv-header-btn icon-text"
                    title="Dashboard"
                    onClick={() => navigate('/user/dashboard')}
                >
                    <LayoutDashboard size={21} />
                    <span>Dashboard</span>
                </button>

                <div className="tv-header-separator" />

                <button
                    className="tv-theme-toggle"
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
