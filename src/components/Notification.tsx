import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import useMarketStore from '../store/useMarketStore';

interface NotificationProps {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

function NotificationItem({ message, type, onClose }: NotificationProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : Info;
    const colorClass = type === 'success' ? 'text-bull' : type === 'error' ? 'text-bear' : 'text-blue-400';
    const borderClass = type === 'success' ? 'border-bull/20' : type === 'error' ? 'border-bear/20' : 'border-blue-400/20';

    return (
        <div className={`flex items-center gap-3 px-4 py-3 bg-bg-elevated border ${borderClass} rounded-lg shadow-lg animate-slide-in pointer-events-auto min-w-[300px] mb-2`}>
            <Icon size={18} className={colorClass} />
            <span className="flex-1 text-sm text-text-primary">{message}</span>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
                <X size={16} />
            </button>
        </div>
    );
}

export default function NotificationContainer() {
    const notifications = useMarketStore(state => state.notifications);
    const removeNotification = useMarketStore(state => state.removeNotification);

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col items-end pointer-events-none">
            {notifications.map((n) => (
                <NotificationItem
                    key={n.id}
                    {...n}
                    onClose={() => removeNotification(n.id)}
                />
            ))}
        </div>
    );
}
