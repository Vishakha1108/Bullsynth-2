import { Clock } from 'lucide-react';
import useMarketStore from '../store/useMarketStore';

export default function BottomBar() {
    const connected = useMarketStore(state => state.wsConnected);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tzOffset = -now.getTimezoneOffset() / 60;
    const tzStr = `UTC${tzOffset >= 0 ? '+' : ''}${tzOffset}`;

    return (
        <div className="tv-bottom-bar">
            <div className="tv-bottom-bar-left">
                {/* Buttons removed per user request */}
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
