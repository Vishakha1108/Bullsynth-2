import { create } from 'zustand';

export interface Trade {
    price: number;
    qty: number;
    side: 'BUY' | 'SELL';
    timestamp: number;
}

export interface Order {
    id: string;
    symbol: string;
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

export interface Portfolio {
    cash: number;
    holdings: { asset: string; qty: number; avgPrice: number; currentPrice?: number; pnl?: number }[];
    pnl: number;
}

export interface CrosshairData {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    time: number;
}

export const AVAILABLE_SYMBOLS = [
    'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'BTC', 'ETH'
];


export const TIMEFRAMES = [
    { label: '1m', seconds: 60 },
    { label: '5m', seconds: 300 },
    { label: '15m', seconds: 900 },
    { label: '1H', seconds: 3600 },
    { label: '4H', seconds: 14400 },
    { label: '1D', seconds: 86400 },
] as const;

interface MarketState {
    candles: Candle[];
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

    setTimeframe: (seconds: number) => void;
    setCurrentSymbol: (symbol: string) => void;
    setCrosshairData: (data: CrosshairData | null) => void;
    setCandlesData: (candles: Candle[], latestCandle?: Candle | null) => void;
    clearCandles: () => void;
    setOrderBook: (bids: { price: number, qty: number }[], asks: { price: number, qty: number }[]) => void;
    addTrade: (trade: Trade) => void;
    setWsConnected: (connected: boolean) => void;
    addOrder: (order: Order) => void;
    removeOrder: (id: string) => void;
    setPortfolio: (p: Portfolio) => void;
}

const useMarketStore = create<MarketState>((set) => ({
    candles: [],
    latestCandle: null,
    timeframe: 60, // 1 minute default
    currentSymbol: 'BTC',
    crosshairData: null,
    orderBook: { bids: [], asks: [] },
    recentTrades: [],
    lastPrice: 500,
    priceChange24h: 0,
    high24h: 500,
    low24h: 500,

    portfolio: {
        cash: 100000,
        holdings: [],
        pnl: 0,
    },
    openOrders: [],
    wsConnected: false,

    setTimeframe: (seconds) => set({ timeframe: seconds }),
    setCurrentSymbol: (symbol) => set({
        currentSymbol: symbol,
        candles: [],
        latestCandle: null,
        recentTrades: []
    }),
    setCrosshairData: (data) => set({ crosshairData: data }),

    setCandlesData: (candles, latestCandle = null) => set((state) => ({
        candles: candles || state.candles,
        latestCandle: latestCandle || state.latestCandle
    })),

    clearCandles: () => set({ candles: [], latestCandle: null }),

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
    removeOrder: (id) => set((state) => ({ openOrders: state.openOrders.filter(o => o.id !== id) })),
    setPortfolio: (p) => set({ portfolio: p })
}));

export default useMarketStore;
