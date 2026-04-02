import type { Candle } from '../store/useMarketStore';

export interface MacdResult {
    macd: Array<number | null>;
    signal: Array<number | null>;
    histogram: Array<number | null>;
}

export type CustomIndicatorPlotStyle = 'line' | 'histogram';

export interface CustomIndicatorPlot {
    label: string;
    values: Array<number | null>;
    color?: string;
    lineWidth?: 1 | 2 | 3 | 4;
    style?: CustomIndicatorPlotStyle;
}

export interface CustomIndicatorResult {
    plots: CustomIndicatorPlot[];
}

export function calculateSMA(values: number[], period: number): Array<number | null> {
    const result: Array<number | null> = Array(values.length).fill(null);
    if (period <= 0) return result;

    let sum = 0;
    for (let i = 0; i < values.length; i += 1) {
        sum += values[i];
        if (i >= period) {
            sum -= values[i - period];
        }
        if (i >= period - 1) {
            result[i] = sum / period;
        }
    }

    return result;
}

export function calculateEMA(values: number[], period: number): Array<number | null> {
    const result: Array<number | null> = Array(values.length).fill(null);
    if (!values.length || period <= 0 || values.length < period) return result;

    const alpha = 2 / (period + 1);
    let seed = 0;
    for (let i = 0; i < period; i += 1) seed += values[i];

    let ema = seed / period;
    result[period - 1] = ema;

    for (let i = period; i < values.length; i += 1) {
        ema = values[i] * alpha + ema * (1 - alpha);
        result[i] = ema;
    }

    return result;
}

export function calculateVWAP(candles: Candle[]): Array<number | null> {
    const result: Array<number | null> = Array(candles.length).fill(null);
    let cumulativeVolume = 0;
    let cumulativePV = 0;

    for (let i = 0; i < candles.length; i += 1) {
        const c = candles[i];
        const typical = (c.high + c.low + c.close) / 3;
        cumulativePV += typical * c.volume;
        cumulativeVolume += c.volume;
        result[i] = cumulativeVolume === 0 ? typical : cumulativePV / cumulativeVolume;
    }

    return result;
}

export function calculateBollingerBands(values: number[], period = 20, stdMultiplier = 2) {
    const middle = calculateSMA(values, period);
    const upper: Array<number | null> = Array(values.length).fill(null);
    const lower: Array<number | null> = Array(values.length).fill(null);

    for (let i = period - 1; i < values.length; i += 1) {
        const window = values.slice(i - period + 1, i + 1);
        const mean = middle[i] ?? 0;
        const variance = window.reduce((acc, value) => acc + (value - mean) ** 2, 0) / period;
        const stdDev = Math.sqrt(variance);

        upper[i] = mean + stdDev * stdMultiplier;
        lower[i] = mean - stdDev * stdMultiplier;
    }

    return { middle, upper, lower };
}

