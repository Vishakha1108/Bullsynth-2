import useMarketStore from '../store/useMarketStore';

export const candleWorker = new Worker(new URL('../workers/candleWorker.ts', import.meta.url), {
    type: 'module',
});

candleWorker.onmessage = (e) => {
    const { type, candle, candles, symbol, timeframeSec } = e.data;

    if (type === 'CANDLE_UPDATE') {
        useMarketStore.getState().setLatestCandle(candle, symbol, timeframeSec);
    }
    else if (type === 'HISTORY_UPDATE') {
        useMarketStore.getState().setCandlesData(candles, null, symbol, timeframeSec);
    }
    else if (type === 'CLEAR') {
        // Worker reset — clear all chart data
        useMarketStore.getState().clearCandles();
    }
    else if (type === 'COMPARE_HISTORY_UPDATE') {
        useMarketStore.getState().setCompareCandles(symbol, candles);
    }
};

// Track which symbols already have history fetched — avoids redundant re-fetches
const fetchedSymbols = new Set<string>();
export function isSymbolCached(symbol: string): boolean {
    return fetchedSymbols.has(symbol);
}

// ── Initial candle batching ──────────────────────────────────────────────────
// The backend sends candle history as individual 'candle' messages on connect.
// We batch them per-symbol and flush to the worker as HISTORY after a short pause.
const pendingCandles: Record<string, Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>> = {};
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DELAY = 300; // ms — wait for the initial burst to finish

function queueInitialCandle(symbol: string, candle: { time: number; open: number; high: number; low: number; close: number; volume: number }) {
    if (!pendingCandles[symbol]) pendingCandles[symbol] = [];
    pendingCandles[symbol].push(candle);

    // Reset the debounce timer on every candle
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushPendingCandles, FLUSH_DELAY);
}

// Keep the helper reachable for strict noUnusedLocals builds.
void queueInitialCandle;

function flushPendingCandles() {
    flushTimer = null;
    const currentSymbol = useMarketStore.getState().currentSymbol;

    for (const sym of Object.keys(pendingCandles)) {
        const candles = pendingCandles[sym];
        if (!candles || candles.length === 0) continue;
        fetchedSymbols.add(sym);

        candleWorker.postMessage({ type: 'HISTORY', payload: { symbol: sym, candles } });
        // Price update for non-current symbols
        const last = candles[candles.length - 1];
        const first = candles[0];
        const change = first.open > 0 ? ((last.close - first.open) / first.open) * 100 : 0;
        useMarketStore.getState().setPrice(sym, last.close, sym === currentSymbol ? change : undefined);
    }

    // Clear all pending
    for (const k of Object.keys(pendingCandles)) delete pendingCandles[k];
}

/**
 * Request history — the backend sends history as individual candle messages
 * on connect, so for reconnects/symbol changes we re-init the worker which
 * will use its rawCache. This is kept as a no-op for compatibility.
 */
export function requestHistory(_symbol?: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Backend does not support get_history — history arrives as individual candle messages on connect.
    // The worker's rawCache handles symbol switches via INIT.
}

export function requestCompareHistory(symbol: string) {
    candleWorker.postMessage({ type: 'GET_COMPARE_HISTORY', payload: { symbol } });
}

useMarketStore.subscribe((state, prevState) => {
    // 1. Handle layout changes or full re-initialization
    if (state.layoutId !== prevState.layoutId) {
        // Initialize all panes in the worker
        Object.values(state.paneConfigs).forEach(config => {
            candleWorker.postMessage({
                type: 'INIT',
                payload: { timeframeSec: config.timeframe, symbol: config.symbol }
            });
        });
    }

    // 2. Handle current symbol/timeframe changes
    if (state.layoutId === 'l1') {
        // Single-pane: react to global state changes
        if (state.currentSymbol !== prevState.currentSymbol || state.timeframe !== prevState.timeframe) {
            candleWorker.postMessage({
                type: 'INIT',
                payload: { timeframeSec: state.timeframe, symbol: state.currentSymbol }
            });
            state.compareSymbols.forEach((sym) => requestCompareHistory(sym));
        }
    } else {
        // Multi-pane: react to individual paneConfig changes, not global timeframe
        for (const [paneId, config] of Object.entries(state.paneConfigs)) {
            const prevConfig = prevState.paneConfigs[paneId];
            if (!prevConfig || config.symbol !== prevConfig.symbol || config.timeframe !== prevConfig.timeframe) {
                candleWorker.postMessage({
                    type: 'INIT',
                    payload: { timeframeSec: config.timeframe, symbol: config.symbol }
                });
            }
        }
        // Rebuild compare candles when active pane's context changes
        if (state.currentSymbol !== prevState.currentSymbol) {
            state.compareSymbols.forEach((sym) => requestCompareHistory(sym));
        }
    }

    // 3. Handle replay mode transitions
    if (prevState.isReplayMode && !state.isReplayMode) {
        // Re-init worker for all panes to rebuild from rawCache after replay ends
        Object.values(state.paneConfigs).forEach(config => {
            candleWorker.postMessage({
                type: 'INIT',
                payload: { timeframeSec: config.timeframe, symbol: config.symbol }
            });
        });

        state.compareSymbols.forEach((sym) => requestCompareHistory(sym));
    }
});

