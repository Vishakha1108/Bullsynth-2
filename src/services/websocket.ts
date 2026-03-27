import useMarketStore from '../store/useMarketStore';

export const candleWorker = new Worker(new URL('../workers/candleWorker.ts', import.meta.url), {
    type: 'module',
});

candleWorker.onmessage = (e) => {
    const { type, candle, candles } = e.data;

    if (type === 'CANDLE_UPDATE') {
        useMarketStore.getState().setLatestCandle(candle);
    }
    else if (type === 'HISTORY_UPDATE') {
        useMarketStore.getState().setCandlesData(candles);
    }
    else if (type === 'CLEAR') {
        // Worker reset — clear all chart data
        useMarketStore.getState().clearCandles();
    }
};

/**
 * Change the candle timeframe. Call this when the user clicks a timeframe button.
 * It re-initializes the worker which clears history and starts fresh aggregation.
 */
export function requestHistory(symbol?: string) {
    const sym = symbol || useMarketStore.getState().currentSymbol;
    wsManager.send({ type: 'get_history', symbol: sym });
}

export function changeTimeframe(seconds: number) {
    if (useMarketStore.getState().timeframe === seconds) {
        return;
    }

    useMarketStore.getState().setTimeframe(seconds);
    candleWorker.postMessage({
        type: 'INIT',
        payload: { timeframeSec: seconds }
    });
    requestHistory();
}

class WSManager {
    private url: string;
    private ws: WebSocket | null = null;
    private reconnectDelay = 1000;
    private reconnectTimer: any = null;

    constructor(url: string) {
        this.url = url;
    }

