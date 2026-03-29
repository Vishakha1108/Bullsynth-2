import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import useMarketStore from '../store/useMarketStore';
import { wsManager } from '../services/websocket';
import {
  TrendingUp, TrendingDown, Wallet, BarChart3, DollarSign,
  Activity, ArrowUpRight, ArrowDownRight, X, ExternalLink,
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
function StatCard({ label, value, icon: Icon, change, subtitle }: {
  label: string; value: string; icon: LucideIcon; change?: number; subtitle?: string;
}) {
  return (
    <div className="dash-card p-5 flex flex-col gap-3 group">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{label}</span>
        <div className="w-8 h-8 rounded-md dash-icon-bg flex items-center justify-center text-text-secondary group-hover:text-accent transition-colors">
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-bold text-text-primary tracking-tight font-mono tabular-nums">{value}</div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${change >= 0 ? 'text-bull' : 'text-bear'}`}>
          {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change >= 0 ? '+' : ''}{fmt(change)}%
        </div>
      )}
      {subtitle && <span className="text-[10px] text-text-secondary uppercase tracking-wider">{subtitle}</span>}
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
  const removeOrder = useMarketStore((s) => s.removeOrder);

  useEffect(() => {
    if (!wsConnected) {
      wsManager.connect();
    }
  }, [wsConnected]);

  useEffect(() => {
    if (wsConnected) {
      wsManager.send({ type: 'get_portfolio' });
      wsManager.send({ type: 'get_open_orders' });
      symbols.forEach((sym) => {
        wsManager.send({ type: 'get_history', symbol: sym });
      });
    }
  }, [wsConnected, symbols]);

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

  const handleCancelOrder = (orderId: number) => {
    wsManager.send({ type: 'cancel_order', order_id: orderId });
    removeOrder(orderId);
  };

  return (
    <div className="h-screen flex flex-col bg-bg-terminal text-text-primary overflow-hidden dash-root">
      <Navbar />

      <main className="flex-1 min-h-0 overflow-y-auto styling-scrollbar">
        <div className="max-w-[1600px] mx-auto px-6 py-6 flex flex-col gap-6">

          {/* ── Row 1: Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
            />
            <StatCard
              label="Total P&L"
              value={fmtUsd(portfolio.realizedPnl + portfolio.unrealizedPnl)}
              icon={BarChart3}
              change={portfolio.totalValue > 0 ? ((portfolio.realizedPnl + portfolio.unrealizedPnl) / portfolio.totalValue) * 100 : 0}
            />
            <StatCard
              label="Bot 1 P&L"
              value={fmtUsd(0)}
              icon={TrendingUp}
              subtitle="Active"
            />
            <StatCard
              label="Bot 2 P&L"
              value={fmtUsd(0)}
              icon={Activity}
              subtitle="Standby"
            />
          </div>

          {/* ── Row 2: Holdings Table ── */}
          <div className="dash-card overflow-hidden">
            <div className="px-5 py-4 dash-section-header flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Holdings</h2>
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
                      <td colSpan={8} className="text-center py-12 text-text-secondary text-xs uppercase tracking-wider">
                        No holdings yet — start trading
                      </td>
                    </tr>
                  ) : (
                    portfolio.holdings.map((h) => {
                      const unrealPnl = h.unrealizedPnl;
                      const realPnl = h.realizedPnl;
                      return (
                        <tr key={h.asset} className="dash-table-row">
                          <td className="px-5 py-3">
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
                          <td className="text-right px-5 py-3 font-mono tabular-nums">{fmt(h.qty, 4)}</td>
                          <td className="text-right px-5 py-3 font-mono tabular-nums">{fmtUsd(h.avgPrice)}</td>
                          <td className="text-right px-5 py-3 font-mono tabular-nums">{fmtUsd(h.currentPrice)}</td>
                          <td className="text-right px-5 py-3 font-mono tabular-nums font-semibold">{fmtUsd(h.marketValue)}</td>
                          <td className={`text-right px-5 py-3 font-mono tabular-nums font-semibold ${realPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                            {realPnl >= 0 ? '+' : ''}{fmtUsd(realPnl)}
                          </td>
                          <td className={`text-right px-5 py-3 font-mono tabular-nums font-semibold ${unrealPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                            {unrealPnl >= 0 ? '+' : ''}{fmtUsd(unrealPnl)}
                          </td>
                          <td className="text-right px-5 py-3">
                            <button
                              onClick={() => navigate(`/terminal?symbol=${h.asset}`)}
                              className="text-text-secondary hover:text-accent transition-colors cursor-pointer"
                              title="Trade"
                            >
                              <ExternalLink size={14} />
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

          {/* ── Row 3: Market Overview + Open Orders ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Market Overview (3 cols) */}
            <div className="lg:col-span-3 dash-card overflow-hidden flex flex-col">
              <div className="px-5 py-4 dash-section-header flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Market Overview</h2>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-bull' : 'bg-bear'}`} />
                  <span className="text-[10px] font-mono text-text-secondary">{wsConnected ? 'Live' : 'Offline'}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto styling-scrollbar max-h-[360px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 dash-thead z-10">
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
                        <td className="px-5 py-3">
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
                        <td className="text-right px-5 py-3 font-mono tabular-nums font-semibold text-text-primary">
                          {item.price > 0 ? fmtUsd(item.price) : '—'}
                        </td>
                        <td className="text-right px-5 py-3">
                          {item.price > 0 ? (
                            <span className={`dash-change-badge ${item.change >= 0 ? 'bull' : 'bear'}`}>
                              {item.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {item.change >= 0 ? '+' : ''}{fmt(item.change)}%
                            </span>
                          ) : (
                            <span className="text-text-secondary text-xs">—</span>
                          )}
                        </td>
                        <td className="text-right px-5 py-3">
                          <button
                            onClick={() => navigate(`/terminal?symbol=${item.symbol}`)}
                            className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary hover:text-accent transition-colors cursor-pointer"
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
            <div className="lg:col-span-2 dash-card overflow-hidden flex flex-col">
              <div className="px-5 py-4 dash-section-header flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Open Orders</h2>
                <span className="text-[10px] font-mono text-text-secondary">{openOrders.length} active</span>
              </div>
              <div className="flex-1 overflow-y-auto styling-scrollbar max-h-[360px]">
                {openOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
                    <BarChart3 size={24} className="mb-3 opacity-40" />
                    <span className="text-xs uppercase tracking-wider">No open orders</span>
                  </div>
                ) : (
                  <div className="dash-order-list">
                    {openOrders.map((order) => (
                      <div key={order.order_id} className="dash-order-item px-5 py-3 flex items-center justify-between">
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
                          onClick={() => handleCancelOrder(order.order_id)}
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
      </main>

      {/* Footer */}
      <footer className="dash-footer px-6 py-3 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">&copy; 2026 NEXTBULL</span>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-bull' : 'bg-bear'}`} />
          <span className="text-[10px] font-mono text-text-secondary">{wsConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </footer>
    </div>
  );
}
