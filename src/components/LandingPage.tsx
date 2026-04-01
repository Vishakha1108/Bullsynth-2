import { Link } from 'react-router-dom';
import {
    TrendingUp, BarChart3, ArrowUpDown, Activity, Zap, Globe,
    Brain, Users, Shield, LineChart, Sparkles, ArrowRight
} from 'lucide-react';
import useMarketStore from '../store/useMarketStore';

export default function LandingPage() {
    const tickers = useMarketStore((state) => state.tickers);
    const prices = useMarketStore((state) => state.prices);
    const priceChanges = useMarketStore((state) => state.priceChanges);

    const navigationSchema = {
        '@context': 'https://schema.org',
        '@type': 'SiteNavigationElement',
        name: 'Primary Navigation',
        about: 'Main navigation links for NextBull',
        url: 'https://nextbull.in',
        hasPart: [
            { '@type': 'WebPage', name: 'All Products', url: 'https://nextbull.in/products' },
            { '@type': 'WebPage', name: 'Deep Research', url: 'https://nextbull.in/products#deep-research' },
            { '@type': 'WebPage', name: 'The AI Engine', url: 'https://nextbull.in/products#ai-engine' },
            { '@type': 'WebPage', name: 'Derivatives & Options', url: 'https://nextbull.in/products#options-trading' },
            { '@type': 'WebPage', name: 'Financial Analysis', url: 'https://nextbull.in/products#financial-analysis' },
            { '@type': 'WebPage', name: 'Global Network', url: 'https://nextbull.in/products#global-network' },
            { '@type': 'WebPage', name: 'NextBull BlackEdge', url: 'https://nextbull.in/blackedge' },
            { '@type': 'WebPage', name: 'All Markets', url: 'https://nextbull.in/markets' },
            { '@type': 'WebPage', name: 'Tokenized Assets', url: 'https://nextbull.in/nextbull-markets#tokenized-assets' },
            { '@type': 'WebPage', name: 'NextBull Markets', url: 'https://nextbull.in/nextbull-markets' },
            { '@type': 'WebPage', name: 'NextBull Connect', url: 'https://nextbull.in/nextbull-markets#nextbull-connect' },
            { '@type': 'WebPage', name: 'NextBull System', url: 'https://nextbull.in/nextbull-markets#nextbull-system' },
            { '@type': 'WebPage', name: 'Terminal Overview', url: 'https://nextbull.in/terminal' },
            { '@type': 'WebPage', name: 'Research', url: 'https://nextbull.in/research' },
            { '@type': 'WebPage', name: 'News', url: 'https://nextbull.in/news' },
            { '@type': 'WebPage', name: 'Access', url: 'https://nextbull.in/access' },
            { '@type': 'WebPage', name: 'Charts', url: 'https://nextbull.in/charts' },
            { '@type': 'WebPage', name: 'Collaboration Tools', url: 'https://nextbull.in/collaboration' },
            { '@type': 'WebPage', name: 'Education', url: 'https://nextbull.in/education' },
            { '@type': 'WebPage', name: 'Portfolio Analytics', url: 'https://nextbull.in/portfolio-analytics' },
            { '@type': 'WebPage', name: 'All Articles', url: 'https://nextbull.in/knowledge' },
            { '@type': 'WebPage', name: 'Information', url: 'https://nextbull.in/knowledge?tab=information' },
            { '@type': 'WebPage', name: 'Analysis', url: 'https://nextbull.in/knowledge?tab=analysis' },
            { '@type': 'WebPage', name: 'FAQs', url: 'https://nextbull.in/why-us#faq' },
            { '@type': 'WebPage', name: 'About', url: 'https://nextbull.in/about' },
            { '@type': 'WebPage', name: 'Why Us', url: 'https://nextbull.in/why-us' },
            { '@type': 'WebPage', name: 'BlackEdge', url: 'https://nextbull.in/blackedge' },
        ],
    };

    return (
        <div className="nb-landing">
            {/* ── Navbar ─────────────────────────────────────────────────── */}
            <nav className="nb-navbar">
                <div className="nb-navbar-inner">
                    <Link to="/" className="nb-logo">
                        <TrendingUp size={22} />
                        <span>NEXTBULL</span>
                    </Link>
                    <div className="nb-navbar-right">
                        <div className="nb-nav-links">
                            <Link to="/terminal" className="nb-nav-link">Terminal</Link>
                            <Link to="/user/dashboard" className="nb-nav-link">Dashboard</Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ── Ticker Marquee ──────────────────────────────────────────── */}
            <div className="nb-marquee-bar">
                <div className="nb-marquee-track">
                    {[...tickers, ...tickers].map((t, i) => {
                        const price = prices[t.symbol] ?? 0;
                        const change = priceChanges[t.symbol] ?? 0;
                        return (
                            <Link
                                key={`${t.symbol}-${i}`}
                                to={`/terminal?symbol=${encodeURIComponent(t.symbol)}`}
                                className="nb-marquee-item"
                            >
                                <span className="nb-marquee-sym">{t.symbol}</span>
                                <span className="nb-marquee-price">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className={`nb-marquee-change ${change >= 0 ? 'up' : 'down'}`}>
                                    {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* ── Hero ────────────────────────────────────────────────────── */}
            <section className="nb-hero">
                <div className="nb-hero-glow" />
                <div className="nb-hero-glow-2" />
                <div className="nb-hero-content">
                    <div className="nb-hero-badge">
                        <Sparkles size={14} />
                        <span>AI-Powered Intelligence Terminal</span>
                    </div>
                    <h1 className="nb-hero-title">
                        The AI Financial<br />
                        <span className="nb-hero-gradient">Intelligence</span>
                    </h1>
                    <p className="nb-hero-subtitle">
                        Power your financial decisions with best-in-class data, research, analytics
                        and access to global markets — all from one intelligent terminal.
                    </p>
                    <div className="nb-hero-actions">
                        <Link to="/terminal" className="nb-cta-primary">
                            Launch Terminal
                            <ArrowRight size={18} />
                        </Link>
                        <Link to="/user/dashboard" className="nb-cta-secondary">
                            View Dashboard
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Features Grid ───────────────────────────────────────────── */}
            <section className="nb-section">
                <div className="nb-section-inner">
                    <h2 className="nb-section-title">
                        Harness the Power of <span className="nb-hero-gradient">AI</span>
                    </h2>
                    <p className="nb-section-desc">
                        Make the smartest financial decisions with institutional-grade tools.
                    </p>
                    <div className="nb-features-grid">
                        <FeatureCard icon={<Zap />} title="High Grade Algo Execution" desc="Deploy and optimize algorithmic strategies in real time with ultra-low-latency execution engines." />
                        <FeatureCard icon={<Users />} title="Social Trading Grid" desc="Mirror top-performing traders in real time, with performance scoring and risk metrics." />
                        <FeatureCard icon={<Activity />} title="Low-Latency Execution" desc="Built on high-frequency-grade architecture, ensuring your trades hit before the rest." />
                        <FeatureCard icon={<BarChart3 />} title="Dynamic Market Heatmaps" desc="Instantly identify liquidity zones and aggressive flows across all asset classes." />
                        <FeatureCard icon={<ArrowUpDown />} title="Depth of Market & Order Flow" desc="Full L2/L3 data with live bid-ask flow, iceberg detection, and trade imbalances." />
                        <FeatureCard icon={<LineChart />} title="Precision Charting Engine" desc="Multi-timeframe, latency-free charts with deep indicator libraries and predictive overlays." />
                        <FeatureCard icon={<Globe />} title="Global Market Access" desc="Seamless multi-asset execution across emerging and developed markets on one screen." />
                        <FeatureCard icon={<Brain />} title="Sentiment Intelligence" desc="Natural language AI scans global news and social data for actionable sentiment signals." />
                        <FeatureCard icon={<Shield />} title="Bloomberg-Level Terminal" desc="Institutional-grade data, analytics, and tools designed for millions of users." />
                    </div>
                </div>
            </section>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="mt-24 border-t border-white/30">
                <div className="bg-black">
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(navigationSchema) }} />

                    <div className="container mx-auto max-w-screen-2xl px-8 pt-12 pb-8">
                        <div className="flex w-full flex-col justify-between gap-8 md:flex-row">
                            <div className="flex-shrink-0 text-left md:w-1/4">
                                <a className="flex items-center space-x-2" href="/">
                                    <img
                                        alt="NextBull logo"
                                        loading="lazy"
                                        width="32"
                                        height="32"
                                        decoding="async"
                                        className="h-10 w-10"
                                        src="https://www.nextbull.in/logo.png"
                                    />
                                    <span className="font-bold text-3xl text-white">NextBull</span>
                                </a>
                                <p className="mt-4 text-base text-neutral-400">Power your financial decision</p>
                                <p className="mt-2 text-base text-neutral-400">
                                    <a href="mailto:contact@nextbull.in" className="transition-colors hover:text-white">contact@nextbull.in</a>
                                </p>
                                <div className="mt-6 flex flex-wrap gap-4">
                                    <a href="https://www.linkedin.com/company/nextbullmarkets" target="_blank" rel="noopener noreferrer" className="text-neutral-400 transition-colors hover:text-white">
                                        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
                                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                        </svg>
                                    </a>
                                    <a className="text-neutral-400 transition-colors hover:text-white" href="/knowledge">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                                            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                                            <path d="M18 14h-8" />
                                            <path d="M15 18h-5" />
                                            <path d="M10 6h8v4h-8V6Z" />
                                        </svg>
                                    </a>
                                </div>
                                <div className="mt-4 flex flex-col gap-2">
                                    <a className="text-neutral-300 text-sm underline hover:text-white w-fit" href="/terms">Terms of Service</a>
                                    <a className="text-neutral-300 text-sm underline hover:text-white w-fit" href="/privacy">Privacy Policy</a>
                                </div>
                            </div>

                            <div className="flex flex-grow">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-left w-full">
                                    <div className="flex flex-col gap-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Products</h3>
                                        <ul className="space-y-3">
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/products">All Products</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/products#deep-research">Deep Research</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/products#ai-engine">The AI Engine</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/products#options-trading">Derivatives &amp; Options</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/products#financial-analysis">Financial Analysis</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/products#global-network">Global Network</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/blackedge">NextBull BlackEdge</a></li>
                                        </ul>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Markets</h3>
                                        <ul className="space-y-3">
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/markets">All Markets</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/nextbull-markets#tokenized-assets">Tokenized Assets</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/nextbull-markets">NextBull Markets</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/nextbull-markets#nextbull-connect">NextBull Connect</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/nextbull-markets#nextbull-system">NextBull System</a></li>
                                        </ul>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Terminal</h3>
                                        <ul className="space-y-3">
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/terminal">Terminal Overview</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/research">Research</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/news">News</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/access">Access</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/charts">Charts</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/collaboration">Collaboration Tools</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/education">Education</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/portfolio-analytics">Portfolio Analytics</a></li>
                                        </ul>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Knowledge Hub</h3>
                                        <ul className="space-y-3">
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/knowledge">All Articles</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/knowledge?tab=information">Information</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/knowledge?tab=analysis">Analysis</a></li>
                                        </ul>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">More</h3>
                                        <ul className="space-y-3">
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/why-us#faq">FAQs</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/about">About</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/why-us">Why Us</a></li>
                                            <li><a className="text-base text-neutral-300 transition-colors hover:text-white" href="/blackedge">BlackEdge</a></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-6 text-left">
                            <p className="text-sm text-neutral-500">© NextBull 2025</p>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="relative w-full mt-0 overflow-hidden rounded-xl border border-border-subtle/40">
                <div className="absolute inset-0 z-0">
                    <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                        <source src="https://www.nextbull.in/earth.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                    <div className="absolute inset-0 bg-black/50" />
                </div>

                <div className="relative z-10 overflow-hidden pt-28 md:pt-40 pb-4 px-2">
                    <h2 className="flex justify-between text-[clamp(2rem,16vw,16rem)] leading-none font-black uppercase text-white">
                        {'NEXTBULL'.split('').map((char, idx) => (
                            <span
                                key={`${char}-${idx}`}
                                className="bg-clip-text text-transparent"
                                style={{ backgroundImage: 'linear-gradient(to top, hsl(0 0% 10%), white 70%)' }}
                            >
                                {char}
                            </span>
                        ))}
                    </h2>
                </div>
            </footer>
            
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <div className="nb-feature-card">
            <div className="nb-feature-icon">{icon}</div>
            <h3 className="nb-feature-title">{title}</h3>
            <p className="nb-feature-desc">{desc}</p>
        </div>
    );
}
