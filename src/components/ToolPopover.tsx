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
        <div ref={containerRef} className="relative flex items-center w-full justify-center group mb-1">
            <div className="flex items-center w-[42px] h-[38px] bg-transparent border border-transparent hover:bg-border-subtle/50 rounded cursor-pointer relative overflow-hidden transition-colors">
                <button
                    className={`flex-1 h-full flex items-center justify-center text-text-secondary hover:text-text-primary ${isGroupActive ? 'text-[#2962ff]!' : ''}`}
                    title={activeOption.label}
                    onClick={() => {
                        onSelect(activeOption.id, activeOption.action);
                        setIsOpen(false);
                    }}
                >
                    <activeOption.icon size={22} />
                </button>
                <button
                    className={`w-[14px] h-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-border-subtle/80 border-l border-transparent ${isOpen ? 'bg-border-subtle/80' : ''}`}
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
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-border-subtle/30 transition-colors ${activeToolId === opt.id ? 'active text-[#2962ff]' : ''}`}
                            onClick={() => {
                                onSelect(opt.id, opt.action);
                                setIsOpen(false);
                            }}
                        >
                            <opt.icon size={18} className={activeToolId === opt.id ? 'text-[#2962ff]' : ''} />
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
