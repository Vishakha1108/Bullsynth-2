import { create } from 'zustand';

export interface Trade {
    id?: string;
    symbol?: string;
    price: number;
    qty: number;
    side?: 'BUY' | 'SELL';
    timestamp: number;
}

export interface Order {
    id: string;
    symbol?: string;
    side: 'BUY' | 'SELL';
    type: 'limit' | 'market';
    price?: number;
    qty: number;
    status?: string;
}

export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// New Portfolio structure matched to the C++ backend
export interface Position {
    holdings: number;
    avg_cost: number;
    realized_pnl: number;
    unrealized_pnl: number;
    market_value: number;
}

export interface Portfolio {
    cash: number;
    positions: Record<string, Position>;
    realized_pnl: number;
    unrealized_pnl: number;
    total_value: number;
}

export interface CrosshairData {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    time: number;
}

export const TIMEFRAMES = [
    { label: '1m', seconds: 60 },
    { label: '5m', seconds: 300 },
    { label: '15m', seconds: 900 },
    { label: '1H', seconds: 3600 },
    { label: '4H', seconds: 14400 },
    { label: '1D', seconds: 86400 },
] as const;

interface MarketState {
    availableSymbols: string[];
    candles: Candle[];
    candlesBySymbol: Record<string, Candle[]>;
    latestCandle: Candle | null;
    timeframe: number; // in seconds
    currentSymbol: string;
    crosshairData: CrosshairData | null;
    orderBook: { bids: { price: number, qty: number }[], asks: { price: number, qty: number }[] };
    recentTrades: Trade[];
    lastPrice: number;
    priceChange24h: number;
    high24h: number;
    low24h: number;

    portfolio: Portfolio;
    openOrders: Order[];
    wsConnected: boolean;

    setAvailableSymbols: (symbols: string[]) => void;
    setTimeframe: (seconds: number) => void;
    setCurrentSymbol: (symbol: string) => void;
    setCrosshairData: (data: CrosshairData | null) => void;

    // Candle setters
    setInitialCandles: (candles: Candle[]) => void;
    addCandle: (candle: Candle) => void;
    addCandleForSymbol: (symbol: string, candle: Candle) => void;
    clearCandles: () => void;

    setOrderBook: (bids: { price: number, qty: number }[], asks: { price: number, qty: number }[]) => void;
    addTrade: (trade: Trade) => void;
    setWsConnected: (connected: boolean) => void;
    addOrder: (order: Order) => void;
    removeOrder: (id: string) => void;
    setOpenOrders: (orders: Order[]) => void;
    setPortfolio: (p: Portfolio) => void;

    // Live update the forming candle based on trades or mid-price
    updateFormingCandle: (price: number, qty: number) => void;
}

function insertCandle(existing: Candle[], candle: Candle): Candle[] {
    if (existing.length === 0) {
        return [candle];
    }
    const last = existing[existing.length - 1];
    // Fast path: chronological advance
    if (candle.time > last.time) {
        const next = [...existing, candle];
        if (next.length > 500) next.shift();
        return next;
    }

    // Fast path: update forming candle
    if (candle.time === last.time) {
        const next = [...existing];
        next[next.length - 1] = candle;
        return next;
    }

    // Slow path: out of order candle (due to live stream interlaced with historical dump)
    const next = [...existing];
    const idx = next.findIndex(c => c.time === candle.time);
    if (idx !== -1) {
        next[idx] = candle;
    } else {
        next.push(candle);
        next.sort((a, b) => a.time - b.time);
        if (next.length > 500) next.shift();
    }
    return next;
}

