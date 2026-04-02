import useMarketStore from '../store/useMarketStore';
import type { ToolOption } from './ToolPopover';
import { ToolPopover } from './ToolPopover';
import {
    Plus, Circle, MousePointer2,
    MoveHorizontal, Minus, ArrowDown,
    Type, Ruler,
    Trash2,
    Waves, Pentagon, ArrowUpRight, Magnet, X,
    ArrowDownRight, Triangle, Pencil,
    Tag, MessageSquare, StickyNote,
    TrendingUp, ArrowUp, MoveVertical,
    Spline, Grid3X3, Fan,
    Undo2
} from 'lucide-react';
import { formatShortcutLabel } from '../lib/platform';

const TrendLineIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="5" r="2" />
        <path d="M 6.4 17.6 L 17.6 6.4" />
    </svg>
);

const ExtendedLineIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 20 L22 4" />
    </svg>
);

const ParallelChannelIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 16 L22 8" />
        <path d="M2 20 L22 12" />
    </svg>
);

const EllipseIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <ellipse cx="12" cy="12" rx="10" ry="6" />
    </svg>
);

const PitchforkIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2 L12 22" />
        <path d="M4 6 L12 2 L20 6" />
    </svg>
);

const XABCDIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="2,18 7,6 12,16 17,4 22,14" />
    </svg>
);

const ElliottWaveIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="2,20 6,8 9,16 14,4 17,12 22,6" />
    </svg>
);

const HeadShouldersIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="2,18 5,12 8,18 12,4 16,18 19,12 22,18" />
    </svg>
);

