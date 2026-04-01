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
import { List, BookOpen, Bot, Wallet } from 'lucide-react';
import Portfolio from './Portfolio';
import BotPanel from './BotPanel';
import NotificationContainer from './Notification';

type SidebarTab = 'portfolio' | 'watchlist' | 'orderbook' | 'bot';

export default function Terminal() {
    const [singleTab, setSingleTab] = useState<SidebarTab>('orderbook');
    const [panelOneTab, setPanelOneTab] = useState<SidebarTab>('orderbook');
    const [panelTwoTab, setPanelTwoTab] = useState<SidebarTab>('watchlist');
    const [activePanel, setActivePanel] = useState<1 | 2>(1);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const [panelLayout, setPanelLayout] = useState<1 | 2>(1);
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

    useEffect(() => {
        if (panelLayout === 2) {
            // In dual-panel mode we always open both sections with defaults.
            setIsRightPanelOpen(true);
        } else {
            setActivePanel(1);
        }
    }, [panelLayout]);

    const renderTabContent = (tab: SidebarTab) => {
        if (tab === 'portfolio') return <Portfolio onClose={() => setIsRightPanelOpen(false)} />;
        if (tab === 'watchlist') return <Watchlist onClose={() => setIsRightPanelOpen(false)} />;
        if (tab === 'orderbook') return <OrderBook onClose={() => setIsRightPanelOpen(false)} />;
        return <BotPanel onClose={() => setIsRightPanelOpen(false)} />;
    };

    const handleToolbarTabSelect = (tab: SidebarTab) => {
        if (panelLayout === 1) {
            if (singleTab === tab && isRightPanelOpen) {
                setIsRightPanelOpen(false);
            } else {
                setSingleTab(tab);
                setIsRightPanelOpen(true);
            }
            return;
        }

        setIsRightPanelOpen(true);
        if (activePanel === 1) {
            setPanelOneTab(tab);
        } else {
            setPanelTwoTab(tab);
        }
    };

    return (
        <div className="h-screen w-screen bg-bg-terminal text-text-primary flex flex-col font-sans overflow-hidden">
            <Header />

            <div className="flex-1 flex min-h-0 relative">
                <div className="flex-1 flex flex-col min-w-0 min-h-0 transition-all duration-300">
                    <div className="flex-1 min-h-0 relative">
                        <Chart />
                    </div>
                </div>

                <div className={`overflow-hidden transition-[width] duration-300 ease-in-out border-l border-border-subtle bg-bg-terminal flex ${panelLayout === 2 ? 'flex-row' : 'flex-col'} ${isRightPanelOpen ? (panelLayout === 2 ? 'w-[640px]' : 'w-[320px]') : 'w-0 border-none'}`}>
                    {panelLayout === 1 && (
                        <>
                            <div className={`min-h-0 overflow-hidden flex flex-col min-w-[320px] ${singleTab === 'orderbook' || singleTab === 'portfolio' ? 'flex-none border-b border-border-subtle' : 'flex-1'}`}>
                                {renderTabContent(singleTab)}
                            </div>

                            {singleTab === 'orderbook' && (
                                <div className="flex-1 min-h-0 overflow-y-auto styling-scrollbar bg-bg-terminal min-w-[320px]">
                                    <RightPanel />
                                </div>
                            )}
                        </>
                    )}

                    {panelLayout === 2 && (
                        <>
                            <div
                                className={`w-[320px] min-h-0 overflow-hidden border-r border-border-subtle flex-none ${activePanel === 1 ? 'bg-bg-elevated/40' : ''}`}
                                onClick={() => setActivePanel(1)}
                            >
                                {panelOneTab === 'orderbook' ? (
                                    <div className="h-full min-h-0 flex flex-col">
                                        <div className="flex-none border-b border-border-subtle min-h-0 overflow-hidden">
                                            <OrderBook onClose={() => setIsRightPanelOpen(false)} />
                                        </div>
                                        <div className="flex-1 min-h-0 overflow-y-auto styling-scrollbar bg-bg-terminal">
                                            <RightPanel />
                                        </div>
                                    </div>
                                ) : (
                                    renderTabContent(panelOneTab)
                                )}
                            </div>
                            <div
                                className={`w-[320px] min-h-0 overflow-hidden flex-none ${activePanel === 2 ? 'bg-bg-elevated/40' : ''}`}
                                onClick={() => setActivePanel(2)}
                            >
                                {panelTwoTab === 'orderbook' ? (
                                    <div className="h-full min-h-0 flex flex-col">
                                        <div className="flex-none border-b border-border-subtle min-h-0 overflow-hidden">
                                            <OrderBook onClose={() => setIsRightPanelOpen(false)} />
                                        </div>
                                        <div className="flex-1 min-h-0 overflow-y-auto styling-scrollbar bg-bg-terminal">
                                            <RightPanel />
                                        </div>
                                    </div>
                                ) : (
                                    renderTabContent(panelTwoTab)
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="w-14 bg-bg-terminal border-l border-border-subtle flex flex-col items-center py-4 gap-4 flex-none z-10 transition-colors">
                    {panelLayout === 2 && (
                        <div className="flex flex-col gap-1">
                            <button
                                className={`w-10 h-6 rounded text-[10px] font-semibold transition-all ${activePanel === 1 ? 'bg-border-subtle text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
                                onClick={() => setActivePanel(1)}
                                title="Edit Panel 1"
                            >
                                P1
                            </button>
                            <button
                                className={`w-10 h-6 rounded text-[10px] font-semibold transition-all ${activePanel === 2 ? 'bg-border-subtle text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
                                onClick={() => setActivePanel(2)}
                                title="Edit Panel 2"
                            >
                                P2
                            </button>
                        </div>
                    )}

                    <button
                        className={`w-12 h-16 rounded flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${((panelLayout === 1 && singleTab === 'portfolio') || (panelLayout === 2 && ((activePanel === 1 && panelOneTab === 'portfolio') || (activePanel === 2 && panelTwoTab === 'portfolio')))) && isRightPanelOpen ? 'bg-border-subtle text-text-primary shadow-inner' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
                        onClick={() => handleToolbarTabSelect('portfolio')}
                        title="Portfolio"
                    >
                        <Wallet size={21} />
                        <span className="text-[10px] font-semibold leading-none">Portfolio</span>
                    </button>

                    <button
                        className={`w-12 h-16 rounded flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${((panelLayout === 1 && singleTab === 'watchlist') || (panelLayout === 2 && ((activePanel === 1 && panelOneTab === 'watchlist') || (activePanel === 2 && panelTwoTab === 'watchlist')))) && isRightPanelOpen ? 'bg-border-subtle text-text-primary shadow-inner' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
                        onClick={() => handleToolbarTabSelect('watchlist')}
                        title="Watchlist"
                    >
                        <List size={21} />
                        <span className="text-[10px] font-semibold leading-none">Watchlist</span>
                    </button>

                    <button
                        className={`w-12 h-16 rounded flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${((panelLayout === 1 && singleTab === 'orderbook') || (panelLayout === 2 && ((activePanel === 1 && panelOneTab === 'orderbook') || (activePanel === 2 && panelTwoTab === 'orderbook')))) && isRightPanelOpen ? 'bg-border-subtle text-text-primary shadow-inner' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
                        onClick={() => handleToolbarTabSelect('orderbook')}
                        title="Order Book"
                    >
                        <BookOpen size={21} />
                        <span className="text-[10px] font-semibold leading-[1.1] text-center">Order<br />Book</span>
                    </button>

                    <button
                        className={`w-12 h-16 rounded flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${((panelLayout === 1 && singleTab === 'bot') || (panelLayout === 2 && ((activePanel === 1 && panelOneTab === 'bot') || (activePanel === 2 && panelTwoTab === 'bot')))) && isRightPanelOpen ? 'bg-border-subtle text-text-primary shadow-inner' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
                        onClick={() => handleToolbarTabSelect('bot')}
                        title="Trading Bots"
                    >
                        <Bot size={21} />
                        <span className="text-[10px] font-semibold leading-none">Bots</span>
                    </button>

                    <button
                        className="mt-auto w-12 h-12 rounded flex items-center justify-center transition-all cursor-pointer text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                        onClick={() => setPanelLayout(panelLayout === 1 ? 2 : 1)}
                        title={`Switch to ${panelLayout === 1 ? '2' : '1'} Panel Layout`}
                    >
                        {panelLayout === 1 ? (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <line x1="12" y1="3" x2="12" y2="21" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            <BottomBar />
            <NotificationContainer />
        </div>
    );
}
