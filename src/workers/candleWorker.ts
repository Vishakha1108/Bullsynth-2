export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

let history: Candle[] = [];
let timeframeSec = 60; // Default 1 minute

function normalizeTimestampToSec(input: unknown): number {
    if (typeof input === 'string') {
        const trimmed = input.trim();
        if (!trimmed) return Math.floor(Date.now() / 1000);

        const numeric = Number(trimmed);
        if (Number.isFinite(numeric) && numeric > 0) {
            return Math.floor(numeric < 1e12 ? numeric : numeric / 1000);
        }

        const parsed = Date.parse(trimmed);
        if (Number.isFinite(parsed) && parsed > 0) {
            return Math.floor(parsed / 1000);
        }

        return history.length > 0 ? history[history.length - 1].time : Math.floor(Date.now() / 1000);
    }

    const value = Number(input ?? 0);
    if (!Number.isFinite(value) || value <= 0) return history.length > 0 ? history[history.length - 1].time : Math.floor(Date.now() / 1000);
    return Math.floor(value < 1e12 ? value : value / 1000);
}

const rawCache: Record<string, Candle[]> = {};
let currentSymbol = 'AAPL';

self.onmessage = (e) => {
    const { type, payload } = e.data;

    if (type === 'INIT') {
        timeframeSec = Number(payload?.timeframeSec) > 0 ? Number(payload.timeframeSec) : 60;
        if (payload?.symbol) currentSymbol = payload.symbol;
        
        history = [];
        self.postMessage({ type: 'CLEAR' });

        const raw = rawCache[currentSymbol] || [];
        for (const c of raw) {
            const sourceTime = c.time;
            const normalizedSec = normalizeTimestampToSec(sourceTime);
            const candleTime = Math.floor(normalizedSec / timeframeSec) * timeframeSec;

            if (!Number.isFinite(candleTime)) continue;

            const lastCandle = history.length > 0 ? history[history.length - 1] : null;

            if (lastCandle && !Number.isFinite(lastCandle.time)) {
                history = [];
            }

            if (!lastCandle || candleTime > lastCandle.time) {
                history.push({
                    time: candleTime,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                    volume: c.volume,
                });
            } else if (candleTime === lastCandle.time) {
                lastCandle.high = Math.max(lastCandle.high, c.high);
                lastCandle.low = Math.min(lastCandle.low, c.low);
                lastCandle.close = c.close;
                lastCandle.volume += c.volume;
            }
        }

        if (history.length > 2000) history = history.slice(-2000);
        self.postMessage({ type: 'HISTORY_UPDATE', candles: history });
    }
    else if (type === 'HISTORY') {
        const rawCandles: Candle[] = Array.isArray(payload)
            ? payload
            : (Array.isArray(payload?.candles) ? payload.candles : []);
        const payloadSym: string = Array.isArray(payload)
            ? currentSymbol
            : (payload?.symbol || currentSymbol);
        
        if (!rawCandles.length) {
            return;
        }

        if (payloadSym) {
            rawCache[payloadSym] = rawCandles.slice(-5000);
        }

        if (payloadSym === currentSymbol) {
            history = []; // Reset history
            
            for (const c of rawCandles) {
            const sourceTime = c.time;
            const normalizedSec = normalizeTimestampToSec(sourceTime);
            const candleTime = Math.floor(normalizedSec / timeframeSec) * timeframeSec;

            if (!Number.isFinite(candleTime)) continue;

            const lastCandle = history.length > 0 ? history[history.length - 1] : null;

            if (lastCandle && !Number.isFinite(lastCandle.time)) {
                history = [];
            }

            if (!lastCandle || candleTime > lastCandle.time) {
                history.push({
                    time: candleTime,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                    volume: c.volume,
                });
            } else if (candleTime === lastCandle.time) {
                lastCandle.high = Math.max(lastCandle.high, c.high);
                lastCandle.low = Math.min(lastCandle.low, c.low);
                lastCandle.close = c.close;
                lastCandle.volume += c.volume;
            }
        }

            if (history.length > 2000) history = history.slice(-2000);
            self.postMessage({ type: 'HISTORY_UPDATE', candles: history });
        }
    }
    else if (type === 'GET_COMPARE_HISTORY') {
        const sym = payload?.symbol;
        if (!sym) return;
        const raw = rawCache[sym] || [];
        
        const aggregated: Candle[] = [];
        for (const c of raw) {
            const candleTime = Math.floor(normalizeTimestampToSec(c.time) / timeframeSec) * timeframeSec;
            if (!Number.isFinite(candleTime)) continue;
            
            const lastCandle = aggregated.length > 0 ? aggregated[aggregated.length - 1] : null;

            if (!lastCandle || candleTime > lastCandle.time) {
                aggregated.push({ ...c, time: candleTime });
            } else if (candleTime === lastCandle.time) {
                lastCandle.high = Math.max(lastCandle.high, c.high);
                lastCandle.low = Math.min(lastCandle.low, c.low);
                lastCandle.close = c.close;
                lastCandle.volume += c.volume;
            }
        }
        self.postMessage({ type: 'COMPARE_HISTORY_UPDATE', symbol: sym, candles: aggregated });
    }
    else if (type === 'TICK') {
        const trade = payload;
        if (trade.symbol && trade.symbol !== currentSymbol) return;
        const timeInSeconds = normalizeTimestampToSec(trade?.timestamp ?? trade?.time ?? trade?.ts);
        const c = {
            time: timeInSeconds,
            open: trade.price,
            high: trade.price,
            low: trade.price,
            close: trade.price,
            volume: trade.qty,
        };
        const candleTime = Math.floor(c.time / timeframeSec) * timeframeSec;

        if (!Number.isFinite(candleTime)) {
            return;
        }

        const lastCandle = history.length > 0 ? history[history.length - 1] : null;

        if (lastCandle && !Number.isFinite(lastCandle.time)) {
            history = [];
        }

        if (!lastCandle || candleTime > lastCandle.time) {
            if (lastCandle && candleTime > lastCandle.time + timeframeSec) {
                let fillTime = lastCandle.time + timeframeSec;
                if ((candleTime - fillTime) / timeframeSec > 500) {
                    fillTime = candleTime - 500 * timeframeSec;
                }

                while (fillTime < candleTime) {
                    const fillerCandle: Candle = {
                        time: fillTime,
                        open: lastCandle.close,
                        high: lastCandle.close,
                        low: lastCandle.close,
                        close: lastCandle.close,
                        volume: 0,
                    };
                    history.push(fillerCandle);
                    if (history.length > 2000) history = history.slice(-2000);
                    self.postMessage({ type: 'CANDLE_UPDATE', candle: fillerCandle, isNew: true });
                    fillTime += timeframeSec;
                }
            }

            const newCandle: Candle = {
                time: candleTime,
                open: trade.price,
                high: trade.price,
                low: trade.price,
                close: trade.price,
                volume: trade.qty,
            };
            history.push(newCandle);
            if (history.length > 2000) {
                history = history.slice(-2000);
            }
            self.postMessage({ type: 'CANDLE_UPDATE', candle: newCandle, isNew: true });
        } else {
            lastCandle.high = Math.max(lastCandle.high, trade.price);
            lastCandle.low = Math.min(lastCandle.low, trade.price);
            lastCandle.close = trade.price;
            lastCandle.volume += trade.qty;
            self.postMessage({ type: 'CANDLE_UPDATE', candle: { ...lastCandle }, isNew: false });
        }
    }
    else if (type === 'CANDLE_1S') {
        const c = payload;
        const sym = c.symbol;
        if (!sym) return;

        if (!rawCache[sym]) rawCache[sym] = [];
        rawCache[sym].push(c);
        if (rawCache[sym].length > 5000) rawCache[sym] = rawCache[sym].slice(-5000);

        if (sym !== currentSymbol) return;

        const normalizedSec = normalizeTimestampToSec(c.time);
        const candleTime = Math.floor(normalizedSec / timeframeSec) * timeframeSec;

        if (!Number.isFinite(candleTime)) {
            return;
        }

        const lastCandle = history.length > 0 ? history[history.length - 1] : null;

        if (lastCandle && !Number.isFinite(lastCandle.time)) {
            history = [];
        }

        if (!lastCandle || candleTime > lastCandle.time) {
            const newCandle: Candle = {
                time: candleTime,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume,
            };
            history.push(newCandle);
            if (history.length > 2000) history = history.slice(-2000);
            self.postMessage({ type: 'CANDLE_UPDATE', candle: newCandle, isNew: true });
        } else if (candleTime === lastCandle.time) {
            lastCandle.high = Math.max(lastCandle.high, c.high);
            lastCandle.low = Math.min(lastCandle.low, c.low);
            lastCandle.close = c.close;
            lastCandle.volume += c.volume;
            self.postMessage({ type: 'CANDLE_UPDATE', candle: { ...lastCandle }, isNew: false });
        }
    }
};