export function ChartToolbar() {
    const activeTool = useMarketStore(s => s.activeTool);
    const setActiveTool = useMarketStore(s => s.setActiveTool);
    const drawings = useMarketStore(s => s.drawings);
    const setDrawings = useMarketStore(s => s.setDrawings);
    const clearDrawings = useMarketStore(s => s.clearDrawings);
    const magnetMode = useMarketStore(s => s.magnetMode);
    const setMagnetMode = useMarketStore(s => s.setMagnetMode);

    const pointerTools: ToolOption[] = [
        { id: 'crosshair', icon: Plus, label: 'Cross' },
        { id: 'dot', icon: Circle, label: 'Dot' },
        { id: 'arrow', icon: MousePointer2, label: 'Arrow' },
    ];

    const lineTools: ToolOption[] = [
        { id: 'trendline', icon: TrendLineIcon, label: `Trend Line (${formatShortcutLabel('Alt+T')})` },
        { id: 'ray', icon: MoveHorizontal, label: `Ray (${formatShortcutLabel('Alt+H')})` },
        { id: 'vertical_ray', icon: MoveVertical, label: 'Vertical Ray' },
        { id: 'horizontal_line', icon: Minus, label: 'Horizontal Line' },
        { id: 'vertical_line', icon: ArrowDown, label: 'Vertical Line' },
        { id: 'extended_line', icon: ExtendedLineIcon, label: 'Extended Line' },
        { id: 'parallel_channel', icon: ParallelChannelIcon, label: 'Parallel Channel' },
        { id: 'regression_trend', icon: TrendingUp, label: 'Regression Trend' },
    ];

    const fibTools: ToolOption[] = [
        { id: 'fibonacci', icon: Waves, label: 'Fibonacci Retracement' },
        { id: 'fib_extension', icon: Waves, label: 'Fibonacci Extension' },
        { id: 'fib_fan', icon: Fan, label: 'Fibonacci Fan' },
        { id: 'fib_timezone', icon: MoveVertical, label: 'Fibonacci Time Zone' },
    ];

    const shapeTools: ToolOption[] = [
        { id: 'rectangle', icon: Pentagon, label: 'Rectangle' },
        { id: 'circle', icon: Circle, label: 'Circle' },
        { id: 'triangle', icon: Triangle, label: 'Triangle' },
        { id: 'ellipse', icon: EllipseIcon, label: 'Ellipse' },
        { id: 'polyline', icon: Spline, label: 'Polyline' },
        { id: 'pencil', icon: Pencil, label: 'Brush' },
    ];

    const gannTools: ToolOption[] = [
        { id: 'gann_box', icon: Grid3X3, label: 'Gann Box' },
        { id: 'gann_fan', icon: Fan, label: 'Gann Fan' },
        { id: 'gann_square', icon: Grid3X3, label: 'Gann Square' },
    ];

    const patternTools: ToolOption[] = [
        { id: 'pitchfork', icon: PitchforkIcon, label: 'Pitchfork' },
        { id: 'head_shoulders', icon: HeadShouldersIcon, label: 'Head & Shoulders' },
        { id: 'elliott_wave', icon: ElliottWaveIcon, label: 'Elliott Wave' },
        { id: 'xabcd_pattern', icon: XABCDIcon, label: 'XABCD Pattern' },
    ];

    const predictionTools: ToolOption[] = [
        { id: 'long_position', icon: ArrowUpRight, label: 'Long Position' },
        { id: 'short_position', icon: ArrowDownRight, label: 'Short Position' },
        { id: 'measure', icon: Ruler, label: 'Measure' },
        { id: 'price_range', icon: MoveVertical, label: 'Price Range' },
        { id: 'date_range', icon: MoveHorizontal, label: 'Date Range' },
        { id: 'date_price_range', icon: Ruler, label: 'Date & Price Range' },
    ];

    const annotationTools: ToolOption[] = [
        { id: 'text', icon: Type, label: 'Text' },
        { id: 'note', icon: StickyNote, label: 'Note' },
        { id: 'callout', icon: MessageSquare, label: 'Callout' },
        { id: 'price_label', icon: Tag, label: 'Price Label' },
        { id: 'arrow_marker', icon: ArrowUp, label: 'Arrow Marker' },
        { id: 'anchored_note', icon: StickyNote, label: 'Anchored Note' },
    ];

    const magnetOptions: ToolOption[] = [
        { id: 'magnet_strong', icon: Magnet, label: 'Strong Magnet', action: () => setMagnetMode('strong') },
        { id: 'magnet_weak', icon: Magnet, label: 'Weak Magnet', action: () => setMagnetMode('weak') },
        { id: 'magnet_off', icon: X, label: 'Magnet Off', action: () => setMagnetMode('off') },
    ];

    const handleSelect = (id: string, action?: () => void) => {
        if (action) {
            action();
        } else {
            setActiveTool(id);
        }
    };

    return (
        <div className="chart-toolbar pb-4 pt-2">
            <ToolPopover options={pointerTools} activeToolId={activeTool} onSelect={handleSelect} />
            <ToolPopover options={lineTools} activeToolId={activeTool} onSelect={handleSelect} />
            <ToolPopover options={fibTools} activeToolId={activeTool} onSelect={handleSelect} />
            <ToolPopover options={shapeTools} activeToolId={activeTool} onSelect={handleSelect} />
            <ToolPopover options={gannTools} activeToolId={activeTool} onSelect={handleSelect} />
            <ToolPopover options={patternTools} activeToolId={activeTool} onSelect={handleSelect} />
            <ToolPopover options={predictionTools} activeToolId={activeTool} onSelect={handleSelect} />
            <ToolPopover options={annotationTools} activeToolId={activeTool} onSelect={handleSelect} />

            <div className="w-6 h-[1px] bg-border-subtle my-2 mx-auto" />

            <div className="flex flex-col items-center gap-1 w-full mt-2">
                <ToolPopover
                    options={magnetOptions}
                    activeToolId={`magnet_${magnetMode}`}
                    onSelect={(_, action) => action && action()}
                />


                <button
                    className="tv-toolbar-clear-btn"
                    onClick={() => { clearDrawings(); window.dispatchEvent(new CustomEvent('reset-chart-view')); }}
                    title={`Clear All Drawings (${formatShortcutLabel('Alt+C')})`}
                >
                    <Trash2 size={18} />
                </button>
                <button
                    className="tv-toolbar-clear-btn"
                    onClick={() => setDrawings(drawings.slice(0, -1))}
                    title={`Delete Last Drawing (${formatShortcutLabel('Delete')})`}
                    disabled={drawings.length === 0}
                >
                    <Undo2 size={18} />
                </button>
            </div>
        </div>
    );
}
