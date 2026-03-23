import { useState, useMemo } from 'react';
import useMarketStore from '../store/useMarketStore';
import { wsManager } from '../services/websocket';

export default function TradePanel() {
    const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
    const [type, setType] = useState<'limit' | 'market'>('limit');
    const [price, setPrice] = useState('');
    const [qty, setQty] = useState('');

    const lastPrice = useMarketStore(state => state.lastPrice);

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
        if (!qty || parseFloat(qty) <= 0) return;
        if (type === 'limit' && (!price || parseFloat(price) <= 0)) return;

        const orderId = Math.random().toString(36).substring(7);

        // Optimistically add to open orders (the real spec wants POST /api/order, but we simulate it here just like before)
        useMarketStore.getState().addOrder({
            id: orderId,
            side,
            type,
            price: type === 'limit' ? parseFloat(price) : undefined,
            qty: parseFloat(qty),
            status: 'Open'
        });

        wsManager.send({
            action: type,
            side: side === 'BUY' ? 'B' : 'S',
            price: type === 'limit' ? parseFloat(price) : undefined,
            qty: parseFloat(qty)
        });

        setQty('');
    };

    return (
        <div className="bg-bg-panel border border-border-subtle rounded flex flex-col p-4 w-full">
            <h3 className="uppercase tracking-widest text-xs text-text-secondary border-l-2 border-accent pl-2 font-semibold mb-4">PLACE ORDER</h3>

            {/* Toggles */}
            <div className="flex gap-2 w-full mb-4">
                <button
                    className={`flex-1 py-3 font-bold rounded transition-colors text-sm ${side === 'BUY'
                            ? 'bg-bull text-bg-terminal border-transparent'
                            : 'border border-border-subtle text-text-secondary hover:text-text-primary'
                        }`}
                    onClick={() => setSide('BUY')}
                >
                    BUY
                </button>
                <button
                    className={`flex-1 py-3 font-bold rounded transition-colors text-sm ${side === 'SELL'
                            ? 'bg-bear text-bg-terminal border-transparent'
                            : 'border border-border-subtle text-text-secondary hover:text-text-primary'
                        }`}
                    onClick={() => setSide('SELL')}
                >
                    SELL
                </button>
            </div>

            <div className="flex gap-2 w-full mb-4 bg-bg-elevated p-1 rounded">
                {['limit', 'market'].map(t => (
                    <button
                        key={t}
                        className={`flex-1 text-xs py-1.5 rounded capitalize font-medium transition-colors ${type === t ? 'bg-bg-panel text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                            }`}
                        onClick={() => setType(t as any)}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
                {type === 'limit' && (
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-text-secondary font-medium">Price (USD)</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                className="w-full bg-bg-elevated border border-border-subtle text-text-primary rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
                                placeholder="0.00"
                            />
                            <button
                                type="button"
                                onClick={handlePriceClick}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-secondary hover:text-accent font-medium"
                            >
                                Last
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    <label className="text-xs text-text-secondary font-medium">Amount = Volume</label>
                    <input
                        type="number"
                        step="1"
                        min="0"
                        value={qty}
                        onChange={e => setQty(e.target.value)}
                        className="w-full bg-bg-elevated border border-border-subtle text-text-primary rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
                        placeholder="0"
                        required
                    />
                </div>

                <div className="mt-2 flex justify-between items-center text-sm py-2 border-t border-border-subtle">
                    <span className="text-text-secondary">Expected Total</span>
                    <span className="font-mono font-bold text-text-primary">${totalValue}</span>
                </div>

                <button
                    type="submit"
                    className={`w-full py-3 mt-2 rounded font-bold transition-all hover:brightness-110 active:scale-95 text-bg-terminal ${side === 'BUY' ? 'bg-bull' : 'bg-bear'
                        }`}
                >
                    {side} SYNTH
                </button>
            </form>
        </div>
    );
}
