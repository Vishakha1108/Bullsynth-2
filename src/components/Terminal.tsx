import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { wsManager } from '../services/websocket';
import Header from './Header';
import Chart from './Chart';
import OrderBook from './OrderBook';
import RightPanel from './RightPanel';
import RecentTrades from './RecentTrades';
import BottomBar from './BottomBar.tsx';
import useMarketStore from '../store/useMarketStore';

export default function Terminal() {
    const [activeBottomTab, setActiveBottomTab] = useState<string | null>(null);
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
                            {activeBottomTab === 'trades' && <RecentTrades />}
                            {activeBottomTab === 'trading' && <RightPanel />}
                        </div>
                    )}
                </div>

                {/* Right Panel: Order Book + Trade Panel (like TradingView's right sidebar) */}
                <div className="w-[300px] min-w-[300px] border-l border-[#2a2e39] bg-[#131722] flex flex-col overflow-hidden">
                    {/* Tab switcher */}
                    <div className="flex border-b border-[#2a2e39]">
                        <button className="tv-right-tab active">Order Book</button>
                        <button className="tv-right-tab">Trades</button>
                    </div>

                    {/* Split: Top = OrderBook, Bottom = Trade Panel */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="flex-1 min-h-0 overflow-hidden border-b border-[#2a2e39]">
                            <OrderBook />
                        </div>
                        <div className="overflow-y-auto styling-scrollbar">
                            <RightPanel />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Status Bar (like TradingView) */}
            <BottomBar activeTab={activeBottomTab} setActiveTab={setActiveBottomTab} />
        </div>
    );
}
