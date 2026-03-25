import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
    TrendingUp, Wallet, PieChart,
    ArrowUpDown, Clock, ExternalLink
} from 'lucide-react';
import useMarketStore from '../store/useMarketStore';
import { fetchTickers, type Ticker } from '../services/api';

export default function Dashboard() {
    const [tickers, setTickers] = useState<Ticker[]>([]);
    const portfolio = useMarketStore(state => state.portfolio);
    const openOrders = useMarketStore(state => state.openOrders);
    const recentTrades = useMarketStore(state => state.recentTrades);

    useEffect(() => {
        fetchTickers().then(setTickers);
    }, []);

    const totalValue = portfolio.totalValue;
    const isPnlPositive = portfolio.unrealizedPnl > 0;

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
                        <Link to="/" className="nb-nav-link">Home</Link>
                        <Link to="/terminal" className="nb-nav-link">Terminal</Link>
                        <Link to="/user/dashboard" className="nb-nav-link active">Dashboard</Link>
                    </div>
                    <div className="nb-nav-actions">
                        <Link to="/terminal" className="nb-nav-signup">Open Terminal</Link>
                    </div>
                </div>
            </nav>

            {/* ── Dashboard Content ────────────────────────────────────────── */}
            <div className="db-container">
                <div className="db-header">
                    <h1 className="db-title">Dashboard</h1>
                    <p className="db-subtitle">Overview of your portfolio and market activity</p>
                </div>

                {/* ── Portfolio Stats ──────────────────────────────────────── */}
                <div className="db-stats-grid">
                    <div className="db-stat-card">
                        <div className="db-stat-icon">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <div className="db-stat-label">Cash Balance</div>
                            <div className="db-stat-value">
                                ${portfolio.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                    <div className="db-stat-card">
                        <div className="db-stat-icon">
                            <PieChart size={20} />
                        </div>
                        <div>
                            <div className="db-stat-label">Total Value</div>
                            <div className="db-stat-value">
                                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                    <div className="db-stat-card">
                        <div className="db-stat-icon pnl">
                            <ArrowUpDown size={20} />
                        </div>
                        <div>
                            <div className="db-stat-label">Unrealized P&L</div>
                            <div className={`db-stat-value ${isPnlPositive ? 'up' : portfolio.unrealizedPnl < 0 ? 'down' : ''}`}>
                                {isPnlPositive ? '+' : ''}{portfolio.unrealizedPnl.toFixed(2)}
                            </div>
                        </div>
                    </div>
                    <div className="db-stat-card">
                        <div className="db-stat-icon">
                            <Clock size={20} />
                        </div>
                        <div>
                            <div className="db-stat-label">Open Orders</div>
                            <div className="db-stat-value">{openOrders.length}</div>
                        </div>
                    </div>
                </div>

                {/* ── Holdings ─────────────────────────────────────────────── */}
                {portfolio.holdings.length > 0 && (
                    <div className="db-section">
                        <h2 className="db-section-title">Holdings</h2>
                        <div className="db-table-wrap">
                            <table className="nb-ticker-table">
                                <thead>
                                    <tr>
                                        <th>Asset</th>
                                        <th>Quantity</th>
                                        <th>Avg Price</th>
                                        <th>Current Price</th>
                                        <th>Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {portfolio.holdings.map((h, i) => {
                                        return (
                                            <tr key={i}>
                                                <td className="nb-ticker-sym">{h.asset}</td>
                                                <td>{h.qty}</td>
                                                <td>${h.avgPrice.toFixed(2)}</td>
                                                <td>${h.currentPrice.toFixed(2)}</td>
                                                <td className="nb-ticker-price">${h.marketValue.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Watchlist / Tickers ──────────────────────────────────── */}
                <div className="db-section">
                    <h2 className="db-section-title">Watchlist</h2>
                    <div className="db-table-wrap">
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
                                                <ExternalLink size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Open Orders ──────────────────────────────────────────── */}
                <div className="db-section">
                    <h2 className="db-section-title">Open Orders ({openOrders.length})</h2>
                    <div className="db-table-wrap">
                        {openOrders.length === 0 ? (
                            <div className="db-empty">No open orders</div>
                        ) : (
                            <table className="nb-ticker-table">
                                <thead>
                                    <tr>
                                        <th>Side</th>
                                        <th>Type</th>
                                        <th>Price</th>
                                        <th>Quantity</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {openOrders.map(o => (
                                        <tr key={o.order_id}>
                                            <td className={o.side === 'BUY' ? 'nb-text-bull' : 'nb-text-bear'}>
                                                {o.side}
                                            </td>
                                            <td className="nb-ticker-name">{o.type}</td>
                                            <td className="nb-ticker-price">
                                                ${o.price.toFixed(2)}
                                            </td>
                                            <td>{o.remainingQty}</td>
                                            <td className="nb-ticker-cat-inline">{o.status || 'Open'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* ── Recent Trades ────────────────────────────────────────── */}
                <div className="db-section">
                    <h2 className="db-section-title">Recent Trades</h2>
                    <div className="db-table-wrap">
                        {recentTrades.length === 0 ? (
                            <div className="db-empty">No recent trades — start trading in the Terminal</div>
                        ) : (
                            <table className="nb-ticker-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Side</th>
                                        <th>Price</th>
                                        <th>Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTrades.slice(0, 20).map((t, i) => {
                                        const d = new Date(t.timestamp);
                                        const ts = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
                                        return (
                                            <tr key={i}>
                                                <td className="nb-ticker-name">{ts}</td>
                                                <td className={t.side === 'BUY' ? 'nb-text-bull' : 'nb-text-bear'}>
                                                    {t.side}
                                                </td>
                                                <td className="nb-ticker-price">${t.price.toFixed(2)}</td>
                                                <td>{t.qty}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <footer className="nb-footer">
                <div className="nb-footer-inner">
                    <div className="nb-footer-brand">
                        <div className="nb-logo">
                            <TrendingUp size={20} />
                            <span>NEXTBULL</span>
                        </div>
                        <p className="nb-footer-tagline">Power your financial decisions</p>
                    </div>
                    <div className="nb-footer-links">
                        <div className="nb-footer-col">
                            <h4>Quick Links</h4>
                            <Link to="/">Home</Link>
                            <Link to="/terminal">Terminal</Link>
                            <Link to="/user/dashboard">Dashboard</Link>
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
