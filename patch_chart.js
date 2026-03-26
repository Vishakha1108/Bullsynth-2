const fs = require('fs');
let code = fs.readFileSync('src/components/Chart.tsx', 'utf8');

// 1. Imports
code = code.replace("import { changeTimeframe, candleWorker } from '../services/websocket';", "import { changeTimeframe, candleWorker, requestHistory } from '../services/websocket';");

// 2. Error Boundary
const errorBoundaryCode = `
class ChartErrorBoundary extends React.Component<any, any> {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    render() {
        if (this.state.hasError) {
            return <div className="text-red-500 p-10 font-mono text-xs whitespace-pre-wrap flex flex-col h-full bg-slate-900 border overflow-auto">
                <h1 className="text-xl mb-4 text-white">Chart Crash</h1>
                {this.state.error?.toString()}{'\\n'}{this.state.error?.stack}
            </div>;
        }
        return this.props.children;
    }
}
export default function ChartContainer() { return <ChartErrorBoundary><Chart /></ChartErrorBoundary>; }
`;
code = code.replace("export default function Chart() {", errorBoundaryCode + "\nfunction Chart() {");

// 3. handleSelect
code = code.replace("candleWorker.postMessage({\n            type: 'INIT',\n            payload: { timeframeSec }\n        });\n    }, [setCurrentSymbol]);", "candleWorker.postMessage({\n            type: 'INIT',\n            payload: { timeframeSec }\n        });\n        requestHistory(symbol);\n    }, [setCurrentSymbol]);");

// 4. OHLCVOverlay
code = code.replace(`
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
`, `
    const rawData = (crosshairData || latestCandle) as any;

    if (!rawData) return null;

    const o = rawData.open ?? rawData.value ?? rawData.close ?? 0;
    const h = rawData.high ?? rawData.value ?? rawData.close ?? 0;
    const l = rawData.low ?? rawData.value ?? rawData.close ?? 0;
    const c = rawData.close ?? rawData.value ?? 0;
    const v = rawData.volume ?? 0;

    const isUp = c >= o;
    const color = isUp ? '#26a69a' : '#ef5350';

    return (
        <div className="ohlcv-overlay">
            <span className="ohlcv-symbol">{currentSymbol}</span>
            <span className="ohlcv-timeframe">{tf?.label || '1m'}</span>
            <span className="ohlcv-label">O</span>
            <span className="ohlcv-value" style={{ color }}>{o.toFixed(2)}</span>
            <span className="ohlcv-label">H</span>
            <span className="ohlcv-value" style={{ color }}>{h.toFixed(2)}</span>
            <span className="ohlcv-label">L</span>
            <span className="ohlcv-value" style={{ color }}>{l.toFixed(2)}</span>
            <span className="ohlcv-label">C</span>
            <span className="ohlcv-value" style={{ color }}>{c.toFixed(2)}</span>
            <span className="ohlcv-label">Vol</span>
            <span className="ohlcv-value ohlcv-vol">{v.toLocaleString()}</span>
        </div>
    );
`);

// 5. borderColor
code = code.replace("            case 'Hollow candles':\n                mainSeries = chart.addSeries(CandlestickSeries, {\n                    upColor: 'transparent',\n                    downColor: '#ef5350',\n                    borderVisible: true,\n                    borderColor: '#26a69a',\n", "            case 'Hollow candles':\n                mainSeries = chart.addSeries(CandlestickSeries, {\n                    upColor: 'transparent',\n                    downColor: '#ef5350',\n                    borderVisible: true,\n");

// 6. formatCandleData
code = code.replace(`
    const formatCandleData = (c: any) => {
        const isUp = c.close >= c.open;
        if (chartType.toLowerCase().includes('line') || chartType === 'Area' || chartType === 'Baseline') {
            return { time: c.time as any, value: c.close };
        } else if (chartType === 'Columns' || chartType === 'Volume candles') {
            return { time: c.time as any, value: c.close, color: isUp ? '#26a69a' : '#ef5350' };
        }
        return {
            time: c.time as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        };
    };`, `
    const formatCandleData = useCallback((c: any) => {
        const isUp = c.close >= c.open;
        if (chartType.toLowerCase().includes('line') || chartType === 'Area' || chartType === 'Baseline') {
            return { time: c.time as any, value: c.close };
        } else if (chartType === 'Columns' || chartType === 'Volume candles') {
            return { time: c.time as any, value: c.close, color: isUp ? '#26a69a' : '#ef5350' };
        }
        return {
            time: c.time as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        };
    }, [chartType]);`);

// 7. Data Dep array
code = code.replace("}, [candles.length === 0]);", "}, [candles.length]);");
code = code.replace("}, [latestCandle, currentSymbol, timeframe]);", "}, [latestCandle, currentSymbol, timeframe, chartType, formatCandleData]);");

fs.writeFileSync('src/components/Chart.tsx', code);
console.log('Patched Chart.tsx successfully.');
