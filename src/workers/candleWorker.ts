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
        // Received when timeframe changes or initial load
        timeframeSec = payload.timeframeSec;
        history = [];
        // Notify chart to clear all existing data
        self.postMessage({ type: 'CLEAR' });
    }
    else if (type === 'TICK') {
        // Payload: { price: number, qty: number, timestamp: number }
        const trade = payload;
        const timestampSec = Math.floor(trade.timestamp / 1000);

        // Align candle open time to the timeframe boundary
        // For example, with 5min (300s) timeframe and timestamp 1711195823:
        //   candleTime = Math.floor(1711195823 / 300) * 300 = 1711195800
        const candleTime = Math.floor(timestampSec / timeframeSec) * timeframeSec;

        const lastCandle = history.length > 0 ? history[history.length - 1] : null;

        if (!lastCandle || lastCandle.time !== candleTime) {
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
};
