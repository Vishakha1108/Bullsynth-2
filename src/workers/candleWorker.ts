export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

let history: Candle[] = [];
let timeframeMs = 1000; // Default 1S

self.onmessage = (e) => {
    const { type, payload } = e.data;

    if (type === 'INIT') {
        // Received when timeframe changes or initial load
        timeframeMs = payload.timeframeMs;
        history = []; // in a real app, we'd fetch historical candles for the timeframe
    }
    else if (type === 'TICK') {
        // Payload: { price: number, qty: number, timestamp: number }
        const trade = payload;
        // Align time to timeframe boundary
        const candleTime = Math.floor(trade.timestamp / timeframeMs) * (timeframeMs / 1000);

        const lastCandle = history.length > 0 ? history[history.length - 1] : null;

        if (!lastCandle || lastCandle.time !== candleTime) {
            const newCandle: Candle = {
                time: candleTime,
                open: trade.price,
                high: trade.price,
                low: trade.price,
                close: trade.price,
                volume: trade.qty,
            };
            history.push(newCandle);
            self.postMessage({ type: 'CANDLE_UPDATE', candle: newCandle, isNew: true });
        } else {
            lastCandle.high = Math.max(lastCandle.high, trade.price);
            lastCandle.low = Math.min(lastCandle.low, trade.price);
            lastCandle.close = trade.price;
            lastCandle.volume += trade.qty;
            self.postMessage({ type: 'CANDLE_UPDATE', candle: { ...lastCandle }, isNew: false });
        }
    }
};
