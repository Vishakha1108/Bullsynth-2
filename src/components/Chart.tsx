import { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode } from 'lightweight-charts';
import type { ISeriesApi, IChartApi } from 'lightweight-charts';
import useMarketStore, { TIMEFRAMES } from '../store/useMarketStore';
import { useTheme } from '../store/ThemeContext';
import {
    Crosshair, TrendingUp, Minus, Type, Ruler,
    Pencil, MousePointer2, Hash, MoveHorizontal, ZoomIn
} from 'lucide-react';

// ─── OHLCV Info Overlay ─────────────────────────────────────────────────────


function OHLCVOverlay() {
    const crosshairData = useMarketStore(s => s.crosshairData);
    const currentSymbol = useMarketStore(s => s.currentSymbol);
    const timeframe = useMarketStore(s => s.timeframe);
    const latestCandle = useMarketStore(s => s.latestCandle);

    const tf = TIMEFRAMES.find(t => t.seconds === timeframe);
    const data = crosshairData || latestCandle;

    if (!data) return null;

    const isUp = data.close >= data.open;
    const color = isUp ? '#26a69a' : '#ef5350';

    return (
        <div className="ohlcv-overlay">
            <span className="ohlcv-symbol">{currentSymbol}</span>
            <span className="ohlcv-timeframe">{tf?.label || '1m'}</span>
            <span className="ohlcv-label">O</span>
            <span className="ohlcv-value" style={{ color }}>{data.open.toFixed(2)}</span>
            <span className="ohlcv-label">H</span>
            <span className="ohlcv-value" style={{ color }}>{data.high.toFixed(2)}</span>
            <span className="ohlcv-label">L</span>
            <span className="ohlcv-value" style={{ color }}>{data.low.toFixed(2)}</span>
            <span className="ohlcv-label">C</span>
            <span className="ohlcv-value" style={{ color }}>{data.close.toFixed(2)}</span>
            <span className="ohlcv-label">Vol</span>
            <span className="ohlcv-value ohlcv-vol">{data.volume.toLocaleString()}</span>
        </div>
    );
}

// ─── Chart Toolbar (Left side, TradingView drawing tools) ───────────────────
function ChartToolbar() {
    const [activeTool, setActiveTool] = useState('crosshair');

    const tools = [
        { id: 'crosshair', icon: Crosshair, label: 'Crosshair' },
        { id: 'pointer', icon: MousePointer2, label: 'Pointer' },
        null, // separator
        { id: 'trendline', icon: TrendingUp, label: 'Trend Line' },
        { id: 'horzline', icon: Minus, label: 'Horizontal Line' },
        { id: 'ray', icon: MoveHorizontal, label: 'Ray' },
        null, // separator
        { id: 'text', icon: Type, label: 'Text' },
        { id: 'pencil', icon: Pencil, label: 'Draw' },
        null, // separator
        { id: 'fibonacci', icon: Hash, label: 'Fibonacci' },
        { id: 'measure', icon: Ruler, label: 'Measure' },
        { id: 'zoom', icon: ZoomIn, label: 'Zoom In' },
    ];

    return (
        <div className="chart-toolbar">
            {tools.map((tool, idx) => {
                if (!tool) return <div key={`sep-${idx}`} className="chart-toolbar-sep" />;
                return (
                    <button
                        key={tool.id}
                        className={`chart-toolbar-btn ${activeTool === tool.id ? 'active' : ''}`}
                        onClick={() => setActiveTool(tool.id)}
                        title={tool.label}
                    >
                        <tool.icon size={16} />
                    </button>
                );
            })}
        </div>
    );
}

// ─── Chart colour palettes ──────────────────────────────────────────────────
const DARK_CHART = {
    bg: '#131722',
    text: '#787b86',
    gridLine: '#1e222d',
    crosshair: '#758696',
    crosshairLabel: '#2a2e39',
    border: '#2a2e39',
};

const LIGHT_CHART = {
    bg: '#f8f9fc',
    text: '#5d606b',
    gridLine: '#e0e3eb',
    crosshair: '#9598a1',
    crosshairLabel: '#d1d4dc',
    border: '#d1d4dc',
};

