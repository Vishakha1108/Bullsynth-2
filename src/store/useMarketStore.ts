import { create } from 'zustand';

export interface Trade {
    id: number;
    symbol: string;
    price: number;
    qty: number;
    side: 'BUY' | 'SELL';
    timestamp: number;
    buyer?: string;
    seller?: string;
}

export interface Order {
    order_id: number;
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'limit';
    price: number;
    qty: number;
    remainingQty: number;
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

export interface Portfolio {
    cash: number;
    holdings: {
        asset: string;
        qty: number;
        avgPrice: number;
        currentPrice: number;
        marketValue: number;
        realizedPnl: number;
        unrealizedPnl: number;
    }[];
    realizedPnl: number;
    unrealizedPnl: number;
    totalValue: number;
}

export interface CrosshairData {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    time: number;
}

export type IndicatorId =
    | 'sma20'
    | 'sma50'
    | 'sma100'
    | 'ema20'
    | 'ema50'
    | 'ema100'
    | 'vwap'
    | 'bb20'
    | 'rsi14'
    | 'macd';

export interface IndicatorDefinition {
    id: IndicatorId;
    label: string;
    category: 'Trend' | 'Volatility' | 'Volume' | 'Oscillator';
    description: string;
}

export const INDICATOR_COLORS: Record<IndicatorId, string> = {
    sma20: '#f59e0b',
    sma50: '#fb7185',
    sma100: '#60a5fa',
    ema20: '#22d3ee',
    ema50: '#a78bfa',
    ema100: '#4ade80',
    vwap: '#fde047',
    bb20: '#9ca3af',
    rsi14: '#818cf8',
    macd: '#34d399',
};

export const INDICATOR_LIBRARY: IndicatorDefinition[] = [
    { id: 'sma20', label: 'Simple Moving Average (20)', category: 'Trend', description: '20-period simple moving average' },
    { id: 'sma50', label: 'Simple Moving Average (50)', category: 'Trend', description: '50-period simple moving average' },
    { id: 'sma100', label: 'Simple Moving Average (100)', category: 'Trend', description: '100-period simple moving average' },
    { id: 'ema20', label: 'Exponential Moving Average (20)', category: 'Trend', description: '20-period exponential moving average' },
    { id: 'ema50', label: 'Exponential Moving Average (50)', category: 'Trend', description: '50-period exponential moving average' },
    { id: 'ema100', label: 'Exponential Moving Average (100)', category: 'Trend', description: '100-period exponential moving average' },
    { id: 'vwap', label: 'Volume Weighted Average Price', category: 'Volume', description: 'Session VWAP' },
    { id: 'bb20', label: 'Bollinger Bands (20, 2)', category: 'Volatility', description: 'Upper and lower volatility bands' },
    { id: 'rsi14', label: 'Relative Strength Index (14)', category: 'Oscillator', description: 'Momentum oscillator from 0 to 100' },
    { id: 'macd', label: 'MACD (12, 26, 9)', category: 'Oscillator', description: 'Trend momentum with histogram and signal line' },
];

export const AVAILABLE_SYMBOLS = [
    'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'BTC', 'ETH'
];

export const TIMEFRAMES = [
    { label: '1s', seconds: 1 },
    { label: '5s', seconds: 5 },
    { label: '20s', seconds: 20 },
    { label: '1m', seconds: 60 },
    { label: '5m', seconds: 300 },
] as const;

function normalizeCandleTime(time: number): number {
    if (!Number.isFinite(time)) return Math.floor(Date.now() / 1000);
    return time > 1e12 ? Math.floor(time / 1000) : Math.floor(time);
}

function sanitizeCandles(input: Candle[]): Candle[] {
    if (input.length === 0) return input;

    const normalized = input.map((candle) => ({
        ...candle,
        time: normalizeCandleTime(candle.time),
    }));

    normalized.sort((a, b) => a.time - b.time);

    const deduped: Candle[] = [];
    for (const candle of normalized) {
        const last = deduped[deduped.length - 1];
        if (last && last.time === candle.time) {
            deduped[deduped.length - 1] = candle;
        } else {
            deduped.push(candle);
        }
    }

    return deduped;
}

interface MarketState {
    candles: Candle[];
    latestCandle: Candle | null;
    timeframe: number; // in seconds
    currentSymbol: string;
    symbols: string[];
    tickers: { symbol: string; name: string; category: string }[];
    userId: string | null;
    crosshairData: CrosshairData | null;
    orderBook: { bids: { price: number, qty: number }[], asks: { price: number, qty: number }[] };
    recentTrades: Trade[];
    lastPrice: number;
    priceChange24h: number;
    high24h: number;
    low24h: number;
    enabledIndicators: IndicatorId[];
    chartType: string;
    watchlist: string[];
    prices: Record<string, number>;
    priceChanges: Record<string, number>;