    connect() {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('WS connected');
            this.reconnectDelay = 1000;
            useMarketStore.getState().setWsConnected(true);

            // Initialize the candle worker with current timeframe
            candleWorker.postMessage({
                type: 'INIT',
                payload: { timeframeSec: useMarketStore.getState().timeframe }
            });

            // Ask for symbol list in case welcome arrives before UI is ready.
            this.send({ type: 'get_symbols' });

            // Ask for history of current symbol
            requestHistory();

            // Subscribe to all watchlist symbols for real-time updates
            const watchlist = useMarketStore.getState().watchlist;
            watchlist.forEach(s => {
                if (s !== useMarketStore.getState().currentSymbol) {
                    this.send({ type: 'get_history', symbol: s });
                }
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                const state = useMarketStore.getState();
                const msgType = msg?.type;

                if (msgType === 'welcome') {
                    const symbols = Array.isArray(msg.symbols)
                        ? msg.symbols.map((item: { symbol: string }) => item.symbol).filter(Boolean)
                        : [];

                    if (symbols.length > 0) {
                        state.setSymbols(symbols);
                        if (!symbols.includes(state.currentSymbol)) {
                            state.setCurrentSymbol(symbols[0]);
                        }
                    }

                    if (typeof msg.user_id === 'string') {
                        state.setUserId(msg.user_id);
                    }
                    return;
                }

                if (msgType === 'symbols') {
                    const symbols = Array.isArray(msg.symbols)
                        ? msg.symbols.map((item: { symbol: string }) => item.symbol).filter(Boolean)
                        : [];

                    if (symbols.length > 0) {
                        state.setSymbols(symbols);
                        if (!symbols.includes(state.currentSymbol)) {
                            state.setCurrentSymbol(symbols[0]);
                        }
                    }
                    return;
                }

                if (msgType === 'orderbook') {
                    if (msg.symbol !== state.currentSymbol) return;

                    const bids = Array.isArray(msg.bids)
                        ? msg.bids.map((level: [number, number]) => ({ price: level[0], qty: level[1] }))
                        : [];
                    const asks = Array.isArray(msg.asks)
                        ? msg.asks.map((level: [number, number]) => ({ price: level[0], qty: level[1] }))
                        : [];
                    state.setOrderBook(bids, asks);
                    return;
                }

                if (msgType === 'trade') {
                    const price = Number(msg.price || 0);
                    const sym = String(msg.symbol || state.currentSymbol);
                    state.setPrice(sym, price);

                    if (sym !== state.currentSymbol) return;

                    const ts = normalizeToMs(msg.ts);
                    const inferredSide: 'BUY' | 'SELL' =
                        msg.buyer === state.userId
                            ? 'BUY'
                            : msg.seller === state.userId
                                ? 'SELL'
                                : msg.price >= state.lastPrice
                                    ? 'BUY'
                                    : 'SELL';

                    const trade = {
                        id: Number(msg.id || 0),
                        symbol: sym,
                        price: price,
                        qty: Number(msg.qty || 0),
                        side: inferredSide,
                        timestamp: ts,
                        buyer: msg.buyer,
                        seller: msg.seller,
                    };

                    state.addTrade(trade);
                    candleWorker.postMessage({
                        type: 'TICK',
                        payload: { price: trade.price, qty: trade.qty, timestamp: ts }
                    });
                    return;
                }

                if (msgType === 'history') {
                    // if (msg.symbol !== state.currentSymbol) return; // This line moves down

                    const candles = msg.candles.map((c: any) => ({
                        time: normalizeToSec(c.t),
                        open: Number(c.o || 0),
                        high: Number(c.h || 0),
                        low: Number(c.l || 0),
                        close: Number(c.c || 0),
                        volume: Number(c.v || 0),
                    }));

                    if (candles.length > 0) {
                        state.setPrice(msg.symbol, candles[candles.length - 1].close);
                    }

                    if (msg.symbol !== state.currentSymbol) return;
                    candleWorker.postMessage({ type: 'HISTORY', payload: candles });
                    return;
                }

                if (msgType === 'candle') {
                    const price = Number(msg.c || 0);
                    state.setPrice(msg.symbol, price);

                    if (msg.symbol !== state.currentSymbol) return;

                    const next = {
                        time: normalizeToSec(msg.t),
                        open: Number(msg.o || 0),
                        high: Number(msg.h || 0),
                        low: Number(msg.l || 0),
                        close: price,
                        volume: Number(msg.v || 0),
                    };

                    candleWorker.postMessage({ type: 'CANDLE_1S', payload: next });
                    return;
                }

                if (msgType === 'portfolio') {
                    const positions = msg.positions && typeof msg.positions === 'object' ? msg.positions : {};
                    const holdings = Object.entries(positions).map(([asset, raw]) => {
                        const value = raw as {
                            holdings?: number;
                            avg_cost?: number;
                            market_value?: number;
                            realized_pnl?: number;
                            unrealized_pnl?: number;
                        };

                        const qty = Number(value.holdings || 0);
                        const marketValue = Number(value.market_value || 0);
                        return {
                            asset,
                            qty,
                            avgPrice: Number(value.avg_cost || 0),
                            currentPrice: Math.abs(qty) > 1e-12 ? marketValue / qty : 0,
                            marketValue,
                            realizedPnl: Number(value.realized_pnl || 0),
                            unrealizedPnl: Number(value.unrealized_pnl || 0),
                        };
                    });

                    state.setPortfolio({
                        cash: Number(msg.cash || 0),
                        holdings,
                        realizedPnl: Number(msg.realized_pnl || 0),
                        unrealizedPnl: Number(msg.unrealized_pnl || 0),
                        totalValue: Number(msg.total_value || 0),
                    });
                    return;
                }

                if (msgType === 'open_orders') {
                    const orders = Array.isArray(msg.orders)
                        ? msg.orders.map((order: {
                            order_id: number;
                            symbol: string;
                            side: 'buy' | 'sell';
                            price: number;
                            orig_qty: number;
                            remaining_qty: number;
                        }) => ({
                            order_id: Number(order.order_id),
                            symbol: String(order.symbol),
                            side: order.side === 'buy' ? 'BUY' : 'SELL' as const,
                            type: 'limit' as const,
                            price: Number(order.price || 0),
                            qty: Number(order.orig_qty || 0),
                            remainingQty: Number(order.remaining_qty || 0),
                            status: 'Open',
                        }))
                        : [];
                    state.setOpenOrders(orders);
                    return;
                }

                if (msgType === 'error') {
                    console.warn('Server error:', msg.message);
                    return;
                }
            } catch (err) {
                // ignore JSON errors
            }
        };

        this.ws.onclose = () => {
            useMarketStore.getState().setWsConnected(false);
            console.log(`WS closed, reconnecting in ${this.reconnectDelay}ms`);
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
        };
    }

    send(message: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}

function normalizeToMs(ts: unknown): number {
    const value = Number(ts || 0);
    if (value <= 0) return Date.now();
    return value < 1e12 ? value * 1000 : value;
}

function normalizeToSec(ts: unknown): number {
    const value = Number(ts || 0);
    if (value <= 0) return Math.floor(Date.now() / 1000);
    return Math.floor(value < 1e12 ? value : value / 1000);
}

export const wsManager = new WSManager('ws://localhost:9001');