const useMarketStore = create<MarketState>((set) => ({
    availableSymbols: ['AAPL', 'GOOGL', 'BTC', 'ETH'], // Fallback defaults until WS connects
    candles: [],
    candlesBySymbol: {},
    latestCandle: null,
    timeframe: 60, // 1 minute default
    currentSymbol: 'AAPL',
    crosshairData: null,
    orderBook: { bids: [], asks: [] },
    recentTrades: [],
    lastPrice: 0,
    priceChange24h: 0,
    high24h: 0,
    low24h: 0,

    portfolio: {
        cash: 0,
        positions: {},
        realized_pnl: 0,
        unrealized_pnl: 0,
        total_value: 0
    },
    openOrders: [],
    wsConnected: false,

    setAvailableSymbols: (symbols) => set({ availableSymbols: symbols }),
    setTimeframe: (seconds) => set({ timeframe: seconds }),

    // When switching symbols, load cached candles for that symbol
    setCurrentSymbol: (symbol) => set((state) => {
        const cached = state.candlesBySymbol[symbol] || [];
        const latest = cached.length > 0 ? cached[cached.length - 1] : null;
        return {
            currentSymbol: symbol,
            candles: cached,
            latestCandle: latest,
        };
    }),

    setCrosshairData: (data) => set({ crosshairData: data }),

    setInitialCandles: (candles) => set({
        candles,
        latestCandle: candles.length > 0 ? candles[candles.length - 1] : null
    }),

    // Legacy addCandle: updates the current symbol's candles
    addCandle: (candle) => set((state) => {
        const symbol = state.currentSymbol;
        const updated = insertCandle(state.candles, candle);
        return {
            candles: updated,
            latestCandle: updated[updated.length - 1],
            candlesBySymbol: { ...state.candlesBySymbol, [symbol]: updated },
        };
    }),

    // Per-symbol candle update: caches for all symbols, reflects to active view if current
    addCandleForSymbol: (symbol, candle) => set((state) => {
        const existing = state.candlesBySymbol[symbol] || [];
        const updated = insertCandle(existing, candle);
        const newCandlesBySymbol = { ...state.candlesBySymbol, [symbol]: updated };

        if (symbol === state.currentSymbol) {
            return {
                candlesBySymbol: newCandlesBySymbol,
                candles: updated,
                latestCandle: updated[updated.length - 1],
            };
        }
        return { candlesBySymbol: newCandlesBySymbol };
    }),

    clearCandles: () => set({ candles: [], latestCandle: null }),

    setOrderBook: (bids, asks) => set({ orderBook: { bids, asks } }),

    addTrade: (trade) => set((state) => {
        const isNewHigh = trade.price > state.high24h;
        const isNewLow = trade.price < state.low24h || state.low24h === 0;
        return {
            recentTrades: [trade, ...state.recentTrades].slice(0, 50),
            lastPrice: trade.price,
            high24h: isNewHigh ? trade.price : state.high24h,
            low24h: isNewLow ? trade.price : state.low24h
        };
    }),

    updateFormingCandle: (price, qty) => set((state) => {
        if (state.candles.length === 0) return state;
        const newCandles = [...state.candles];
        const last = { ...newCandles[newCandles.length - 1] };

        last.close = price;
        if (price > last.high) last.high = price;
        if (price < last.low) last.low = price;
        last.volume += qty;

        newCandles[newCandles.length - 1] = last;

        // Also update the cached symbol
        const symbol = state.currentSymbol;
        const newCandlesBySymbol = { ...state.candlesBySymbol, [symbol]: newCandles };

        return {
            candles: newCandles,
            latestCandle: last,
            candlesBySymbol: newCandlesBySymbol
        };
    }),

    setWsConnected: (connected) => set({ wsConnected: connected }),
    addOrder: (order) => set((state) => ({ openOrders: [...state.openOrders, order] })),
    removeOrder: (id) => set((state) => ({ openOrders: state.openOrders.filter(o => o.id !== id) })),

    // Bulk-replace open orders from server's open_orders message
    setOpenOrders: (orders) => set({ openOrders: orders }),

    setPortfolio: (p) => set({ portfolio: p })
}));

export default useMarketStore;
