import useMarketStore from '../store/useMarketStore';

export const candleWorker = new Worker(new URL('../workers/candleWorker.ts', import.meta.url), {
    type: 'module',
});

candleWorker.onmessage = (e) => {
    const { type, candle, isNew } = e.data;

    if (type === 'CANDLE_UPDATE') {
        const state = useMarketStore.getState();
        const newCandles = isNew ? [...state.candles, candle].slice(-2000) : state.candles;
        useMarketStore.getState().setCandlesData(newCandles, candle);
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
export function changeTimeframe(seconds: number) {
    useMarketStore.getState().setTimeframe(seconds);
    candleWorker.postMessage({
        type: 'INIT',
        payload: { timeframeSec: seconds }
    });
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
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                if (msg.type === 'orderbook') {
                    // New C++ backend sends 'orderbook' with multiple levels
                    if (msg.bids && Array.isArray(msg.bids)) {
                        const bids = msg.bids.map((b: any) => ({
                            price: Array.isArray(b) ? b[0] : b.price,
                            qty: Array.isArray(b) ? b[1] : b.qty
                        }));
                        const asks = msg.asks.map((a: any) => ({
                            price: Array.isArray(a) ? a[0] : a.price,
                            qty: Array.isArray(a) ? a[1] : a.qty
                        }));
                        useMarketStore.getState().setOrderBook(bids, asks);
                    }
                }
                else if (msg.type === 'trade') {
                    const trade = {
                        price: msg.price,
                        qty: msg.qty,
                        side: (msg.side || (Math.random() > 0.5 ? 'buy' : 'sell')).toUpperCase() as 'BUY' | 'SELL',
                        timestamp: msg.ts || Date.now()
                    };
                    useMarketStore.getState().addTrade(trade);
                    // Do NOT post to candleWorker here to avoid duplicate updates.
                    // We will use the 'candle' messages for the chart.
                }
                else if (msg.type === 'candle') {
                    const currentSymbol = useMarketStore.getState().currentSymbol;
                    if (msg.symbol === currentSymbol) {
                        const t = Math.floor(msg.t / 1000);
                        const c = { time: t, open: msg.o, high: msg.h, low: msg.l, close: msg.c, volume: msg.v };
                        candleWorker.postMessage({ type: 'CANDLE_1S', payload: c });
                    }
                }
                else if (msg.type === 'portfolio') {
                    // New C++ backend sends full portfolio
                    const holdings = Object.entries(msg.positions || {}).map(([symbol, pos]: [string, any]) => ({
                        asset: symbol,
                        qty: pos.holdings,
                        avgPrice: pos.avg_cost,
                        currentPrice: pos.avg_cost + (pos.unrealized_pnl / (pos.holdings || 1)),
                        pnl: pos.realized_pnl + pos.unrealized_pnl
                    }));
                    useMarketStore.getState().setPortfolio({
                        cash: msg.cash,
                        holdings,
                        pnl: msg.realized_pnl + msg.unrealized_pnl
                    });
                }
                else if (msg.type === 'symbols' || msg.type === 'welcome') {
                    // Ignore for now, handled in dashboard
                }
                else if (msg.type === 'ack') {
                    console.log('Order Ack:', msg);
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

export const wsManager = new WSManager('ws://localhost:9001/ws/trade');
