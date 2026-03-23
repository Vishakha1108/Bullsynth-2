import useMarketStore from '../store/useMarketStore';

export default function RecentTrades() {
    const trades = useMarketStore(state => state.recentTrades);

    return (
        <div className="flex flex-col h-full w-full bg-bg-panel min-h-0">
            <div className="px-3 py-2 border-b border-border-subtle">
                <h3 className="uppercase tracking-widest text-xs text-text-secondary border-l-2 border-accent pl-2 font-semibold">RECENT TRADES</h3>
            </div>

            <div className="flex px-4 py-1 border-b border-border-subtle text-xs text-text-secondary font-medium">
                <span className="w-1/4 text-left">Time</span>
                <span className="w-1/4 text-right">Price</span>
                <span className="w-1/4 text-right">Qty</span>
                <span className="w-1/4 text-right">Side</span>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-1 styling-scrollbar text-xs">
                {trades.map((trade, i) => {
                    const isBuy = trade.side.toUpperCase() === 'BUY';
                    const tDate = new Date(trade.timestamp);
                    const timeStr = `${tDate.getHours().toString().padStart(2, '0')}:${tDate.getMinutes().toString().padStart(2, '0')}:${tDate.getSeconds().toString().padStart(2, '0')}`;

                    return (
                        <div key={i} className="flex px-2 py-1 font-mono hover:bg-bg-elevated animate-flash transition-colors rounded">
                            <span className="w-1/4 text-left text-text-secondary">{timeStr}</span>
                            <span className={`w-1/4 text-right font-medium ${isBuy ? 'text-bull' : 'text-bear'}`}>
                                {trade.price.toFixed(2)}
                            </span>
                            <span className="w-1/4 text-right text-text-primary">{trade.qty}</span>
                            <span className={`w-1/4 text-right font-bold ${isBuy ? 'text-bull' : 'text-bear'}`}>
                                {trade.side.toUpperCase()}
                            </span>
                        </div>
                    );
                })}
                {trades.length === 0 && <div className="text-text-secondary text-center py-4">No recent trades</div>}
            </div>
        </div>
    );
}