export function calculateRSI(values: number[], period = 14): Array<number | null> {
    const result: Array<number | null> = Array(values.length).fill(null);
    if (values.length <= period) return result;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i += 1) {
        const diff = values[i] - values[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

    for (let i = period + 1; i < values.length; i += 1) {
        const diff = values[i] - values[i - 1];
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? -diff : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        if (avgLoss === 0) {
            result[i] = 100;
            continue;
        }

        const rs = avgGain / avgLoss;
        result[i] = 100 - 100 / (1 + rs);
    }

    return result;
}

export function calculateMACD(values: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MacdResult {
    const emaFast = calculateEMA(values, fastPeriod);
    const emaSlow = calculateEMA(values, slowPeriod);

    const macd: Array<number | null> = values.map((_, idx) => {
        if (emaFast[idx] == null || emaSlow[idx] == null) return null;
        return (emaFast[idx] as number) - (emaSlow[idx] as number);
    });

    const firstMacdIndex = macd.findIndex((value) => value !== null);
    const signal: Array<number | null> = Array(values.length).fill(null);

    if (firstMacdIndex !== -1) {
        const macdTail = macd.slice(firstMacdIndex).map((value) => value as number);
        const signalTail = calculateEMA(macdTail, signalPeriod);

        for (let i = 0; i < signalTail.length; i += 1) {
            signal[firstMacdIndex + i] = signalTail[i];
        }
    }

    const histogram: Array<number | null> = macd.map((value, idx) => {
        if (value == null || signal[idx] == null) return null;
        return value - (signal[idx] as number);
    });

    return {
        macd,
        signal,
        histogram,
    };
}

export function executeCustomIndicatorScript(source: string, candles: Candle[]): CustomIndicatorResult {
    const open = candles.map((c) => c.open);
    const high = candles.map((c) => c.high);
    const low = candles.map((c) => c.low);
    const close = candles.map((c) => c.close);
    const volume = candles.map((c) => c.volume);

    const sandboxFn = new Function(
        'ctx',
        `
        "use strict";
        const { candles, open, high, low, close, volume, sma, sub, ema, rsi, vwap, bb, macd } = ctx;
        ${source}
        `,
    );

    let result: CustomIndicatorResult;
    try {
        result = sandboxFn({
            candles,
            open,
            high,
            low,
            close,
            volume,
            sma: calculateSMA,
            sub: calculateSMA,
            ema: calculateEMA,
            rsi: calculateRSI,
            vwap: () => calculateVWAP(candles),
            bb: (period = 20, stdMultiplier = 2) => calculateBollingerBands(close, period, stdMultiplier),
            macd: (fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => calculateMACD(close, fastPeriod, slowPeriod, signalPeriod),
        }) as CustomIndicatorResult;
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('sub is not defined')) {
            throw new Error('Unknown helper "sub". Use sma(values, period) for Simple Moving Average.');
        }
        throw error;
    }

    if (!result || !Array.isArray(result.plots)) {
        throw new Error('Script must return: { plots: [...] }');
    }

    const plots = result.plots.map((plot) => {
        if (!plot || !Array.isArray(plot.values)) {
            throw new Error(`Invalid plot "${plot?.label || 'Unnamed'}": values must be an array`);
        }

        const normalizedValues: Array<number | null> = Array(candles.length).fill(null);
        const src = plot.values.slice(0, candles.length);
        for (let i = 0; i < src.length; i += 1) {
            const value = src[i];
            normalizedValues[i] = typeof value === 'number' && Number.isFinite(value) ? value : null;
        }

        return {
            label: plot.label || 'Custom Plot',
            values: normalizedValues,
            color: plot.color,
            lineWidth: plot.lineWidth === 1 || plot.lineWidth === 2 || plot.lineWidth === 3 || plot.lineWidth === 4
                ? plot.lineWidth
                : 2,
            style: plot.style || 'line',
        };
    });

    return { plots };
}

// --- Weighted Moving Average ---
export function calculateWMA(values: number[], period: number): Array<number | null> {
    const result: Array<number | null> = Array(values.length).fill(null);
    if (period <= 0 || values.length < period) return result;
    const denom = (period * (period + 1)) / 2;

    for (let i = period - 1; i < values.length; i += 1) {
        let sum = 0;
        for (let j = 0; j < period; j += 1) {
            sum += values[i - period + 1 + j] * (j + 1);
        }
        result[i] = sum / denom;
    }
    return result;
}

function calculateWMAFromNullable(values: Array<number | null>, period: number): Array<number | null> {
    const result: Array<number | null> = Array(values.length).fill(null);
    if (period <= 0 || values.length < period) return result;

    const denom = (period * (period + 1)) / 2;
    for (let i = period - 1; i < values.length; i += 1) {
        let weighted = 0;
        let valid = true;

        for (let j = 0; j < period; j += 1) {
            const value = values[i - period + 1 + j];
            if (value == null) {
                valid = false;
                break;
            }
            weighted += value * (j + 1);
        }

        if (valid) {
            result[i] = weighted / denom;
        }
    }

    return result;
}

function calculateEMAFromNullable(values: Array<number | null>, period: number): Array<number | null> {
    const result: Array<number | null> = Array(values.length).fill(null);
    if (period <= 0 || values.length === 0) return result;

    const firstValid = values.findIndex((value) => value != null);
    if (firstValid === -1) return result;

    const tail = values.slice(firstValid).map((value) => value as number);
    const emaTail = calculateEMA(tail, period);

    for (let i = 0; i < emaTail.length; i += 1) {
        result[firstValid + i] = emaTail[i];
    }

    return result;
}

// --- Hull Moving Average ---
export function calculateHMA(values: number[], period: number): Array<number | null> {
    if (period <= 0) return Array(values.length).fill(null);

    const halfPeriod = Math.max(1, Math.floor(period / 2));
    const sqrtPeriod = Math.max(1, Math.floor(Math.sqrt(period)));
    const wmaHalf = calculateWMA(values, halfPeriod);
    const wmaFull = calculateWMA(values, period);

    const diff: Array<number | null> = Array(values.length).fill(null);
    for (let i = 0; i < values.length; i += 1) {
        if (wmaHalf[i] != null && wmaFull[i] != null) {
            diff[i] = 2 * (wmaHalf[i] as number) - (wmaFull[i] as number);
        }
    }

    return calculateWMAFromNullable(diff, sqrtPeriod);
}

// --- Arnaud Legoux Moving Average ---
export function calculateALMA(values: number[], period: number, offset = 0.85, sigma = 6): Array<number | null> {
    const result: Array<number | null> = Array(values.length).fill(null);
    if (period <= 0 || values.length < period) return result;

    const m = offset * (period - 1);
    const s = period / sigma;

    const weights: number[] = [];
    let wSum = 0;
    for (let i = 0; i < period; i += 1) {
        const w = Math.exp(-((i - m) * (i - m)) / (2 * s * s));
        weights.push(w);
        wSum += w;
    }

    for (let i = period - 1; i < values.length; i += 1) {
        let sum = 0;
        for (let j = 0; j < period; j += 1) {
            sum += values[i - period + 1 + j] * weights[j];
        }
        result[i] = sum / wSum;
    }
    return result;
}

// --- Triple Exponential Moving Average ---
export function calculateTEMA(values: number[], period: number): Array<number | null> {
    if (period <= 0) return Array(values.length).fill(null);

    const ema1 = calculateEMA(values, period);
    const ema2 = calculateEMAFromNullable(ema1, period);
    const ema3 = calculateEMAFromNullable(ema2, period);

    const result: Array<number | null> = Array(values.length).fill(null);
    for (let i = 0; i < values.length; i += 1) {
        if (ema1[i] != null && ema2[i] != null && ema3[i] != null) {
            result[i] = 3 * (ema1[i] as number) - 3 * (ema2[i] as number) + (ema3[i] as number);
        }
    }
    return result;
}

// --- Double Exponential Moving Average ---
export function calculateDEMA(values: number[], period: number): Array<number | null> {
    if (period <= 0) return Array(values.length).fill(null);

    const ema1 = calculateEMA(values, period);
    const ema2 = calculateEMAFromNullable(ema1, period);

    const result: Array<number | null> = Array(values.length).fill(null);
    for (let i = 0; i < values.length; i += 1) {
        if (ema1[i] != null && ema2[i] != null) {
            result[i] = 2 * (ema1[i] as number) - (ema2[i] as number);
        }
    }
    return result;
}

// --- Average True Range ---
export function calculateATR(candles: Candle[], period = 14): Array<number | null> {
    const result: Array<number | null> = Array(candles.length).fill(null);
    if (candles.length < 2) return result;

    const tr: number[] = [candles[0].high - candles[0].low];
    for (let i = 1; i < candles.length; i += 1) {
        const hl = candles[i].high - candles[i].low;
        const hc = Math.abs(candles[i].high - candles[i - 1].close);
        const lc = Math.abs(candles[i].low - candles[i - 1].close);
        tr.push(Math.max(hl, hc, lc));
    }

    let sum = 0;
    for (let i = 0; i < period && i < tr.length; i += 1) sum += tr[i];
    if (tr.length >= period) {
        result[period - 1] = sum / period;
        for (let i = period; i < tr.length; i += 1) {
            result[i] = ((result[i - 1] as number) * (period - 1) + tr[i]) / period;
        }
    }
    return result;
}

// --- Supertrend ---
export interface SupertrendResult {
    supertrend: Array<number | null>;
    direction: Array<number | null>; // 1 = up (bullish), -1 = down (bearish)
}

export function calculateSupertrend(candles: Candle[], period = 10, multiplier = 3): SupertrendResult {
    const len = candles.length;
    const supertrend: Array<number | null> = Array(len).fill(null);
    const direction: Array<number | null> = Array(len).fill(null);
    const atr = calculateATR(candles, period);

    const upperBand: number[] = Array(len).fill(0);
    const lowerBand: number[] = Array(len).fill(0);

    for (let i = period - 1; i < len; i += 1) {
        if (atr[i] == null) continue;
        const hl2 = (candles[i].high + candles[i].low) / 2;
        upperBand[i] = hl2 + multiplier * (atr[i] as number);
        lowerBand[i] = hl2 - multiplier * (atr[i] as number);

        if (i === period - 1) {
            supertrend[i] = upperBand[i];
            direction[i] = -1;
            continue;
        }

        if (lowerBand[i] > lowerBand[i - 1] || candles[i - 1].close < lowerBand[i - 1]) {
            // keep
        } else {
            lowerBand[i] = lowerBand[i - 1];
        }

        if (upperBand[i] < upperBand[i - 1] || candles[i - 1].close > upperBand[i - 1]) {
            // keep
        } else {
            upperBand[i] = upperBand[i - 1];
        }

        const prevDir = direction[i - 1] as number;
        if (prevDir === -1 && candles[i].close > upperBand[i]) {
            direction[i] = 1;
        } else if (prevDir === 1 && candles[i].close < lowerBand[i]) {
            direction[i] = -1;
        } else {
            direction[i] = prevDir;
        }

        supertrend[i] = direction[i] === 1 ? lowerBand[i] : upperBand[i];
    }

    return { supertrend, direction };
}

// --- Parabolic SAR ---
export function calculateParabolicSAR(candles: Candle[], step = 0.02, max = 0.2): Array<number | null> {
    const len = candles.length;
    const result: Array<number | null> = Array(len).fill(null);
    if (len < 2) return result;

    let isUpTrend = candles[1].close > candles[0].close;
    let af = step;
    let ep = isUpTrend ? candles[0].high : candles[0].low;
    let sar = isUpTrend ? candles[0].low : candles[0].high;

    result[0] = sar;

    for (let i = 1; i < len; i += 1) {
        const prevSar = sar;
        sar = prevSar + af * (ep - prevSar);

        if (isUpTrend) {
            sar = Math.min(sar, candles[i - 1].low, i >= 2 ? candles[i - 2].low : candles[i - 1].low);
            if (candles[i].low < sar) {
                isUpTrend = false;
                sar = ep;
                ep = candles[i].low;
                af = step;
            } else {
                if (candles[i].high > ep) {
                    ep = candles[i].high;
                    af = Math.min(af + step, max);
                }
            }
        } else {
            sar = Math.max(sar, candles[i - 1].high, i >= 2 ? candles[i - 2].high : candles[i - 1].high);
            if (candles[i].high > sar) {
                isUpTrend = true;
                sar = ep;
                ep = candles[i].high;
                af = step;
            } else {
                if (candles[i].low < ep) {
                    ep = candles[i].low;
                    af = Math.min(af + step, max);
                }
            }
        }

        result[i] = sar;
    }
    return result;
}

// --- Ichimoku Cloud ---
export interface IchimokuResult {
    tenkan: Array<number | null>;
    kijun: Array<number | null>;
    senkouA: Array<number | null>;
    senkouB: Array<number | null>;
    chikou: Array<number | null>;
}

function highLowAvg(candles: Candle[], end: number, period: number): number | null {
    if (end - period + 1 < 0) return null;
    let high = -Infinity;
    let low = Infinity;
    for (let i = end - period + 1; i <= end; i += 1) {
        high = Math.max(high, candles[i].high);
        low = Math.min(low, candles[i].low);
    }
    return (high + low) / 2;
}

export function calculateIchimoku(candles: Candle[], tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52): IchimokuResult {
    const len = candles.length;
    const tenkan: Array<number | null> = Array(len).fill(null);
    const kijun: Array<number | null> = Array(len).fill(null);
    const senkouA: Array<number | null> = Array(len).fill(null);
    const senkouB: Array<number | null> = Array(len).fill(null);
    const chikou: Array<number | null> = Array(len).fill(null);

    for (let i = 0; i < len; i += 1) {
        tenkan[i] = highLowAvg(candles, i, tenkanPeriod);
        kijun[i] = highLowAvg(candles, i, kijunPeriod);

        // Senkou spans are plotted 26 periods ahead — but we store them at current index
        // The chart renderer will need to shift them forward
        if (tenkan[i] != null && kijun[i] != null) {
            senkouA[i] = ((tenkan[i] as number) + (kijun[i] as number)) / 2;
        }
        senkouB[i] = highLowAvg(candles, i, senkouBPeriod);

        // Chikou is close plotted 26 periods behind
        if (i + kijunPeriod < len) {
            chikou[i] = candles[i + kijunPeriod]?.close ?? null;
        }
    }

    return { tenkan, kijun, senkouA, senkouB, chikou };
}

// --- Average Directional Index ---
export interface ADXResult {
    adx: Array<number | null>;
    plusDI: Array<number | null>;
    minusDI: Array<number | null>;
}

export function calculateADX(candles: Candle[], period = 14): ADXResult {
    const len = candles.length;
    const adx: Array<number | null> = Array(len).fill(null);
    const plusDI: Array<number | null> = Array(len).fill(null);
    const minusDI: Array<number | null> = Array(len).fill(null);
    if (period <= 0 || len < period + 1) return { adx, plusDI, minusDI };

    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    for (let i = 1; i < len; i += 1) {
        const hl = candles[i].high - candles[i].low;
        const hc = Math.abs(candles[i].high - candles[i - 1].close);
        const lc = Math.abs(candles[i].low - candles[i - 1].close);
        tr.push(Math.max(hl, hc, lc));

        const upMove = candles[i].high - candles[i - 1].high;
        const downMove = candles[i - 1].low - candles[i].low;
        plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    let smoothTR = 0, smoothPlusDM = 0, smoothMinusDM = 0;
    for (let i = 0; i < period; i += 1) {
        smoothTR += tr[i];
        smoothPlusDM += plusDM[i];
        smoothMinusDM += minusDM[i];
    }

    const dx: number[] = [];
    for (let i = period; i <= tr.length; i += 1) {
        if (i > period) {
            smoothTR = smoothTR - smoothTR / period + tr[i - 1];
            smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i - 1];
            smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i - 1];
        }

        const pdi = smoothTR === 0 ? 0 : (smoothPlusDM / smoothTR) * 100;
        const mdi = smoothTR === 0 ? 0 : (smoothMinusDM / smoothTR) * 100;
        plusDI[i] = pdi;
        minusDI[i] = mdi;

        const diSum = pdi + mdi;
        dx.push(diSum === 0 ? 0 : (Math.abs(pdi - mdi) / diSum) * 100);
    }

    if (dx.length >= period) {
        let adxSum = 0;
        for (let i = 0; i < period; i += 1) adxSum += dx[i];
        let adxVal = adxSum / period;
        const firstAdxIndex = 2 * period - 1;
        if (firstAdxIndex < len) {
            adx[firstAdxIndex] = adxVal;
        }

        for (let i = period; i < dx.length; i += 1) {
            adxVal = (adxVal * (period - 1) + dx[i]) / period;
            const candleIndex = period + i;
            if (candleIndex < len) {
                adx[candleIndex] = adxVal;
            }
        }
    }

    return { adx, plusDI, minusDI };
}

// --- Aroon ---
export interface AroonResult {
    aroonUp: Array<number | null>;
    aroonDown: Array<number | null>;
}

export function calculateAroon(candles: Candle[], period = 25): AroonResult {
    const len = candles.length;
    const aroonUp: Array<number | null> = Array(len).fill(null);
    const aroonDown: Array<number | null> = Array(len).fill(null);

    for (let i = period; i < len; i += 1) {
        let highIdx = 0, lowIdx = 0;
        let high = -Infinity, low = Infinity;
        for (let j = 0; j <= period; j += 1) {
            if (candles[i - period + j].high >= high) {
                high = candles[i - period + j].high;
                highIdx = j;
            }
            if (candles[i - period + j].low <= low) {
                low = candles[i - period + j].low;
                lowIdx = j;
            }
        }
        aroonUp[i] = (highIdx / period) * 100;
        aroonDown[i] = (lowIdx / period) * 100;
    }

    return { aroonUp, aroonDown };
}

// --- Keltner Channels ---
export interface KeltnerResult {
    upper: Array<number | null>;
    middle: Array<number | null>;
    lower: Array<number | null>;
}

export function calculateKeltnerChannels(candles: Candle[], emaPeriod = 20, atrPeriod = 10, multiplier = 1.5): KeltnerResult {
    const closes = candles.map(c => c.close);
    const middle = calculateEMA(closes, emaPeriod);
    const atr = calculateATR(candles, atrPeriod);

    const upper: Array<number | null> = Array(candles.length).fill(null);
    const lower: Array<number | null> = Array(candles.length).fill(null);

    for (let i = 0; i < candles.length; i += 1) {
        if (middle[i] != null && atr[i] != null) {
            upper[i] = (middle[i] as number) + multiplier * (atr[i] as number);
            lower[i] = (middle[i] as number) - multiplier * (atr[i] as number);
        }
    }

    return { upper, middle, lower };
}

// --- Donchian Channels ---
export interface DonchianResult {
    upper: Array<number | null>;
    middle: Array<number | null>;
    lower: Array<number | null>;
}

export function calculateDonchianChannels(candles: Candle[], period = 20): DonchianResult {
    const len = candles.length;
    const upper: Array<number | null> = Array(len).fill(null);
    const middle: Array<number | null> = Array(len).fill(null);
    const lower: Array<number | null> = Array(len).fill(null);

    for (let i = period - 1; i < len; i += 1) {
        let high = -Infinity, low = Infinity;
        for (let j = i - period + 1; j <= i; j += 1) {
            high = Math.max(high, candles[j].high);
            low = Math.min(low, candles[j].low);
        }
        upper[i] = high;
        lower[i] = low;
        middle[i] = (high + low) / 2;
    }

    return { upper, middle, lower };
}

// --- Standard Deviation ---
export function calculateStdDev(values: number[], period: number): Array<number | null> {
    const result: Array<number | null> = Array(values.length).fill(null);
    if (period <= 0 || values.length < period) return result;

    for (let i = period - 1; i < values.length; i += 1) {
        const window = values.slice(i - period + 1, i + 1);
        const mean = window.reduce((a, b) => a + b, 0) / period;
        const variance = window.reduce((acc, v) => acc + (v - mean) ** 2, 0) / period;
        result[i] = Math.sqrt(variance);
    }
    return result;
}

// --- Choppiness Index ---
export function calculateChoppinessIndex(candles: Candle[], period = 14): Array<number | null> {
    const len = candles.length;
    const result: Array<number | null> = Array(len).fill(null);
    const atr1 = calculateATR(candles, 1);

    for (let i = period; i < len; i += 1) {
        let atrSum = 0;
        let high = -Infinity, low = Infinity;
        for (let j = i - period + 1; j <= i; j += 1) {
            atrSum += atr1[j] ?? (candles[j].high - candles[j].low);
            high = Math.max(high, candles[j].high);
            low = Math.min(low, candles[j].low);
        }
        const range = high - low;
        if (range > 0) {
            result[i] = 100 * Math.log10(atrSum / range) / Math.log10(period);
        }
    }
    return result;
}

// --- On Balance Volume ---
export function calculateOBV(candles: Candle[]): Array<number | null> {
    const result: Array<number | null> = Array(candles.length).fill(null);
    if (candles.length === 0) return result;
    let obv = 0;
    result[0] = obv;

    for (let i = 1; i < candles.length; i += 1) {
        if (candles[i].close > candles[i - 1].close) obv += candles[i].volume;
        else if (candles[i].close < candles[i - 1].close) obv -= candles[i].volume;
        result[i] = obv;
    }
    return result;
}

// --- Accumulation/Distribution ---
export function calculateAD(candles: Candle[]): Array<number | null> {
    const result: Array<number | null> = Array(candles.length).fill(null);
    if (candles.length === 0) return result;
    let ad = 0;

    for (let i = 0; i < candles.length; i += 1) {
        const hl = candles[i].high - candles[i].low;
        const clv = hl === 0 ? 0 : ((candles[i].close - candles[i].low) - (candles[i].high - candles[i].close)) / hl;
        ad += clv * candles[i].volume;
        result[i] = ad;
    }
    return result;
}

// --- Chaikin Money Flow ---
export function calculateCMF(candles: Candle[], period = 20): Array<number | null> {
    const result: Array<number | null> = Array(candles.length).fill(null);
    if (candles.length < period) return result;

    for (let i = period - 1; i < candles.length; i += 1) {
        let mfvSum = 0, volSum = 0;
        for (let j = i - period + 1; j <= i; j += 1) {
            const hl = candles[j].high - candles[j].low;
            const clv = hl === 0 ? 0 : ((candles[j].close - candles[j].low) - (candles[j].high - candles[j].close)) / hl;
            mfvSum += clv * candles[j].volume;
            volSum += candles[j].volume;
        }
        result[i] = volSum === 0 ? 0 : mfvSum / volSum;
    }
    return result;
}

// --- Volume Oscillator ---
export function calculateVolumeOscillator(candles: Candle[], fastPeriod = 5, slowPeriod = 10): Array<number | null> {
    const volumes = candles.map(c => c.volume);
    const fastEMA = calculateEMA(volumes, fastPeriod);
    const slowEMA = calculateEMA(volumes, slowPeriod);

    const result: Array<number | null> = Array(candles.length).fill(null);
    for (let i = 0; i < candles.length; i += 1) {
        if (fastEMA[i] != null && slowEMA[i] != null && (slowEMA[i] as number) !== 0) {
            result[i] = ((fastEMA[i] as number) - (slowEMA[i] as number)) / (slowEMA[i] as number) * 100;
        }
    }
    return result;
}

// --- Price Volume Trend ---
export function calculatePVT(candles: Candle[]): Array<number | null> {
    const result: Array<number | null> = Array(candles.length).fill(null);
    if (candles.length === 0) return result;
    let pvt = 0;
    result[0] = pvt;

    for (let i = 1; i < candles.length; i += 1) {
        const prevClose = candles[i - 1].close;
        if (prevClose !== 0) {
            pvt += ((candles[i].close - prevClose) / prevClose) * candles[i].volume;
        }
        result[i] = pvt;
    }
    return result;
}

// --- Stochastic Oscillator ---
export interface StochasticResult {
    k: Array<number | null>;
    d: Array<number | null>;
}

export function calculateStochastic(candles: Candle[], kPeriod = 14, dPeriod = 3, smooth = 3): StochasticResult {
    const len = candles.length;
    const rawK: Array<number | null> = Array(len).fill(null);

    for (let i = kPeriod - 1; i < len; i += 1) {
        let high = -Infinity, low = Infinity;
        for (let j = i - kPeriod + 1; j <= i; j += 1) {
            high = Math.max(high, candles[j].high);
            low = Math.min(low, candles[j].low);
        }
        const range = high - low;
        rawK[i] = range === 0 ? 50 : ((candles[i].close - low) / range) * 100;
    }

    // Smooth %K with SMA
    const kValues = rawK.map(v => v ?? 0);
    const k = smooth > 1 ? calculateSMA(kValues, smooth) : rawK;

    // %D is SMA of %K
    const kForD = k.map(v => v ?? 0);
    const d = calculateSMA(kForD, dPeriod);

    // Null out values before valid period
    const result: StochasticResult = { k: Array(len).fill(null), d: Array(len).fill(null) };
    const startIdx = kPeriod - 1 + smooth - 1;
    for (let i = startIdx; i < len; i += 1) {
        result.k[i] = k[i];
    }
    for (let i = startIdx + dPeriod - 1; i < len; i += 1) {
        result.d[i] = d[i];
    }
    return result;
}

// --- Stochastic RSI ---
export interface StochRSIResult {
    k: Array<number | null>;
    d: Array<number | null>;
}

export function calculateStochRSI(values: number[], rsiPeriod = 14, stochPeriod = 14, kSmooth = 3, dSmooth = 3): StochRSIResult {
    const len = values.length;
    const rsi = calculateRSI(values, rsiPeriod);

    const stochK: Array<number | null> = Array(len).fill(null);
    for (let i = rsiPeriod + stochPeriod - 1; i < len; i += 1) {
        let minRSI = Infinity, maxRSI = -Infinity;
        for (let j = i - stochPeriod + 1; j <= i; j += 1) {
            if (rsi[j] != null) {
                minRSI = Math.min(minRSI, rsi[j] as number);
                maxRSI = Math.max(maxRSI, rsi[j] as number);
            }
        }
        const range = maxRSI - minRSI;
        stochK[i] = range === 0 ? 50 : ((rsi[i] as number) - minRSI) / range * 100;
    }

    const kValues = stochK.map(v => v ?? 0);
    const k = kSmooth > 1 ? calculateSMA(kValues, kSmooth) : stochK;
    const kForD = k.map(v => v ?? 0);
    const d = calculateSMA(kForD, dSmooth);

    const result: StochRSIResult = { k: Array(len).fill(null), d: Array(len).fill(null) };
    const startK = rsiPeriod + stochPeriod - 1 + kSmooth - 1;
    const startD = startK + dSmooth - 1;
    for (let i = startK; i < len; i += 1) result.k[i] = k[i];
    for (let i = startD; i < len; i += 1) result.d[i] = d[i];
    return result;
}

// --- Commodity Channel Index ---
export function calculateCCI(candles: Candle[], period = 20): Array<number | null> {
    const len = candles.length;
    const result: Array<number | null> = Array(len).fill(null);
    const tp = candles.map(c => (c.high + c.low + c.close) / 3);

    for (let i = period - 1; i < len; i += 1) {
        const window = tp.slice(i - period + 1, i + 1);
        const mean = window.reduce((a, b) => a + b, 0) / period;
        const meanDev = window.reduce((a, v) => a + Math.abs(v - mean), 0) / period;
        result[i] = meanDev === 0 ? 0 : (tp[i] - mean) / (0.015 * meanDev);
    }
    return result;
}

// --- Momentum ---
export function calculateMomentum(values: number[], period = 10): Array<number | null> {
    const result: Array<number | null> = Array(values.length).fill(null);
    for (let i = period; i < values.length; i += 1) {
        result[i] = values[i] - values[i - period];
    }
    return result;
}

// --- Williams %R ---
export function calculateWilliamsR(candles: Candle[], period = 14): Array<number | null> {
    const len = candles.length;
    const result: Array<number | null> = Array(len).fill(null);

    for (let i = period - 1; i < len; i += 1) {
        let high = -Infinity, low = Infinity;
        for (let j = i - period + 1; j <= i; j += 1) {
            high = Math.max(high, candles[j].high);
            low = Math.min(low, candles[j].low);
        }
        const range = high - low;
        result[i] = range === 0 ? -50 : ((high - candles[i].close) / range) * -100;
    }
    return result;
}

// --- Awesome Oscillator ---
export function calculateAwesomeOscillator(candles: Candle[]): Array<number | null> {
    const medians = candles.map(c => (c.high + c.low) / 2);
    const sma5 = calculateSMA(medians, 5);
    const sma34 = calculateSMA(medians, 34);

    const result: Array<number | null> = Array(candles.length).fill(null);
    for (let i = 0; i < candles.length; i += 1) {
        if (sma5[i] != null && sma34[i] != null) {
            result[i] = (sma5[i] as number) - (sma34[i] as number);
        }
    }
    return result;
}

// --- Percentage Price Oscillator ---
export function calculatePPO(values: number[], fastPeriod = 12, slowPeriod = 26): Array<number | null> {
    const emaFast = calculateEMA(values, fastPeriod);
    const emaSlow = calculateEMA(values, slowPeriod);

    const result: Array<number | null> = Array(values.length).fill(null);
    for (let i = 0; i < values.length; i += 1) {
        if (emaFast[i] != null && emaSlow[i] != null && (emaSlow[i] as number) !== 0) {
            result[i] = ((emaFast[i] as number) - (emaSlow[i] as number)) / (emaSlow[i] as number) * 100;
        }
    }
    return result;
}

// --- Rate of Change ---
export function calculateROC(values: number[], period = 9): Array<number | null> {
    const result: Array<number | null> = Array(values.length).fill(null);
    for (let i = period; i < values.length; i += 1) {
        if (values[i - period] !== 0) {
            result[i] = ((values[i] - values[i - period]) / values[i - period]) * 100;
        }
    }
    return result;
}

// --- TRIX ---
export function calculateTRIX(values: number[], period = 15): Array<number | null> {
    if (period <= 0) return Array(values.length).fill(null);

    const ema1 = calculateEMA(values, period);
    const ema2 = calculateEMAFromNullable(ema1, period);
    const ema3 = calculateEMAFromNullable(ema2, period);

    const result: Array<number | null> = Array(values.length).fill(null);
    for (let i = 1; i < values.length; i += 1) {
        if (ema3[i] != null && ema3[i - 1] != null && (ema3[i - 1] as number) !== 0) {
            result[i] = ((ema3[i] as number) - (ema3[i - 1] as number)) / (ema3[i - 1] as number) * 100;
        }
    }
    return result;
}

// --- Ultimate Oscillator ---
export function calculateUltimateOscillator(candles: Candle[], p1 = 7, p2 = 14, p3 = 28): Array<number | null> {
    const len = candles.length;
    const result: Array<number | null> = Array(len).fill(null);
    if (len < p3 + 1) return result;

    const bp: number[] = [0];
    const tr: number[] = [candles[0].high - candles[0].low];

    for (let i = 1; i < len; i += 1) {
        const prevClose = candles[i - 1].close;
        bp.push(candles[i].close - Math.min(candles[i].low, prevClose));
        const hl = candles[i].high - candles[i].low;
        const hc = Math.abs(candles[i].high - prevClose);
        const lc = Math.abs(candles[i].low - prevClose);
        tr.push(Math.max(hl, hc, lc));
    }

    for (let i = p3; i < len; i += 1) {
        let bpSum1 = 0, trSum1 = 0;
        let bpSum2 = 0, trSum2 = 0;
        let bpSum3 = 0, trSum3 = 0;

        for (let j = i - p1 + 1; j <= i; j += 1) { bpSum1 += bp[j]; trSum1 += tr[j]; }
        for (let j = i - p2 + 1; j <= i; j += 1) { bpSum2 += bp[j]; trSum2 += tr[j]; }
        for (let j = i - p3 + 1; j <= i; j += 1) { bpSum3 += bp[j]; trSum3 += tr[j]; }

        const avg1 = trSum1 === 0 ? 0 : bpSum1 / trSum1;
        const avg2 = trSum2 === 0 ? 0 : bpSum2 / trSum2;
        const avg3 = trSum3 === 0 ? 0 : bpSum3 / trSum3;

        result[i] = 100 * (4 * avg1 + 2 * avg2 + avg3) / 7;
    }
    return result;
}