export function changeTimeframe(seconds: number) {
    if (useMarketStore.getState().timeframe !== seconds) {
        useMarketStore.getState().setTimeframe(seconds);
    }
}

class WSManager {
    private url: string;
    private ws: WebSocket | null = null;
    private reconnectDelay = 1000;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private accountSyncTimer: ReturnType<typeof setTimeout> | null = null;
    private accountSyncQueued = false;

    constructor(url: string) {
        this.url = url;
    }

    private queueAccountSync(delayMs = 80) {
        if (this.accountSyncQueued && delayMs > 0) {
            return;
        }

        this.accountSyncQueued = true;
        if (this.accountSyncTimer) {
            clearTimeout(this.accountSyncTimer);
        }
        this.accountSyncTimer = setTimeout(() => {
            this.accountSyncTimer = null;
            this.accountSyncQueued = false;
            this.send({ type: 'get_portfolio' });
            this.send({ type: 'get_open_orders' });
        }, delayMs);
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('WS connected');
            this.reconnectDelay = 1000;
            useMarketStore.getState().setWsConnected(true);

            // Initialize the candle worker with current timeframe
            const initState = useMarketStore.getState();
            candleWorker.postMessage({
                type: 'INIT',
                payload: { timeframeSec: initState.timeframe, symbol: initState.currentSymbol }
            });

            initState.compareSymbols.forEach((sym) => requestCompareHistory(sym));

            // Frontend session uses guest_login (no API key required).
            this.send({ type: 'guest_login' });

            // Ask for symbol list in case welcome arrives before UI is ready.
            this.send({ type: 'get_symbols' });
            this.queueAccountSync(0);
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                const state = useMarketStore.getState();
                const msgType = msg?.type;

                if (msgType === 'welcome' || msgType === 'symbols') {
                    const rawSymbols = Array.isArray(msg.symbols) ? msg.symbols : [];
                    const symbols = rawSymbols.map((item: { symbol?: string; name?: string; category?: string; asset_type?: string } | string) => typeof item === 'string' ? item : item.symbol).filter(Boolean);
                    const tickers = rawSymbols.map((item: { symbol?: string; name?: string; category?: string; asset_type?: string } | string) => ({
                        symbol: typeof item === 'string' ? item : item.symbol,
                        name: typeof item === 'string' ? '' : (item.name || ''),
                        category: typeof item === 'string' ? 'Stocks' : (item.category || item.asset_type || 'Stocks'),
                    })).filter((t: { symbol?: string }) => t.symbol);

                    const rawShortCfg = (msg && typeof msg.short_selling === 'object')
                        ? msg.short_selling as Record<string, unknown>
                        : null;

                    if (rawShortCfg) {
                        const maxShortQtyPerSymbol = Number(rawShortCfg.max_short_qty_per_symbol ?? 0);
                        const maxTotalShortNotional = Number(rawShortCfg.max_total_short_notional ?? 0);
                        const minEquity = Number(rawShortCfg.min_equity ?? 0);
                        const maxShortNotionalToEquity = Number(rawShortCfg.max_short_notional_to_equity ?? 0);

                        state.setShortSellingConfig({
                            enabled: Boolean(rawShortCfg.enabled),
                            maxShortQtyPerSymbol: Number.isFinite(maxShortQtyPerSymbol) ? maxShortQtyPerSymbol : 0,
                            maxTotalShortNotional: Number.isFinite(maxTotalShortNotional) ? maxTotalShortNotional : 0,
                            minEquity: Number.isFinite(minEquity) ? minEquity : 0,
                            maxShortNotionalToEquity: Number.isFinite(maxShortNotionalToEquity) ? maxShortNotionalToEquity : 0,
                        });
                    }

                    if (symbols.length > 0) {
                        state.setSymbols(symbols);
                        state.setTickers(tickers);
                        if (!symbols.includes(state.currentSymbol)) {
                            state.setCurrentSymbol(symbols[0]);
                        }
                    }

                    if (msgType === 'welcome' && typeof msg.user_id === 'string') {
                        state.setUserId(msg.user_id);
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
                    const involvesUser = Boolean(state.userId && (msg.buyer === state.userId || msg.seller === state.userId));

                    if (sym === state.currentSymbol && state.candles.length > 0) {
                        const openPrice = state.candles[0].open;
                        const change = openPrice > 0 ? ((price - openPrice) / openPrice) * 100 : 0;
                        state.setPrice(sym, price, change);
                    } else {
                        state.setPrice(sym, price);
                    }

                    if (involvesUser) {
                        this.queueAccountSync();
                    }

                    if (sym !== state.currentSymbol) return;

                    const rawTs = msg.ts ?? msg.t ?? msg.time ?? msg.timestamp;
                    const fallbackTs = state.latestCandle ? state.latestCandle.time * 1000 : Date.now();
                    const ts = rawTs ? normalizeToMs(rawTs) : fallbackTs;
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
                        payload: { price: trade.price, qty: trade.qty, timestamp: ts, symbol: trade.symbol }
                    });
                    return;
                }

