import useMarketStore from '../store/useMarketStore';

export const candleWorker = new Worker(new URL('../workers/candleWorker.ts', import.meta.url), {
    type: 'module',
});

candleWorker.onmessage = (e) => {
    const { type, candle, isNew } = e.data;
    if (type === 'CANDLE_UPDATE') {
        const state = useMarketStore.getState();
        const newCandles = isNew ? [...state.candles, candle].slice(-1000) : state.candles;
        useMarketStore.getState().setCandlesData(newCandles, candle);
    }
};

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

            candleWorker.postMessage({
                type: 'INIT',
                payload: { timeframeMs: useMarketStore.getState().timeframe * 1000 }
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                // Translating backend TRADE and TOB to the frontend spec:
                if (msg.event === 'TOB') {
                    // Mock 5 levels of bids and asks using the single TOB from the backend
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
                    // Trade implies a tick update
                    const trade = {
                        price: msg.price,
                        qty: msg.qty,
                        side: (Math.random() > 0.5 ? 'BUY' : 'SELL') as 'BUY' | 'SELL', // server.py doesn't emit side directly
                        timestamp: Date.now()
                    };
                    useMarketStore.getState().addTrade(trade);
                    candleWorker.postMessage({ type: 'TICK', payload: trade });
                }
                else if (msg.event === 'ACK') {
                    // Provide a mock portfolio update on order ACK for testing
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

// Reverted WS string back to /ws/trade
export const wsManager = new WSManager('ws://localhost:8000/ws/trade');
