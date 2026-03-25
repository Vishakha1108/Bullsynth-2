import useMarketStore from '../store/useMarketStore';
import type { Order } from '../store/useMarketStore';
import { wsManager } from '../services/websocket';

export default function OpenOrders() {
    const orders = useMarketStore(state => state.openOrders);
    const currentSymbol = useMarketStore(state => state.currentSymbol);

    const handleCancel = (order: Order) => {
        wsManager.send({
            type: 'cancel_order',
            order_id: parseInt(order.id, 10),
            symbol: order.symbol || currentSymbol,
        });
        useMarketStore.getState().removeOrder(order.id);
    };

    return (
        <div className="tv-open-orders">
            <div className="tv-open-orders-header">
                Open Orders ({orders.length})
            </div>

            <div className="tv-open-orders-list styling-scrollbar">
                {orders.length === 0 ? (
                    <div className="tv-open-orders-empty">
                        No open orders
                    </div>
                ) : (
                    <>
                        <div className="tv-open-orders-cols">
                            <span>Type</span>
                            <span>Price</span>
                            <span>Qty</span>
                            <span></span>
                        </div>
                        {orders.map((o) => (
                            <div key={o.id} className="tv-open-order-row">
                                <span>
                                    <span className={o.side === 'BUY' ? 'tv-text-bull' : 'tv-text-bear'}>
                                        {o.side}
                                    </span>
                                    {' '}
                                    <span className="tv-text-dim">{o.type}</span>
                                </span>
                                <span>{o.price ? o.price.toFixed(2) : 'MKT'}</span>
                                <span>{o.qty}</span>
                                <span>
                                    <button
                                        onClick={() => handleCancel(o)}
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
