import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import useMarketStore, { INDICATOR_COLORS, INDICATOR_LIBRARY, TIMEFRAMES } from '../store/useMarketStore';
import { changeTimeframe } from '../services/websocket';
import { TickerSearch } from './Chart';
import { useTheme } from '../store/ThemeContext';
import { formatShortcutLabel } from '../lib/platform';
import { useNavigate } from 'react-router-dom';
import {
    Menu, RotateCcw,
    Search, Maximize2, Minimize2, Sun, Moon, LayoutDashboard, X, Plus,
    UserRound, UserPlus, Wallet, ChartNoAxesColumn, Sigma, Bookmark, Trophy, Flame, ShoppingBag, ChevronDown,
    Bell, CandlestickChart as CandlestickTypeIcon, Home, HelpCircle, Zap, Keyboard, Globe
} from 'lucide-react';


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
    const currentSymbol = useMarketStore((state) => state.currentSymbol);
    const currentPrice = useMarketStore((state) => state.lastPrice);
    const timeframe = useMarketStore((state) => state.timeframe);
    const priceChange24h = useMarketStore((state) => state.priceChange24h);
    const priceChanges = useMarketStore((state) => state.priceChanges);
    const enabledIndicators = useMarketStore((state) => state.enabledIndicators);
    const setIndicatorEnabled = useMarketStore((state) => state.setIndicatorEnabled);
    const clearIndicators = useMarketStore((state) => state.clearIndicators);
    const activeTool = useMarketStore(state => state.activeTool);
    const setActiveTool = useMarketStore(state => state.setActiveTool);
    const isReplayMode = useMarketStore(state => state.isReplayMode);
    const stopReplay = useMarketStore(state => state.stopReplay);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
        const query = indicatorQuery.trim().toLowerCase();
        const filtered = query
            ? INDICATOR_LIBRARY.filter((ind) => (
                ind.label.toLowerCase().includes(query)
                || ind.description.toLowerCase().includes(query)
                || ind.category.toLowerCase().includes(query)
            ))
            : INDICATOR_LIBRARY;

        const groups: Record<string, typeof INDICATOR_LIBRARY> = {};
        for (const ind of filtered) {
            if (!groups[ind.category]) groups[ind.category] = [];
            groups[ind.category].push(ind);
        }
        return groups;
    }, [indicatorQuery]);

    const livePriceChange = priceChanges[currentSymbol] ?? priceChange24h;

    useEffect(() => {
        const onOutsideClick = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
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
                <div className="relative" ref={menuRef}>
                    <button 
                        type="button" 
                        className={`tv-header-btn ${isMenuOpen ? 'active' : ''}`}
                        title="Menu"
                        onClick={() => setIsMenuOpen(v => !v)}
                    >
                        <Menu size={21} />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute top-[120%] left-0 w-64 bg-bg-elevated border border-border-subtle rounded-md shadow-lg z-50 py-2 flex flex-col text-[14px]">
                            <button className="flex items-center gap-3 px-4 py-2.5 hover:bg-border-subtle transition-colors text-left" onClick={() => { setIsMenuOpen(false); navigate('/'); }}>
                                <Home size={18} className="text-text-secondary" />
                                <span>Home</span>
                            </button>
                            <button className="flex items-center gap-3 px-4 py-2.5 hover:bg-border-subtle transition-colors text-left" onClick={() => setIsMenuOpen(false)}>
                                <HelpCircle size={18} className="text-text-secondary" />
                                <span>Help Center</span>
                            </button>
                            <button className="flex items-center gap-3 px-4 py-2.5 hover:bg-border-subtle transition-colors text-left" onClick={() => setIsMenuOpen(false)}>
                                <Zap size={18} className="text-text-secondary" />
                                <span>What's new</span>
                            </button>
                            
                            <div className="h-px bg-border-subtle my-1 w-full" />
                            
                            <button className="flex items-center justify-between px-4 py-2.5 hover:bg-border-subtle transition-colors text-left" onClick={() => toggleTheme()}>
                                <div className="flex items-center gap-3">
                                    {theme === 'dark' ? <Moon size={18} className="text-text-secondary" /> : <Sun size={18} className="text-text-secondary" />}
                                    <span>Dark color theme</span>
                                </div>
                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors relative flex items-center ${theme === 'dark' ? 'bg-[#2962ff]' : 'bg-border-strong'}`}>
                                    <div className={`w-3 h-3 rounded-full bg-white absolute transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>

                            <button className="flex items-center justify-between px-4 py-2.5 hover:bg-border-subtle transition-colors text-left" onClick={() => setIsMenuOpen(false)}>
                                <div className="flex items-center gap-3">
                                    <Globe size={18} className="text-text-secondary" />
                                    <span>Language</span>
                                </div>
                                <ChevronDown size={16} className="text-text-muted -rotate-90" />
                            </button>

                            <div className="h-px bg-border-subtle my-1 w-full" />
                            
                            <button className="flex items-center justify-between px-4 py-2.5 hover:bg-border-subtle transition-colors text-left" onClick={() => { setIsMenuOpen(false); window.dispatchEvent(new CustomEvent('open-keyboard-shortcuts')); }}>
                                <div className="flex items-center gap-3">
                                    <Keyboard size={18} className="text-text-secondary" />
                                    <span>Keyboard shortcuts</span>
                                </div>
                                <span className="text-text-muted text-xs">{formatShortcutLabel('Ctrl+/')}</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="tv-header-separator" />

                {/* Symbol selector split trigger */}
                <div className="flex items-center mx-1 gap-1">
                    <button
                        className="tv-header-btn text-text-primary hover:text-white flex items-center gap-2 bg-border-subtle rounded-md px-3 py-1"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-ticker-search', { detail: { mode: 'search' } }))}
                    >
                        <Search size={16} />
                        <span className="font-semibold">{currentSymbol}</span>
                        <span className="text-xs text-text-muted ml-1 hidden sm:inline">Search</span>
                    </button>
                    <button 
                        className="tv-header-btn text-text-secondary hover:text-white flex items-center justify-center p-1 rounded-md border border-border-subtle"
                        title="Compare Symbol"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-ticker-search', { detail: { mode: 'compare' } }))}
                    >
                        <Plus size={16} />
                    </button>
                    {/* The modal component itself */}
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
                    <span className={`tv-price-change ${livePriceChange >= 0 ? 'up' : 'down'}`}>
                        {livePriceChange >= 0 ? '+' : ''}{livePriceChange.toFixed(2)}%
                    </span>
                </div>

                <div className="tv-header-separator" />

                <button 
                    type="button" 
                    className="tv-header-btn icon-text" 
                    title={`Create Alert (${formatShortcutLabel('Alt+A')})`}
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
