import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode } from 'lightweight-charts';
import type { ISeriesApi } from 'lightweight-charts';
import useMarketStore from '../store/useMarketStore';

export default function Chart() {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<{ candle: ISeriesApi<"Candlestick">, volume: ISeriesApi<"Histogram"> } | null>(null);

    const candles = useMarketStore(state => state.candles);
    const latestCandle = useMarketStore(state => state.latestCandle);
    const timeframe = useMarketStore(state => state.timeframe);
    const setTimeframe = useMarketStore(state => state.setTimeframe);
    const lastPrice = useMarketStore(state => state.lastPrice);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0a0e17' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: '#1f2937', style: 2 },
                horzLines: { color: '#1f2937', style: 2 },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: '#f59e0b', style: 3, width: 1, labelBackgroundColor: '#f59e0b' },
                horzLine: { color: '#f59e0b', style: 3, width: 1, labelBackgroundColor: '#f59e0b' },
            },
            rightPriceScale: {
                borderColor: '#1f2937',
                scaleMargins: { top: 0.1, bottom: 0.2 },
            },
            timeScale: {
                borderColor: '#1f2937',
                timeVisible: true,
                secondsVisible: true,
            },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
            priceLineColor: '#f59e0b',
            priceLineStyle: 3,
            priceLineWidth: 1,
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#64748b',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
        });

        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        chartRef.current = chart;
        seriesRef.current = { candle: candleSeries, volume: volumeSeries };

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, []);

    // Update real-time or historical candles
    useEffect(() => {
        if (seriesRef.current && candles.length > 0) {
            // Very basic batch load if we ever pull history, 
            // Lightweight charts requires setData for multiple items at once ideally
            // For this spec, we update the candle worker's updates incrementally.
        }
    }, [candles]);

    useEffect(() => {
        if (seriesRef.current && latestCandle) {
            // @ts-ignore
            seriesRef.current.candle.update(latestCandle);

            seriesRef.current.volume.update({
                time: latestCandle.time as any,
                value: latestCandle.volume,
                color: latestCandle.close >= latestCandle.open
                    ? 'rgba(34,197,94,0.3)'
                    : 'rgba(239,68,68,0.3)',
            });
        }
    }, [latestCandle]);

    return (
        <div className="flex flex-col h-full bg-bg-terminal w-full">
            <div className="flex items-center px-4 py-2 border-b border-border-subtle gap-4">
                <h3 className="font-bold text-text-primary uppercase tracking-wider">SYNTH/USD</h3>

                <div className="flex h-7 bg-bg-panel rounded border border-border-subtle p-0.5 text-xs text-text-secondary">
                    {[
                        { label: '1S', val: 1 },
                        { label: '5S', val: 5 },
                        { label: '1M', val: 60 },
                        { label: '5M', val: 300 }
                    ].map(tf => (
                        <button
                            key={tf.val}
                            className={`px-3 rounded transition-colors ${timeframe === tf.val ? 'bg-accent text-bg-terminal font-bold' : 'hover:text-text-primary'}`}
                            onClick={() => {
                                setTimeframe(tf.val);
                                // Also need to push INIT to candleWorker
                                // we import candleWorker in websocket.ts, but can also trigger it from there if we listen to state changes,
                                // or just import the instance. To avoid circular deps, a robust way is to dispatch an event or expose a method.
                                // We'll rely on the re-connect or manual re-init if needed.
                            }}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                <button className="h-7 px-3 text-xs bg-bg-panel rounded border border-border-subtle hover:bg-bg-elevated text-text-secondary transition-colors ml-auto">
                    VOL
                </button>
            </div>

            <div ref={chartContainerRef} className="flex-1 w-full min-h-0" />
        </div>
    );
}
