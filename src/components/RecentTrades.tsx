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
                    // C++ engine trades don't have an explicit 'side' since every trade has a buyer and seller.
                    // Instead, we use "tick direction" — compare with the previous trade (which is at index i+1 since array is newest-first).
                    const previousTrade = trades[i + 1];
                    const isUpTick = previousTrade ? trade.price >= previousTrade.price : true;

                    const tDate = new Date(trade.timestamp);
                    const timeStr = `${tDate.getHours().toString().padStart(2, '0')}:${tDate.getMinutes().toString().padStart(2, '0')}:${tDate.getSeconds().toString().padStart(2, '0')}`;

                    return (
                        <div key={trade.id || i} className="tv-trade-row">
                            <span className="tv-trade-time">{timeStr}</span>
                            <span className={`tv-trade-price ${isUpTick ? 'up' : 'down'}`}>
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
