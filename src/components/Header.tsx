import { Link } from 'react-router-dom';
import useMarketStore from '../store/useMarketStore';
import { TrendingUp } from 'lucide-react';

export default function Header() {
    const currentPrice = useMarketStore(state => state.lastPrice);
    const connected = useMarketStore(state => state.wsConnected);

    return (
        <header className="h-14 bg-nb-surface border-b border-nb-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-50">
            <div className="flex items-center gap-6">
                <Link to="/" className="flex items-center gap-2 group">
                    <TrendingUp className="text-nb-accent group-hover:text-nb-accent-h transition-colors" size={24} />
                    <span className="font-brand font-bold text-lg tracking-wider text-nb-text-1 group-hover:text-white transition-colors">
                        NEXTBULL
                    </span>
                </Link>

                <div className="hidden sm:flex items-center bg-nb-bg px-3 py-1.5 rounded border border-nb-border/50">
                    <span className="text-nb-text-2 text-sm font-semibold mr-3">SYNTH/USD</span>
                    <span className="font-mono text-nb-text-1 font-bold">${currentPrice.toFixed(2)}</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-nb-bull shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-nb-bear shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                    <span className="text-xs text-nb-text-3 hidden md:inline-block">
                        {connected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>

                <div className="w-8 h-8 rounded bg-gradient-to-br from-nb-elevated to-nb-bg border border-nb-border flex items-center justify-center text-xs font-bold text-nb-text-2">
                    U1
                </div>
            </div>
        </header>
    );
}
