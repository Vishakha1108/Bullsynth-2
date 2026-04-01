import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import {
    TrendingUp, BarChart3, ArrowUpDown, Activity, Zap, Globe,
    Brain, Users, Shield, LineChart, Sparkles, ArrowRight
} from 'lucide-react';
import useMarketStore from '../store/useMarketStore';
import { wsManager } from '../services/websocket';

export default function LandingPage() {
    const tickers = useMarketStore((state) => state.tickers);
    const prices = useMarketStore((state) => state.prices);
    const priceChanges = useMarketStore((state) => state.priceChanges);
    const operatingPillars = [
        {
            icon: <Brain size={18} />,
            title: 'Context-Aware Analysis',
            desc: 'Blend price action, sentiment, and structure into one fast decision layer.',
        },
        {
            icon: <Zap size={18} />,
            title: 'Fast Execution Paths',
            desc: 'Move from analysis to terminal execution or bot deployment in a single flow.',
        },
        {
            icon: <Shield size={18} />,
            title: 'Risk-First Controls',
            desc: 'Track performance and behavior continuously before capital is overexposed.',
        },
    ];

    const workflowSteps = [
        {
            icon: <Globe size={16} />,
            title: 'Scan Markets',
            desc: 'Use live feeds and symbols to identify high-conviction opportunities.',
        },
        {
            icon: <Activity size={16} />,
            title: 'Validate Signal',
            desc: 'Confirm direction using chart behavior, order flow, and momentum context.',
        },
        {
            icon: <LineChart size={16} />,
            title: 'Execute or Automate',
            desc: 'Place trades manually or shift repeatable logic into bots for scale.',
        },
    ];

    const capabilities = [
        {
            icon: <Zap />,
            title: 'High Grade Algo Execution',
            desc: 'Deploy and optimize algorithmic strategies in real time with ultra-low-latency execution engines.',
        },
        {
            icon: <Users />,
            title: 'Social Trading Grid',
            desc: 'Mirror top-performing traders in real time, with performance scoring and risk metrics.',
        },
        {
            icon: <Activity />,
            title: 'Low-Latency Execution',
            desc: 'Built on high-frequency-grade architecture, ensuring your trades hit before the rest.',
        },
        {
            icon: <BarChart3 />,
            title: 'Dynamic Market Heatmaps',
            desc: 'Instantly identify liquidity zones and aggressive flows across all asset classes.',
        },
        {
            icon: <ArrowUpDown />,
            title: 'Depth of Market & Order Flow',
            desc: 'Full L2/L3 data with live bid-ask flow, iceberg detection, and trade imbalances.',
        },
        {
            icon: <LineChart />,
            title: 'Precision Charting Engine',
            desc: 'Multi-timeframe, latency-free charts with deep indicator libraries and predictive overlays.',
        },
        {
            icon: <Globe />,
            title: 'Global Market Access',
            desc: 'Seamless multi-asset execution across emerging and developed markets on one screen.',
        },
        {
            icon: <Brain />,
            title: 'Sentiment Intelligence',
            desc: 'Natural language AI scans global news and social data for actionable sentiment signals.',
        },
        {
            icon: <Shield />,
            title: 'Institutional Terminal Layer',
            desc: 'Professional-grade data, analytics, and workflows designed for disciplined operators.',
        },
    ];

    useEffect(() => {
        wsManager.connect();
    }, []);

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
                            <Link to="/admin/dashboard" className="nb-nav-link">Bots</Link>
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
                        <Link to="/admin/dashboard" className="nb-cta-secondary">
                            Bots Dashboard
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Lower Experience ────────────────────────────────────────── */}
            <section className="nb-section nb-section-layered">
                <div className="nb-section-inner">
                    <span className="nb-section-kicker">System Architecture</span>
                    <h2 className="nb-section-title">
                        A Logical Flow From Signals to <span className="nb-hero-gradient">Execution</span>
                    </h2>
                    <p className="nb-section-desc">
                        The lower stack is built to keep every step clear: discover opportunity, validate direction, execute with speed, and scale with bots.
                    </p>

                    <div className="nb-pillars-grid">
                        {operatingPillars.map((pillar) => (
                            <article key={pillar.title} className="nb-pillar-card">
                                <div className="nb-pillar-icon">{pillar.icon}</div>
                                <h3 className="nb-pillar-title">{pillar.title}</h3>
                                <p className="nb-pillar-desc">{pillar.desc}</p>
                            </article>
                        ))}
                    </div>

                    <div className="nb-lower-layout">
                        <aside className="nb-system-map">
                            <p className="nb-system-kicker">Execution Map</p>
                            <h3 className="nb-system-title">From market movement to bot action.</h3>
                            <p className="nb-system-desc">
                                Watch opportunities emerge, validate with precision, and route decisions into Terminal or Bots without workflow friction.
                            </p>
                            <div className="nb-workflow-list">
                                {workflowSteps.map((step, index) => (
                                    <article key={step.title} className="nb-workflow-step">
                                        <span className="nb-workflow-index">{String(index + 1).padStart(2, '0')}</span>
                                        <div className="nb-workflow-icon">{step.icon}</div>
                                        <div>
                                            <h4 className="nb-workflow-title">{step.title}</h4>
                                            <p className="nb-workflow-desc">{step.desc}</p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </aside>

                        <div className="nb-features-grid">
                            {capabilities.map((feature, index) => (
                                <FeatureCard
                                    key={feature.title}
                                    icon={feature.icon}
                                    title={feature.title}
                                    desc={feature.desc}
                                    highlight={index === 0}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <footer className="nb-footer">
                <div className="nb-footer-inner">
                    <div className="nb-footer-brand">
                        <div className="nb-logo">
                            <TrendingUp size={20} />
                            <span>NEXTBULL</span>
                        </div>
                        <p className="nb-footer-tagline">Power your financial decisions</p>
                        <a href="mailto:contact@nextbull.in" className="nb-footer-email">contact@nextbull.in</a>
                    </div>
                    <div className="nb-footer-links">
                        <div className="nb-footer-col">
                            <h4>Platform</h4>
                            <Link to="/terminal">Terminal</Link>
                            <Link to="/user/dashboard">Dashboard</Link>
                        </div>
                        <div className="nb-footer-col">
                            <h4>Company</h4>
                            <a href="mailto:contact@nextbull.in">Contact</a>
                        </div>
                    </div>
                </div>
                <div className="nb-footer-bottom">
                    © NextBull 2026. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc, highlight = false }: { icon: React.ReactNode; title: string; desc: string; highlight?: boolean }) {
    return (
        <article className={`nb-feature-card ${highlight ? 'highlight' : ''}`}>
            <div className="nb-feature-icon">{icon}</div>
            <h3 className="nb-feature-title">{title}</h3>
            <p className="nb-feature-desc">{desc}</p>
        </article>
    );
}
