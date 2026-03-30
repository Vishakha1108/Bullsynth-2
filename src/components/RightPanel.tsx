import TradePanel from './TradePanel';
import OpenOrders from './OpenOrders';

export default function RightPanel() {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-none">
                <TradePanel />
            </div>
            <div className="flex-1 min-h-[200px]">
                <OpenOrders />
            </div>
        </div>
    );
}
