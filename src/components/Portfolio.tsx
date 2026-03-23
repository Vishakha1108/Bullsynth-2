import useMarketStore from '../store/useMarketStore';

export default function Portfolio() {
    const portfolio = useMarketStore(state => state.portfolio);
    const lastPrice = useMarketStore(state => state.lastPrice);

    const totalValue = portfolio.cash + portfolio.holdings.reduce((acc, h) => acc + (h.qty * lastPrice), 0);
    const isPnlPositive = portfolio.pnl > 0;

    return (
        <div className="bg-bg-panel border border-border-subtle rounded flex flex-col p-4 w-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="uppercase tracking-widest text-xs text-text-secondary border-l-2 border-accent pl-2 font-semibold">PORTFOLIO</h3>
                <span className={`text-xs font-bold font-mono ${isPnlPositive ? 'text-bull' : portfolio.pnl < 0 ? 'text-bear' : 'text-text-secondary'}`}>
                    {isPnlPositive ? '▲' : portfolio.pnl < 0 ? '▼' : ''} ${Math.abs(portfolio.pnl).toFixed(2)}
                </span>
            </div>

            <div className="mb-4">
                <div className="text-text-secondary text-xs uppercase font-medium">Cash Balance</div>
                <div className="text-2xl font-bold font-mono mt-1 text-text-primary">
                    ${portfolio.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>

            <div className="mb-4">
                <div className="text-text-secondary text-xs uppercase font-medium">Total Value</div>
                <div className="text-lg font-bold font-mono mt-1 text-text-primary">
                    ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>

            {portfolio.holdings.length > 0 && (
                <div className="mt-2 text-xs">
                    <div className="flex text-text-secondary mb-2 uppercase font-medium border-b border-border-subtle pb-1">
                        <span className="w-1/3 text-left">Asset</span>
                        <span className="w-1/3 text-right">Qty</span>
                        <span className="w-1/3 text-right">Avg</span>
                    </div>
                    {portfolio.holdings.map((h, i) => (
                        <div key={i} className="flex font-mono py-1">
                            <span className="w-1/3 text-left text-text-primary font-bold">{h.asset}</span>
                            <span className="w-1/3 text-right text-text-secondary">{h.qty}</span>
                            <span className="w-1/3 text-right text-text-secondary">${h.avgPrice.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
