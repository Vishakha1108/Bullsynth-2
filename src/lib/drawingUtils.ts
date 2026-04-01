import type { Candle } from '../store/useMarketStore';

/**
 * Magnet Mode: Snaps (time, price) to closest OHLC of visible candles.
 * 
 * @param time Current mouse time
 * @param price Current mouse price
 * @param candles Visible or all candles
 * @param mode 'off' | 'weak' | 'strong'
 * @param thresholdTime Max diff in logical time to consider snapping (e.g. half a candle width)
 * @param thresholdPrice Max diff in price to consider snapping for "weak" magnet
 */
export function getSnappedCoordinates(
    time: number,
    price: number,
    candles: Candle[],
    mode: 'off' | 'weak' | 'strong',
    thresholdPrice: number, // based on pixel-to-price conversion for weak mode
    maxTimeDistanceSeconds: number
): { time: number; price: number; snapped: boolean } {
    if (mode === 'off' || candles.length === 0) {
        return { time, price, snapped: false };
    }

    // Binary search to find closest candle in time
    let left = 0;
    let right = candles.length - 1;
    let closestCandle = candles[0];
    let minDiff = Infinity;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const diff = Math.abs(candles[mid].time - time);

        if (diff < minDiff) {
            minDiff = diff;
            closestCandle = candles[mid];
        }

        if (candles[mid].time < time) {
            left = mid + 1;
        } else if (candles[mid].time > time) {
            right = mid - 1;
        } else {
            break;
        }
    }

    if (minDiff > maxTimeDistanceSeconds) {
        // Even the closest candle is too far to snap horizontally
        return { time, price, snapped: false };
    }

    // Determine the closest price node: Open, High, Low, Close
    const prices = [closestCandle.open, closestCandle.high, closestCandle.low, closestCandle.close];
    let bestPrice = prices[0];
    let minPriceDiff = Math.abs(prices[0] - price);

    for (let i = 1; i < prices.length; i++) {
        const pDiff = Math.abs(prices[i] - price);
        if (pDiff < minPriceDiff) {
            minPriceDiff = pDiff;
            bestPrice = prices[i];
        }
    }

    if (mode === 'weak' && minPriceDiff > thresholdPrice) {
        // Weak magnet only snaps if within price threshold
        return { time, price, snapped: false };
    }

    return { time: closestCandle.time, price: bestPrice, snapped: true };
}

/**
 * Utility to calculate standard Fibonacci levels between two points
 * Returns an array of objects: { level, price }
 */
export function calculateFibonacciLevels(price1: number, price2: number) {
    const diff = price2 - price1;
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618];
    return levels.map(level => ({
        level,
        price: price1 + diff * level
    }));
}

/**
 * Extrapolates a ray from p1 through p2 to find the intersection with the bounding box (x=0 to width)
 * @returns {x: number, y: number} the point at the edge of the screen
 */
export function getRayExtension(
    x1: number, y1: number, x2: number, y2: number, width: number, height: number
) {
    if (x1 === x2) {
        return { x: x1, y: y2 > y1 ? height : 0 };
    }
    const slope = (y2 - y1) / (x2 - x1);
    
    // Ray goes in the direction from x1 to x2
    const targetX = x2 > x1 ? width : 0;
    const targetY = y1 + slope * (targetX - x1);

    return { x: targetX, y: targetY };
}
