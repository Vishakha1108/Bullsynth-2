import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  Activity,
  CandlestickChart,
  List,
  AlertCircle
} from 'lucide-react';
import { formatModifierKey } from '../lib/platform';

const SECTIONS = [
  {
    id: 'important',
    title: 'Important',
    icon: AlertCircle,
    shortcuts: [
      { keys: ['Ctrl', '/'], description: 'Keyboard shortcuts' },
      { keys: ['Ctrl', 'K'], description: 'Quick Search' },
      { keys: ['Alt', 'A'], description: 'Create Alert' },
      { keys: ['Alt', 'L'], description: 'Add Alert' },
      { keys: ['/'], description: 'Open Indicators menu' },
      { keys: ['Esc'], description: 'Close dialog / Reset active tool' },
      { keys: ['Alt', 'T'], description: 'Trendline' },
      { keys: ['Alt', 'H'], description: 'Horizontal Line' },
      { keys: ['Alt', 'R'], description: 'Horizontal Line' },
      { keys: ['Alt', 'V'], description: 'Vertical Line' },
      { keys: ['Alt', 'C'], description: 'Clear all drawings & Reset chart' },
      { keys: ['Ctrl', 'H'], description: 'Hide / Show all drawings' },
      { keys: ['T'], description: 'Text tool' },
      { keys: ['M'], description: 'Measure tool' },
      { keys: ['Ctrl', '↑'], description: 'Zoom In' },
      { keys: ['Ctrl', 'Shift', 'S'], description: 'Take Chart Screenshot' }
    ]
  },
  {
    id: 'chart',
    title: 'Chart',
    icon: Activity,
    shortcuts: [
      { keys: ['Alt', 'T'], description: 'Trend Line' },
      { keys: ['Alt', 'H'], description: 'Horizontal Line' },
      { keys: ['Alt', 'V'], description: 'Vertical Line' },
    ]
  },
  {
    id: 'indicators',
    title: 'Indicators and drawings',
    icon: CandlestickChart,
    shortcuts: [
      { keys: ['/'], description: 'Indicators menu' },
      { keys: ['Ctrl', 'H'], description: 'Hide all drawings' },
    ]
  },
  {
    id: 'watchlist',
    title: 'Watchlist',
    icon: List,
    shortcuts: [
      { keys: ['Space'], description: 'Next symbol in watchlist' },
      { keys: ['Shift', 'Space'], description: 'Previous symbol in watchlist' },
    ]
  }
];

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('important');
  const [panelWidth, setPanelWidth] = useState(380);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Ctrl+/ (Windows/Linux) and Cmd+/ (macOS)
      const isSlash = e.key === '/' || e.code === 'Slash';
      if ((e.ctrlKey || e.metaKey) && isSlash) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleOpenFromMenu = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-keyboard-shortcuts', handleOpenFromMenu);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-keyboard-shortcuts', handleOpenFromMenu);
    };
  }, []);



  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      // Calculate new width based on window width and mouse X position
      // Mouse is at the left edge of the panel, so width = window.innerWidth - e.clientX
      const newWidth = window.innerWidth - e.clientX;
      
      // Enforce min and max widths
      if (newWidth >= 300 && newWidth <= 800) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Invisible backdrop just for clicking outside */}
      <div 
        className="fixed inset-0 z-[90]" 
        onClick={() => setIsOpen(false)} 
      />
      
      {/* Right corner panel */}
      <div 
        style={{ width: `${panelWidth}px` }}
        data-keyboard-shortcuts-modal="true"
        className="fixed top-4 right-4 bottom-4 z-[100] bg-[#131722] border border-[#2a2e39] rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Resize Handle on the left edge */}
        <div 
          className="absolute top-0 left-0 w-2 h-full cursor-col-resize hover:bg-[#2962ff]/30 z-10 transition-colors"
          onMouseDown={handleMouseDown}
        />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2a2e39] shrink-0">
          <h2 className="text-xl font-bold text-[#d1d4dc]">Keyboard shortcuts</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-[#2a2e39] rounded-lg text-[#787b86] hover:text-[#d1d4dc] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pl-2 pr-1 py-2 side-panel-scroll">
          {SECTIONS.map((section) => {
            const isExpanded = expandedSection === section.id;
            const Icon = section.icon;

            return (
              <div key={section.id} className="border-b border-[#2a2e39]/50 last:border-0 ml-1">
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#2a2e39]/30 transition-colors"
                >
                  <div className="flex items-center gap-4 text-[#d1d4dc]">
                    <Icon size={22} strokeWidth={1.5} className="text-[#787b86]" />
                    <span className="font-medium text-[15px]">{section.title}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={20} className="text-[#787b86]" />
                  ) : (
                    <ChevronDown size={20} className="text-[#787b86]" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1">
                    <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-2 shadow-inner">
                      <div className="space-y-1">
                        {section.shortcuts.map((shortcut, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between p-2 rounded hover:bg-[#2a2e39]/50 transition-colors"
                          >
                            <span className="text-sm text-[#d1d4dc] opacity-90">{shortcut.description}</span>
                            <div className="flex items-center gap-1.5">
                              {shortcut.keys.map((key, keyIdx) => (
                                <div key={keyIdx} className="flex items-center">
                                  <kbd className="px-2.5 py-1 bg-[#131722] border border-[#363a45] rounded-md shadow-sm text-xs text-[#d1d4dc] font-medium font-mono min-w-[28px] text-center">
                                    {formatModifierKey(key)}
                                  </kbd>
                                  {keyIdx < shortcut.keys.length - 1 && (
                                    <span className="text-[#787b86] text-xs mx-1">+</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        .side-panel-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .side-panel-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .side-panel-scroll::-webkit-scrollbar-thumb {
          background-color: #363a45;
          border-radius: 10px;
        }
        .side-panel-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #4c525e;
        }
      `}</style>
    </>
  );
}
