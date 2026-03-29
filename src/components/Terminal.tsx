import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { wsManager } from '../services/websocket';
import Header from './Header';
import Chart from './Chart';
import OrderBook from './OrderBook';
import Watchlist from './Watchlist';
import RightPanel from './RightPanel';
import BottomBar from './BottomBar.tsx';
import useMarketStore from '../store/useMarketStore';
import { List, BookOpen } from 'lucide-react';

export default function Terminal() {
    const [activeBottomTab, setActiveBottomTab] = useState<string | null>(null);
    const [sidebarTab, setSidebarTab] = useState<'watchlist' | 'orderbook'>('orderbook');
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const [searchParams] = useSearchParams();
    const setCurrentSymbol = useMarketStore((state) => state.setCurrentSymbol);
    const resetSymbolData = useMarketStore((state) => state.resetSymbolData);

    useEffect(() => {
        wsManager.connect();
    }, []);

    useEffect(() => {
        const symbol = searchParams.get('symbol');
        if (symbol) {
            setCurrentSymbol(symbol.toUpperCase());
            resetSymbolData();
        }
    }, [searchParams, setCurrentSymbol, resetSymbolData]);

    return (
        <div className="h-screen w-screen bg-bg-terminal text-text-primary flex flex-col font-sans overflow-hidden">
            {/* Top Header Bar (TradingView style) */}
            <Header />

            {/* Main Content Area */}
            <div className="flex-1 flex min-h-0 relative">
                {/* Chart area takes full width minus right panel */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0 transition-all duration-300">
                    {/* Chart (takes remaining space) */}
                    <div className="flex-1 min-h-0 relative">
                        <Chart />
                    </div>

                    {/* Bottom panel (expandable like TradingView) */}
                    {activeBottomTab && (
                        <div className="h-[200px] border-t border-border-subtle bg-bg-terminal flex flex-col min-h-0">
                            {activeBottomTab === 'orderbook' && <OrderBook />}
                            {activeBottomTab === 'trading' && <RightPanel />}
                        </div>
                    )}
                </div>

                {/* Collapsible Right Area Container */}
                <div className={`overflow-hidden transition-[width] duration-300 ease-in-out border-l border-border-subtle bg-bg-terminal flex flex-col ${isRightPanelOpen ? 'w-[320px]' : 'w-0 border-none'}`}>
                    {/* Top Section: Information View */}
                    <div className={`min-h-0 overflow-hidden flex flex-col min-w-[320px] ${sidebarTab === 'orderbook' ? 'flex-none border-b border-border-subtle' : 'flex-1'}`}>
                        {sidebarTab === 'watchlist' ? <Watchlist onClose={() => setIsRightPanelOpen(false)} /> : <OrderBook onClose={() => setIsRightPanelOpen(false)} />}
                    </div>

                    {/* Bottom Section: Action View (TradePanel) - Only visible with Order Book */}
                    {sidebarTab === 'orderbook' && (
                        <div className="flex-1 min-h-0 overflow-y-auto styling-scrollbar bg-bg-terminal min-w-[320px]">
                            <RightPanel />
                        </div>
                    )}
                </div>

                {/* Thin Far-Right Icon Toolbar (Always visible) */}
                <div className="w-[56px] bg-bg-terminal border-l border-border-subtle flex flex-col items-center py-4 gap-4 flex-none z-10 transition-colors">
                    <button 
                         className={`w-12 h-14 rounded flex flex-col items-center justify-center gap-[2px] transition-all cursor-pointer ${sidebarTab === 'watchlist' && isRightPanelOpen ? 'bg-border-subtle text-text-primary shadow-inner' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
                         onClick={() => {
                             if (sidebarTab === 'watchlist' && isRightPanelOpen) {
                                 setIsRightPanelOpen(false);
                             } else {
                                 setSidebarTab('watchlist');
                                 setIsRightPanelOpen(true);
                             }
                         }}
                         title="Watchlist"
                    >
                         <List size={18} />
                         <span className="text-[9px] font-medium leading-[1]">Watchlist</span>
                    </button>

                    <button 
                         className={`w-12 h-14 rounded flex flex-col items-center justify-center gap-[2px] transition-all cursor-pointer ${sidebarTab === 'orderbook' && isRightPanelOpen ? 'bg-border-subtle text-text-primary shadow-inner' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
                         onClick={() => {
                             if (sidebarTab === 'orderbook' && isRightPanelOpen) {
                                 setIsRightPanelOpen(false);
                             } else {
                                 setSidebarTab('orderbook');
                                 setIsRightPanelOpen(true);
                             }
                         }}
                         title="Order Book"
                    >
                         <BookOpen size={18} />
                         <span className="text-[9px] font-medium leading-[1.1] text-center">Order<br/>Book</span>
                    </button>
                </div>
            </div>

            {/* Bottom Status Bar (like TradingView) */}
            <BottomBar activeTab={activeBottomTab} setActiveTab={setActiveBottomTab} />
        </div>
    );
}
