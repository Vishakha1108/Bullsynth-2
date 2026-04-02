import { useState, useMemo } from 'react';
import useMarketStore from '../store/useMarketStore';
import { wsManager } from '../services/websocket';

export default function TradePanel() {
    const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
    const [type, setType] = useState<'limit' | 'market'>('limit');
    const [price, setPrice] = useState('');
    const [qty, setQty] = useState('');

    const lastPrice = useMarketStore(state => state.lastPrice);
    const currentSymbol = useMarketStore(state => state.currentSymbol);
    const holdings = useMarketStore(state => state.portfolio.holdings);

    const availableQty = useMemo(() => {
        const h = holdings.find(item => item.asset === currentSymbol);
        return h ? h.qty : 0;
    }, [holdings, currentSymbol]);

    const bestBid = useMarketStore(state => state.orderBook.bids[0]?.price || 0);
    const bestAsk = useMarketStore(state => state.orderBook.asks[0]?.price || 0);

    const handlePriceClick = () => {
        setPrice(side === 'BUY' ? bestAsk.toFixed(2) : bestBid.toFixed(2));
    };

    const totalValue = useMemo(() => {
        const p = type === 'limit' ? parseFloat(price) : lastPrice;
        const q = parseFloat(qty);
        if (!isNaN(p) && !isNaN(q)) return (p * q).toFixed(2);
        return '0.00';
    }, [price, qty, lastPrice, type]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericQty = parseFloat(qty);
        if (!qty || numericQty <= 0) return;
        if (side === 'SELL' && numericQty > availableQty) return;
        if (type === 'limit' && (!price || parseFloat(price) <= 0)) return;

        wsManager.send({
            type: 'place_order',
            symbol: currentSymbol,
            order_type: type,
            side: side.toLowerCase(),
            price: type === 'limit' ? parseFloat(price) : undefined,
            qty: parseFloat(qty)
        });

        useMarketStore.getState().addNotification(
            `${side} ${type.toUpperCase()} order submitted: ${qty} ${currentSymbol}`,
            'info'
        );

        setQty('');
    };

    return (
        <div className="tv-trade-panel">
            <div className="tv-trade-title">Place Order</div>

            {/* Buy/Sell toggle */}
            <div className="tv-trade-side-toggle">
                <button
                    className={`tv-trade-side-btn buy ${side === 'BUY' ? 'active' : ''}`}
                    onClick={() => setSide('BUY')}
                >
                    Buy
                </button>
                <button
                    className={`tv-trade-side-btn sell ${side === 'SELL' ? 'active' : ''}`}
                    onClick={() => setSide('SELL')}
                >
                    Sell
                </button>
            </div>

            {/* Order type */}
            <div className="tv-trade-type-toggle">
                {['limit', 'market'].map(t => (
                    <button
                        key={t}
                        className={`tv-trade-type-btn ${type === t ? 'active' : ''}`}
                        onClick={() => setType(t as 'limit' | 'market')}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="tv-trade-form">
                {type === 'limit' && (
                    <div className="tv-trade-field">
                        <label>Price</label>
                        <div className="tv-trade-input-wrap">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                placeholder="0.00"
                            />
                            <button type="button" onClick={handlePriceClick} className="tv-trade-last-btn">
                                Last
                            </button>
                        </div>
                    </div>
                )}

                <div className="tv-trade-field">
                    <div className="flex justify-between items-center mb-1">
                        <label className="m-0">Quantity</label>
                        {side === 'SELL' && (
                            <span className="text-[10px] text-text-secondary">
                                Available: <span className="text-text-primary font-mono">{availableQty}</span>
                            </span>
                        )}
                    </div>
                    <div className="tv-trade-input-wrap">
                        <input
                            type="number"
                            step="1"
                            min="0"
                            value={qty}
                            onChange={e => setQty(e.target.value)}
                            placeholder="0"
                            required
                        />
                        <span className="tv-trade-unit">{currentSymbol}</span>
                    </div>
                </div>

                <div className="tv-trade-total">
                    <span>Total</span>
                    <span className="tv-trade-total-val">${totalValue}</span>
                </div>

                <button
                    type="submit"
                    className={`tv-trade-submit ${side === 'BUY' ? 'buy' : 'sell'}`}
                    disabled={side === 'SELL' && (parseFloat(qty) > availableQty || !qty || parseFloat(qty) <= 0)}
                >
                    {side} {currentSymbol}
                </button>
            </form>
        </div>
    );
}
