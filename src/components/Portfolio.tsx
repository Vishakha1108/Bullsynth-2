import useMarketStore from '../store/useMarketStore';

export default function Portfolio() {
    const portfolio = useMarketStore(state => state.portfolio);

    const isPnlPositive = portfolio.unrealized_pnl > 0;
    const positionsList = Object.entries(portfolio.positions || {});

    return (
        <div className="tv-portfolio">
            <div className="tv-portfolio-header">
                <span className="tv-portfolio-title">Portfolio</span>
                <span className={`tv-portfolio-pnl ${isPnlPositive ? 'up' : portfolio.unrealized_pnl < 0 ? 'down' : ''}`}>
                    {isPnlPositive ? '▲' : portfolio.unrealized_pnl < 0 ? '▼' : ''} ${Math.abs(portfolio.unrealized_pnl).toFixed(2)}
                </span>
            </div>

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
                        ${portfolio.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="tv-portfolio-stat">
                    <span className="tv-portfolio-stat-label">Realized PnL</span>
                    <span className={`tv-portfolio-stat-val ${portfolio.realized_pnl > 0 ? 'text-[#089981]' : portfolio.realized_pnl < 0 ? 'text-[#f23645]' : ''}`}>
                        ${portfolio.realized_pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {positionsList.length > 0 && (
                <div className="tv-portfolio-holdings" style={{ marginTop: '16px' }}>
                    <div className="tv-portfolio-holdings-header" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--tv-text-muted)' }}>
                        <span>Asset</span>
                        <span style={{ textAlign: 'right' }}>Qty</span>
                        <span style={{ textAlign: 'right' }}>Avg</span>
                        <span style={{ textAlign: 'right' }}>PnL</span>
                    </div>
                    {positionsList.map(([symbol, pos]) => (
                        <div key={symbol} className="tv-portfolio-holding-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '8px', fontSize: '12px', marginTop: '8px' }}>
                            <span className="tv-portfolio-holding-asset">{symbol}</span>
                            <span style={{ textAlign: 'right' }}>{pos.holdings}</span>
                            <span style={{ textAlign: 'right' }}>${pos.avg_cost.toFixed(2)}</span>
                            <span style={{ textAlign: 'right', color: pos.unrealized_pnl > 0 ? '#089981' : pos.unrealized_pnl < 0 ? '#f23645' : 'inherit' }}>
                                {pos.unrealized_pnl > 0 ? '+' : ''}{pos.unrealized_pnl.toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
