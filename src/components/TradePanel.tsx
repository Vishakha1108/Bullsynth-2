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
    const portfolio = useMarketStore(state => state.portfolio);
    const openOrders = useMarketStore(state => state.openOrders);
    const pricesBySymbol = useMarketStore(state => state.prices);
    const userId = useMarketStore(state => state.userId);
    const wsConnected = useMarketStore(state => state.wsConnected);
    const shortSellingConfig = useMarketStore(state => state.shortSellingConfig);

    const heldQty = useMemo(() => {
        const h = holdings.find(item => item.asset === currentSymbol);
        return h ? h.qty : 0;
    }, [holdings, currentSymbol]);

    const reservedSellQty = useMemo(() => {
        return openOrders
            .filter((order) => order.symbol === currentSymbol && order.side === 'SELL' && order.remainingQty > 0)
            .reduce((sum, order) => sum + order.remainingQty, 0);
    }, [openOrders, currentSymbol]);

    const sessionMode = useMemo<'connecting' | 'guest' | 'bot'>(() => {
        if (!userId) return 'connecting';
        return userId === 'frontend_user' ? 'guest' : 'bot';
    }, [userId]);

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

    const numericQty = parseFloat(qty);
    const numericPrice = parseFloat(price);
    const canSubmit = wsConnected
        && Boolean(userId)
        && Number.isFinite(numericQty)
        && numericQty > 0
        && (type === 'market' || (Number.isFinite(numericPrice) && numericPrice > 0));

    const riskPreview = useMemo(() => {
        if (side !== 'SELL') return null;
        if (!Number.isFinite(numericQty) || numericQty <= 0) return null;

        const holdingsBySymbol: Record<string, number> = {};
        const markBySymbol: Record<string, number> = {};
        for (const h of portfolio.holdings) {
            holdingsBySymbol[h.asset] = h.qty;
            const fromStore = pricesBySymbol[h.asset];
            const mark = Number.isFinite(fromStore) && fromStore > 0
                ? fromStore
                : (Number.isFinite(h.currentPrice) && h.currentPrice > 0 ? h.currentPrice : 0);
            if (mark > 0) {
                markBySymbol[h.asset] = mark;
            }
        }

        if (!markBySymbol[currentSymbol] || markBySymbol[currentSymbol] <= 0) {
            const fallback = pricesBySymbol[currentSymbol];
            if (Number.isFinite(fallback) && fallback > 0) {
                markBySymbol[currentSymbol] = fallback;
            } else if (Number.isFinite(lastPrice) && lastPrice > 0) {
                markBySymbol[currentSymbol] = lastPrice;
            }
        }

        const reservedBySymbol: Record<string, number> = {};
        for (const order of openOrders) {
            if (order.side !== 'SELL' || order.remainingQty <= 0) continue;
            reservedBySymbol[order.symbol] = (reservedBySymbol[order.symbol] || 0) + order.remainingQty;
        }

        const currentHoldings = holdingsBySymbol[currentSymbol] || 0;
        const currentReserved = reservedBySymbol[currentSymbol] || 0;
        const projectedEffectiveHoldings = currentHoldings - currentReserved - numericQty;
        const projectedShortQty = Math.max(0, -projectedEffectiveHoldings);

        const symbols = new Set<string>([
            ...Object.keys(holdingsBySymbol),
            ...Object.keys(reservedBySymbol),
            currentSymbol,
        ]);

        let projectedShortNotional = 0;
        for (const symbol of symbols) {
            let effective = (holdingsBySymbol[symbol] || 0) - (reservedBySymbol[symbol] || 0);
            if (symbol === currentSymbol) {
                effective -= numericQty;
            }
            if (effective >= -1e-12) continue;

            const fromStore = pricesBySymbol[symbol];
            const mark = (Number.isFinite(fromStore) && fromStore > 0) ? fromStore : (markBySymbol[symbol] || 0);
            if (mark <= 0) continue;

            projectedShortNotional += (-effective) * mark;
        }

        const equity = portfolio.totalValue;
        const maxShortByEquity = equity > 1e-12 && shortSellingConfig
            ? equity * shortSellingConfig.maxShortNotionalToEquity
            : 0;
        const leverageRatio = equity > 1e-12
            ? projectedShortNotional / equity
            : Number.POSITIVE_INFINITY;

        return {
            currentHoldings,
            currentReserved,
            projectedEffectiveHoldings,
            projectedShortQty,
            projectedShortNotional,
            equity,
            maxShortByEquity,
            leverageRatio,
        };
    }, [
        side,
        numericQty,
        portfolio.holdings,
        portfolio.totalValue,
        openOrders,
        pricesBySymbol,
        currentSymbol,
        lastPrice,
        shortSellingConfig,
    ]);

    const riskChecks = useMemo(() => {
        if (side !== 'SELL' || !riskPreview || !shortSellingConfig) return null;

        if (!shortSellingConfig.enabled) {
            const available = riskPreview.currentHoldings - riskPreview.currentReserved;
            return {
                mode: 'no-short' as const,
                available,
                passAvailable: available + 1e-12 >= numericQty,
            };
        }

        return {
            mode: 'short-enabled' as const,
            passQty: riskPreview.projectedShortQty <= shortSellingConfig.maxShortQtyPerSymbol + 1e-12,
            passEquity: riskPreview.equity + 1e-12 >= shortSellingConfig.minEquity,
            passTotalNotional: riskPreview.projectedShortNotional <= shortSellingConfig.maxTotalShortNotional + 1e-12,
            passLeverage: riskPreview.projectedShortNotional <= riskPreview.maxShortByEquity + 1e-12,
        };
    }, [side, riskPreview, shortSellingConfig, numericQty]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        wsManager.send({
            type: 'place_order',
            symbol: currentSymbol,
            order_type: type,
            side: side.toLowerCase(),
            price: type === 'limit' ? parseFloat(price) : undefined,
            qty: parseFloat(qty)
        });

        useMarketStore.getState().addNotification(
            `Submitted ${side} ${qty} ${currentSymbol}. Exchange will validate cash and short-risk limits.`,
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
                                Held: <span className="text-text-primary font-mono">{heldQty.toFixed(5)}</span>
                                {'  '}Reserved: <span className="text-text-primary font-mono">{reservedSellQty.toFixed(5)}</span>
                            </span>
                        )}
                    </div>
                    <div className="tv-trade-input-wrap">
                        <input
                            type="number"
                            step="0.00001"
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
                    disabled={!canSubmit}
                >
                    {wsConnected ? `${side} ${currentSymbol}` : 'Connecting...'}
                </button>

                <div className="mt-3 rounded-md border border-border-subtle bg-bg-elevated/60 px-3 py-2 text-[11px] leading-4">
                    <div className="font-semibold text-text-primary">
                        {sessionMode === 'guest' && 'Session: Guest frontend_user (UI)'}
                        {sessionMode === 'bot' && `Session: Bot ${userId}`}
                        {sessionMode === 'connecting' && 'Session: Connecting...'}
                    </div>
                    <div className="mt-1 text-text-secondary">
                        Guest UI uses guest_login. Bots authenticate via API key using auth.
                    </div>
                    <div className="mt-1 text-text-secondary">
                        SELL can exceed held quantity and open a short. Validation happens on the exchange.
                    </div>
                    <div className="text-text-secondary">
                        {shortSellingConfig
                            ? `Engine short config: ${shortSellingConfig.enabled ? 'ENABLED' : 'DISABLED'} | max qty/symbol ${shortSellingConfig.maxShortQtyPerSymbol.toFixed(5)} | max total notional $${shortSellingConfig.maxTotalShortNotional.toFixed(2)} | min equity $${shortSellingConfig.minEquity.toFixed(2)} | max ratio ${shortSellingConfig.maxShortNotionalToEquity.toFixed(2)}x`
                            : 'Engine short config: waiting for server...'}
                    </div>

                    {side === 'SELL' && riskPreview && (
                        <div className="mt-2 border-t border-border-subtle pt-2 text-[10px] text-text-secondary">
                            <div>
                                Projected effective holdings: {riskPreview.projectedEffectiveHoldings.toFixed(5)}
                                {' | '}Projected short qty: {riskPreview.projectedShortQty.toFixed(5)}
                            </div>
                            <div>
                                Projected short notional: ${riskPreview.projectedShortNotional.toFixed(2)}
                                {' | '}Equity: ${riskPreview.equity.toFixed(2)}
                                {' | '}Projected ratio: {Number.isFinite(riskPreview.leverageRatio) ? riskPreview.leverageRatio.toFixed(3) : 'INF'}x
                            </div>

                            {riskChecks?.mode === 'no-short' && (
                                <div className={riskChecks.passAvailable ? 'text-bull' : 'text-bear'}>
                                    No-short mode check (available = holdings - reserved): {riskChecks.passAvailable ? 'PASS' : 'FAIL'}
                                </div>
                            )}

                            {riskChecks?.mode === 'short-enabled' && (
                                <div>
                                    <span className={riskChecks.passQty ? 'text-bull' : 'text-bear'}>
                                        Qty limit {riskChecks.passQty ? 'PASS' : 'FAIL'}
                                    </span>
                                    {' | '}
                                    <span className={riskChecks.passEquity ? 'text-bull' : 'text-bear'}>
                                        Min equity {riskChecks.passEquity ? 'PASS' : 'FAIL'}
                                    </span>
                                    {' | '}
                                    <span className={riskChecks.passTotalNotional ? 'text-bull' : 'text-bear'}>
                                        Total notional {riskChecks.passTotalNotional ? 'PASS' : 'FAIL'}
                                    </span>
                                    {' | '}
                                    <span className={riskChecks.passLeverage ? 'text-bull' : 'text-bear'}>
                                        Leverage {riskChecks.passLeverage ? 'PASS' : 'FAIL'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}
