import TradePanel from './TradePanel';
import Portfolio from './Portfolio';
import OpenOrders from './OpenOrders';

export default function RightPanel() {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-none">
                <TradePanel />
            </div>
            <div className="flex-none">
                <Portfolio />
            </div>
            <div className="flex-1 min-h-[200px]">
                <OpenOrders />
            </div>
        </div>
    );
}