// ─── Main Chart Component ───────────────────────────────────────────────────
export default function Chart() {
    const { theme } = useTheme();
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<{
        candle: ISeriesApi<"Candlestick">;
        volume: ISeriesApi<"Histogram">;
    } | null>(null);

    const candles = useMarketStore(s => s.candles);
    const latestCandle = useMarketStore(s => s.latestCandle);
    const currentSymbol = useMarketStore(s => s.currentSymbol);
    const setCrosshairData = useMarketStore(s => s.setCrosshairData);

    // Apply chart colours based on theme
    useEffect(() => {
        if (!chartRef.current) return;
        const p = theme === 'dark' ? DARK_CHART : LIGHT_CHART;
        chartRef.current.applyOptions({
            layout: {
                background: { type: ColorType.Solid, color: p.bg },
                textColor: p.text,
            },
            grid: {
                vertLines: { color: p.gridLine },
                horzLines: { color: p.gridLine },
            },
            crosshair: {
                vertLine: { color: p.crosshair, labelBackgroundColor: p.crosshairLabel },
                horzLine: { color: p.crosshair, labelBackgroundColor: p.crosshairLabel },
            },
            rightPriceScale: { borderColor: p.border },
            timeScale: { borderColor: p.border },
        });
    }, [theme]);

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current) return;
        const p = DARK_CHART; // start dark; theme effect will override if needed

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: p.bg },
                textColor: p.text,
                fontSize: 11,
            },
            grid: {
                vertLines: { color: p.gridLine, style: 0 },
                horzLines: { color: p.gridLine, style: 0 },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    color: p.crosshair,
                    style: 0,
                    width: 1,
                    labelBackgroundColor: p.crosshairLabel,
                },
                horzLine: {
                    color: p.crosshair,
                    style: 0,
                    width: 1,
                    labelBackgroundColor: p.crosshairLabel,
                },
            },
            rightPriceScale: {
                borderColor: p.border,
                scaleMargins: { top: 0.1, bottom: 0.2 },
            },
            timeScale: {
                borderColor: p.border,
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 5,
                barSpacing: 8,
            },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderUpColor: '#26a69a',
            borderDownColor: '#ef5350',
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            priceLineColor: '#f59e0b',
            priceLineStyle: 2,
            priceLineWidth: 1,
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
        });

        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        // Subscribe to crosshair move for OHLCV overlay
        chart.subscribeCrosshairMove((param) => {
            if (!param || !param.time || !param.seriesData) {
                setCrosshairData(null);
                return;
            }
            const candleData = param.seriesData.get(candleSeries) as any;
            if (candleData) {
                const volData = param.seriesData.get(volumeSeries) as any;
                setCrosshairData({
                    open: candleData.open,
                    high: candleData.high,
                    low: candleData.low,
                    close: candleData.close,
                    volume: volData?.value ?? 0,
                    time: param.time as number,
                });
            }
        });

        chartRef.current = chart;
        seriesRef.current = { candle: candleSeries, volume: volumeSeries };

        // Init with existing candles if component mounts after websocket already received them
        const existingCandles = useMarketStore.getState().candles;
        if (existingCandles.length > 0) {
            candleSeries.setData(existingCandles as any[]);
            volumeSeries.setData(existingCandles.map(c => ({
                time: c.time as any,
                value: c.volume,
                color: c.close >= c.open ? 'rgba(38,166,154,0.35)' : 'rgba(239,83,80,0.35)'
            })));
        }

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, []);

    // Full chart reload when the selected symbol changes
    useEffect(() => {
        if (!seriesRef.current) return;
        const symbolCandles = useMarketStore.getState().candles;
        seriesRef.current.candle.setData(symbolCandles as any[]);
        seriesRef.current.volume.setData(symbolCandles.map(c => ({
            time: c.time as any,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(38,166,154,0.35)' : 'rgba(239,83,80,0.35)',
        })));
    }, [currentSymbol]);

    // When candles array is cleared, reset chart data
    useEffect(() => {
        if (seriesRef.current && candles.length === 0) {
            seriesRef.current.candle.setData([]);
            seriesRef.current.volume.setData([]);
        }
    }, [candles.length]);

    // Incremental update for the forming (latest) candle
    useEffect(() => {
        if (!seriesRef.current || !latestCandle) return;
        try {
            // @ts-ignore
            seriesRef.current.candle.update(latestCandle);
            seriesRef.current.volume.update({
                time: latestCandle.time as any,
                value: latestCandle.volume,
                color: latestCandle.close >= latestCandle.open
                    ? 'rgba(38,166,154,0.35)'
                    : 'rgba(239,83,80,0.35)',
            });
        } catch {
            // Time regression after symbol switch – fall back to full reload
            const symbolCandles = useMarketStore.getState().candles;
            seriesRef.current.candle.setData(symbolCandles as any[]);
            seriesRef.current.volume.setData(symbolCandles.map(c => ({
                time: c.time as any,
                value: c.volume,
                color: c.close >= c.open ? 'rgba(38,166,154,0.35)' : 'rgba(239,83,80,0.35)',
            })));
        }
    }, [latestCandle]);

    return (
        <div className="chart-root">
            {/* Main chart area */}
            <div className="chart-body">
                <ChartToolbar />
                <div className="chart-canvas-wrap">
                    {/* OHLCV overlay floats on top of chart */}
                    <OHLCVOverlay />
                    <div ref={chartContainerRef} className="chart-canvas" />
                </div>
            </div>
        </div>
    );
}
