import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

export interface ToolOption {
    id: string;
    icon: React.ElementType;
    label: string;
    action?: () => void;
}

interface ToolPopoverProps {
    options: ToolOption[];
    activeToolId?: string;
    onSelect: (id: string, action?: () => void) => void;
}

export function ToolPopover({ options, activeToolId, onSelect }: ToolPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeOption = options.find(o => o.id === activeToolId) || options[0];
    const isGroupActive = options.some(o => o.id === activeToolId);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div ref={containerRef} className="relative flex items-center w-full justify-center group mb-1.5">
            <div className="tv-toolbar-combo">
                <button
                    className={`tv-toolbar-combo-main ${isGroupActive ? 'active' : ''}`}
                    title={activeOption.label}
                    onClick={() => {
                        onSelect(activeOption.id, activeOption.action);
                        setIsOpen(false);
                    }}
                >
                    <activeOption.icon size={22} />
                </button>
                <button
                    className={`tv-toolbar-combo-caret ${isOpen ? 'open' : ''}`}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                >
                    <ChevronRight size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <div className="tv-dropdown-surface tv-toolbar-dropdown absolute left-[46px] top-0 z-[200] w-max animate-in fade-in slide-in-from-left-1 duration-200 bg-bg-elevated border border-border-subtle rounded shadow-xl py-1">
                    {options.map((opt) => (
                        <button
                            key={opt.id}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/10 transition-colors ${activeToolId === opt.id ? 'active text-[#6366f1] bg-white/5' : ''}`}
                            onClick={() => {
                                onSelect(opt.id, opt.action);
                                setIsOpen(false);
                            }}
                        >
                            <opt.icon size={18} className={activeToolId === opt.id ? 'text-[#6366f1]' : ''} />
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
