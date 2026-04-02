import { useRef, useEffect } from 'react';
import useMarketStore, { LAYOUT_TEMPLATES } from '../store/useMarketStore';

// ─── Mini SVG icons for each layout ─────────────────────────────────────────
function LayoutIcon({ id }: { id: string }) {
    const s = 'rgba(120,123,134,0.6)';
    const a = '#d1d4dc';
    const props = { fill: 'none', stroke: s, strokeWidth: 1 };

    switch (id) {
        case 'l1':
            return <svg viewBox="0 0 28 20" className="w-7 h-5"><rect x="1" y="1" width="26" height="18" {...props} /></svg>;
        case 'l2h':
            return <svg viewBox="0 0 28 20" className="w-7 h-5"><rect x="1" y="1" width="12" height="18" {...props} /><rect x="15" y="1" width="12" height="18" {...props} /></svg>;
        case 'l2v':
            return <svg viewBox="0 0 28 20" className="w-7 h-5"><rect x="1" y="1" width="26" height="8" {...props} /><rect x="1" y="11" width="26" height="8" {...props} /></svg>;
        case 'l3h':
            return <svg viewBox="0 0 28 20" className="w-7 h-5"><rect x="1" y="1" width="7" height="18" {...props} /><rect x="10" y="1" width="8" height="18" {...props} /><rect x="20" y="1" width="7" height="18" {...props} /></svg>;
        case 'l4':
            return <svg viewBox="0 0 28 20" className="w-7 h-5"><rect x="1" y="1" width="12" height="8" {...props} /><rect x="15" y="1" width="12" height="8" {...props} /><rect x="1" y="11" width="12" height="8" {...props} /><rect x="15" y="11" width="12" height="8" {...props} /></svg>;
        case 'l1r2':
            return <svg viewBox="0 0 28 20" className="w-7 h-5"><rect x="1" y="1" width="17" height="18" {...props} /><rect x="20" y="1" width="7" height="8" {...props} /><rect x="20" y="11" width="7" height="8" {...props} /></svg>;
        case 'l2b1':
            return <svg viewBox="0 0 28 20" className="w-7 h-5"><rect x="1" y="1" width="12" height="8" {...props} /><rect x="15" y="1" width="12" height="8" {...props} /><rect x="1" y="11" width="26" height="8" {...props} /></svg>;
        case 'l1l3':
            return <svg viewBox="0 0 28 20" className="w-7 h-5"><rect x="1" y="1" width="18" height="18" {...props} /><rect x="21" y="1" width="6" height="4" {...props} /><rect x="21" y="7" width="6" height="5" {...props} /><rect x="21" y="14" width="6" height="5" {...props} /></svg>;
        default:
            return <svg viewBox="0 0 28 20" className="w-7 h-5"><rect x="1" y="1" width="26" height="18" fill={a} /></svg>;
    }
}

interface LayoutPickerProps {
    onClose: () => void;
}

export default function LayoutPicker({ onClose }: LayoutPickerProps) {
    const layoutId = useMarketStore(s => s.layoutId);
    const syncSettings = useMarketStore(s => s.syncSettings);
    const setLayout = useMarketStore(s => s.setLayout);
    const updateSyncSettings = useMarketStore(s => s.updateSyncSettings);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const syncToggles: { key: keyof typeof syncSettings; label: string }[] = [
        { key: 'symbol', label: 'Symbol' },
        { key: 'interval', label: 'Interval' },
        { key: 'crosshair', label: 'Crosshair' },
        { key: 'time', label: 'Time' },
        { key: 'dateRange', label: 'Date range' },
    ];

    return (
        <div
            ref={ref}
            className="layout-picker-panel"
        >
            <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Layout</div>
            <div className="grid grid-cols-4 gap-1.5">
                {LAYOUT_TEMPLATES.map(tpl => (
                    <button
                        key={tpl.id}
                        title={tpl.label}
                        onClick={() => { setLayout(tpl.id); onClose(); }}
                        className={`flex items-center justify-center p-1.5 rounded transition-all layout-picker-item ${
                            layoutId === tpl.id ? 'layout-picker-item--active' : ''
                        }`}
                    >
                        <LayoutIcon id={tpl.id} />
                    </button>
                ))}
            </div>

            <div className="mt-3 border-t layout-picker-divider pt-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Sync in Layout</div>
                <div className="flex flex-col gap-2">
                    {syncToggles.map(({ key, label }) => (
                        <label key={key} className="flex items-center justify-between cursor-pointer">
                            <span className="text-[12px] text-text-secondary">{label}</span>
                            <div
                                onClick={() => updateSyncSettings({ [key]: !syncSettings[key] })}
                                className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer layout-picker-toggle ${
                                    syncSettings[key] ? 'layout-picker-toggle--on' : ''
                                }`}
                            >
                                <div
                                    className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                                    style={{ left: syncSettings[key] ? '17px' : '2px' }}
                                />
                            </div>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
