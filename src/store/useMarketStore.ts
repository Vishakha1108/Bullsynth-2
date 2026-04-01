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

export interface Alert {
    id: string;
    symbol: string;
    targetPrice: number;
    type: 'crossing' | 'above' | 'below';
    active: boolean;
    createdAt: number;
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

export interface DrawingPoint {
    time: number;
    price: number;
}

export interface Drawing {
    type: string;
    points: DrawingPoint[];
    text?: string;
}

export interface BotConfig {
    spread?: number;
    size?: number;
    maxPosition?: number;
    activeSymbol?: string;
    strategy?: string;
    riskLevel?: string;
    timeframe?: string;
    [key: string]: string | number | boolean | undefined;
}

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
    { label: '10m', seconds: 600 },
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
    activeTool: string;
    drawings: Drawing[];
    prices: Record<string, number>;
    priceChanges: Record<string, number>;

    historySequence: number;
    portfolio: Portfolio;
    openOrders: Order[];
    wsConnected: boolean;

    // Replay State
    isReplayMode: boolean;
    replayCandles: Candle[];
    replayIndex: number;
    replaySpeed: number; // updates per second (e.g. 1, 3, 5)
    isReplaying: boolean;
    _savedFullHistory?: Candle[];
    
    // Bot State
    botStatus: Record<string, 'running' | 'stopped' | 'standby'>;
    botConfigs: Record<string, BotConfig>;
    
    // Notification State
    notifications: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
    
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
    setActiveTool: (tool: string) => void;
    setDrawings: (drawings: Drawing[] | ((prev: Drawing[]) => Drawing[])) => void;
    clearDrawings: () => void;
    setBotStatus: (botId: string, status: 'running' | 'stopped' | 'standby') => void;
    updateBotConfig: (botId: string, config: Partial<BotConfig>) => void;

    // Alert Actions
    addAlert: (alert: Omit<Alert, 'id' | 'active' | 'createdAt'>) => void;
    removeAlert: (id: string) => void;
    checkAlerts: (symbol: string, currentPrice: number) => void;

    // Replay Actions
    startReplay: (startIndex: number, allCandles: Candle[]) => void;
    stopReplay: () => void;
    setIsReplaying: (playing: boolean) => void;
    stepReplay: () => void;
    setReplaySpeed: (speed: number) => void;

    // Notification Actions
    addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
    removeNotification: (id: string) => void;
}

const PORTFOLIO_STORAGE_KEY = 'synthetic_bull_portfolio';

