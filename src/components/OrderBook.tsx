import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import useMarketStore from '../store/useMarketStore';

const OrderBook = React.memo(function OrderBook() {
    const { bids, asks } = useMarketStore(state => state.orderBook);

    // Top 5 only
    const topBids = bids.slice(0, 5);
    // Asks are lowest first according to spec
    const topAsks = asks.slice(0, 5);

    const maxBidQty = useMemo(() => Math.max(0, ...topBids.map(b => b.qty)), [topBids]);
    const maxAskQty = useMemo(() => Math.max(0, ...topAsks.map(a => a.qty)), [topAsks]);
    const spread = (topAsks[0]?.price || 0) - (topBids[0]?.price || 0);
    const spreadPct = topBids[0]?.price ? (spread / topBids[0].price * 100) : 0;

    // Prepare data for Recharts Depth Chart (Cumulative sum)
    const depthData = useMemo(() => {
        let sumBid = 0;
        const bidData = [...bids].reverse().map(b => {
            sumBid += b.qty;
            return { price: b.price, bidDepth: sumBid, askDepth: null };
        });

        let sumAsk = 0;
        const askData = [...asks].map(a => {
            sumAsk += a.qty;
            return { price: a.price, bidDepth: null, askDepth: sumAsk };
        });

        return [...bidData, ...askData];
    }, [bids, asks]);

    return (
        <div className="flex flex-col h-full bg-bg-panel text-sm flex-1 min-h-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-border-subtle">
                <h3 className="uppercase tracking-widest text-xs text-text-secondary border-l-2 border-accent pl-2 font-semibold">ORDER BOOK <span className="text-text-primary ml-1 font-bold">SYNTH/USD</span></h3>
            </div>

            <div className="flex px-3 py-1 text-xs text-text-secondary border-b border-border-subtle/50 font-medium">
                <div className="w-1/2 flex justify-between pr-2 border-r border-border-subtle/30">
                    <span>Size</span><span>Price</span>
                </div>
                <div className="w-1/2 flex justify-between pl-2">
                    <span>Price</span><span>Size</span>
                </div>
            </div>

            <div className="flex px-3 pt-1">
                {/* Left Col: Bids (Green) */}
                <div className="w-1/2 pr-1 flex flex-col">
                    {topBids.map((bid, i) => (
                        <OrderRow key={`bid-${i}`} price={bid.price} qty={bid.qty} side="bid" maxQty={maxBidQty} />
                    ))}
                    {topBids.length === 0 && <div className="text-text-secondary text-xs text-center py-2 h-[100px]">No bids</div>}
                </div>

                {/* Right Col: Asks (Red) */}
                <div className="w-1/2 pl-1 flex flex-col">
                    {topAsks.map((ask, i) => (
                        <OrderRow key={`ask-${i}`} price={ask.price} qty={ask.qty} side="ask" maxQty={maxAskQty} />
                    ))}
                    {topAsks.length === 0 && <div className="text-text-secondary text-xs text-center py-2 h-[100px]">No asks</div>}
                </div>
            </div>

            <div className="text-center text-xs text-text-secondary py-2 border-y border-border-subtle/50 mx-3 my-2 font-mono">
                Spread: <span className="text-text-primary">${spread.toFixed(2)}</span> ({spreadPct.toFixed(3)}%)
            </div>

            {/* Depth Chart with Recharts */}
            <div className="flex-1 min-h-[100px] w-full mt-2 relative overflow-hidden">
                <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={depthData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBid" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorAsk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', color: '#f1f5f9' }}
                                itemStyle={{ color: '#f59e0b', fontFamily: 'JetBrains Mono' }}
                                labelStyle={{ color: '#94a3b8', fontFamily: 'JetBrains Mono' }}
                            />
                            <Area type="step" dataKey="bidDepth" stroke="#22c55e" fillOpacity={1} fill="url(#colorBid)" isAnimationActive={false} />
                            <Area type="step" dataKey="askDepth" stroke="#ef4444" fillOpacity={1} fill="url(#colorAsk)" isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
});

function OrderRow({ price, qty, side, maxQty }: { price: number; qty: number; side: 'bid' | 'ask'; maxQty: number }) {
    const pct = maxQty > 0 ? (qty / maxQty) * 100 : 0;
    const bgColor = side === 'bid' ? 'bg-bull/15' : 'bg-bear/15';
    const textColor = side === 'bid' ? 'text-bull' : 'text-bear';
    const barSide = side === 'bid' ? 'right-0' : 'left-0';

    return (
        <div className="relative flex justify-between items-center py-1 text-[13px] font-mono group hover:bg-elevated transition-colors animate-flash">
            {/* Background depth bar proportional to max column qty */}
            <div
                className={`absolute top-0 bottom-0 ${barSide} ${bgColor} transition-all duration-150`}
                style={{ width: `${Math.max(pct, 2)}%` }}
            />

            {side === 'bid' ? (
                <>
                    <span className="relative z-10 text-text-secondary">{qty}</span>
                    <span className={`relative z-10 ${textColor} font-semibold`}>{price.toFixed(2)}</span>
                </>
            ) : (
                <>
                    <span className={`relative z-10 ${textColor} font-semibold`}>{price.toFixed(2)}</span>
                    <span className="relative z-10 text-text-secondary">{qty}</span>
                </>
            )}
        </div>
    );
}

export default OrderBook;
