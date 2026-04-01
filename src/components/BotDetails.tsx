import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Cpu, Zap, ArrowUpRight, ArrowDownRight, ExternalLink,
  TrendingUp, BarChart2, ChevronRight, X,
  ShieldCheck, Activity, Target, Layers, ArrowLeft,
  WifiOff, AlertCircle, Wallet, Clock, DollarSign,
} from 'lucide-react';
import { Navbar } from './Navbar';
import { useBotPolling } from '../hooks/useBotPolling';
import PnLAnalysisModal from './PnLAnalysisModal';
import type { AlphaStatus, MarketMakerStatus } from '../services/botsApi';
import {
  fetchBotPortfolio, fetchBotTrades, depositFunds,
  type BotPortfolio, type BotTrade,
} from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type BotId = 'alpha_bot' | 'market_maker';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number, d = 2) {
  return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtUsd(v: number) { return '$' + fmt(Math.abs(v)); }
function fmtPct(v: number) { return `${fmt(v)}%`; }
function sign(v: number) { return v >= 0 ? '+' : '-'; }

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, positive }: {
  label: string; value: string; sub?: string; positive?: boolean;
}) {
  const color = positive === undefined ? 'text-text-primary' : positive ? 'text-bull' : 'text-bear';
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4 flex flex-col gap-1">
      <div className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">{label}</div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-text-secondary font-mono">{sub}</div>}
    </div>
  );
}

// ─── Status Chips ─────────────────────────────────────────────────────────────
function StatusChips({
  halted, isDisconnected, isStale, position, regime,
}: {
  halted: boolean; isDisconnected: boolean; isStale: boolean;
  position?: string; regime?: string;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isDisconnected && (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
          <WifiOff size={11} /> Disconnected
        </span>
      )}
      {isStale && !isDisconnected && (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
          <AlertCircle size={11} /> Stale Data
        </span>
      )}
      {halted && (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
          HALTED
        </span>
      )}
      {position && (
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
          position === 'LONG'
            ? 'bg-bull/10 text-bull border-bull/20'
            : position === 'SHORT'
              ? 'bg-bear/10 text-bear border-bear/20'
              : 'bg-bg-elevated text-text-secondary border-border-subtle'
        }`}>
          {position}
        </span>
      )}
      {regime && (
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
          regime === 'trending'
            ? 'bg-accent/10 text-accent border-accent/20'
            : regime === 'mean_reverting'
              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              : 'bg-bg-elevated text-text-secondary border-border-subtle'
        }`}>
          {regime.replace(/_/g, ' ')}
        </span>
      )}
    </div>
  );
}

