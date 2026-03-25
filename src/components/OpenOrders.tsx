import useMarketStore from '../store/useMarketStore';
import { wsManager } from '../services/websocket';

export default function OpenOrders() {
    const orders = useMarketStore(state => state.openOrders);
    const currentSymbol = useMarketStore(state => state.currentSymbol);

    const handleCancel = (symbol: string, orderId: number) => {
        wsManager.send({ type: 'cancel_order', symbol, order_id: orderId });
    };

    const visibleOrders = orders.filter((o) => o.symbol === currentSymbol);

    return (
        <div className="tv-open-orders">
            <div className="tv-open-orders-header">
                Open Orders ({visibleOrders.length})
            </div>

            <div className="tv-open-orders-list styling-scrollbar">
                {visibleOrders.length === 0 ? (
                    <div className="tv-open-orders-empty">
                        No open orders for {currentSymbol}
                    </div>
                ) : (
                    <>
                        <div className="tv-open-orders-cols">
                            <span>Type</span>
                            <span>Price</span>
                            <span>Qty</span>
                            <span></span>
                        </div>
                        {visibleOrders.map((o) => (
                            <div key={o.order_id} className="tv-open-order-row">
                                <span>
                                    <span className={o.side === 'BUY' ? 'tv-text-bull' : 'tv-text-bear'}>
                                        {o.side}
                                    </span>
                                    {' '}
                                    <span className="tv-text-dim">{o.type}</span>
                                </span>
                                <span>{o.price.toFixed(2)}</span>
                                <span>{o.remainingQty}</span>
                                <span>
                                    <button
                                        onClick={() => handleCancel(o.symbol, o.order_id)}
                                        className="tv-cancel-btn"
                                    >
                                        ✕
                                    </button>
                                </span>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
