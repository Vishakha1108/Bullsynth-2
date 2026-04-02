import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { wsManager } from '../services/websocket';
import Header from './Header';
import Chart from './Chart';
import OrderBook from './OrderBook';
import Watchlist from './Watchlist';
import RightPanel from './RightPanel';
import BottomBar from './BottomBar.tsx';
import useMarketStore, { LAYOUT_TEMPLATES } from '../store/useMarketStore';
import { List, BookOpen, Bot, Wallet } from 'lucide-react';
import Portfolio from './Portfolio';
import BotPanel from './BotPanel';
import NotificationContainer from './Notification';
import { ChartToolbar } from './ChartToolbar';

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
    const layoutId = useMarketStore((state) => state.layoutId);
    const activePaneId = useMarketStore((state) => state.activePaneId);
    const setActivePaneId = useMarketStore((state) => state.setActivePaneId);

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

    const toolbarTabIsActive = (tab: SidebarTab) => {
        if (!isRightPanelOpen) return false;
        if (panelLayout === 1) return singleTab === tab;
        return (activePanel === 1 ? panelOneTab : panelTwoTab) === tab;
    };

    const handlePanelLayoutToggle = () => {
        if (panelLayout === 1) {
            setPanelLayout(2);
            setIsRightPanelOpen(true);
        } else {
            setPanelLayout(1);
            setActivePanel(1);
        }
    };

    return (
        <div className="h-screen w-screen bg-bg-terminal text-text-primary flex flex-col font-sans overflow-hidden">
            {/* Top Header Bar (TradingView style) */}
            <Header />

            {/* Main Content Area */}
            <div className="flex-1 flex min-h-0 relative">
                {/* Drawing Tools Sidebar (Global) */}
                <ChartToolbar />

                {/* Layout-based chart grid area takes full width minus right panel */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0 transition-all duration-300">
                    {/* Get the layout template for the current layout ID */}
                    {(() => {
                        const layout = LAYOUT_TEMPLATES.find(l => l.id === layoutId) || LAYOUT_TEMPLATES[0];
                        return (
                            <div
                                className="flex-1 min-h-0 relative"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: layout.gridTemplateColumns,
                                    gridTemplateRows: layout.gridTemplateRows,
                                    gridTemplateAreas: layout.gridTemplateAreas,
                                    gap: '1px',
                                    background: '#2a2e39', // gap/divider colour
                                }}
                            >
                                {/* Render Chart for each pane in the layout */}
                                {layout.paneAreaNames.map((areaName, i) => {
                                    const isActive = areaName === activePaneId;
                                    const isMultiPane = layout.paneAreaNames.length > 1;
                                    return (
                                        <div
                                            key={`pane-${i}`}
                                            style={{
                                                gridArea: areaName,
                                                position: 'relative',
                                            }}
                                            className="flex flex-col min-h-0 overflow-hidden bg-bg-terminal cursor-pointer transition-all"
                                            onClick={() => setActivePaneId(areaName)}
                                        >
                                            <Chart paneId={areaName} />
                                            {isMultiPane && isActive && <div className="absolute inset-0 border-2 border-[#2962ff] pointer-events-none z-[5]"></div>}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>

                {/* Collapsible Right Area Container */}
                <div className={`overflow-hidden transition-[width] duration-300 ease-in-out border-l border-border-subtle bg-bg-terminal flex ${panelLayout === 2 ? 'flex-row' : 'flex-col'} ${isRightPanelOpen ? (panelLayout === 2 ? 'w-160' : 'w-[320px]') : 'w-0 border-none'}`}>
                    {panelLayout === 1 && (
                        <>
                            {/* Top Section: Information View */}
                            <div className={`min-h-0 overflow-hidden overflow-x-hidden flex flex-col min-w-[320px] max-w-[320px] ${(singleTab === 'orderbook' || singleTab === 'portfolio') ? 'flex-none border-b border-border-subtle' : 'flex-1'}`}>
                                {renderTabContent(singleTab)}
                            </div>

                            {/* Bottom Section: Action View (TradePanel) - Only visible with Order Book */}
                            {singleTab === 'orderbook' && (
                                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden styling-scrollbar bg-bg-terminal min-w-[320px] max-w-[320px]">
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

                {/* Thin Far-Right Icon Toolbar (Always visible) */}
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
                        className="w-12 flex flex-col items-center gap-1.5 cursor-pointer group"
                        onClick={() => handleToolbarTabSelect('portfolio')}
                        title="Portfolio"
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border ${toolbarTabIsActive('portfolio') ? 'sidebar-icon-active' : 'bg-bg-elevated border-border-subtle text-text-secondary group-hover:text-text-primary group-hover:border-text-secondary/30'}`}>
                            <Wallet size={20} />
                        </div>
                        <span className={`text-[10px] font-semibold leading-none transition-colors ${toolbarTabIsActive('portfolio') ? 'sidebar-label-active' : 'text-text-secondary group-hover:text-text-primary'}`}>Portfolio</span>
                    </button>

                    <button
                        className="w-12 flex flex-col items-center gap-1.5 cursor-pointer group"
                        onClick={() => handleToolbarTabSelect('watchlist')}
                        title="Watchlist"
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border ${toolbarTabIsActive('watchlist') ? 'sidebar-icon-active' : 'bg-bg-elevated border-border-subtle text-text-secondary group-hover:text-text-primary group-hover:border-text-secondary/30'}`}>
                            <List size={20} />
                        </div>
                        <span className={`text-[10px] font-semibold leading-none transition-colors ${toolbarTabIsActive('watchlist') ? 'sidebar-label-active' : 'text-text-secondary group-hover:text-text-primary'}`}>Watchlist</span>
                    </button>

                    <button
                        className="w-12 flex flex-col items-center gap-1.5 cursor-pointer group"
                        onClick={() => handleToolbarTabSelect('orderbook')}
                        title="Order Book"
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border ${toolbarTabIsActive('orderbook') ? 'sidebar-icon-active' : 'bg-bg-elevated border-border-subtle text-text-secondary group-hover:text-text-primary group-hover:border-text-secondary/30'}`}>
                            <BookOpen size={20} />
                        </div>
                        <span className={`text-[10px] font-semibold leading-[1.1] text-center transition-colors ${toolbarTabIsActive('orderbook') ? 'sidebar-label-active' : 'text-text-secondary group-hover:text-text-primary'}`}>Order<br />Book</span>
                    </button>

                    <button
                        className="w-12 flex flex-col items-center gap-1.5 cursor-pointer group"
                        onClick={() => handleToolbarTabSelect('bot')}
                        title="Trading Bots"
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border ${toolbarTabIsActive('bot') ? 'sidebar-icon-active' : 'bg-bg-elevated border-border-subtle text-text-secondary group-hover:text-text-primary group-hover:border-text-secondary/30'}`}>
                            <Bot size={20} />
                        </div>
                        <span className={`text-[10px] font-semibold leading-none transition-colors ${toolbarTabIsActive('bot') ? 'sidebar-label-active' : 'text-text-secondary group-hover:text-text-primary'}`}>Bots</span>
                    </button>

                    <button
                        className="mt-auto w-12 h-12 rounded flex items-center justify-center transition-all cursor-pointer text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                        onClick={handlePanelLayoutToggle}
                        title={`Switch to ${panelLayout === 1 ? '2' : '1'} Panel Layout`}
                    >
                        {panelLayout === 1 ? (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M12 3V21" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M12 3V21" />
                                <path d="M3 12H21" opacity="0.35" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Bottom Status Bar (like TradingView) */}
            <BottomBar />

            {/* Notifications */}
            <NotificationContainer />
        </div>
    );
}
