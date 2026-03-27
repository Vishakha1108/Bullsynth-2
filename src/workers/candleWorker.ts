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

self.onmessage = (e) => {
    const { type, payload } = e.data;

    if (type === 'INIT') {
        // Received when timeframe changes
        timeframeSec = payload.timeframeSec;
        history = [];
        // Notify chart to clear all existing data
        self.postMessage({ type: 'CLEAR' });
    }
    else if (type === 'HISTORY') {
        const rawCandles = payload; // Array of 1s candles
        history = []; // Reset history

        for (const c of rawCandles) {
            const candleTime = Math.floor(c.time / timeframeSec) * timeframeSec;
            const lastCandle = history.length > 0 ? history[history.length - 1] : null;

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
    else if (type === 'TICK') {
        // Payload: { price: number, qty: number, timestamp: number }
        const trade = payload;
        const timeInSeconds = Math.floor(trade.timestamp / 1000);
        const c = {
            time: timeInSeconds,
            open: trade.price,
            high: trade.price,
            low: trade.price,
            close: trade.price,
            volume: trade.qty,
        };
        // Align candle open time to the timeframe boundary
        // For example, with 5min (300s) timeframe and timestamp 1711195823:
        //   candleTime = Math.floor(1711195823 / 300) * 300 = 1711195800
        const candleTime = Math.floor(c.time / timeframeSec) * timeframeSec;

        const lastCandle = history.length > 0 ? history[history.length - 1] : null;

        if (!lastCandle || candleTime > lastCandle.time) {
            if (lastCandle && candleTime > lastCandle.time + timeframeSec) {
                // Fill time gaps with flat candles so chart time is continuous, cap at 500 to prevent OOM
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

            // New candle boundary reached
            const newCandle: Candle = {
                time: candleTime,
                open: trade.price,
                high: trade.price,
                low: trade.price,
                close: trade.price,
                volume: trade.qty,
            };
            history.push(newCandle);
            // Keep only the last 2000 candles in memory
            if (history.length > 2000) {
                history = history.slice(-2000);
            }
            self.postMessage({ type: 'CANDLE_UPDATE', candle: newCandle, isNew: true });
        } else {
            // Update existing candle
            lastCandle.high = Math.max(lastCandle.high, trade.price);
            lastCandle.low = Math.min(lastCandle.low, trade.price);
            lastCandle.close = trade.price;
            lastCandle.volume += trade.qty;
            self.postMessage({ type: 'CANDLE_UPDATE', candle: { ...lastCandle }, isNew: false });
        }
    }
    else if (type === 'CANDLE_1S') {
        const c = payload;
        const candleTime = Math.floor(c.time / timeframeSec) * timeframeSec;
        const lastCandle = history.length > 0 ? history[history.length - 1] : null;

        if (!lastCandle || candleTime > lastCandle.time) {
            // New candle boundary or filling a gap
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
            // Update existing aggregated candle
            lastCandle.high = Math.max(lastCandle.high, c.high);
            lastCandle.low = Math.min(lastCandle.low, c.low);
            lastCandle.close = c.close;
            // Since CANDLE_1S aggregates, we just take the max volume to prevent double-counting trades
            lastCandle.volume += c.volume;
            self.postMessage({ type: 'CANDLE_UPDATE', candle: { ...lastCandle }, isNew: false });
        }
    }
};
