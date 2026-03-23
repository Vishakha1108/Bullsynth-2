import { Link } from 'react-router-dom';
import { TrendingUp, BarChart3, ArrowUpDown, Activity } from 'lucide-react';
import useMarketStore from '../store/useMarketStore';

export default function LandingPage() {
    const currentPrice = useMarketStore(state => state.lastPrice);

    return (
        <div className="min-h-screen bg-nb-bg text-nb-text-1 font-sans selection:bg-nb-accent/30 selection:text-white pb-20">

            {/* Ticker Strip */}
            <div className="bg-nb-surface border-b border-nb-border py-2 overflow-hidden sticky top-0 z-50 shadow-md">
                <div className="animate-marquee whitespace-nowrap font-mono text-sm inline-flex items-center w-[max-content]">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex items-center">
                            <span className="mx-8 font-bold text-nb-text-1">SYNTH/USD</span>
                            <span className="mx-4 text-nb-bull">
                                ${currentPrice.toFixed(2)} ▲ 0.47%
                            </span>
                            <span className="mx-4 text-nb-text-2">Vol: 12,450</span>
                            <span className="mx-4 text-nb-bull">Bid: ${(currentPrice - 0.05).toFixed(2)}</span>
                            <span className="mx-4 text-nb-bear">Ask: ${(currentPrice + 0.05).toFixed(2)}</span>
                            <span className="mx-8 text-nb-border">|</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hero Section */}
            <main className="relative pt-20 pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[80vh]">
                {/* Decorative background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-nb-accent/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 container mx-auto px-4 text-center flex flex-col items-center justify-center">
                    <div className="inline-flex items-center gap-3 mb-6 bg-nb-surface/80 backdrop-blur-sm border border-nb-border px-4 py-2 rounded-full shadow-lg">
                        <TrendingUp className="text-nb-accent" size={20} />
                        <span className="font-brand font-bold tracking-widest text-sm text-nb-text-2">NEXTBULL EXCHANGE</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-brand tracking-tight mb-8 leading-tight">
                        Synthetic <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-nb-accent to-nb-bull">Markets</span> Online
                    </h1>

                    <p className="text-lg md:text-xl text-nb-text-2 max-w-2xl mx-auto mb-12 font-medium">
                        Real-time simulated trading at your fingertips. Experience institutional-grade charting, deep liquidity order books, and bot competition.
                    </p>

                    <Link
                        to="/terminal"
                        className="group relative inline-flex items-center justify-center bg-nb-accent hover:bg-nb-accent-h text-nb-bg font-extrabold text-lg md:text-xl px-10 py-5 rounded-lg transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_50px_rgba(245,158,11,0.5)] hover:-translate-y-1"
                    >
                        Enter Terminal <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                </div>
            </main>

            {/* Features Showcase */}
            <section className="container mx-auto px-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">

                    <FeatureCard
                        icon={<BarChart3 size={32} className="text-nb-accent mb-4" />}
                        title="Live Candlestick Charts"
                        desc="Real-time 1-second candles powered by TradingView's high-performance canvas engine."
                    />

                    <FeatureCard
                        icon={<ArrowUpDown size={32} className="text-nb-bull mb-4" />}
                        title="Full Order Book"
                        desc="Bid/ask depth visualization with 50+ order-per-second throughput and sub-millisecond execution."
                    />

                    <FeatureCard
                        icon={<Activity size={32} className="text-nb-bear mb-4" />}
                        title="Algorithmic Trading"
                        desc="Market maker and alpha bots competing in the synthetic market ecosystem."
                    />

                </div>
            </section>

            <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="bg-nb-surface/60 backdrop-blur-md border border-nb-border p-8 rounded-xl hover:bg-nb-surface transition-colors shadow-xl group">
            <div className="transform group-hover:scale-110 transition-transform origin-left">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-white font-brand">{title}</h3>
            <p className="text-nb-text-2 leading-relaxed">{desc}</p>
        </div>
    );
}
