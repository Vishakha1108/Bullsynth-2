import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import useMarketStore from '../store/useMarketStore';
import type { Alert } from '../store/useMarketStore';

export function AlertModal({ onClose }: { onClose: () => void }) {
    const currentSymbol = useMarketStore(s => s.currentSymbol);
    const lastPrice = useMarketStore(s => s.lastPrice);
    const addAlert = useMarketStore(s => s.addAlert);
    const alerts = useMarketStore(s => s.alerts);
    const removeAlert = useMarketStore(s => s.removeAlert);
    const [price, setPrice] = useState(lastPrice.toFixed(2));
    const [type, setType] = useState<'crossing' | 'above' | 'below'>('crossing');
    const inputRef = useRef<HTMLInputElement>(null);

    const activeAlerts = alerts.filter((a: Alert) => a.active);

    const handleCreate = () => {
        const targetPrice = parseFloat(price);
        if (isNaN(targetPrice) || targetPrice <= 0) return;
        addAlert({ symbol: currentSymbol, targetPrice, type });
        window.dispatchEvent(new CustomEvent('show-toast', {
            detail: `🔔 Alert set: ${currentSymbol} ${type === 'crossing' ? 'crosses' : type === 'above' ? '≥' : '≤'} $${targetPrice.toFixed(2)}`
        }));
        onClose();
    };

    const conditions: { value: 'crossing' | 'above' | 'below'; label: string; icon: string }[] = [
        { value: 'crossing', label: 'Crossing', icon: '⇅' },
        { value: 'above', label: 'Above', icon: '↑' },
        { value: 'below', label: 'Below', icon: '↓' },
    ];

    const diff = parseFloat(price) - lastPrice;
    const diffPct = lastPrice !== 0 ? (diff / lastPrice) * 100 : 0;

    return (
        <div
            className="tv-alert-overlay"
            onClick={onClose}
        >
            <div
                className="tv-alert-modal"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="tv-alert-header">
                    <div className="flex items-center gap-3">
                        <div className="tv-alert-header-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </div>
                        <div>
                            <p className="tv-alert-title">Create Alert</p>
                            <p className="tv-alert-subtitle">{currentSymbol} · <span className="font-mono">${lastPrice.toFixed(2)}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="tv-alert-close-btn">
                        <X size={14} />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    {/* Condition Options */}
                    <div className="flex flex-col gap-2">
                        <p className="tv-alert-section-label">Condition</p>
                        <div className="flex gap-2">
                            {conditions.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => setType(c.value)}
                                    className={`tv-alert-condition-btn ${type === c.value ? 'active' : ''}`}
                                >
                                    <span className="text-[14px] leading-tight mb-0.5">{c.icon}</span>
                                    <span>{c.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price Setup */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="tv-alert-section-label">Target Price</p>
                            {!isNaN(parseFloat(price)) && (
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${diff >= 0 ? 'text-bull bg-bull/10' : 'text-bear bg-bear/10'}`}>
                                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)} ({diffPct.toFixed(2)} %)
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <span className="tv-alert-currency">$</span>
                            <input
                                ref={inputRef}
                                type="number"
                                step="0.01"
                                autoFocus
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') onClose(); }}
                                className="tv-alert-input"
                            />
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                                <button onClick={() => setPrice((parseFloat(price) - 0.01).toFixed(2))}
                                    className="tv-alert-step-btn">−</button>
                                <button onClick={() => setPrice((parseFloat(price) + 0.01).toFixed(2))}
                                    className="tv-alert-step-btn">+</button>
                            </div>
                        </div>
                        <button
                            onClick={() => setPrice(lastPrice.toFixed(2))}
                            className="tv-alert-reset-btn"
                        >
                            ← Reset
                        </button>
                    </div>

                    {/* Existing Alerts */}
                    {activeAlerts.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <p className="tv-alert-section-label">Active Alerts ({activeAlerts.length})</p>
                            <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto styling-scrollbar">
                                {activeAlerts.map((a: Alert) => (
                                    <div key={a.id} className="tv-alert-row">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${a.type === 'above' ? 'bg-bull' : a.type === 'below' ? 'bg-bear' : 'bg-[#2962ff]'}`} />
                                            <span className="tv-alert-row-symbol">{a.symbol}</span>
                                            <span className="tv-alert-row-type">{a.type === 'crossing' ? '⇅' : a.type === 'above' ? '↑' : '↓'}</span>
                                            <span className="tv-alert-row-price">${a.targetPrice.toFixed(2)}</span>
                                        </div>
                                        <button onClick={() => removeAlert(a.id)} className="tv-alert-row-remove">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CTA Button */}
                    <button
                        onClick={handleCreate}
                        className="tv-alert-cta"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        Set Alert
                    </button>
                </div>
            </div>
        </div>
    );
}