    historySequence: number;
    portfolio: Portfolio;
    openOrders: Order[];
    wsConnected: boolean;
    setTimeframe: (seconds: number) => void;
    setCurrentSymbol: (symbol: string) => void;
    setSymbols: (symbols: string[]) => void;
    setTickers: (tickers: { symbol: string; name: string; category: string }[]) => void;
    setUserId: (uid: string | null) => void;
    resetSymbolData: () => void;
    setCrosshairData: (data: CrosshairData | null) => void;
    setCandlesData: (candles: Candle[], latestCandle?: Candle | null) => void;
    setLatestCandle: (candle: Candle) => void;
    clearCandles: () => void;
    setOrderBook: (bids: { price: number, qty: number }[], asks: { price: number, qty: number }[]) => void;
    addTrade: (trade: Trade) => void;
    setWsConnected: (connected: boolean) => void;
    addOrder: (order: Order) => void;
    removeOrder: (orderId: number) => void;
    setOpenOrders: (orders: Order[]) => void;
    setPortfolio: (p: Portfolio) => void;
    toggleIndicator: (indicatorId: IndicatorId) => void;
    setIndicatorEnabled: (indicatorId: IndicatorId, enabled: boolean) => void;
    clearIndicators: () => void;
    setChartType: (type: string) => void;
    addToWatchlist: (symbol: string) => void;
    removeFromWatchlist: (symbol: string) => void;
    setPrice: (symbol: string, price: number, change?: number) => void;
}

const useMarketStore = create<MarketState>((set) => ({
    candles: [],
    latestCandle: null,
    timeframe: 1, // 1 second default
    currentSymbol: 'AAPL',
    symbols: AVAILABLE_SYMBOLS,
    tickers: [],
    userId: null,
    crosshairData: null,
    orderBook: { bids: [], asks: [] },
    recentTrades: [],
    lastPrice: 0,
    priceChange24h: 0,
    high24h: 0,
    low24h: 0,
    enabledIndicators: [],
    chartType: 'Candles',
    watchlist: ['AAPL', 'BTC', 'ETH'],
    prices: {},
    priceChanges: {},
    historySequence: 0,

    portfolio: {
        cash: 100000,
        holdings: [],
        realizedPnl: 0,
        unrealizedPnl: 0,
        totalValue: 100000,
    },
    openOrders: [],
    wsConnected: false,

    setTimeframe: (seconds) => set({ timeframe: seconds }),
    setCurrentSymbol: (symbol) => set({ currentSymbol: symbol }),
    setSymbols: (symbols) => set({ symbols }),
    setTickers: (tickers) => set({ tickers }),
    setUserId: (uid) => set({ userId: uid }),
    resetSymbolData: () => set({
        candles: [],
        latestCandle: null,
        orderBook: { bids: [], asks: [] },
        recentTrades: [],
    }),
    setCrosshairData: (data) => set({ crosshairData: data }),

    setCandlesData: (candles, latestCandle = null) => set((state) => {
        const source = candles || state.candles;
        const safeCandles = sanitizeCandles(source).slice(-2000);
        const safeLatest = latestCandle
            ? { ...latestCandle, time: normalizeCandleTime(latestCandle.time) }
            : safeCandles[safeCandles.length - 1] || state.latestCandle;

        return {
            candles: safeCandles,
            latestCandle: safeLatest,
            prices: safeLatest ? { ...state.prices, [state.currentSymbol]: safeLatest.close } : state.prices,
            lastPrice: safeLatest ? safeLatest.close : state.lastPrice,
            historySequence: state.historySequence + 1,
        };
    }),

    setLatestCandle: (candle: Candle) => set((state) => {
        const normalizedCandle = { ...candle, time: normalizeCandleTime(candle.time) };
        const updatedCandles = [...state.candles];
        const lastCandle = updatedCandles.length > 0 ? updatedCandles[updatedCandles.length - 1] : null;

        if (lastCandle) {
            if (normalizedCandle.time < lastCandle.time) {
                // Out of order old candle, ignore
                return state;
            } else if (normalizedCandle.time === lastCandle.time) {
                // Duplicate timestamp, overwrite instead of pushing
                updatedCandles[updatedCandles.length - 1] = normalizedCandle;
            } else {
                // Safely greater, push
                updatedCandles.push(normalizedCandle);
            }
        } else {
            updatedCandles.push(normalizedCandle);
        }

        if (updatedCandles.length > 2000) {
            updatedCandles.shift();
        }
        return {
            latestCandle: normalizedCandle,
            candles: updatedCandles,
            lastPrice: normalizedCandle.close,
            prices: { ...state.prices, [state.currentSymbol]: normalizedCandle.close }
        };
    }),

    clearCandles: () => set((state) => ({ candles: [], latestCandle: null, historySequence: state.historySequence + 1 })),

    setOrderBook: (bids, asks) => set({ orderBook: { bids, asks } }),

    addTrade: (trade) => set((state) => {
        const isNewHigh = trade.price > state.high24h;
        const isNewLow = trade.price < state.low24h;
        return {
            recentTrades: [trade, ...state.recentTrades].slice(0, 50),
            lastPrice: trade.price,
            high24h: isNewHigh ? trade.price : state.high24h,
            low24h: isNewLow ? trade.price : state.low24h
        };
    }),

    setWsConnected: (connected) => set({ wsConnected: connected }),
    addOrder: (order) => set((state) => ({ openOrders: [...state.openOrders, order] })),
    removeOrder: (orderId) => set((state) => ({ openOrders: state.openOrders.filter((o) => o.order_id !== orderId) })),
    setOpenOrders: (orders) => set({ openOrders: orders }),
    setPortfolio: (p) => set({ portfolio: p }),

    toggleIndicator: (indicatorId) => set((state) => ({
        enabledIndicators: state.enabledIndicators.includes(indicatorId)
            ? state.enabledIndicators.filter((id) => id !== indicatorId)
            : [...state.enabledIndicators, indicatorId]
    })),

    setIndicatorEnabled: (indicatorId, enabled) => set((state) => ({
        enabledIndicators: enabled
            ? (state.enabledIndicators.includes(indicatorId)
                ? state.enabledIndicators
                : [...state.enabledIndicators, indicatorId])
            : state.enabledIndicators.filter((id) => id !== indicatorId)
    })),

    clearIndicators: () => set({ enabledIndicators: [] }),
    setChartType: (type) => set({ chartType: type }),
    addToWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.includes(symbol) ? state.watchlist : [...state.watchlist, symbol]
    })),
    removeFromWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.filter((s) => s !== symbol)
    })),

    setPrice: (symbol, price, change) => set((state) => {
        const nextPrices = { ...state.prices, [symbol]: price };
        const nextChanges = change !== undefined ? { ...state.priceChanges, [symbol]: change } : state.priceChanges;

        if (symbol === state.currentSymbol) {
            return {
                prices: nextPrices,
                priceChanges: nextChanges,
                lastPrice: price,
                priceChange24h: change !== undefined ? change : state.priceChange24h
            };
        }
        return { prices: nextPrices, priceChanges: nextChanges };
    }),
}));

export default useMarketStore;
