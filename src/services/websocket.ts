import useMarketStore from '../store/useMarketStore';
import type { Order } from '../store/useMarketStore';

/**
 * Change the candle timeframe.
 * Note: The new Synthetic-Bull backend currently streams fixed candles (e.g. 1m or 5m).
 * This function just updates the UI state for now.
 */
export function changeTimeframe(seconds: number) {
    useMarketStore.getState().setTimeframe(seconds);
    // Future: send a websocket request to subscribe to a different timeframe stream if supported.
}

class WSManager {
    private url: string;
    private ws: WebSocket | null = null;
    private reconnectDelay = 1000;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(url: string) {
        this.url = url;
    }

    connect() {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('WS connected to Synthetic-Bull engine');
            this.reconnectDelay = 1000;
            useMarketStore.getState().setWsConnected(true);
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                const state = useMarketStore.getState();

                switch (msg.type) {
                    case 'welcome':
                        // Welcome payload: { symbols: [{ symbol: 'AAPL', price: 150 }, ...] }
                        if (msg.symbols && Array.isArray(msg.symbols)) {
                            const symbols = msg.symbols.map((s: any) => s.symbol);
                            state.setAvailableSymbols(symbols);
                            if (!symbols.includes(state.currentSymbol)) {
                                state.setCurrentSymbol(symbols[0] || 'AAPL');
                            }
                        }
                        break;

                    case 'orderbook':
                        // Only process orderbook for the currently viewed symbol
                        if (msg.symbol === state.currentSymbol) {
                            const mapLevel = (lvl: any[]) => ({ price: lvl[0], qty: lvl[1] });
                            state.setOrderBook(
                                (msg.bids || []).map(mapLevel),
                                (msg.asks || []).map(mapLevel)
                            );
                            if (msg.mid) {
                                state.updateFormingCandle(msg.mid, 0);
                                useMarketStore.setState({ lastPrice: msg.mid });
                            }
                        }
                        break;

                    case 'trade':
                        if (msg.symbol === state.currentSymbol) {
                            state.addTrade({
                                id: msg.id,
                                symbol: msg.symbol,
                                price: msg.price,
                                qty: msg.qty,
                                timestamp: msg.ts || Date.now(),
                            });
                            state.updateFormingCandle(msg.price, msg.qty);
                        }
                        break;

                    case 'candle':
                        // Store candles for ALL symbols (not just current) so switching
                        // symbols shows historical data immediately.
                        {
                            // Ensure time is in seconds for lightweight-charts
                            const timeSecs = Math.floor(msg.t / 1000);
                            state.addCandleForSymbol(msg.symbol, {
                                time: timeSecs,
                                open: msg.o,
                                high: msg.h,
                                low: msg.l,
                                close: msg.c,
                                volume: msg.v
                            });
                        }
                        break;

                    case 'portfolio':
                        // The backend pushes the full portfolio on connect and after trades
                        state.setPortfolio({
                            cash: msg.cash,
                            positions: msg.positions || {},
                            realized_pnl: msg.realized_pnl,
                            unrealized_pnl: msg.unrealized_pnl,
                            total_value: msg.total_value
                        });
                        break;

                    case 'open_orders':
                        // Backend sends the full open orders list after connect, place, and cancel
                        {
                            const orders: Order[] = (msg.orders || []).map((o: any) => ({
                                id: String(o.order_id),
                                symbol: o.symbol,
                                side: (o.side as string).toUpperCase() as 'BUY' | 'SELL',
                                type: 'limit' as const,
                                price: o.price,
                                qty: o.qty ?? o.remaining_qty,
                                status: 'open',
                            }));
                            state.setOpenOrders(orders);
                        }
                        break;

                    case 'ack':
                        console.log('Order accepted:', msg);
                        break;

                    case 'cancel_ack':
                        console.log('Order cancelled:', msg);
                        break;

                    case 'error':
                        console.error('Engine error:', msg.message);
                        break;
                }
            } catch (err) {
                console.error('Failed to parse WS message:', err);
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

// Connect to the new C++ backend on port 9001
export const wsManager = new WSManager('ws://localhost:9001/ws');
