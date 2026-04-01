import { useState } from 'react';
import { X, TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';
import useMarketStore from '../store/useMarketStore';
import { useTheme } from '../store/ThemeContext';
import type { Holding } from '../lib/portfolioEngine';

interface PortfolioProps {
    onClose?: () => void;
}

export default function Portfolio({ onClose }: PortfolioProps) {
    const { theme } = useTheme();
    const portfolio = useMarketStore((state: any) => state.portfolio);
    const holdings = useMarketStore((state: any) => state.dynamicHoldings);
    const metrics = useMarketStore((state: any) => state.dynamicPortfolioMetrics);
    const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
    const [sortBy, setSortBy] = useState<'symbol' | 'value' | 'pnl'>('symbol');

    // Fallback to portfolio if metrics not available
    const totalValue = metrics?.totalValue || portfolio.totalValue;
    const totalInvested = metrics?.totalInvestment || 0;
    const totalPnL = metrics?.totalPnL || portfolio.unrealizedPnl;
    const totalPnLPercent = metrics?.returnPercent || 0;
    const dailyPnL = metrics?.dailyPnL || 0;
    const cash = metrics?.cash || portfolio.cash;
    const displayHoldings = holdings.length > 0 ? holdings : portfolio.holdings.map((h: any) => ({
        symbol: h.asset,
        totalBuyQty: 0,
        totalSellQty: 0,
        netQty: h.qty,
        avgBuyPrice: h.avgPrice,
        currentPrice: h.currentPrice,
        investment: h.avgPrice * h.qty,
        marketValue: h.marketValue,
        realizedPnL: h.realizedPnl,
        unrealizedPnL: h.unrealizedPnl,
        totalPnL: h.unrealizedPnl + h.realizedPnl,
        returnPercent: ((h.unrealizedPnl + h.realizedPnl) / (h.avgPrice * h.qty)) * 100,
        dailyPnL: 0,
        minPrice: h.avgPrice,
        maxPrice: h.currentPrice,
    })) as Holding[];

    // Sort holdings
    const sortedHoldings = [...displayHoldings].sort((a, b) => {
        if (sortBy === 'symbol') return a.symbol.localeCompare(b.symbol);
        if (sortBy === 'value') return b.marketValue - a.marketValue;
        if (sortBy === 'pnl') return b.totalPnL - a.totalPnL;
        return 0;
    });

    const isPnLPositive = totalPnL >= 0;
    const isDailyPnLPositive = dailyPnL >= 0;

    return (
        <div className={`flex flex-col h-full ${theme === 'dark' ? 'bg-bg-terminal text-text-primary' : 'bg-white text-gray-900'} font-sans border-l ${theme === 'dark' ? 'border-border-subtle' : 'border-gray-200'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 ${theme === 'dark' ? 'border-b border-border-subtle bg-bg-elevated' : 'border-b border-gray-200 bg-gray-50'}`}>
                <h2 className="text-sm font-bold uppercase tracking-wider">Portfolio</h2>
                {onClose && (
                    <button
                        onClick={onClose}
                        className={`p-1 hover:${theme === 'dark' ? 'bg-border-subtle' : 'bg-gray-100'} rounded transition-colors`}
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Portfolio Summary Card */}
                <div className={`m-4 rounded-lg p-4 ${theme === 'dark' ? 'bg-bg-elevated border border-border-subtle' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className="space-y-4">
                        {/* Current Value */}
                        <div>
                            <p className={`text-xs uppercase tracking-widest font-semibold ${theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'}`}>Current Value</p>
                            <p className="text-3xl font-bold font-mono mt-1">
                                ₹{(totalValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </p>
                        </div>

                        {/* Invested & PnL Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className={`text-xs uppercase tracking-widest font-semibold ${theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'}`}>Invested</p>
                                <p className="text-lg font-bold font-mono mt-1">
                                    ₹{(totalInvested || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div>
                                <p className={`text-xs uppercase tracking-widest font-semibold ${theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'}`}>Total PnL</p>
                                <p className={`text-lg font-bold font-mono mt-1 flex items-center gap-1 ${isPnLPositive ? 'text-green-500' : 'text-red-500'}`}>
                                    {isPnLPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    ₹{Math.abs(totalPnL || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </p>
                                <p className={`text-xs mt-1 font-semibold ${isPnLPositive ? 'text-green-500' : 'text-red-500'}`}>
                                    {isPnLPositive ? '+' : '-'}{Math.abs(totalPnLPercent || 0).toFixed(2)}%
                                </p>
                            </div>
                        </div>

                        {/* Daily PnL */}
                        <div className={`p-2 rounded ${theme === 'dark' ? 'bg-bg-terminal' : 'bg-white'}`}>
                            <p className={`text-xs uppercase tracking-widest font-semibold ${theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'}`}>Today's PnL</p>
                            <p className={`text-lg font-bold font-mono mt-1 ${isDailyPnLPositive ? 'text-green-500' : 'text-red-500'}`}>
                                {isDailyPnLPositive ? '+' : '-'}₹{Math.abs(dailyPnL || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </p>
                        </div>

                        {/* Cash */}
                        <div className={`p-2 rounded ${theme === 'dark' ? 'bg-bg-terminal' : 'bg-white'}`}>
                            <p className={`text-xs uppercase tracking-widest font-semibold ${theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'}`}>Cash Available</p>
                            <p className="text-lg font-bold font-mono mt-1">
                                ₹{(cash || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Holdings Section */}
                <div className="px-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider">Holdings ({sortedHoldings.length})</h3>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className={`text-xs px-2 py-1 rounded border ${theme === 'dark' ? 'bg-bg-terminal border-border-subtle text-text-primary' : 'bg-white border-gray-200 text-gray-900'}`}
                        >
                            <option value="symbol">Sort by Symbol</option>
                            <option value="value">Sort by Value</option>
                            <option value="pnl">Sort by PnL</option>
                        </select>
                    </div>

                    {/* Holdings List */}
                    <div className="space-y-2 pb-4">
                        {sortedHoldings.length > 0 ? (
                            sortedHoldings.map((holding) => {
                                const holdingPnLPercent = holding.returnPercent || 0;
                                const isPositive = holding.totalPnL >= 0;

                                return (
                                    <div
                                        key={holding.symbol}
                                        onClick={() => setSelectedHolding(holding)}
                                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                                            selectedHolding?.symbol === holding.symbol
                                                ? theme === 'dark'
                                                    ? 'bg-blue-900/30 border border-blue-500'
                                                    : 'bg-blue-50 border border-blue-300'
                                                : theme === 'dark'
                                                    ? 'bg-bg-elevated border border-border-subtle hover:border-border-subtle/60'
                                                    : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {/* Row 1: Symbol and Market Value */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-white ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'}`}>
                                                    {holding.symbol[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{holding.symbol}</p>
                                                    <p className={`text-xs ${theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'}`}>
                                                        {holding.netQty} shares
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm font-mono">
                                                    ₹{(holding.marketValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </p>
                                                <p className={`text-xs font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                                    {isPositive ? '▲' : '▼'} {Math.abs(holdingPnLPercent).toFixed(2)}%
                                                </p>
                                            </div>
                                        </div>

                                        {/* Row 2: Price Details */}
                                        <div className={`flex justify-between text-xs ${theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'}`}>
                                            <span>Avg: ₹{(holding.avgBuyPrice || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                            <span>Current: ₹{(holding.currentPrice || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                        </div>

                                        {/* Row 3: PnL Details */}
                                        <div className={`flex justify-between text-xs mt-2 p-1 rounded ${isPositive ? (theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100') : theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'}`}>
                                            <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
                                                Unrealized: ₹{Math.abs(holding.unrealizedPnL || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                            </span>
                                            {holding.realizedPnL !== 0 && (
                                                <span className={holding.realizedPnL > 0 ? 'text-green-500' : 'text-red-500'}>
                                                    Realized: ₹{Math.abs(holding.realizedPnL || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className={`p-8 text-center rounded-lg ${theme === 'dark' ? 'bg-bg-elevated' : 'bg-gray-50'}`}>
                                <p className={`text-sm ${theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'}`}>
                                    No holdings yet. Start trading to build your portfolio!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Selected Holding Details */}
            {selectedHolding && (
                <div className={`border-t ${theme === 'dark' ? 'border-border-subtle bg-bg-elevated' : 'border-gray-200 bg-gray-50'} p-4`}>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-sm">{selectedHolding.symbol} Details</h4>
                        <button
                            onClick={() => setSelectedHolding(null)}
                            className={`p-1 hover:${theme === 'dark' ? 'bg-border-subtle' : 'bg-gray-200'} rounded`}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'}>Buy Price (Avg)</span>
                            <span className="font-bold">₹{(selectedHolding.avgBuyPrice || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'}>Current Price</span>
                            <span className="font-bold">₹{(selectedHolding.currentPrice || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'}>Quantity</span>
                            <span className="font-bold">{selectedHolding.netQty}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'}>Total Investment</span>
                            <span className="font-bold">₹{(selectedHolding.investment || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className={theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'}>Current Value</span>
                            <span className="font-bold">₹{(selectedHolding.marketValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-4">
                        <button className={`flex-1 py-2 rounded text-xs font-bold flex items-center justify-center gap-1 ${theme === 'dark' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}>
                            <Plus size={14} /> BUY
                        </button>
                        <button className={`flex-1 py-2 rounded text-xs font-bold flex items-center justify-center gap-1 ${theme === 'dark' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
                            <Minus size={14} /> SELL
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
