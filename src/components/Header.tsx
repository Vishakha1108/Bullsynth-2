import useMarketStore, { TIMEFRAMES } from '../store/useMarketStore';
import { changeTimeframe } from '../services/websocket';
import {
    Menu, BarChart3, Bell, RotateCcw,
    Search, Settings, ChevronDown, Maximize2, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../store/ThemeContext';

export default function Header() {
    const { theme, toggleTheme } = useTheme();
    const currentPrice = useMarketStore(state => state.lastPrice);

    // Use the dynamic symbols and current symbol from the store
    const currentSymbol = useMarketStore(state => state.currentSymbol);
    const availableSymbols = useMarketStore(state => state.availableSymbols);
    const setCurrentSymbol = useMarketStore(state => state.setCurrentSymbol);

    const timeframe = useMarketStore(state => state.timeframe);
    const priceChange24h = useMarketStore(state => state.priceChange24h);

    return (
        <header className="tv-header">
            {/* Left section */}
            <div className="tv-header-left">
                {/* Menu / Logo */}
                <button className="tv-header-btn" title="Menu">
                    <Menu size={18} />
                </button>

                <div className="tv-header-separator" />

                {/* Symbol selector */}
                <div className="tv-symbol-dropdown-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <select
                        value={currentSymbol}
                        onChange={(e) => setCurrentSymbol(e.target.value)}
                        className="tv-symbol-link"
                        style={{
                            appearance: 'none',
                            background: 'transparent',
                            border: 'none',
                            color: 'inherit',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            fontWeight: 'inherit',
                            cursor: 'pointer',
                            outline: 'none',
                            paddingRight: '16px'
                        }}
                    >
                        {availableSymbols.map(sym => (
                            <option key={sym} value={sym} style={{ background: theme === 'dark' ? '#131722' : '#ffffff', color: theme === 'dark' ? '#c8cdd6' : '#131722' }}>
                                {sym}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={12} className="text-[#787b86]" style={{ position: 'absolute', right: 0, pointerEvents: 'none' }} />
                </div>

                <div className="tv-header-separator" />

                {/* Timeframe selector */}
                <div className="tv-header-timeframes">
                    {TIMEFRAMES.map(tf => (
                        <button
                            key={tf.seconds}
                            className={`tv-header-tf-btn ${timeframe === tf.seconds ? 'active' : ''}`}
                            onClick={() => changeTimeframe(tf.seconds)}
                        >
                            {tf.label}
                        </button>
                    ))}
                    <button className="tv-header-tf-btn">
                        <ChevronDown size={12} />
                    </button>
                </div>

                <div className="tv-header-separator" />

                {/* Chart type / Indicators / Alerts */}
                <button className="tv-header-btn icon-text">
                    <BarChart3 size={16} />
                    <span>Indicators</span>
                </button>

                <div className="tv-header-separator" />

                <button className="tv-header-btn icon-text">
                    <Bell size={16} />
                    <span>Alert</span>
                </button>

                <button className="tv-header-btn icon-text">
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

                <button className="tv-header-btn" title="Search">
                    <Search size={16} />
                </button>
                <button className="tv-header-btn" title="Settings">
                    <Settings size={16} />
                </button>
                <button className="tv-header-btn" title="Fullscreen">
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
