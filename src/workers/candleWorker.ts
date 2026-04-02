export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// State maps to handle multiple independent symbol-timeframe aggregations
const histories = new Map<string, Candle[]>();
const timeframes = new Map<string, number>();
const rawCache: Record<string, Candle[]> = {};

function getContextKey(symbol: string, timeframe: number): string {
    return `${symbol}-${timeframe}`;
}

function normalizeTimestampToSec(input: unknown): number {
    if (typeof input === 'string') {
        const numeric = Number(input.trim());
        if (Number.isFinite(numeric) && numeric > 0) {
            return Math.floor(numeric < 1e12 ? numeric : numeric / 1000);
        }
        const parsed = Date.parse(input);
        if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed / 1000);
        return Math.floor(Date.now() / 1000);
    }
    const value = Number(input ?? 0);
    if (!Number.isFinite(value) || value <= 0) return Math.floor(Date.now() / 1000);
    return Math.floor(value < 1e12 ? value : value / 1000);
}

function mergeRawCache(existing: Candle[], incoming: Candle[]): Candle[] {
    if (incoming.length === 0) return existing.slice(-5000);

    const merged = [...existing, ...incoming]
        .map((candle) => ({
            ...candle,
            time: normalizeTimestampToSec(candle.time),
        }))
        .sort((a, b) => a.time - b.time);

    const deduped: Candle[] = [];
    for (const candle of merged) {
        const last = deduped[deduped.length - 1];
        if (last && last.time === candle.time) {
            deduped[deduped.length - 1] = candle;
        } else {
            deduped.push(candle);
        }
    }

    return deduped.slice(-5000);
}

function aggregateCandles(raw: Candle[], timeframe: number): Candle[] {
    const history: Candle[] = [];
    for (const c of raw) {
        const normalizedSec = normalizeTimestampToSec(c.time);
        const candleTime = Math.floor(normalizedSec / timeframe) * timeframe;
        if (!Number.isFinite(candleTime)) continue;

        const last = history[history.length - 1];
        if (!last || candleTime > last.time) {
            history.push({ ...c, time: candleTime });
        } else if (candleTime === last.time) {
            last.high = Math.max(last.high, c.high);
            last.low = Math.min(last.low, c.low);
            last.close = c.close;
            last.volume += c.volume;
        }
    }
    return history.slice(-2000);
}

self.onmessage = (e) => {
    const { type, payload } = e.data;
    const symbol = typeof payload?.symbol === 'string' ? payload.symbol : undefined;
    const timeframe = Number(payload?.timeframeSec || 1);

    if (type === 'INIT') {
        if (!symbol) return;
        const key = getContextKey(symbol, timeframe);
        timeframes.set(key, timeframe);
        const raw = rawCache[symbol] || [];
        const history = aggregateCandles(raw, timeframe);
        histories.set(key, history);
        self.postMessage({ type: 'HISTORY_UPDATE', candles: history, symbol, timeframeSec: timeframe });
    }
    else if (type === 'HISTORY') {
        if (!symbol) return;
        const key = getContextKey(symbol, timeframe);
        const rawCandles: Candle[] = Array.isArray(payload) ? payload : (payload?.candles || []);
        rawCache[symbol] = mergeRawCache(rawCache[symbol] || [], rawCandles);

        const history = aggregateCandles(rawCache[symbol], timeframe);
        histories.set(key, history);
        self.postMessage({ type: 'HISTORY_UPDATE', candles: history, symbol, timeframeSec: timeframe });
    }
    else if (type === 'CACHE_HISTORY') {
        if (!symbol) return;
        const rawCandles: Candle[] = Array.isArray(payload) ? payload : (payload?.candles || []);
        rawCache[symbol] = mergeRawCache(rawCache[symbol] || [], rawCandles);
    }
    else if (type === 'GET_COMPARE_HISTORY') {
        if (!symbol) return;
        const compareTimeframe = Number(payload?.timeframeSec || 1);
        const cached = rawCache[symbol] || [];
        const history = aggregateCandles(cached, compareTimeframe);
        self.postMessage({ type: 'COMPARE_HISTORY_UPDATE', candles: history, symbol, timeframeSec: compareTimeframe });
    }
    else if (type === 'TICK' || type === 'CANDLE_1S') {
        const c = payload;
        const sym = typeof c?.symbol === 'string' ? c.symbol : undefined;
        if (!sym) return;

        // Store in raw cache
        if (!rawCache[sym]) rawCache[sym] = [];
        const tickCandle = type === 'TICK' ? {
            time: normalizeTimestampToSec(c.timestamp || c.time),
            open: c.price, high: c.price, low: c.price, close: c.price, volume: c.qty
        } : c;

        rawCache[sym].push(tickCandle);
        if (rawCache[sym].length > 5000) rawCache[sym] = rawCache[sym].slice(-5000);

        // Update all active histories for this symbol
        for (const [ctxKey, history] of histories.entries()) {
            if (!ctxKey.startsWith(`${sym}-`)) continue;
            const tf = timeframes.get(ctxKey) || 60;
            const normalizedSec = normalizeTimestampToSec(tickCandle.time);
            const candleTime = Math.floor(normalizedSec / tf) * tf;

            const lastCandle = history[history.length - 1];
            if (!lastCandle || candleTime > lastCandle.time) {
                const newCandle = { ...tickCandle, time: candleTime };
                history.push(newCandle);
                if (history.length > 2000) history.shift();
                self.postMessage({ type: 'CANDLE_UPDATE', candle: newCandle, isNew: true, symbol: sym, timeframeSec: tf });
            } else if (candleTime === lastCandle.time) {
                lastCandle.high = Math.max(lastCandle.high, tickCandle.high || tickCandle.price);
                lastCandle.low = Math.min(lastCandle.low, tickCandle.low || tickCandle.price);
                lastCandle.close = tickCandle.close || tickCandle.price;
                lastCandle.volume += (tickCandle.volume || tickCandle.qty);
                self.postMessage({ type: 'CANDLE_UPDATE', candle: { ...lastCandle }, isNew: false, symbol: sym, timeframeSec: tf });
            }
        }
    }
};
