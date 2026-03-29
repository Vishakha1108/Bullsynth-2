import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
    TrendingUp, BarChart3, ArrowUpDown, Activity, Zap, Globe,
    Brain, Users, Shield, LineChart, Sparkles, ArrowRight
} from 'lucide-react';
import { fetchTickers, type Ticker } from '../services/api';

export default function LandingPage() {
    const [tickers, setTickers] = useState<Ticker[]>([]);

    useEffect(() => {
        fetchTickers().then(setTickers);
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
                    <div className="nb-nav-links">
                        <Link to="/terminal" className="nb-nav-link">Terminal</Link>
                        <Link to="/user/dashboard" className="nb-nav-link">Dashboard</Link>
                    </div>
                    <div className="nb-nav-actions">
                        <Link to="/terminal" className="nb-nav-signin">Sign in</Link>
                        <Link to="/terminal" className="nb-nav-signup">Sign up</Link>
                    </div>
                </div>
            </nav>

            {/* ── Ticker Marquee ──────────────────────────────────────────── */}
            <div className="nb-marquee-bar">
                <div className="nb-marquee-track">
                    {[...tickers, ...tickers].map((t, i) => (
                        <Link
                            key={`${t.symbol}-${i}`}
                            to={`/terminal?symbol=${encodeURIComponent(t.symbol)}`}
                            className="nb-marquee-item"
                        >
                            <span className="nb-marquee-sym">{t.symbol}</span>
                            <span className="nb-marquee-price">${t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className={`nb-marquee-change ${t.change24h >= 0 ? 'up' : 'down'}`}>
                                {t.change24h >= 0 ? '▲' : '▼'} {Math.abs(t.change24h).toFixed(2)}%
                            </span>
                        </Link>
                    ))}
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

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <div className="nb-feature-card">
            <div className="nb-feature-icon">{icon}</div>
            <h3 className="nb-feature-title">{title}</h3>
            <p className="nb-feature-desc">{desc}</p>
        </div>
    );
}