const initialPortfolio: Portfolio = (() => {
    if (typeof window === 'undefined') return {
        cash: 100000,
        holdings: [],
        realizedPnl: 0,
        unrealizedPnl: 0,
        totalValue: 100000,
    };

    const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse portfolio from localStorage', e);
        }
    }
    return {
        cash: 100000,
        holdings: [],
        realizedPnl: 0,
        unrealizedPnl: 0,
        totalValue: 100000,
    };
})();

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
    activeTool: 'crosshair',
    drawings: [],
    prices: {},
    priceChanges: {},
    historySequence: 0,

    portfolio: initialPortfolio,
    openOrders: [],
    wsConnected: false,

    isReplayMode: false,
    replayCandles: [],
    replayIndex: 0,
    replaySpeed: 1,
    isReplaying: false,

    botStatus: {
        'market_maker': 'stopped',
        'alpha_bot': 'standby'
    },
    botConfigs: {
        'market_maker': {
            spread: 0.1,
            size: 100,
            maxPosition: 5000,
            activeSymbol: 'BTC'
        },
        'alpha_bot': {
            strategy: 'Trend Following',
            riskLevel: 'Medium',
            timeframe: '5m'
        }
    },

    notifications: [],

    setTimeframe: (seconds) => set({ timeframe: seconds }),
    setCurrentSymbol: (symbol) => set({ currentSymbol: symbol }),
    setSymbols: (symbols) => set({ symbols }),
    setTickers: (tickers) => set({ tickers }),
    setUserId: (uid) => set({ userId: uid }),
    resetSymbolData: () => set((state) => ({
        candles: [],
        latestCandle: null,
        orderBook: { bids: [], asks: [] },
        recentTrades: [],
        historySequence: state.historySequence + 1,
    })),
    setCrosshairData: (data) => set({ crosshairData: data }),

    setCandlesData: (candles, latestCandle = null) => set((state) => {
        if (state.isReplayMode) return state; // Ignore live history updates during replay

        const source = candles || state.candles;
        const safeCandles = sanitizeCandles(source).slice(-2000);
        const safeLatest = latestCandle
            ? { ...latestCandle, time: normalizeCandleTime(latestCandle.time) }
            : safeCandles[safeCandles.length - 1] || state.latestCandle;

        if (safeLatest) {
            useMarketStore.getState().checkAlerts(state.currentSymbol, safeLatest.close);
        }

        return {
            candles: safeCandles,
            latestCandle: safeLatest,
            prices: safeLatest ? { ...state.prices, [state.currentSymbol]: safeLatest.close } : state.prices,
            lastPrice: safeLatest ? safeLatest.close : state.lastPrice,
            historySequence: state.historySequence + 1,
        };
    }),

    setLatestCandle: (candle: Candle) => set((state) => {
        if (state.isReplayMode) return state; // Ignore live websocket updates during replay

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

    // Alert logic implementation
    alerts: [],
    addAlert: (alertData) => set((state) => ({
        alerts: [
            ...state.alerts,
            {
                ...alertData,
                id: Math.random().toString(36).substr(2, 9),
                active: true,
                createdAt: Date.now()
            }
        ]
    })),
    removeAlert: (id) => set((state) => ({
        alerts: state.alerts.filter(a => a.id !== id)
    })),
    checkAlerts: (symbol, currentPrice) => set((state) => {
        const triggeredAlerts = state.alerts.filter(alert => {
            if (!alert.active || alert.symbol !== symbol) return false;
            
            // Logic for "crossing" is simplified for trial: trigger if price is near target
            if (alert.type === 'crossing') {
                return (Math.abs(currentPrice - alert.targetPrice) / alert.targetPrice) < 0.0005;
            }
            if (alert.type === 'above') return currentPrice >= alert.targetPrice;
            if (alert.type === 'below') return currentPrice <= alert.targetPrice;
            return false;
        });

        if (triggeredAlerts.length > 0) {
            triggeredAlerts.forEach(a => {
                window.dispatchEvent(new CustomEvent('show-toast', { 
                    detail: `ALERT: ${a.symbol} ${a.type} ${a.targetPrice} (Current: ${currentPrice.toFixed(2)})` 
                }));
            });
            
            // Deactivate triggered alerts
            const triggeredIds = new Set(triggeredAlerts.map(a => a.id));
            return {
                alerts: state.alerts.map(a => triggeredIds.has(a.id) ? { ...a, active: false } : a)
            };
        }
        return state;
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
    setPortfolio: (p) => {
        set((state) => {
            // Check if incoming portfolio is the default "reset" state (100k cash, no holdings, no P&L)
            const isServerReset = p.holdings.length === 0 && p.cash === 100000 && p.realizedPnl === 0 && p.unrealizedPnl === 0;
            const hasLocalData = state.portfolio.holdings.length > 0;

            if (isServerReset && hasLocalData) {
                console.log('Preserving local holdings - server appears to have reset');
                return { portfolio: state.portfolio };
            }

            // Merge holdings: Keep existing ones if they aren't in the incoming update
            const mergedHoldings = [...p.holdings];
            const incomingAssets = new Set(p.holdings.map(h => h.asset));

            for (const localH of state.portfolio.holdings) {
                if (!incomingAssets.has(localH.asset)) {
                    mergedHoldings.push(localH);
                }
            }

            // Recalculate totals based on merged holdings
            const totalMarketValue = mergedHoldings.reduce((sum, h) => sum + h.marketValue, 0);
            const totalUnrealizedPnl = mergedHoldings.reduce((sum, h) => sum + h.unrealizedPnl, 0);
            const updatedTotalValue = p.cash + totalMarketValue;

            const updatedPortfolio = {
                ...p,
                holdings: mergedHoldings,
                unrealizedPnl: totalUnrealizedPnl,
                totalValue: updatedTotalValue
            };

            localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updatedPortfolio));
            return { portfolio: updatedPortfolio };
        });
    },

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

        useMarketStore.getState().checkAlerts(symbol, price);

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

    setActiveTool: (tool) => set({ activeTool: tool }),
    setDrawings: (drawingsOrFn) => set((state) => ({
        drawings: typeof drawingsOrFn === 'function' ? (drawingsOrFn as (prev: Drawing[]) => Drawing[])(state.drawings) : drawingsOrFn
    })),
    clearDrawings: () => set({ drawings: [] }),

    setBotStatus: (botId, status) => set((state) => ({
        botStatus: { ...state.botStatus, [botId]: status }
    })),

    updateBotConfig: (botId, config) => set((state) => ({
        botConfigs: {
            ...state.botConfigs,
            [botId]: { ...state.botConfigs[botId], ...config }
        }
    })),

    // Replay implementaton
    startReplay: (startIndex, allCandles) => set((state) => ({
        isReplayMode: true,
        isReplaying: false,
        replayIndex: 0,
        // The user wants it to play from the beginning of history up to the point they clicked (X)
        replayCandles: allCandles.slice(0, startIndex + 1),
        // Start visible chart with just the first candle (or empty)
        candles: allCandles.length > 0 ? [allCandles[0]] : [],
        latestCandle: allCandles.length > 0 ? allCandles[0] : null,
        // Save the full history so we can restore it when replay closes!
        _savedFullHistory: allCandles,
        historySequence: state.historySequence + 1,
        activeTool: 'crosshair', // reset tool
    })),

    stopReplay: () => set((state) => {
        if (!state.isReplayMode) return state; // Safety guard if we cancel before clicking the chart

        // Restore full history so the chart doesn't break, and is ready for another replay or live mode
        const restoredCandles = state._savedFullHistory || [];
        return {
            isReplayMode: false,
            isReplaying: false,
            replayCandles: [],
            replayIndex: 0,
            candles: restoredCandles,
            latestCandle: restoredCandles[restoredCandles.length - 1] || null,
            _savedFullHistory: undefined,
            historySequence: state.historySequence + 1,
        };
    }),

    setIsReplaying: (playing) => set((state) => {
        if (playing && state.isReplayMode && state.replayIndex >= state.replayCandles.length - 1) {
            // Auto-restart from the beginning if they hit play at the end!
            return {
                isReplaying: true,
                replayIndex: 0,
                candles: state.replayCandles.length > 0 ? [state.replayCandles[0]] : [],
                latestCandle: state.replayCandles.length > 0 ? state.replayCandles[0] : null,
                historySequence: state.historySequence + 1, // trigger full chart refresh
            };
        }
        return { isReplaying: playing };
    }),

    stepReplay: () => set((state) => {
        if (!state.isReplayMode) return state;
        const nextIndex = state.replayIndex + 1;
        
        if (nextIndex >= state.replayCandles.length) {
            // End of replay data
            return { isReplaying: false, replayIndex: nextIndex - 1 };
        }

        const nextCandle = state.replayCandles[nextIndex];
        const updatedCandles = [...state.candles, nextCandle];
        if (updatedCandles.length > 2000) updatedCandles.shift();

        return {
            replayIndex: nextIndex,
            candles: updatedCandles,
            latestCandle: nextCandle,
            lastPrice: nextCandle.close,
            prices: { ...state.prices, [state.currentSymbol]: nextCandle.close }
        };
    }),

    setReplaySpeed: (speed) => set({ replaySpeed: speed }),

    addNotification: (message, type = 'info') => set((state) => ({
        notifications: [...state.notifications, { id: Math.random().toString(36).substr(2, 9), message, type }]
    })),

    removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
    })),
}));

export default useMarketStore;
