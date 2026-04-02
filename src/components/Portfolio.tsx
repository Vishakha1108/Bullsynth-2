import { X, Wallet } from 'lucide-react';
import useMarketStore from '../store/useMarketStore';

export default function Portfolio({ onClose }: { onClose?: () => void }) {
    const portfolio = useMarketStore(state => state.portfolio);
    const totalValue = portfolio.totalValue;
    const isPnlPositive = portfolio.unrealizedPnl > 0;

    return (
        <div className="tv-side-accent tv-side-accent-portfolio flex flex-col h-full bg-bg-terminal text-text-primary font-sans border-l border-border-subtle">
            {/* Portfolio Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-linear-to-r from-bg-elevated via-bg-elevated/90 to-bg-terminal">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Portfolio</span>
                    <Wallet size={12} className="text-text-primary" />
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold font-mono ${isPnlPositive ? 'text-bull' : portfolio.unrealizedPnl < 0 ? 'text-bear' : 'text-text-secondary'}`}>
                        {isPnlPositive ? '▲' : portfolio.unrealizedPnl < 0 ? '▼' : ''} ${Math.abs(portfolio.unrealizedPnl).toFixed(2)}
                    </span>
                    {onClose && <X size={18} className="cursor-pointer hover:text-text-primary ml-1 text-text-secondary" onClick={onClose} />}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto styling-scrollbar p-3">
            <div className="mb-3 h-px bg-linear-to-r from-[#6366f132] via-[#2563eb16] to-transparent" />

            <div className="tv-portfolio-stats">
                <div className="tv-portfolio-stat">
                    <span className="tv-portfolio-stat-label">Cash</span>
                    <span className="tv-portfolio-stat-val">
                        ${portfolio.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="tv-portfolio-stat">
                    <span className="tv-portfolio-stat-label">Total</span>
                    <span className="tv-portfolio-stat-val">
                        ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {portfolio.holdings.length > 0 && (
                <div className="tv-portfolio-holdings">
                    <div className="tv-portfolio-holdings-header">
                        <span>Asset</span>
                        <span>Qty</span>
                        <span>Avg</span>
                    </div>
                    {portfolio.holdings.map((h, i) => (
                        <div key={i} className="tv-portfolio-holding-row">
                            <span className="tv-portfolio-holding-asset">{h.asset}</span>
                            <span className="font-mono tabular-nums">
                                {h.qty.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 5 })}
                            </span>
                            <span>${h.avgPrice.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}
            </div>
        </div>
    );
}