                if (msgType === 'ack' || msgType === 'cancel_ack') {
                    this.queueAccountSync();
                    return;
                }

                if (msgType === 'history') {
                    const candles = msg.candles.map((c: Record<string, unknown>) => ({
                        time: normalizeToSec(c.t ?? c.ts ?? c.time),
                        open: Number(c.o || 0),
                        high: Number(c.h || 0),
                        low: Number(c.l || 0),
                        close: Number(c.c || 0),
                        volume: Number(c.v || 0),
                    }));

                    if (candles.length > 0) {
                        const closePrice = candles[candles.length - 1].close;
                        const openPrice = candles[0].open;
                        const change = openPrice > 0 ? ((closePrice - openPrice) / openPrice) * 100 : 0;
                        state.setPrice(msg.symbol, closePrice, change);
                    }

                    // Keep worker raw cache warm for all symbols so compare backfill is instant.
                    candleWorker.postMessage({ type: 'CACHE_HISTORY', payload: { symbol: msg.symbol, candles } });

                    if (msg.symbol === state.currentSymbol) {
                        fetchedSymbols.add(msg.symbol);
                        candleWorker.postMessage({ type: 'HISTORY', payload: { symbol: msg.symbol, candles, timeframeSec: state.timeframe } });
                    } else {
                        if (state.compareSymbols.includes(msg.symbol)) {
                            state.setCompareCandles(msg.symbol, candles);
                        }
                        // Store non-current symbol data directly in paneCandles
                        fetchedSymbols.add(msg.symbol);
                        state.setCandlesData(candles, null, msg.symbol);
                    }
                    return;
                }

                if (msgType === 'candle') {
                    const price = Number(msg.c || 0);
                    const sym = msg.symbol;
                    const candleTimeSec = normalizeToSec(msg.t ?? msg.ts ?? msg.time);
                    const nowSec = Math.floor(Date.now() / 1000);
                    const isNearRealtime = candleTimeSec >= (nowSec - 2);

                    if (sym && (isNearRealtime || state.prices[sym] == null)) {
                        state.setPrice(sym, price);
                    }

                    const next = {
                        symbol: sym,
                        time: candleTimeSec,
                        open: Number(msg.o || 0),
                        high: Number(msg.h || 0),
                        low: Number(msg.l || 0),
                        close: price,
                        volume: Number(msg.v || 0),
                    };

                    if (msg.symbol !== state.currentSymbol && state.compareSymbols.includes(msg.symbol)) {
                        state.updateCompareCandle(msg.symbol, next);
                    }

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
                    const isUnknownType = msg.message?.toLowerCase().includes('unknown message type');
                    if (!isUnknownType) {
                        state.addNotification(msg.message || 'An unknown error occurred', 'error');
                    }
                    return;
                }
            } catch {
                // ignore JSON errors
            }
        };

        this.ws.onclose = () => {
            this.ws = null;
            fetchedSymbols.clear();
            if (this.accountSyncTimer) {
                clearTimeout(this.accountSyncTimer);
                this.accountSyncTimer = null;
            }
            this.accountSyncQueued = false;
            if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
            for (const k of Object.keys(pendingCandles)) delete pendingCandles[k];
            useMarketStore.getState().setWsConnected(false);
            console.log(`WS closed, reconnecting in ${this.reconnectDelay}ms`);
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
        };
    }

    send(message: Record<string, unknown>) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}

function normalizeToMs(ts: unknown): number {
    if (typeof ts === 'string') {
        const trimmed = ts.trim();
        if (!trimmed) return Date.now();

        const numeric = Number(trimmed);
        if (Number.isFinite(numeric) && numeric > 0) {
            if (numeric > 1e14) return Math.floor(numeric / 1000);
            return numeric < 1e12 ? numeric * 1000 : numeric;
        }

        const parsed = Date.parse(trimmed);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }

        return Date.now();
    }

    const value = Number(ts ?? 0);
    if (!Number.isFinite(value) || value <= 0) return Date.now();
    if (value > 1e14) return Math.floor(value / 1000);
    return value < 1e12 ? value * 1000 : value;
}

function normalizeToSec(ts: unknown): number {
    return Math.floor(normalizeToMs(ts) / 1000);
}

export const wsManager = new WSManager(import.meta.env.VITE_WS_URL || 'ws://localhost:9001');
