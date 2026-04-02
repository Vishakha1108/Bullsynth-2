import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import {
    TrendingUp, BarChart3, Activity, Zap, Globe,
    Brain, Users, LineChart, ArrowRight,
    PlayCircle, Command, Layers, BookOpen, Clock
} from 'lucide-react';
import useMarketStore from '../store/useMarketStore';
import { wsManager } from '../services/websocket';

export default function LandingPage() {
    const tickers = useMarketStore((state) => state.tickers);
    const prices = useMarketStore((state) => state.prices);
    const priceChanges = useMarketStore((state) => state.priceChanges);

    const analysisPicks = [
        {
            title: "Decoding Market Structure",
            desc: "Precision Entry Planning with Risk Layering",
            link: "#"
        },
        {
            title: "Order Block Rejection to CLS Breakout",
            desc: "An institutional analysis of price action, from a Weekly Order Block rejection to a breakout above key Closing Levels.",
            link: "#"
        },
        {
            title: "The Rise Beyond the Swing High",
            desc: "An institutional analysis of the crypto market cap's multi-year journey, from swing highs and fakeouts to a potential new expansion phase.",
            link: "#"
        },
        {
            title: "Intraday Market Structure",
            desc: "A breakdown of how smart money manipulates sessions, hunts liquidity, and redistributes control using intraday market structure.",
            link: "#"
        }
    ];

    const capabilities = [
        {
            icon: <Zap size={24} className="text-purple-400" />,
            title: 'High Grade Algo Execution',
            desc: 'Deploy and optimize algorithmic strategies in real time with ultra-low-latency execution engines.',
        },
        {
            icon: <Users size={24} className="text-blue-400" />,
            title: 'Social Trading Grid',
            desc: 'Mirror top-performing traders in real time, with performance scoring and risk tracking.',
        },
        {
            icon: <Activity size={24} className="text-green-400" />,
            title: 'Low-Latency Execution',
            desc: 'Built on high-frequency-grade architecture, ensuring your trades hit the market before the rest even blink.',
        },
        {
            icon: <BarChart3 size={24} className="text-orange-400" />,
            title: 'Dynamic Market Heatmaps',
            desc: 'Instantly identify liquidity zones, aggressive flows, and imbalances across all asset classes.',
        },
        {
            icon: <Layers size={24} className="text-pink-400" />,
            title: 'Depth of Market & Order Flow',
            desc: 'Full L2/L3 data with live bid-ask flow, iceberg detection, and trade imbalances.',
        },
        {
            icon: <LineChart size={24} className="text-teal-400" />,
            title: 'Precision Charting Engine',
            desc: 'Multi-timeframe, latency-free charts with deep indicator overlays and predictive tools.',
        },
        {
            icon: <Globe size={24} className="text-indigo-400" />,
            title: 'Global Market Access',
            desc: 'Seamless multi-asset execution across emerging and developed markets—on one screen.',
        },
        {
            icon: <Brain size={24} className="text-yellow-400" />,
            title: 'Sentiment Intelligence',
            desc: 'Natural language AI scans global news and social data for actionable sentiment signals.',
        },
        {
            icon: <Command size={24} className="text-rose-400" />,
            title: 'Bloomberg-Level Terminal',
            desc: 'Institutional-grade data, analytics, and workflow tools designed for professional operators.',
        },
    ];

    useEffect(() => {
        wsManager.connect();
    }, []);

    return (
        <div className="landing-page w-full relative">

            {/* ── Navbar ─────────────────────────────────────────────────── */}
            <nav className="landing-nav fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/5">
                <div className="landing-nav-inner max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="landing-brand flex items-center gap-2 text-white hover:text-purple-400 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                            <TrendingUp size={18} className="text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">NEXTBULL</span>
                    </Link>
                    <div className="landing-nav-links hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
                        <Link to="/terminal" className="hover:text-white transition-colors">Terminal</Link>
                        <Link to="/user/dashboard" className="hover:text-white transition-colors">Workspace</Link>
                        <Link to="/admin/dashboard" className="hover:text-white transition-colors">Automation</Link>
                    </div>
                    <div className="flex flex-col items-end sm:block hidden">
                        <Link to="/terminal" className="landing-launch-btn px-5 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-gray-200 transition-colors">
                            Launch Terminal
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Ticker Marquee ──────────────────────────────────────────── */}
            <div className="landing-marquee fixed top-16 left-0 right-0 z-40 bg-[#0a0a0a] border-b border-white/5 overflow-hidden flex items-center h-10">
                <div className="flex animate-[nb-marquee_60s_linear_infinite] whitespace-nowrap">
                    {[...tickers, ...tickers, ...tickers].map((t, i) => {
                        const price = prices[t.symbol] ?? 0;
                        const change = priceChanges[t.symbol] ?? 0;
                        return (
                            <Link
                                key={`${t.symbol}-${i}`}
                                to={`/terminal?symbol=${encodeURIComponent(t.symbol)}`}
                                className="landing-marquee-item flex items-center gap-3 px-6 border-r border-white/5 hover:bg-white/5 transition-colors"
                            >
                                <span className="font-bold text-xs text-white">{t.symbol}</span>
                                <span className="font-mono text-xs text-gray-400">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className={`font-mono text-xs font-semibold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <main className="landing-main relative z-10 pt-48 pb-24">
                {/* ── Hero ────────────────────────────────────────────────────── */}
                <section className="landing-hero max-w-7xl mx-auto px-6 mb-32 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
                    
                    <div className="relative text-center max-w-4xl mx-auto">
                        <h1 className="landing-hero-title text-5xl md:text-7xl lg:text-[84px] font-black tracking-tighter leading-[1.05] text-white mb-6">
                            The AI Financial<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-teal-400">
                                Intelligence
                            </span>
                        </h1>
                        <p className="landing-hero-subtitle text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Power your financial decision with best-in-class data, news, research, analytics and access to global markets — all from one intelligent terminal.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/terminal" className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all shadow-[0_0_30px_rgba(124,58,237,0.3)] flex items-center justify-center gap-2 group">
                                Start Trading Now
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                            </Link>
                            <Link to="/user/dashboard" className="landing-hero-secondary w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                                <PlayCircle size={20} />
                                View Dashboard
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── Top Analysis Picks ──────────────────────────────────────── */}
                <section className="landing-analysis max-w-7xl mx-auto px-6 mb-32">
                    <div className="landing-analysis-head flex items-end justify-between mb-10 border-b border-white/10 pb-4">
                        <div>
                            <h2 className="text-3xl font-bold text-white tracking-tight">Top Analysis Picks</h2>
                        </div>
                        <Link to="#" className="landing-analysis-link text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1">
                            View all <ArrowRight size={16} />
                        </Link>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {analysisPicks.map((pick, i) => (
                            <Link key={i} to={pick.link} className="landing-analysis-card group flex flex-col p-6 rounded-2xl bg-[#111111] border border-white/5 hover:border-purple-500/30 transition-colors relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-600/10 to-transparent blur-2xl group-hover:from-purple-600/20 transition-all" />
                                <BookOpen size={24} className="text-purple-400 mb-4" />
                                <h3 className="landing-analysis-title text-lg font-bold text-white mb-2 leading-tight group-hover:text-purple-300 transition-colors">{pick.title}</h3>
                                <p className="landing-analysis-desc text-gray-400 text-sm leading-relaxed mt-auto">{pick.desc}</p>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* ── Execution Speed (Full width dark band) ──────────────────── */}
                <section className="landing-speed w-full bg-[#050505] border-y border-white/5 py-32 mb-32 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50" />
                    
                    {/* Speed lines effect */}
                    <div className="absolute -inset-x-full h-[1px] top-1/3 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-20 animate-[pulse_2s_infinite]" />
                    <div className="absolute -inset-x-full h-[1px] top-2/3 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-20 animate-[pulse_3s_infinite]" />
                    
                    <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-6">
                            <Clock size={14} /> Zero Latency
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-6">
                            Blazing-Fast<br/>Execution Speed.
                        </h2>
                        <p className="text-xl text-gray-400 leading-relaxed md:px-12">
                            Institutional-grade execution with lightning-fast speed and unmatched accuracy — tailored for today's agile, high-performance traders.
                        </p>
                    </div>
                </section>

                {/* ── Harness the power of AI ─────────────────────────────────── */}
                <section className="landing-capabilities max-w-7xl mx-auto px-6 mb-32">
                    <div className="mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight max-w-2xl">
                            Harness the power of AI to make the smartest financial decisions
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {capabilities.map((feature, idx) => (
                            <div key={idx} className="landing-cap-card p-8 rounded-2xl bg-[#0a0a0a] border border-[#222] hover:bg-[#111] hover:border-[#333] transition-all group">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Made for all ────────────────────────────────────────────── */}
                <section className="landing-audience max-w-7xl mx-auto px-6 mb-12">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">Made for all</h2>
                        <p className="text-gray-400">Engineered for every tier of the financial ecosystem.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="landing-audience-card p-8 rounded-3xl bg-gradient-to-b from-[#111] to-black border border-white/5">
                            <h3 className="text-2xl font-bold text-white mb-6">For Traders</h3>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                    <span className="text-gray-400 text-sm">Real-time data streams & low-latency execution.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                    <span className="text-gray-400 text-sm">Advanced charting with a full suite of indicators.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                    <span className="text-gray-400 text-sm">Customizable watchlists and real-time alerts.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="landing-audience-card p-8 rounded-3xl bg-gradient-to-b from-[#111] to-black border border-white/5">
                            <h3 className="text-2xl font-bold text-white mb-6">For Investors</h3>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                    <span className="text-gray-400 text-sm">In-depth company profiles and financial statements.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                    <span className="text-gray-400 text-sm">Portfolio tracking, analysis, and rebalancing tools.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                    <span className="text-gray-400 text-sm">Access to analyst ratings and long-term market trends.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="landing-audience-card p-8 rounded-3xl bg-gradient-to-b from-[#111] to-black border border-white/5">
                            <h3 className="text-2xl font-bold text-white mb-6">For Market Professionals</h3>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="text-gray-400 text-sm">Comprehensive market data APIs for custom solutions.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="text-gray-400 text-sm">Powerful backtesting engine to validate strategies.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="text-gray-400 text-sm">AI-powered market sentiment analysis and news feeds.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>
            </main>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <footer className="landing-footer border-t border-white/5 bg-black pt-16 pb-8 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="md:col-span-1">
                            <Link to="/" className="flex items-center gap-2 text-white mb-4">
                                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                                    <TrendingUp size={14} className="text-white" />
                                </div>
                                <span className="font-bold tracking-tight">NEXTBULL</span>
                            </Link>
                            <p className="text-gray-500 text-sm font-medium mb-6">
                                Power your financial decision.
                            </p>
                            <a href="mailto:contact@nextbull.in" className="text-purple-400 text-sm font-semibold hover:text-purple-300">
                                contact@nextbull.in
                            </a>
                        </div>
                        
                        <div>
                            <h4 className="text-white font-bold mb-4 tracking-tight">Products</h4>
                            <ul className="space-y-3">
                                <li><Link to="/terminal" className="text-gray-400 hover:text-white text-sm transition-colors">Terminal</Link></li>
                                <li><Link to="/user/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">Workspace</Link></li>
                                <li><Link to="/admin/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">Automation Bots</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-bold mb-4 tracking-tight">Knowledge Hub</h4>
                            <ul className="space-y-3">
                                <li><Link to="#" className="text-gray-400 hover:text-white text-sm transition-colors">Research</Link></li>
                                <li><Link to="#" className="text-gray-400 hover:text-white text-sm transition-colors">News</Link></li>
                                <li><Link to="#" className="text-gray-400 hover:text-white text-sm transition-colors">Education</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-bold mb-4 tracking-tight">Company</h4>
                            <ul className="space-y-3">
                                <li><Link to="#" className="text-gray-400 hover:text-white text-sm transition-colors">About</Link></li>
                                <li><Link to="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</Link></li>
                                <li><Link to="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</Link></li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
                        <p>© NextBull 2026. All rights reserved.</p>
                        <div className="flex items-center gap-6 mt-4 md:mt-0">
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                All Systems Operational
                            </span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
