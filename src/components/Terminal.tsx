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

export default function Terminal() {
    const [activeBottomTab, setActiveBottomTab] = useState<string | null>(null);
    const [sidebarTab, setSidebarTab] = useState<'watchlist' | 'orderbook'>('orderbook');
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
        <div className="h-screen w-screen bg-[#131722] text-[#d1d4dc] flex flex-col font-sans overflow-hidden">
            {/* Top Header Bar (TradingView style) */}
            <Header />

            {/* Main Content Area */}
            <div className="flex-1 flex min-h-0">
                {/* Chart area takes full width minus right panel */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0">
                    {/* Chart (takes remaining space) */}
                    <div className="flex-1 min-h-0 relative">
                        <Chart />
                    </div>

                    {/* Bottom panel (expandable like TradingView) */}
                    {activeBottomTab && (
                        <div className="h-[200px] border-t border-[#2a2e39] bg-[#131722] flex flex-col min-h-0">
                            {activeBottomTab === 'orderbook' && <OrderBook />}
                            {activeBottomTab === 'trading' && <RightPanel />}
                        </div>
                    )}
                </div>

                {/* Right Area: Single 300px sidebar with Toggle */}
                <div className="w-[300px] border-l border-[#2a2e39] bg-[#131722] flex flex-col overflow-hidden">
                    {/* Sidebar Toggle Tabs - White/Grey Refined Aesthetic */}
                    <div className="flex border-b border-[#2a2e39] bg-[#1c202b] p-[3px] gap-1">
                        <button
                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-transparent transition-all ${sidebarTab === 'watchlist' ? 'bg-white text-[#4c525e] shadow-sm' : 'text-[#787b86] hover:text-[#d1d4dc] hover:border-[#4c525e] hover:bg-transparent'}`}
                            onClick={() => setSidebarTab('watchlist')}
                        >
                            Watchlist
                        </button>
                        <button
                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-transparent transition-all ${sidebarTab === 'orderbook' ? 'bg-white text-[#4c525e] shadow-sm' : 'text-[#787b86] hover:text-[#d1d4dc] hover:border-[#4c525e] hover:bg-transparent'}`}
                            onClick={() => setSidebarTab('orderbook')}
                        >
                            Order Book
                        </button>
                    </div>

                    {/* Top Section: Information View (Dynamic height to avoid gaps for Order Book) */}
                    <div className={`min-h-0 overflow-hidden ${sidebarTab === 'orderbook' ? 'flex-none border-b border-[#2a2e39]' : 'flex-1'}`}>
                        {sidebarTab === 'watchlist' ? <Watchlist /> : <OrderBook />}
                    </div>

                    {/* Bottom Section: Action View (TradePanel) - Only visible with Order Book */}
                    {sidebarTab === 'orderbook' && (
                        <div className="flex-1 min-h-0 overflow-y-auto styling-scrollbar bg-[#131722]">
                            <RightPanel />
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Status Bar (like TradingView) */}
            <BottomBar activeTab={activeBottomTab} setActiveTab={setActiveBottomTab} />
        </div>
    );
}
