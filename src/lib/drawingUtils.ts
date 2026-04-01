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

/**
 * Extends a line through p1 and p2 to both edges of the canvas.
 */
export function getExtendedLineEnds(
    x1: number, y1: number, x2: number, y2: number, width: number, height: number
) {
    if (x1 === x2) return { start: { x: x1, y: 0 }, end: { x: x1, y: height } };
    const slope = (y2 - y1) / (x2 - x1);
    const startY = y1 + slope * (0 - x1);
    const endY = y1 + slope * (width - x1);
    return { start: { x: 0, y: startY }, end: { x: width, y: endY } };
}

/**
 * Calculate Fibonacci extension levels from 3 points
 */
export function calculateFibonacciExtension(price1: number, price2: number, price3: number) {
    const diff = price2 - price1;
    const levels = [0, 0.618, 1, 1.618, 2.618, 4.236];
    return levels.map(level => ({
        level,
        price: price3 + diff * level
    }));
}

/**
 * Compute parallel channel: given 3 points (p1, p2 define the base line, p3 defines the channel width offset)
 */
export function getParallelChannelOffset(
    x1: number, y1: number, x2: number, y2: number, x3: number, y3: number
) {
    // Project p3 onto line(p1,p2) to find the offset
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return 0;
    // Perpendicular distance from p3 to line(p1,p2)
    return ((x3 - x1) * dy - (y3 - y1) * dx) / len;
}

/**
 * Generate Gann fan angles from origin
 */
export function getGannFanLines(
    x1: number, y1: number, x2: number, y2: number, width: number, _height: number
) {
    const angles = [
        { label: '1×8', ratio: 1 / 8 },
        { label: '1×4', ratio: 1 / 4 },
        { label: '1×3', ratio: 1 / 3 },
        { label: '1×2', ratio: 1 / 2 },
        { label: '1×1', ratio: 1 },
        { label: '2×1', ratio: 2 },
        { label: '3×1', ratio: 3 },
        { label: '4×1', ratio: 4 },
        { label: '8×1', ratio: 8 },
    ];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const baseAngle = Math.atan2(dy, dx);
    const baseDist = Math.sqrt(dx * dx + dy * dy);
    if (baseDist === 0) return [];

    return angles.map(({ label, ratio }) => {
        const angle = Math.atan(ratio * Math.tan(baseAngle));
        const endX = x1 + width * Math.cos(angle);
        const endY = y1 + width * Math.sin(angle);
        return { label, endX, endY };
    });
}

/**
 * Linear regression line between two x positions given values
 */
export function calculateRegressionLine(values: { x: number; y: number }[]): { slope: number; intercept: number } {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: 0 };
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const { x, y } of values) {
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

/**
 * Point count required for each drawing tool type.
 * -1 = multi-click (double-click to finish)
 * 0 = drag tool (pencil)
 * 1 = single click
 * 2 = two-click
 * 3 = three-click
 * 5 = five-click
 * 7 = seven-click
 */
export const TOOL_POINT_COUNTS: Record<string, number> = {
    crosshair: 0, dot: 0, arrow: 0, zoom: 0, replay: 0,
    pencil: 0,
    // 1-point tools
    horizontal_line: 1, vertical_line: 1, price_label: 1, arrow_marker: 1, anchored_note: 1,
    text: 1, note: 1,
    // 2-point tools
    trendline: 2, ray: 2, measure: 2, rectangle: 2, circle: 2, fibonacci: 2,
    long_position: 2, short_position: 2,
    vertical_ray: 2,
    extended_line: 2, regression_trend: 2, ellipse: 2, price_range: 2, date_range: 2,
    date_price_range: 2,
    gann_box: 2, gann_fan: 2, gann_square: 2, fib_fan: 2, fib_timezone: 2, callout: 2,
    // 3-point tools
    parallel_channel: 3, pitchfork: 3, triangle: 3, fib_extension: 3,
    // 5-point tools
    xabcd_pattern: 5,
    // Multi-click tools
    polyline: -1, elliott_wave: -1, head_shoulders: -1,
};
