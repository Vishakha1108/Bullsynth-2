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

                if (msg.event === 'TOB') {
                    const bids = Array.from({ length: 5 }).map((_, i) => ({
                        price: Number((msg.best_bid - (i * 0.05)).toFixed(2)),
                        qty: msg.bid_qty + (i * 15)
                    }));
                    const asks = Array.from({ length: 5 }).map((_, i) => ({
                        price: Number((msg.best_ask + (i * 0.05)).toFixed(2)),
                        qty: msg.ask_qty + (i * 15)
                    }));
                    useMarketStore.getState().setOrderBook(bids, asks);
                }
                else if (msg.event === 'TRADE') {
                    const trade = {
                        price: msg.price,
                        qty: msg.qty,
                        side: (Math.random() > 0.5 ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
                        timestamp: Date.now()
                    };
                    useMarketStore.getState().addTrade(trade);
                    candleWorker.postMessage({ type: 'TICK', payload: trade });
                }
                else if (msg.event === 'ACK') {
                    const currentPortfolio = useMarketStore.getState().portfolio;
                    useMarketStore.getState().setPortfolio({
                        ...currentPortfolio,
                        cash: currentPortfolio.cash - (msg.price !== 'Market' ? msg.price * msg.qty : 0),
                        pnl: currentPortfolio.pnl + (Math.random() * 100 - 50)
                    });
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

export const wsManager = new WSManager('ws://localhost:8000/ws/trade');
