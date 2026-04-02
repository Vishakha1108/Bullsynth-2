import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  Activity,
  CandlestickChart,
  List,
  AlertCircle,
  Keyboard
} from 'lucide-react';
import { useTheme } from '../store/ThemeContext';
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
  const { theme } = useTheme();
  const isLight = theme === 'light';

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
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Right corner panel */}
      <div
        style={{ width: `${panelWidth}px` }}
        data-keyboard-shortcuts-modal="true"
        className={`fixed top-4 right-4 bottom-4 z-[100] rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-colors ${
          isLight
            ? 'bg-white border-gray-200/80'
            : 'bg-[#131722] border-[#2a2e39]'
        }`}
      >
        {/* Resize Handle on the left edge */}
        <div
          className="absolute top-0 left-0 w-2 h-full cursor-col-resize hover:bg-[#6366f1]/30 z-10 transition-colors"
          onMouseDown={handleMouseDown}
        />

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
          isLight ? 'border-gray-200' : 'border-[#2a2e39]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isLight ? 'bg-blue-50' : 'bg-[#6366f1]/10'}`}>
              <Keyboard size={18} className={isLight ? 'text-blue-600' : 'text-[#6366f1]'} />
            </div>
            <h2 className={`text-lg font-semibold ${isLight ? 'text-gray-800' : 'text-[#d1d4dc]'}`}>
              Keyboard shortcuts
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight
                ? 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                : 'hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-3 py-2 side-panel-scroll">
          {SECTIONS.map((section) => {
            const isExpanded = expandedSection === section.id;
            const Icon = section.icon;

            return (
              <div key={section.id} className={`border-b last:border-0 ${
                isLight ? 'border-gray-100' : 'border-[#2a2e39]/50'
              }`}>
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-lg my-0.5 transition-colors ${
                    isLight
                      ? 'hover:bg-gray-50 text-gray-700'
                      : 'hover:bg-[#2a2e39]/30 text-[#d1d4dc]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} strokeWidth={1.5} className={isLight ? 'text-gray-400' : 'text-[#787b86]'} />
                    <span className="font-medium text-sm">{section.title}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={18} className={isLight ? 'text-gray-400' : 'text-[#787b86]'} />
                  ) : (
                    <ChevronDown size={18} className={isLight ? 'text-gray-400' : 'text-[#787b86]'} />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-2 pb-3 pt-0.5">
                    <div className={`rounded-xl p-1.5 ${
                      isLight
                        ? 'bg-gray-50 border border-gray-100'
                        : 'bg-[#1e222d] border border-[#2a2e39]'
                    }`}>
                      <div className="space-y-0.5">
                        {section.shortcuts.map((shortcut, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                              isLight
                                ? 'hover:bg-white'
                                : 'hover:bg-[#2a2e39]/50'
                            }`}
                          >
                            <span className={`text-sm ${
                              isLight ? 'text-gray-600' : 'text-[#d1d4dc] opacity-90'
                            }`}>{shortcut.description}</span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIdx) => (
                                <div key={keyIdx} className="flex items-center">
                                  <kbd className={`px-2 py-0.5 rounded-md text-xs font-medium font-mono min-w-[26px] text-center border shadow-sm ${
                                    isLight
                                      ? 'bg-white border-gray-200 text-gray-700 shadow-gray-100'
                                      : 'bg-[#131722] border-[#363a45] text-[#d1d4dc]'
                                  }`}>
                                    {formatModifierKey(key)}
                                  </kbd>
                                  {keyIdx < shortcut.keys.length - 1 && (
                                    <span className={`text-xs mx-0.5 ${isLight ? 'text-gray-400' : 'text-[#787b86]'}`}>+</span>
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
          background-color: ${isLight ? '#d1d5db' : '#363a45'};
          border-radius: 10px;
        }
        .side-panel-scroll::-webkit-scrollbar-thumb:hover {
          background-color: ${isLight ? '#9ca3af' : '#4c525e'};
        }
      `}</style>
    </>
  );
}
