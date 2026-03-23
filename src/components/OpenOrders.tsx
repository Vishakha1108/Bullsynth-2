import useMarketStore from '../store/useMarketStore';
import { wsManager } from '../services/websocket';

export default function OpenOrders() {
    const orders = useMarketStore(state => state.openOrders);

    const handleCancel = (id: string) => {
        // Send cancel request (simulated per spec)
        wsManager.send({ action: 'cancel', order_id: id });
        useMarketStore.getState().removeOrder(id);
    };

    return (
        <div className="bg-bg-panel border border-border-subtle rounded flex flex-col h-full w-full min-h-0">
            <div className="px-4 py-3 border-b border-border-subtle">
                <h3 className="uppercase tracking-widest text-xs text-text-secondary border-l-2 border-accent pl-2 font-semibold">OPEN ORDERS ({orders.length})</h3>
            </div>

            <div className="flex-1 overflow-y-auto styling-scrollbar">
                {orders.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                        No open orders
                    </div>
                ) : (
                    <table className="w-full text-left text-xs font-mono">
                        <thead className="text-text-secondary uppercase sticky top-0 bg-bg-panel border-b border-border-subtle">
                            <tr>
                                <th className="font-medium pb-2 pt-3 px-4">Type</th>
                                <th className="font-medium pb-2 pt-3 px-4 text-right">Price</th>
                                <th className="font-medium pb-2 pt-3 px-4 text-right">Qty</th>
                                <th className="font-medium pb-2 pt-3 px-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => (
                                <tr key={o.id} className="border-b border-border-subtle/50 hover:bg-bg-elevated transition-colors">
                                    <td className="py-2 px-4">
                                        <span className={`font-bold ${o.side === 'BUY' ? 'text-bull' : 'text-bear'}`}>
                                            {o.side}
                                        </span>{' '}
                                        <span className="text-text-secondary capitalize">{o.type}</span>
                                    </td>
                                    <td className="py-2 px-4 text-right text-text-primary">
                                        {o.price ? o.price.toFixed(2) : 'MKT'}
                                    </td>
                                    <td className="py-2 px-4 text-right text-text-primary">{o.qty}</td>
                                    <td className="py-2 px-4 text-center">
                                        <button
                                            onClick={() => handleCancel(o.id)}
                                            className="text-text-secondary hover:text-bear underline transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
