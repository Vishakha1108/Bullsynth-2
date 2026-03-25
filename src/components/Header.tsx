import { Link } from 'react-router-dom';
import useMarketStore, { TIMEFRAMES } from '../store/useMarketStore';
import { changeTimeframe } from '../services/websocket';
import { TickerSearch } from './Chart';
import {
    Menu, Plus, BarChart3, Layers, Bell, RotateCcw,
    Search, Settings, ChevronDown, Maximize2
} from 'lucide-react';

export default function Header() {
    const currentPrice = useMarketStore(state => state.lastPrice);
    const connected = useMarketStore(state => state.wsConnected);
    const timeframe = useMarketStore(state => state.timeframe);
    const priceChange24h = useMarketStore(state => state.priceChange24h);
    const high24h = useMarketStore(state => state.high24h);
    const low24h = useMarketStore(state => state.low24h);

    const currentTf = TIMEFRAMES.find(t => t.seconds === timeframe);

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
                <TickerSearch />

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
            </div>
        </header>
    );
}
