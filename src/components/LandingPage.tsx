import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
    TrendingUp, BarChart3, ArrowUpDown, Activity, Zap, Globe,
    Brain, Users, Shield, LineChart, ChevronRight, LayoutDashboard,
    Sparkles, ArrowRight
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
                        <Link to="/" className="nb-nav-link">Products</Link>
                        <Link to="/" className="nb-nav-link">Markets</Link>
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
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Live Tickers Table ──────────────────────────────────────── */}
            <section className="nb-section">
                <div className="nb-section-inner">
                    <h2 className="nb-section-title">
                        Capital Markets <span className="nb-hero-gradient">Happen Here</span>
                    </h2>
                    <p className="nb-section-desc">
                        Track and trade across global asset classes. Click any instrument to launch its chart.
                    </p>
                    <div className="nb-ticker-table-wrap">
                        <table className="nb-ticker-table">
                            <thead>
                                <tr>
                                    <th>Symbol</th>
                                    <th>Name</th>
                                    <th>Price</th>
                                    <th>24h Change</th>
                                    <th>Volume</th>
                                    <th>Category</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickers.map(t => (
                                    <tr key={t.symbol}>
                                        <td className="nb-ticker-sym">{t.symbol}</td>
                                        <td className="nb-ticker-name">{t.name}</td>
                                        <td className="nb-ticker-price">
                                            ${t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className={`nb-ticker-change ${t.change24h >= 0 ? 'up' : 'down'}`}>
                                            {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%
                                        </td>
                                        <td className="nb-ticker-vol">{t.volume.toLocaleString()}</td>
                                        <td>
                                            <span className="nb-ticker-cat">{t.category}</span>
                                        </td>
                                        <td>
                                            <Link
                                                to={`/terminal?symbol=${encodeURIComponent(t.symbol)}`}
                                                className="nb-ticker-trade-btn"
                                            >
                                                Trade <ChevronRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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

            {/* ── Go Further Section ──────────────────────────────────────── */}
            <section className="nb-section nb-go-further">
                <div className="nb-section-inner">
                    <h2 className="nb-section-title">
                        Go Further with <span className="nb-hero-gradient">NextBull Terminal</span>
                    </h2>
                    <div className="nb-go-further-grid">
                        {[
                            { icon: <BarChart3 size={24} />, title: 'Charts', desc: 'Precision charting with multi-timeframe analysis' },
                            { icon: <Brain size={24} />, title: 'Research', desc: 'Deep fundamental and technical research tools' },
                            { icon: <Globe size={24} />, title: 'Access', desc: 'Global markets from a single terminal' },
                            { icon: <LayoutDashboard size={24} />, title: 'Portfolio', desc: 'Track and analyze your portfolio performance' },
                            { icon: <Users size={24} />, title: 'Collaboration', desc: 'Share ideas and strategies with peers' },
                            { icon: <Sparkles size={24} />, title: 'AI Engine', desc: 'Predictive analytics and smart alerts' },
                        ].map((item, i) => (
                            <Link to="/terminal" key={i} className="nb-gf-card">
                                <div className="nb-gf-icon">{item.icon}</div>
                                <div>
                                    <div className="nb-gf-title">{item.title}</div>
                                    <div className="nb-gf-desc">{item.desc}</div>
                                </div>
                                <ChevronRight size={16} className="nb-gf-arrow" />
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Section ─────────────────────────────────────────────── */}
            <section className="nb-cta-section">
                <div className="nb-cta-glow" />
                <h2 className="nb-cta-title">Dominate.</h2>
                <p className="nb-cta-desc">
                    Harness the power of the most powerful financial platform in the world.
                </p>
                <Link to="/terminal" className="nb-cta-primary">
                    Sign Up — It's Free
                    <ArrowRight size={18} />
                </Link>
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
                            <h4>Products</h4>
                            <Link to="/">Deep Research</Link>
                            <Link to="/">AI Engine</Link>
                            <Link to="/">Options Trading</Link>
                            <Link to="/">Financial Analysis</Link>
                        </div>
                        <div className="nb-footer-col">
                            <h4>Markets</h4>
                            <Link to="/">All Markets</Link>
                            <Link to="/">Tokenized Assets</Link>
                            <Link to="/">NextBull Connect</Link>
                        </div>
                        <div className="nb-footer-col">
                            <h4>Terminal</h4>
                            <Link to="/terminal">Overview</Link>
                            <Link to="/">Charts</Link>
                            <Link to="/user/dashboard">Portfolio</Link>
                            <Link to="/">Education</Link>
                        </div>
                        <div className="nb-footer-col">
                            <h4>More</h4>
                            <Link to="/">About</Link>
                            <Link to="/">Why Us</Link>
                            <Link to="/">FAQs</Link>
                        </div>
                    </div>
                </div>
                <div className="nb-footer-bottom">
                    © NextBull 2025. All rights reserved.
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
