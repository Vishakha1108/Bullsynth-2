import React, { useMemo, useState } from 'react';
import useMarketStore from '../store/useMarketStore';

const OrderBook = React.memo(function OrderBook() {
    const { bids, asks } = useMarketStore(state => state.orderBook);
    const lastPrice = useMarketStore(state => state.lastPrice);
    const [displayMode, setDisplayMode] = useState<'both' | 'bids' | 'asks'>('both');

    // Top entries - reduced to 4 rows for extreme compaction
    const topBids = bids.slice(0, 4);
    const topAsks = asks.slice(0, 4);

    const maxBidQty = useMemo(() => Math.max(0, ...topBids.map(b => b.qty)), [topBids]);
    const maxAskQty = useMemo(() => Math.max(0, ...topAsks.map(a => a.qty)), [topAsks]);
    const spread = (topAsks[0]?.price || 0) - (topBids[0]?.price || 0);
    const spreadPct = topBids[0]?.price ? (spread / topBids[0].price * 100) : 0;

    return (
        <div className="tv-orderbook">
            {/* Header */}
            <div className="tv-ob-header">
                <div className="tv-ob-modes">
                    <button
                        className={`tv-ob-mode-btn ${displayMode === 'both' ? 'active' : ''}`}
                        onClick={() => setDisplayMode('both')}
                        title="Both"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="5" fill="#ef5350" rx="1" /><rect x="1" y="8" width="12" height="5" fill="#26a69a" rx="1" /></svg>
                    </button>
                    <button
                        className={`tv-ob-mode-btn ${displayMode === 'bids' ? 'active' : ''}`}
                        onClick={() => setDisplayMode('bids')}
                        title="Bids only"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" fill="#26a69a" rx="1" /></svg>
                    </button>
                    <button
                        className={`tv-ob-mode-btn ${displayMode === 'asks' ? 'active' : ''}`}
                        onClick={() => setDisplayMode('asks')}
                        title="Asks only"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" fill="#ef5350" rx="1" /></svg>
                    </button>
                </div>
                <span className="tv-ob-precision">0.01</span>
            </div>

            {/* Column headers */}
            <div className="tv-ob-cols">
                <span>Price</span>
                <span>Amount</span>
                <span>Total</span>
            </div>

            {/* Asks (reversed so lowest ask is at bottom, near spread) */}
            {(displayMode === 'both' || displayMode === 'asks') && (
                <div className="tv-ob-asks">
                    {[...topAsks].reverse().map((ask, i) => {
                        const pct = maxAskQty > 0 ? (ask.qty / maxAskQty) * 100 : 0;
                        const cumTotal = [...topAsks].reverse().slice(0, i + 1).reduce((s, a) => s + a.qty, 0);
                        return (
                            <div key={`ask-${i}`} className="tv-ob-row ask">
                                <div className="tv-ob-bar ask" style={{ width: `${pct}%` }} />
                                <span className="tv-ob-price ask">{ask.price.toFixed(2)}</span>
                                <span className="tv-ob-amount">{ask.qty}</span>
                                <span className="tv-ob-total">{cumTotal}</span>
                            </div>
                        );
                    })}
                    {topAsks.length === 0 && <div className="tv-ob-empty">No asks</div>}
                </div>
            )}

            {/* Spread / Last Price */}
            <div className="tv-ob-spread">
                <span className="tv-ob-last-price">{lastPrice.toFixed(2)}</span>
                <span className="tv-ob-spread-val">Spread: {spread.toFixed(2)} ({spreadPct.toFixed(3)}%)</span>
            </div>

            {/* Bids */}
            {(displayMode === 'both' || displayMode === 'bids') && (
                <div className="tv-ob-bids">
                    {topBids.map((bid, i) => {
                        const pct = maxBidQty > 0 ? (bid.qty / maxBidQty) * 100 : 0;
                        const cumTotal = topBids.slice(0, i + 1).reduce((s, b) => s + b.qty, 0);
                        return (
                            <div key={`bid-${i}`} className="tv-ob-row bid">
                                <div className="tv-ob-bar bid" style={{ width: `${pct}%` }} />
                                <span className="tv-ob-price bid">{bid.price.toFixed(2)}</span>
                                <span className="tv-ob-amount">{bid.qty}</span>
                                <span className="tv-ob-total">{cumTotal}</span>
                            </div>
                        );
                    })}
                    {topBids.length === 0 && <div className="tv-ob-empty">No bids</div>}
                </div>
            )}
        </div>
    );
});

export default OrderBook;
