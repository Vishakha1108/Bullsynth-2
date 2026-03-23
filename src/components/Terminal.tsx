import { useEffect } from 'react';
import { wsManager } from '../services/websocket';
import Header from './Header';
import Chart from './Chart';
import OrderBook from './OrderBook';
import RightPanel from './RightPanel';
import RecentTrades from './RecentTrades';

export default function Terminal() {
    useEffect(() => {
        wsManager.connect();
        // In a real app we might disconnect on unmount, but here we want to keep it alive
    }, []);

    return (
        <div className="h-screen w-screen bg-terminal text-text-primary flex flex-col font-sans overflow-hidden">
            {/* Container with CSS Grid: Row 1 = 56px, Row 2 = remaining viewport */}
            <div
                className="h-full w-full grid"
                style={{
                    gridTemplateRows: '56px minmax(0, 1fr)',
                    gridTemplateColumns: '280px minmax(0, 1fr) 320px',
                }}
            >
                {/* Row 1: Header spans all columns */}
                <div className="col-span-3 border-b border-border-subtle bg-bg-panel">
                    <Header />
                </div>

                {/* Column 1: Order Book */}
                <div className="border-r border-border-subtle bg-bg-panel flex flex-col overflow-hidden h-full min-h-0">
                    <OrderBook />
                </div>

                {/* Column 2: Chart + Recent Trades */}
                <div className="flex flex-col border-r border-border-subtle bg-bg-terminal h-full min-h-0 overflow-hidden">
                    <div className="flex-1 min-h-0 relative flex flex-col">
                        <Chart />
                    </div>
                    <div className="h-[160px] border-t border-border-subtle bg-bg-panel flex flex-col min-h-0">
                        <RecentTrades />
                    </div>
                </div>

                {/* Column 3: Right Panel (independently scrollable) */}
                <div className="bg-bg-panel overflow-y-auto styling-scrollbar h-full">
                    <RightPanel />
                </div>
            </div>
        </div>
    );
}
