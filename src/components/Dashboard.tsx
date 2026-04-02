import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import useMarketStore from '../store/useMarketStore';
import { wsManager } from '../services/websocket';
import {
  TrendingUp, TrendingDown, Wallet, BarChart3, DollarSign,
  ArrowUpRight, ArrowDownRight, X, ExternalLink, Activity, Zap,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

const SYMBOL_COLORS: Record<string, string> = {
  AAPL: '#555555', GOOGL: '#4285F4', MSFT: '#7FBA00', AMZN: '#FF9900',
  TSLA: '#CC0000', META: '#1877F2', NVDA: '#76B900', JPM: '#003A70',
  BTC: '#F7931A', ETH: '#627EEA',
};

function fmt(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtUsd(value: number): string {
  return '$' + fmt(value);
}

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, change, subtitle, valueColor }: {
  label: string; value: string; icon: LucideIcon; change?: number; subtitle?: string; valueColor?: string;
}) {
  return (
    <div className="dash-card relative overflow-hidden border-white/12 bg-white/[0.035] p-4 sm:p-5 flex flex-col gap-3 group">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: 'radial-gradient(circle at top right, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 42%, transparent 72%)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{label}</span>
        <div className="w-8 h-8 rounded-md dash-icon-bg flex items-center justify-center text-text-secondary border border-white/10">
          <Icon size={16} />
        </div>
      </div>
      <div className="relative text-2xl leading-tight font-bold tracking-tight font-mono tabular-nums" style={{ color: valueColor ?? 'var(--color-text-primary)' }}>{value}</div>
      {change !== undefined && (
        <div className={`relative flex items-center gap-1 text-xs font-semibold ${change >= 0 ? 'text-bull' : 'text-bear'}`}>
          {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change >= 0 ? '+' : ''}{fmt(change)}%
        </div>
      )}
      {subtitle && <span className="relative text-[10px] text-text-secondary uppercase tracking-wider">{subtitle}</span>}
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const symbols = useMarketStore((s) => s.symbols);
  const prices = useMarketStore((s) => s.prices);
  const priceChanges = useMarketStore((s) => s.priceChanges);
  const portfolio = useMarketStore((s) => s.portfolio);
  const openOrders = useMarketStore((s) => s.openOrders);
  const wsConnected = useMarketStore((s) => s.wsConnected);

  useEffect(() => {
    if (!wsConnected) {
      wsManager.connect();
    }
  }, [wsConnected]);

  useEffect(() => {
    if (wsConnected) {
      wsManager.send({ type: 'get_portfolio' });
      wsManager.send({ type: 'get_open_orders' });
    }
  }, [wsConnected]);

  const totalPnl = portfolio.realizedPnl + portfolio.unrealizedPnl;
  const pnlPercent = portfolio.totalValue > 0 ? (totalPnl / portfolio.totalValue) * 100 : 0;

  const marketData = useMemo(() => {
    return symbols.map((sym) => ({
      symbol: sym,
      price: prices[sym] || 0,
      change: priceChanges[sym] || 0,
      color: SYMBOL_COLORS[sym] || '#787b86',
    })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }, [symbols, prices, priceChanges]);

  const marketBreadth = useMemo(() => {
    const advancers = marketData.filter((item) => item.change > 0).length;
    const decliners = marketData.filter((item) => item.change < 0).length;
    const flat = marketData.length - advancers - decliners;
    const total = marketData.length || 1;

    return {
      advancers,
      decliners,
      flat,
      advPct: (advancers / total) * 100,
      decPct: (decliners / total) * 100,
      flatPct: (flat / total) * 100,
    };
  }, [marketData]);



  const handleCancelOrder = (orderId: number, symbol: string) => {
    wsManager.send({ type: 'cancel_order', symbol, order_id: orderId });
  };

  return (
    <div className="h-screen flex flex-col bg-bg-terminal text-text-primary overflow-hidden dash-root">
      <Navbar />

      <main className="relative flex-1 min-h-0 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-[24%] h-72 w-72 rounded-full bg-white/[0.02] blur-[120px]" />
          <div className="absolute bottom-8 right-[8%] h-80 w-80 rounded-full bg-white/[0.015] blur-[130px]" />
        </div>

        <div className="relative h-full overflow-y-auto styling-scrollbar">
          <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-5 px-4 pb-5 pt-4 sm:px-6 lg:px-8">

            <section className="dash-card relative overflow-hidden border-white/12 bg-white/4.5 px-5 py-5 sm:px-6">
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a5b4fc]">
                    <Zap size={12} />
                    Workspace Control Center
                  </span>
                  <h1 className="dash-hero-title mt-3 text-2xl font-black tracking-tight sm:text-3xl">Professional Trading Dashboard</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
                    Monitor live market movement, portfolio health, holdings, and active orders from one performance-first view.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate('/terminal')}
                      className="tv-glass-btn px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.08em] cursor-pointer"
                    >
                      <ExternalLink size={13} />
                      Open Terminal
                    </button>

                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="dash-mini-stat rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.08em] text-text-secondary">Connection</div>
                    <div className="mt-1 inline-flex items-center gap-2 text-xs font-semibold">
                      <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? 'bg-bull' : 'bg-bear'}`} />
                      <span className={wsConnected ? 'text-bull' : 'text-bear'}>{wsConnected ? 'Live' : 'Offline'}</span>
                    </div>
                  </div>
                  <div className="dash-mini-stat rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.08em] text-text-secondary">Tracked Symbols</div>
                    <div className="mt-1 text-lg font-mono font-bold text-text-primary">{symbols.length}</div>
                  </div>
                  <div className="dash-mini-stat rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.08em] text-text-secondary">Active Positions</div>
                    <div className="mt-1 text-lg font-mono font-bold text-text-primary">{portfolio.holdings.length}</div>
                  </div>
                  <div className="dash-mini-stat rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.08em] text-text-secondary">Open Orders</div>
                    <div className="mt-1 text-lg font-mono font-bold text-text-primary">{openOrders.length}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Row 1: Stat Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Portfolio Value"
              value={fmtUsd(portfolio.totalValue)}
              icon={Wallet}
              change={pnlPercent}
            />
            <StatCard
              label="Cash Balance"
              value={fmtUsd(portfolio.cash)}
              icon={DollarSign}
              subtitle="Available"
              valueColor="#6366f1"
            />
            <StatCard
              label="Total P&L"
              value={fmtUsd(portfolio.realizedPnl + portfolio.unrealizedPnl)}
              icon={BarChart3}
              change={portfolio.totalValue > 0 ? ((portfolio.realizedPnl + portfolio.unrealizedPnl) / portfolio.totalValue) * 100 : 0}
            />
              <StatCard
                label="Active Positions"
                value={String(portfolio.holdings.length)}
                icon={Activity}
                subtitle="Live holdings"
                valueColor="#a5b4fc"
              />
          </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-0">

              {/* Holdings */}
              <div className="xl:col-span-8 dash-card overflow-hidden border-white/12 bg-white/[0.035] flex flex-col">
                <div className="px-5 py-3 dash-section-header flex items-center justify-between bg-linear-to-r from-white/[0.03] via-transparent to-transparent">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Holdings Matrix</h2>
                  <span className="text-[10px] font-mono text-text-secondary">{portfolio.holdings.length} positions</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary dash-table-header">
                        <th className="text-left px-5 py-3">Asset</th>
                        <th className="text-right px-5 py-3">Qty</th>
                        <th className="text-right px-5 py-3">Avg Price</th>
                        <th className="text-right px-5 py-3">Current</th>
                        <th className="text-right px-5 py-3">Market Value</th>
                        <th className="text-right px-5 py-3">Realized P&L</th>
                        <th className="text-right px-5 py-3">Unrealized P&L</th>
                        <th className="text-right px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.holdings.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-14 text-text-secondary text-xs uppercase tracking-wider">
                            No holdings yet — start trading
                          </td>
                        </tr>
                      ) : (
                        portfolio.holdings.map((h) => {
                          const unrealPnl = h.unrealizedPnl;
                          const realPnl = h.realizedPnl;
                          return (
                            <tr key={h.asset} className="dash-table-row">
                              <td className="px-5 py-2.5">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                                    style={{ backgroundColor: SYMBOL_COLORS[h.asset] || '#363a45' }}
                                  >
                                    {h.asset.slice(0, 2)}
                                  </div>
                                  <span className="font-semibold text-text-primary">{h.asset}</span>
                                </div>
                              </td>
                              <td className="text-right px-5 py-2.5 font-mono tabular-nums">{fmt(h.qty, 4)}</td>
                              <td className="text-right px-5 py-2.5 font-mono tabular-nums">{fmtUsd(h.avgPrice)}</td>
                              <td className="text-right px-5 py-2.5 font-mono tabular-nums">{fmtUsd(h.currentPrice)}</td>
                              <td className="text-right px-5 py-2.5 font-mono tabular-nums font-semibold">{fmtUsd(h.marketValue)}</td>
                              <td className={`text-right px-5 py-2.5 font-mono tabular-nums font-semibold ${realPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                                {realPnl >= 0 ? '+' : ''}{fmtUsd(realPnl)}
                              </td>
                              <td className={`text-right px-5 py-2.5 font-mono tabular-nums font-semibold ${unrealPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                                {unrealPnl >= 0 ? '+' : ''}{fmtUsd(unrealPnl)}
                              </td>
                              <td className="text-right px-5 py-2.5">
                                <button
                                  onClick={() => navigate(`/terminal?symbol=${h.asset}`)}
                                  className="tv-glass-btn px-3 py-1.5 text-xs font-semibold cursor-pointer"
                                  title="Trade"
                                >
                                  <ExternalLink size={14} /> Trade
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Market Breadth & Movers */}
              <div className="xl:col-span-4 dash-card overflow-hidden border-white/12 bg-white/[0.035] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Market Breadth</h2>
                  <span className="text-[10px] font-mono text-text-secondary">{symbols.length} assets</span>
                </div>

                <div className="dash-soft-panel space-y-2 rounded-xl border border-white/8 bg-black/35 p-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-text-primary">
                    <span>Advancers</span>
                    <span className="font-mono text-bull">{marketBreadth.advancers}</span>
                  </div>
                  <div className="h-1.5 rounded bg-white/8 overflow-hidden">
                    <div className="h-full rounded bg-bull" style={{ width: `${marketBreadth.advPct}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-text-primary">
                    <span>Decliners</span>
                    <span className="font-mono text-bear">{marketBreadth.decliners}</span>
                  </div>
                  <div className="h-1.5 rounded bg-white/8 overflow-hidden">
                    <div className="h-full rounded bg-bear" style={{ width: `${marketBreadth.decPct}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-text-primary">
                    <span>Flat</span>
                    <span className="font-mono text-[#93a0ba]">{marketBreadth.flat}</span>
                  </div>
                  <div className="h-1.5 rounded bg-white/8 overflow-hidden">
                    <div className="h-full rounded bg-[#93a0ba]" style={{ width: `${marketBreadth.flatPct}%` }} />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Top Movers</div>
                  <div className="space-y-2">
                    {marketData.slice(0, 4).map((item) => (
                      <div key={item.symbol} className="dash-soft-row flex items-center justify-between rounded-lg border border-white/8 bg-black/30 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-bold text-text-primary">{item.symbol}</div>
                          <div className={`text-[11px] font-mono ${item.change >= 0 ? 'text-bull' : 'text-bear'}`}>
                            {item.change >= 0 ? '+' : ''}{fmt(item.change)}%
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/terminal?symbol=${item.symbol}`)}
                          className="tv-glass-btn px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] cursor-pointer"
                        >
                          Trade
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          {/* ── Row 3: Market Overview + Open Orders ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 min-h-0">

            {/* Market Overview (3 cols) */}
            <div className="lg:col-span-3 dash-card overflow-hidden flex flex-col min-h-0 border-white/12 bg-white/[0.035]">
              <div className="px-5 py-3 dash-section-header flex items-center justify-between bg-linear-to-r from-white/[0.03] via-transparent to-transparent">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Market Overview</h2>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-bull' : 'bg-bear'}`} />
                  <span className="text-[10px] font-mono text-text-secondary">{wsConnected ? 'Live' : 'Offline'}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto styling-scrollbar max-h-75">
                <table className="w-full text-sm border-collapse">
                  <thead className="dash-thead dash-market-thead">
                    <tr className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary dash-table-header">
                      <th className="text-left px-5 py-2.5">Symbol</th>
                      <th className="text-right px-5 py-2.5">Price</th>
                      <th className="text-right px-5 py-2.5">Change</th>
                      <th className="text-right px-5 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketData.map((item) => (
                      <tr key={item.symbol} className="dash-table-row">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ backgroundColor: item.color }}
                            >
                              {item.symbol.slice(0, 2)}
                            </div>
                            <span className="font-semibold text-text-primary">{item.symbol}</span>
                          </div>
                        </td>
                        <td className="text-right px-5 py-2.5 font-mono tabular-nums font-semibold text-text-primary">
                          {item.price > 0 ? fmtUsd(item.price) : '—'}
                        </td>
                        <td className="text-right px-5 py-2.5">
                          {item.price > 0 ? (
                            <span className={`dash-change-badge ${item.change >= 0 ? 'bull' : 'bear'}`}>
                              {item.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {item.change >= 0 ? '+' : ''}{fmt(item.change)}%
                            </span>
                          ) : (
                            <span className="text-text-secondary text-xs">—</span>
                          )}
                        </td>
                        <td className="text-right px-5 py-2.5">
                          <button
                            onClick={() => navigate(`/terminal?symbol=${item.symbol}`)}
                            className="tv-glass-btn px-4 py-1.5 text-xs font-semibold cursor-pointer"
                          >
                            Trade
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Open Orders (2 cols) */}
            <div className="lg:col-span-2 dash-card overflow-hidden flex flex-col min-h-0 border-white/12 bg-white/[0.035]">
              <div className="px-5 py-3 dash-section-header flex items-center justify-between bg-linear-to-r from-white/[0.03] via-transparent to-transparent">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Open Orders</h2>
                <span className="text-[10px] font-mono text-text-secondary">{openOrders.length} active</span>
              </div>
              <div className="flex-1 overflow-y-auto styling-scrollbar max-h-75">
                {openOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
                    <BarChart3 size={24} className="mb-3 opacity-40" />
                    <span className="text-xs uppercase tracking-wider">No open orders</span>
                  </div>
                ) : (
                  <div className="dash-order-list">
                    {openOrders.map((order) => (
                      <div key={order.order_id} className="dash-order-item px-5 py-3 flex items-center justify-between rounded-lg mx-2 my-1 border border-transparent hover:border-white/8">
                        <div className="flex items-center gap-3">
                          <span className={`dash-side-badge ${order.side === 'BUY' ? 'bull' : 'bear'}`}>
                            {order.side}
                          </span>
                          <div>
                            <div className="font-semibold text-sm text-text-primary">{order.symbol}</div>
                            <div className="text-[10px] text-text-secondary font-mono">
                              {fmt(order.remainingQty, 4)} / {fmt(order.qty, 4)} @ {fmtUsd(order.price)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelOrder(order.order_id, order.symbol)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-bear hover:bg-bear/10 transition-all cursor-pointer"
                          title="Cancel order"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="dash-footer bg-black/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between shrink-0 border-t border-white/10">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">&copy; 2026 NEXTBULL</span>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-bull' : 'bg-bear'}`} />
          <span className="text-[10px] font-mono text-text-secondary">{wsConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </footer>
    </div>
  );
}
