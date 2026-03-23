import useMarketStore from '../store/useMarketStore';

export default function Portfolio() {
    const portfolio = useMarketStore(state => state.portfolio);
    const lastPrice = useMarketStore(state => state.lastPrice);

    const totalValue = portfolio.cash + portfolio.holdings.reduce((acc, h) => acc + (h.qty * lastPrice), 0);
    const isPnlPositive = portfolio.pnl > 0;

    return (
        <div className="tv-portfolio">
            <div className="tv-portfolio-header">
                <span className="tv-portfolio-title">Portfolio</span>
                <span className={`tv-portfolio-pnl ${isPnlPositive ? 'up' : portfolio.pnl < 0 ? 'down' : ''}`}>
                    {isPnlPositive ? '▲' : portfolio.pnl < 0 ? '▼' : ''} ${Math.abs(portfolio.pnl).toFixed(2)}
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
                            <span>{h.qty}</span>
                            <span>${h.avgPrice.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
