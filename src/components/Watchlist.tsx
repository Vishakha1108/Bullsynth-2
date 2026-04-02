import { useMemo } from 'react';
import { TrendingDown, Plus, ExternalLink, Info, X } from 'lucide-react';
import useMarketStore from '../store/useMarketStore';
import { candleWorker, requestHistory, isSymbolCached } from '../services/websocket';
import { useTheme } from '../store/ThemeContext';

export default function Watchlist({ onClose }: { onClose?: () => void }) {
    const { theme } = useTheme();
    const watchlist = useMarketStore(s => s.watchlist);
    const currentSymbol = useMarketStore(s => s.currentSymbol);
    const setCurrentSymbol = useMarketStore(s => s.setCurrentSymbol);
    const lastPrice = useMarketStore(s => s.lastPrice);
    const priceChange24h = useMarketStore(s => s.priceChange24h);
    const prices = useMarketStore(s => s.prices);
    const priceChanges = useMarketStore(s => s.priceChanges);

    const handleSelect = (symbol: string) => {
        if (symbol === currentSymbol) return;
        setCurrentSymbol(symbol);
        const _st = useMarketStore.getState();
        _st.clearCandles(_st.layoutId !== 'l1' ? _st.activePaneId : undefined);
        const timeframeSec = _st.timeframe;
        candleWorker.postMessage({ type: 'INIT', payload: { timeframeSec, symbol } });
        if (!isSymbolCached(symbol)) {
            requestHistory(symbol);
        }
    };

    // Derived mock stats for the detailed view
    const selectedSymbolStats = useMemo(() => {
        const seed = currentSymbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return {
            name: currentSymbol === 'AAPL' ? 'Apple Inc' : currentSymbol === 'BTC' ? 'Bitcoin' : currentSymbol === 'ETH' ? 'Ethereum' : `${currentSymbol} Corp`,
            exchange: currentSymbol === 'AAPL' ? 'NASDAQ' : 'BINANCE',
            sector: currentSymbol === 'AAPL' ? 'Electronic Technology' : 'Crypto',
            industry: currentSymbol === 'AAPL' ? 'Telecommunications Equipment' : 'Blockchain',
            volume: (seed * 123456 % 100).toFixed(2) + 'M',
            avgVolume: (seed * 654321 % 100).toFixed(2) + 'M',
            marketCap: (seed * 987654 % 5).toFixed(2) + 'T',
            nextEarnings: 'In ' + (seed % 30 + 1) + ' days'
        };
    }, [currentSymbol]);

    return (
        <div className="tv-side-accent tv-side-accent-watchlist flex flex-col h-full bg-bg-terminal text-text-primary font-sans">
            {/* Watchlist Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-linear-to-r from-bg-elevated via-bg-elevated/85 to-bg-terminal">
                <div className="flex items-center gap-2 cursor-pointer hover:bg-border-subtle px-1.5 py-0.5 rounded transition-colors">
                    <span className="text-xs font-bold text-text-primary">Watchlist</span>
                    <TrendingDown size={12} className="text-text-primary" />
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center cursor-pointer hover:text-text-primary"
                        title="Add symbol"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-ticker-search'))}
                    >
                        <Plus size={16} />
                    </button>
                    {onClose && <X size={18} className="cursor-pointer hover:text-text-primary ml-1" onClick={onClose} />}
                </div>
            </div>

            {/* Watchlist Table Header */}
            <div className="flex px-3 py-1 text-[10px] text-text-secondary font-bold uppercase tracking-tight border-b border-border-subtle bg-linear-to-r from-[#6366f10b] via-transparent to-[#2563eb06]">
                <span className="flex-1">Symbol</span>
                <span className="w-16 text-right">Last</span>
                <span className="w-12 text-right">Chg</span>
                <span className="w-14 text-right">Chg%</span>
            </div>

            {/* Watchlist List */}
            <div className="flex-1 overflow-y-auto styling-scrollbar">
                {watchlist.map(symbol => {
                    const isActive = symbol === currentSymbol;
                    // Mock variation for others
                    const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const mockChgPct = (seed % 4 - 2).toFixed(2);

                    const price = prices[symbol] || (isActive ? (lastPrice || 150 + (seed % 50)) : 150 + (seed % 50));
                    const chgPctNum = priceChanges[symbol] !== undefined ? priceChanges[symbol] : (isActive ? priceChange24h : parseFloat(mockChgPct));
                    const chgVal = (price * chgPctNum / 100).toFixed(2);
                    const chgPctStr = chgPctNum.toFixed(2);
                    const isUp = chgPctNum >= 0;

                    return (
                        <div
                            key={symbol}
                            className={`flex items-center px-3 py-2 border-b border-border-subtle cursor-pointer transition-colors group ${isActive ? 'bg-linear-to-r from-[#6366f112] via-[#6366f10a] to-transparent border-[#6366f122]' : 'hover:bg-bg-elevated/85 hover:border-[#6366f114]'}`}
                            onClick={() => handleSelect(symbol)}
                        >
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${symbol === 'BTC' ? 'bg-[#f7931a]' : symbol === 'ETH' ? 'bg-[#627eea]' : 'bg-[#6366f1]'}`}>
                                    {symbol[0]}
                                </div>
                                <div className={`text-xs font-bold truncate ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>{symbol}</div>
                            </div>

                            <div className="w-16 text-right text-xs font-mono font-medium">
                                {price.toFixed(2)}
                            </div>

                            <div className={`w-12 text-right text-[11px] font-mono ${isUp ? 'text-bull' : 'text-bear'}`}>
                                {isUp ? '+' : ''}{chgVal}
                            </div>

                            <div className={`w-14 text-right text-[11px] font-mono ${isUp ? 'text-bull' : 'text-bear'}`}>
                                {isUp ? '+' : ''}{chgPctStr}%
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Symbol Detail Section (Bottom) */}
            <div className={`border-t border-border-subtle p-4 flex flex-col gap-3 min-h-80 ${theme === 'light' ? 'bg-bg-terminal' : 'bg-linear-to-b from-bg-terminal via-bg-terminal to-[#04050b]'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${currentSymbol === 'BTC' ? 'bg-[#f7931a]' : 'bg-[#6366f1]'}`}>
                            {currentSymbol[0]}
                        </div>
                        <span className="text-sm font-bold text-text-primary uppercase">{currentSymbol}</span>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-1.5 text-xs text-text-primary font-medium">
                        {selectedSymbolStats.name} <ExternalLink size={12} className="text-text-secondary" /> • <span className="text-text-secondary">{selectedSymbolStats.exchange}</span>
                    </div>
                    <div className="text-[10px] text-text-secondary mt-0.5">
                        {selectedSymbolStats.sector} • {selectedSymbolStats.industry}
                    </div>
                </div>

                <div className="mt-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-text-primary font-mono">{lastPrice > 0 ? lastPrice.toFixed(2) : '---'}</span>
                        <span className="text-xs text-text-secondary font-medium">USD</span>
                        <span className={`text-sm font-bold font-mono ${priceChange24h >= 0 ? 'text-bull' : 'text-bear'}`}>
                            {priceChange24h >= 0 ? '+' : ''}{(lastPrice * priceChange24h / 100).toFixed(2)} {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                        </span>
                    </div>
                    <div className="text-[10px] text-text-secondary mt-0.5">
                        Last update at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                </div>

                {/* News/Action mock bar */}
                <div className={`rounded-md p-2 flex items-center gap-3 cursor-pointer hover:bg-border-subtle transition-colors border border-[#6366f116] hover:border-[#6366f130] ${theme === 'light' ? 'bg-bg-elevated' : 'bg-linear-to-r from-bg-elevated via-bg-elevated/95 to-[#0a1020]'}`}>
                    <div className="w-8 h-8 rounded bg-bear/20 flex items-center justify-center text-bear">
                        <Info size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-text-secondary">Latest News • 23 minutes ago</div>
                        <div className="text-[11px] font-bold text-text-primary truncate">{currentSymbol} Price Target Maintained at $350.00...</div>
                    </div>
                </div>

                {/* Key Stats Grid */}
                <div className="grid grid-cols-2 gap-y-3 mt-1">
                    <div>
                        <div className="text-[10px] text-text-secondary">Next earnings report</div>
                        <div className="text-xs font-bold text-text-primary">{selectedSymbolStats.nextEarnings}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-text-secondary text-right">Volume</div>
                        <div className="text-xs font-bold text-text-primary text-right">{selectedSymbolStats.volume}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-text-secondary">Average Volume (30D)</div>
                        <div className="text-xs font-bold text-text-primary">{selectedSymbolStats.avgVolume}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-text-secondary text-right">Market capitalization</div>
                        <div className="text-xs font-bold text-text-primary text-right">{selectedSymbolStats.marketCap}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
