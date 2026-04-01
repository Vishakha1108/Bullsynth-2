import useMarketStore from '../store/useMarketStore';
import type { ToolOption } from './ToolPopover';
import { ToolPopover } from './ToolPopover';
import {
    Plus, Circle, MousePointer2,
    MoveHorizontal,
    Type, Ruler,
    Trash2,
    Waves, Pentagon, ArrowUpRight, Magnet, X,
    ArrowDownRight
} from 'lucide-react';

const TrendLineIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="5" r="2" />
        <path d="M 6.4 17.6 L 17.6 6.4" />
    </svg>
);

export function ChartToolbar() {
    const activeTool = useMarketStore(s => s.activeTool);
    const setActiveTool = useMarketStore(s => s.setActiveTool);
    const clearDrawings = useMarketStore(s => s.clearDrawings);
    const magnetMode = useMarketStore(s => s.magnetMode);
    const setMagnetMode = useMarketStore(s => s.setMagnetMode);

    const pointerTools: ToolOption[] = [
        { id: 'crosshair', icon: Plus, label: 'Cross' },
        { id: 'dot', icon: Circle, label: 'Dot' },
        { id: 'arrow', icon: MousePointer2, label: 'Arrow' },
    ];

    const lineTools: ToolOption[] = [
        { id: 'trendline', icon: TrendLineIcon, label: 'Trend Line (Alt+T)' },
        { id: 'ray', icon: MoveHorizontal, label: 'Horizontal Ray (Alt+H)' },
    ];

    const fibTools: ToolOption[] = [
        { id: 'fibonacci', icon: Waves, label: 'Fibonacci Retracement' },
    ];

    const shapeTools: ToolOption[] = [
        { id: 'rectangle', icon: Pentagon, label: 'Rectangle' },
        { id: 'circle', icon: Circle, label: 'Circle' },
    ];

    const predictionTools: ToolOption[] = [
        { id: 'long_position', icon: ArrowUpRight, label: 'Long Position' },
        { id: 'short_position', icon: ArrowDownRight, label: 'Short Position' },
        { id: 'measure', icon: Ruler, label: 'Measure/Date Range' },
    ];

    const textTools: ToolOption[] = [
        { id: 'text', icon: Type, label: 'Text' },
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
            <ToolPopover options={predictionTools} activeToolId={activeTool} onSelect={handleSelect} />
            <ToolPopover options={textTools} activeToolId={activeTool} onSelect={handleSelect} />
            
            <div className="w-6 h-[1px] bg-border-subtle my-2 mx-auto" />
            
            <div className="flex flex-col items-center gap-1 w-full mt-2">
                <ToolPopover 
                    options={magnetOptions} 
                    activeToolId={`magnet_${magnetMode}`} 
                    onSelect={(_, action) => action && action()} 
                />
                
                <button
                    className="w-10 h-10 flex items-center justify-center rounded hover:bg-border-subtle/50 transition-colors text-text-secondary hover:text-red-400"
                    onClick={() => { clearDrawings(); window.dispatchEvent(new CustomEvent('reset-chart-view')); }}
                    title="Clear All Drawings (Alt+C)"
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
    );
}
