import useMarketStore from '../store/useMarketStore';

export default function RecentTrades() {
    const trades = useMarketStore(state => state.recentTrades);

    return (
        <div className="tv-trades">
            {/* Column headers */}
            <div className="tv-trades-header">
                <span>Time</span>
                <span>Price</span>
                <span>Amount</span>
            </div>

            <div className="tv-trades-list styling-scrollbar">
                {trades.map((trade, i) => {
                    const isBuy = trade.side.toUpperCase() === 'BUY';
                    const tDate = new Date(trade.timestamp);
                    const timeStr = `${tDate.getHours().toString().padStart(2, '0')}:${tDate.getMinutes().toString().padStart(2, '0')}:${tDate.getSeconds().toString().padStart(2, '0')}`;

                    return (
                        <div key={`${trade.id}-${trade.timestamp}-${i}`} className="tv-trade-row">
                            <span className="tv-trade-time">{timeStr}</span>
                            <span className={`tv-trade-price ${isBuy ? 'up' : 'down'}`}>
                                {trade.price.toFixed(2)}
                            </span>
                            <span className="tv-trade-amount">{trade.qty}</span>
                        </div>
                    );
                })}
                {trades.length === 0 && <div className="tv-trades-empty">No recent trades</div>}
            </div>
        </div>
    );
}
