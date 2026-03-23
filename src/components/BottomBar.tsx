import { Clock } from 'lucide-react';
import useMarketStore from '../store/useMarketStore';

interface BottomBarProps {
    activeTab: string | null;
    setActiveTab: (tab: string | null) => void;
}

export default function BottomBar({ activeTab, setActiveTab }: BottomBarProps) {
    const connected = useMarketStore(state => state.wsConnected);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tzOffset = -now.getTimezoneOffset() / 60;
    const tzStr = `UTC${tzOffset >= 0 ? '+' : ''}${tzOffset}`;

    const tabs = [
        { id: 'orderbook', label: 'Order Book' },
        { id: 'trades', label: 'Recent Trades' },
        { id: 'trading', label: 'Trading Panel' },
    ];

    const handleTabClick = (tabId: string) => {
        setActiveTab(activeTab === tabId ? null : tabId);
    };

    return (
        <div className="tv-bottom-bar">
            <div className="tv-bottom-bar-left">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tv-bottom-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabClick(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="tv-bottom-bar-right">
                <div className="tv-bottom-connection">
                    <div className={`tv-status-dot ${connected ? 'connected' : 'disconnected'}`} />
                    <span>{connected ? 'Live' : 'Offline'}</span>
                </div>
                <div className="tv-bottom-separator" />
                <div className="tv-bottom-time">
                    <Clock size={12} />
                    <span>{timeStr} ({tzStr})</span>
                </div>
            </div>
        </div>
    );
}
