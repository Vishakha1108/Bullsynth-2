import type { Candle } from '../store/useMarketStore';

export interface MacdResult {
    macd: Array<number | null>;
    signal: Array<number | null>;
    histogram: Array<number | null>;
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