// ─── Alpha Analysis Panel ─────────────────────────────────────────────────────
function AlphaAnalysisPanel({ status, onClose }: { status: AlphaStatus; onClose: () => void }) {
  return (
    <div className="dash-card p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-accent" />
          <span className="text-sm font-bold">Strategy Analysis</span>
          <span className="text-[10px] text-text-secondary font-mono bg-bg-elevated border border-border-subtle rounded-full px-2 py-0.5">
            Alpha Bot
          </span>
        </div>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Realized P&amp;L</div>
          <div className={`text-sm font-bold font-mono ${status.realizedPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
            {sign(status.realizedPnl)}{fmtUsd(status.realizedPnl)}
          </div>
        </div>
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Unrealized P&amp;L</div>
          <div className={`text-sm font-bold font-mono ${status.unrealizedPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
            {sign(status.unrealizedPnl)}{fmtUsd(status.unrealizedPnl)}
          </div>
        </div>
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Total P&amp;L</div>
          <div className={`text-sm font-bold font-mono ${status.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
            {sign(status.pnl)}{fmtUsd(status.pnl)}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={13} className="text-text-secondary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Risk Metrics</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3 flex items-center gap-3">
            <Target size={14} className="text-accent shrink-0" />
            <div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider">Sharpe Ratio</div>
              <div className="text-sm font-bold font-mono text-text-primary">{fmt(status.sharpe)}</div>
            </div>
          </div>
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3 flex items-center gap-3">
            <ArrowDownRight size={14} className="text-bear shrink-0" />
            <div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider">Max Drawdown</div>
              <div className="text-sm font-bold font-mono text-bear">{fmtPct(status.maxDrawdown * 100)}</div>
            </div>
          </div>
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3 flex items-center gap-3">
            <Activity size={14} className="text-bull shrink-0" />
            <div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider">Win Rate</div>
              <div className="text-sm font-bold font-mono text-bull">{fmtPct(status.winRate * 100)}</div>
            </div>
          </div>
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3 flex items-center gap-3">
            <Layers size={14} className="text-text-secondary shrink-0" />
            <div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider">Total Trades</div>
              <div className="text-sm font-bold font-mono text-text-primary">{status.trades.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {status.regime && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} className="text-text-secondary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Market Regime</span>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border ${
            status.regime === 'trending'
              ? 'bg-accent/10 text-accent border-accent/20'
              : status.regime === 'mean_reverting'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                : 'bg-bg-elevated text-text-secondary border-border-subtle'
          }`}>
            {status.regime.replace(/_/g, ' ')}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Market Maker Analysis Panel ──────────────────────────────────────────────
function MMAnalysisPanel({ status, onClose }: { status: MarketMakerStatus; onClose: () => void }) {
  const bidPct = status.totalFills > 0 ? (status.bidFills / status.totalFills) * 100 : 50;
  const askPct = status.totalFills > 0 ? (status.askFills / status.totalFills) * 100 : 50;

  return (
    <div className="dash-card p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-accent" />
          <span className="text-sm font-bold">Market Making Analysis</span>
          <span className="text-[10px] text-text-secondary font-mono bg-bg-elevated border border-border-subtle rounded-full px-2 py-0.5">
            Market Maker Bot
          </span>
        </div>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Realized P&amp;L</div>
          <div className={`text-sm font-bold font-mono ${status.realizedPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
            {sign(status.realizedPnl)}{fmtUsd(status.realizedPnl)}
          </div>
        </div>
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Unrealized P&amp;L</div>
          <div className={`text-sm font-bold font-mono ${status.unrealizedPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
            {sign(status.unrealizedPnl)}{fmtUsd(status.unrealizedPnl)}
          </div>
        </div>
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Total P&amp;L</div>
          <div className={`text-sm font-bold font-mono ${status.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
            {sign(status.pnl)}{fmtUsd(status.pnl)}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={13} className="text-text-secondary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Risk Metrics</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3 flex items-center gap-3">
            <Activity size={14} className="text-bull shrink-0" />
            <div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider">Fill Balance</div>
              <div className="text-sm font-bold font-mono text-bull">{fmtPct(status.fillBalance * 100)}</div>
            </div>
          </div>
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3 flex items-center gap-3">
            <ArrowDownRight size={14} className="text-bear shrink-0" />
            <div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider">Max Drawdown</div>
              <div className="text-sm font-bold font-mono text-bear">{fmtPct(status.maxDrawdown * 100)}</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={13} className="text-text-secondary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Fill Distribution</span>
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-bull">Bid Fills</span>
              <span className="font-mono font-semibold text-text-primary">
                {status.bidFills.toLocaleString()} ({fmt(bidPct, 1)}%)
              </span>
            </div>
            <div className="h-1.5 bg-bg-terminal rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-bull transition-all" style={{ width: `${bidPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-bear">Ask Fills</span>
              <span className="font-mono font-semibold text-text-primary">
                {status.askFills.toLocaleString()} ({fmt(askPct, 1)}%)
              </span>
            </div>
            <div className="h-1.5 bg-bg-terminal rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-bear transition-all" style={{ width: `${askPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Portfolio Section (from main API) ────────────────────────────────────────
function PortfolioSection({
  botId, portfolio, onDeposit,
}: {
  botId: string;
  portfolio: BotPortfolio | null;
  onDeposit: (botId: string, amount: number) => Promise<void>;
}) {
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepositError('Enter a valid positive amount');
      return;
    }
    setDepositing(true);
    setDepositError(null);
    try {
      await onDeposit(botId, amount);
      setDepositAmount('');
    } catch (err: unknown) {
      setDepositError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setDepositing(false);
    }
  };

  return (
    <div className="dash-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Wallet size={14} className="text-accent" />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Portfolio &amp; Holdings</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Cash Balance</div>
          <div className="text-base font-bold font-mono text-accent">
            {portfolio ? fmtUsd(portfolio.cash_balance) : '—'}
          </div>
        </div>
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Total Capital</div>
          <div className="text-base font-bold font-mono text-text-primary">
            {portfolio ? fmtUsd(portfolio.initial_capital ?? 100_000) : '—'}
          </div>
        </div>
      </div>

      {/* Deposit */}
      <div className="flex gap-2 items-center">
        <DollarSign size={14} className="text-text-secondary shrink-0" />
        <input
          type="number"
          min="0"
          step="1000"
          placeholder="Amount to deposit"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          className="flex-1 bg-bg-terminal border border-border-subtle rounded px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent/40 transition-colors"
        />
        <button
          onClick={handleDeposit}
          disabled={depositing || !depositAmount}
          className="px-4 py-2 rounded text-sm font-semibold bg-accent text-white hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {depositing ? 'Depositing...' : 'Deposit'}
        </button>
      </div>
      {depositError && <p className="text-xs text-red-500">{depositError}</p>}

      {/* Active Positions */}
      <div>
        <div className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Active Positions</div>
        {!portfolio ? (
          <div className="text-sm text-text-secondary italic">Loading...</div>
        ) : portfolio.positions.length === 0 ? (
          <div className="text-sm text-text-secondary italic">No active positions</div>
        ) : (
          <div className="flex flex-col gap-2">
            {portfolio.positions.map((p) => (
              <div
                key={p.symbol}
                className="flex justify-between items-center bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2"
              >
                <span className="font-bold text-text-primary">{p.symbol}</span>
                <div className="flex items-center gap-4 font-mono text-sm">
                  <span className="text-text-secondary">
                    {p.qty > 0 ? '+' : ''}{p.qty.toFixed(4)} units
                  </span>
                  <span className="text-text-secondary">
                    avg ${p.avg_entry_price.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Trade History Section (from main API) ────────────────────────────────────
function TradeHistorySection({ trades }: { trades: BotTrade[] }) {
  return (
    <div className="dash-card overflow-hidden">
      <div className="px-5 py-4 dash-section-header flex items-center gap-3">
        <Clock size={14} className="text-text-secondary" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Recent Trades</h2>
        <span className="text-[10px] font-mono text-text-secondary bg-bg-elevated px-2 py-0.5 rounded-full border border-border-subtle">
          {trades.length} {trades.length === 1 ? 'trade' : 'trades'}
        </span>
      </div>
      <div className="overflow-x-auto max-h-72 overflow-y-auto styling-scrollbar">
        {trades.length === 0 ? (
          <div className="px-5 py-8 text-sm text-center text-text-secondary italic">No trades executed yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary dash-table-header sticky top-0">
                <th className="text-left px-5 py-3">Side</th>
                <th className="text-left px-5 py-3">Symbol</th>
                <th className="text-right px-5 py-3">Qty</th>
                <th className="text-right px-5 py-3">Price</th>
                <th className="text-right px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="dash-table-row">
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold ${t.side.toUpperCase() === 'BUY' ? 'text-bull' : 'text-bear'}`}>
                      {t.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-bold text-text-primary">{t.symbol}</td>
                  <td className="px-5 py-3 text-right font-mono text-text-primary">{t.qty.toFixed(4)}</td>
                  <td className="px-5 py-3 text-right font-mono text-text-primary">${t.price.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-mono text-text-secondary text-xs">
                    {new Date(t.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Alpha Bot Tab Content ────────────────────────────────────────────────────
function AlphaBotContent({
  alphaState, portfolio, trades, onDeposit, botId,
}: {
  alphaState: ReturnType<typeof useBotPolling>['alpha'];
  portfolio: BotPortfolio | null;
  trades: BotTrade[];
  onDeposit: (botId: string, amount: number) => Promise<void>;
  botId: string;
}) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showPnLModal, setShowPnLModal] = useState(false);
  const { status, isDisconnected, isStale } = alphaState;

  if (!status) {
    return (
      <div className="flex items-center justify-center py-20 text-text-secondary">
        {isDisconnected ? (
          <div className="flex flex-col items-center gap-3">
            <WifiOff size={32} className="text-red-500" />
            <div className="text-sm">Alpha Bot is disconnected</div>
          </div>
        ) : (
          <div className="text-sm animate-pulse">Loading Alpha Bot data...</div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <StatusChips
        halted={status.halted}
        isDisconnected={isDisconnected}
        isStale={isStale}
        position={status.position}
        regime={status.regime}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Equity" value={fmtUsd(status.equity)} />
        <KpiCard
          label="1D P&L"
          value={`${sign(status.pnl)}${fmtUsd(status.pnl)}`}
          positive={status.pnl >= 0}
        />
        <KpiCard
          label="Realized P&L"
          value={`${sign(status.realizedPnl)}${fmtUsd(status.realizedPnl)}`}
          positive={status.realizedPnl >= 0}
        />
        <KpiCard label="Sharpe Ratio" value={fmt(status.sharpe)} positive={status.sharpe >= 1} />
        <KpiCard label="Win Rate" value={fmtPct(status.winRate * 100)} positive={status.winRate >= 0.5} />
        <KpiCard label="Max Drawdown" value={fmtPct(status.maxDrawdown * 100)} positive={false} />
      </div>

      {/* Returns Summary */}
      <div className="dash-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Returns</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Equity</div>
            <div className="text-base font-bold font-mono text-text-primary">{fmtUsd(status.equity)}</div>
          </div>
          <div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Unrealized P&amp;L</div>
            <div className={`text-base font-bold font-mono ${status.unrealizedPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
              {sign(status.unrealizedPnl)}{fmtUsd(status.unrealizedPnl)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Daily P&amp;L</div>
            <div className={`text-base font-bold font-mono ${status.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
              {sign(status.pnl)}{fmtUsd(status.pnl)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Total Trades</div>
            <div className="text-base font-bold font-mono text-text-primary">{status.trades.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Position Table */}
      <div className="dash-card overflow-hidden">
        <div className="px-5 py-4 dash-section-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Current Position</h2>
            <span className="text-[10px] font-mono text-text-secondary bg-bg-elevated px-2 py-0.5 rounded-full border border-border-subtle">
              {status.trades.toLocaleString()} trades
            </span>
          </div>
          <button
            onClick={() => setShowPnLModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors text-xs font-semibold cursor-pointer"
          >
            <BarChart2 size={12} />
            Analyze
            <ChevronRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary dash-table-header">
                <th className="text-left px-5 py-3">Position</th>
                <th className="text-right px-5 py-3">Regime</th>
                <th className="text-right px-5 py-3">Realized P&amp;L</th>
                <th className="text-right px-5 py-3">Unrealized P&amp;L</th>
                <th className="text-right px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="dash-table-row">
                <td className="px-5 py-4">
                  <div className={`font-bold text-lg ${
                    status.position === 'LONG' ? 'text-bull'
                    : status.position === 'SHORT' ? 'text-bear'
                    : 'text-text-secondary'
                  }`}>
                    {status.position}
                  </div>
                  <div className="text-[10px] text-text-secondary">Current direction</div>
                </td>
                <td className="px-5 py-4 text-right">
                  {status.regime ? (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      status.regime === 'trending'
                        ? 'bg-accent/10 text-accent border-accent/20'
                        : status.regime === 'mean_reverting'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-bg-elevated text-text-secondary border-border-subtle'
                    }`}>
                      {status.regime.replace(/_/g, ' ')}
                    </span>
                  ) : (
                    <span className="text-text-secondary text-[11px]">—</span>
                  )}
                </td>
                <td className={`px-5 py-4 text-right font-mono font-semibold ${status.realizedPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                  <div className="flex items-center justify-end gap-1">
                    {status.realizedPnl >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {sign(status.realizedPnl)}{fmtUsd(status.realizedPnl)}
                  </div>
                </td>
                <td className={`px-5 py-4 text-right font-mono font-semibold ${status.unrealizedPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                  <div className="flex items-center justify-end gap-1">
                    {status.unrealizedPnl >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {sign(status.unrealizedPnl)}{fmtUsd(status.unrealizedPnl)}
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  {status.halted ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">HALTED</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-bull/10 text-bull border border-bull/20">ACTIVE</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {showAnalysis && (
        <AlphaAnalysisPanel status={status} onClose={() => setShowAnalysis(false)} />
      )}

      {/* PnL Analysis Modal */}
      <PnLAnalysisModal
        isOpen={showPnLModal}
        onClose={() => setShowPnLModal(false)}
        botId={botId}
      />

      {/* Portfolio & Trade History from main API */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PortfolioSection botId="alpha_bot" portfolio={portfolio} onDeposit={onDeposit} />
        <TradeHistorySection trades={trades} />
      </div>
    </div>
  );
}

// ─── Market Maker Tab Content ─────────────────────────────────────────────────
function MarketMakerContent({
  mmState, portfolio, trades, onDeposit, botId,
}: {
  mmState: ReturnType<typeof useBotPolling>['marketMaker'];
  portfolio: BotPortfolio | null;
  trades: BotTrade[];
  onDeposit: (botId: string, amount: number) => Promise<void>;
  botId: string;
}) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showPnLModal, setShowPnLModal] = useState(false);
  const { status, isDisconnected, isStale } = mmState;

  if (!status) {
    return (
      <div className="flex items-center justify-center py-20 text-text-secondary">
        {isDisconnected ? (
          <div className="flex flex-col items-center gap-3">
            <WifiOff size={32} className="text-red-500" />
            <div className="text-sm">Market Maker Bot is disconnected</div>
          </div>
        ) : (
          <div className="text-sm animate-pulse">Loading Market Maker Bot data...</div>
        )}
      </div>
    );
  }

  const bidPct = status.totalFills > 0 ? (status.bidFills / status.totalFills) * 100 : 0;
  const askPct = status.totalFills > 0 ? (status.askFills / status.totalFills) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      <StatusChips
        halted={status.halted}
        isDisconnected={isDisconnected}
        isStale={isStale}
        position={status.position}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Equity" value={fmtUsd(status.equity)} />
        <KpiCard
          label="1D P&L"
          value={`${sign(status.pnl)}${fmtUsd(status.pnl)}`}
          positive={status.pnl >= 0}
        />
        <KpiCard
          label="Realized P&L"
          value={`${sign(status.realizedPnl)}${fmtUsd(status.realizedPnl)}`}
          positive={status.realizedPnl >= 0}
        />
        <KpiCard
          label="Fill Balance"
          value={fmtPct(status.fillBalance * 100)}
          positive={status.fillBalance >= 0.45 && status.fillBalance <= 0.55}
        />
        <KpiCard label="Total Fills" value={status.totalFills.toLocaleString()} />
        <KpiCard label="Max Drawdown" value={fmtPct(status.maxDrawdown * 100)} positive={false} />
      </div>

      {/* Returns Summary */}
      <div className="dash-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Returns</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Equity</div>
            <div className="text-base font-bold font-mono text-text-primary">{fmtUsd(status.equity)}</div>
          </div>
          <div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Unrealized P&amp;L</div>
            <div className={`text-base font-bold font-mono ${status.unrealizedPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
              {sign(status.unrealizedPnl)}{fmtUsd(status.unrealizedPnl)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Daily P&amp;L</div>
            <div className={`text-base font-bold font-mono ${status.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
              {sign(status.pnl)}{fmtUsd(status.pnl)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Holdings</div>
            <div className="text-base font-bold font-mono text-text-primary">{fmt(status.holdings, 4)}</div>
          </div>
        </div>
      </div>

      {/* Fill Statistics Table */}
      <div className="dash-card overflow-hidden">
        <div className="px-5 py-4 dash-section-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Fill Statistics</h2>
            <span className="text-[10px] font-mono text-text-secondary bg-bg-elevated px-2 py-0.5 rounded-full border border-border-subtle">
              {status.totalFills.toLocaleString()} total fills
            </span>
          </div>
          <button
            onClick={() => setShowPnLModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors text-xs font-semibold cursor-pointer"
          >
            <BarChart2 size={12} />
            Analyze
            <ChevronRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary dash-table-header">
                <th className="text-left px-5 py-3">Side</th>
                <th className="text-right px-5 py-3">Fills</th>
                <th className="text-right px-5 py-3">% of Total</th>
                <th className="text-right px-5 py-3">Distribution</th>
                <th className="text-right px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'BID', desc: 'Buy-side fills', fills: status.bidFills, pct: bidPct, color: 'text-bull', barColor: 'bg-bull' },
                { label: 'ASK', desc: 'Sell-side fills', fills: status.askFills, pct: askPct, color: 'text-bear', barColor: 'bg-bear' },
              ].map(({ label, desc, fills, pct, color, barColor }) => (
                <tr key={label} className="dash-table-row">
                  <td className="px-5 py-4">
                    <div className={`font-bold ${color}`}>{label}</div>
                    <div className="text-[10px] text-text-secondary">{desc}</div>
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-text-primary">{fills.toLocaleString()}</td>
                  <td className={`px-5 py-4 text-right font-mono font-semibold ${color}`}>
                    {status.totalFills > 0 ? fmtPct(pct) : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-1.5 bg-bg-terminal rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {label === 'BID' && (
                      status.halted ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">HALTED</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-bull/10 text-bull border border-bull/20">ACTIVE</span>
                      )
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border-subtle bg-bg-elevated/60">
                <td className="px-5 py-4" colSpan={2}>
                  <div className="flex items-center gap-2">
                    <Layers size={13} className="text-accent" />
                    <span className="font-bold text-text-primary text-sm">Total Fills</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-right font-mono font-bold text-text-primary" colSpan={3}>
                  {status.totalFills.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {showAnalysis && (
        <MMAnalysisPanel status={status} onClose={() => setShowAnalysis(false)} />
      )}

      {/* PnL Analysis Modal */}
      <PnLAnalysisModal
        isOpen={showPnLModal}
        onClose={() => setShowPnLModal(false)}
        botId={botId}
      />

      {/* Portfolio & Trade History from main API */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PortfolioSection botId="market_maker" portfolio={portfolio} onDeposit={onDeposit} />
        <TradeHistorySection trades={trades} />
      </div>
    </div>
  );
}

// ─── Bot Meta ─────────────────────────────────────────────────────────────────
const BOT_META = {
  alpha_bot: { name: 'Alpha Bot', strategy: 'Trend Following', icon: Zap, color: '#f7931a' },
  market_maker: { name: 'Market Maker Bot', strategy: 'Liquidity Provision', icon: Cpu, color: '#2962ff' },
} as const;

// ─── BotDetails Page ──────────────────────────────────────────────────────────
export default function BotDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { alpha, marketMaker } = useBotPolling();

  const activeTab: BotId = id === 'market_maker' ? 'market_maker' : 'alpha_bot';

  // Portfolio + trades from main API (localhost:8000), refreshed every 3s
  const [portfolio, setPortfolio] = useState<BotPortfolio | null>(null);
  const [trades, setTrades] = useState<BotTrade[]>([]);

  useEffect(() => {
    let cancelled = false;

    const clearData = () => {
      setPortfolio(null);
      setTrades([]);
    };

    const load = async () => {
      try {
        const [pf, tr] = await Promise.all([
          fetchBotPortfolio(activeTab),
          fetchBotTrades(activeTab),
        ]);
        if (cancelled) return;
        setPortfolio(pf);
        setTrades(tr);
      } catch {
        // silently keep last known data if API is down
      }
    };

    clearData();
    void load();
    const interval = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeTab]);

  const handleDeposit = async (botId: string, amount: number) => {
    await depositFunds(botId, amount);
    // Refresh portfolio immediately after deposit
    const pf = await fetchBotPortfolio(botId);
    setPortfolio(pf);
  };

  return (
    <div className="min-h-screen bg-bg-terminal text-text-primary overflow-y-auto styling-scrollbar">
      <Navbar />
      <div className="max-w-300 mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-accent transition-colors mb-2 w-fit"
            >
              <ArrowLeft size={12} /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Bot Dashboard</h1>
            <p className="text-xs text-text-secondary mt-1">Live KPIs &amp; returns for each trading bot</p>
          </div>
          <button
            onClick={() => navigate('/terminal')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors text-sm font-semibold cursor-pointer"
          >
            <ExternalLink size={14} />
            Open Terminal
          </button>
        </div>

        {/* Bot Tabs */}
        <div className="flex gap-2 border-b border-border-subtle pb-0">
          {(Object.entries(BOT_META) as [BotId, typeof BOT_META[BotId]][]).map(([botId, meta]) => {
            const Icon = meta.icon;
            const isActive = activeTab === botId;
            const state = botId === 'alpha_bot' ? alpha : marketMaker;
            return (
              <button
                key={botId}
                onClick={() => navigate(`/admin/dashboard/bot/${botId}`)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all cursor-pointer border-b-2 -mb-px ${
                  isActive
                    ? 'text-text-primary border-accent'
                    : 'text-text-secondary border-transparent hover:text-text-primary hover:border-border-subtle'
                }`}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: meta.color + '20', color: meta.color }}
                >
                  <Icon size={13} />
                </div>
                {meta.name}
                <span className="text-[10px] text-text-secondary font-mono bg-bg-elevated border border-border-subtle rounded-full px-1.5 py-0.5">
                  {meta.strategy}
                </span>
                {state.isDisconnected ? (
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Disconnected" />
                ) : state.status ? (
                  <span className="w-2 h-2 rounded-full bg-bull animate-pulse shrink-0" title="Live" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'alpha_bot' ? (
          <AlphaBotContent
            key="alpha"
            alphaState={alpha}
            portfolio={portfolio}
            trades={trades}
            onDeposit={handleDeposit}
            botId={activeTab}
          />
        ) : (
          <MarketMakerContent
            key="mm"
            mmState={marketMaker}
            portfolio={portfolio}
            trades={trades}
            onDeposit={handleDeposit}
            botId={activeTab}
          />
        )}

      </div>
    </div>
  );
}
