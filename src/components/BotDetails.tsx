import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ExternalLink,
  ArrowLeft,
  Wallet,
  Clock,
  DollarSign,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { Navbar } from './Navbar';
import {
  fetchBot,
  fetchBotKPI,
  fetchBotPortfolio,
  fetchBotSessions,
  fetchBotTrades,
  depositFunds,
  type Bot,
  type BotKPIResponse,
  type BotPortfolio,
  type BotSession,
  type BotTrade,
} from '../services/api';

function fmt(v: number, d = 2) {
  return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtUsd(v: number) {
  return `$${fmt(Math.abs(v))}`;
}

function signedUsd(v: number) {
  const sign = v >= 0 ? '+' : '-';
  return `${sign}${fmtUsd(v)}`;
}

function fmtPct(v: number) {
  return `${fmt(v)}%`;
}

function KpiCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const color = positive === undefined ? 'text-text-primary' : positive ? 'text-bull' : 'text-bear';
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4 flex flex-col gap-1">
      <div className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">{label}</div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}

function PortfolioSection({
  botId,
  portfolio,
  onDeposit,
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
    if (Number.isNaN(amount) || amount <= 0) {
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
        <Wallet size={14} className="text-[#5d8aff]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Portfolio and Holdings</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Cash Balance</div>
          <div className="text-base font-bold font-mono text-text-primary">{portfolio ? fmtUsd(portfolio.cash_balance) : '—'}</div>
        </div>
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Total Capital</div>
          <div className="text-base font-bold font-mono text-text-primary">
            {portfolio ? fmtUsd(portfolio.initial_capital ?? 100_000) : '—'}
          </div>
        </div>
      </div>

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
          className="px-4 py-2 rounded text-sm font-semibold bg-[#2962ff] text-white hover:bg-[#1a4fd6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
        >
          {depositing ? 'Depositing...' : 'Deposit'}
        </button>
      </div>

      {depositError && <p className="text-xs text-red-500">{depositError}</p>}

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
                  <span className="text-text-secondary">{p.qty > 0 ? '+' : ''}{p.qty.toFixed(4)} units</span>
                  <span className="text-text-secondary">avg ${p.avg_entry_price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
          <div className="px-5 py-8 text-sm text-center text-text-secondary italic">No trades found for this scope.</div>
        ) : (
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
              <col className="w-[30%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                <th className="text-left px-3 py-3 sticky top-0 bg-bg-elevated/80 backdrop-blur-sm border-b border-border-subtle">Side</th>
                <th className="text-left px-3 py-3 sticky top-0 bg-bg-elevated/80 backdrop-blur-sm border-b border-border-subtle">Symbol</th>
                <th className="text-right px-3 py-3 sticky top-0 bg-bg-elevated/80 backdrop-blur-sm border-b border-border-subtle">Qty</th>
                <th className="text-right px-3 py-3 sticky top-0 bg-bg-elevated/80 backdrop-blur-sm border-b border-border-subtle">Price</th>
                <th className="text-left px-3 py-3 sticky top-0 bg-bg-elevated/80 backdrop-blur-sm border-b border-border-subtle">Session</th>
                <th className="text-right px-3 py-3 sticky top-0 bg-bg-elevated/80 backdrop-blur-sm border-b border-border-subtle">Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="dash-table-row">
                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold ${t.side.toUpperCase() === 'BUY' ? 'text-bull' : 'text-bear'}`}>
                      {t.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-bold text-text-primary">{t.symbol}</td>
                  <td className="px-3 py-3 text-right font-mono text-text-primary">{t.qty.toFixed(4)}</td>
                  <td className="px-3 py-3 text-right font-mono text-text-primary">${t.price.toFixed(2)}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-text-secondary truncate">{t.session_id ?? '—'}</td>
                  <td className="px-3 py-3 text-right font-mono text-text-secondary text-xs">
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

function sessionLabel(session: BotSession): string {
  const started = new Date(session.start_time).toLocaleString();
  return `${session.session_type.toUpperCase()} | ${session.status.toUpperCase()} | ${started}`;
}

export default function BotDetails() {
  const { id: botId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [bot, setBot] = useState<Bot | null>(null);
  const [portfolio, setPortfolio] = useState<BotPortfolio | null>(null);
  const [trades, setTrades] = useState<BotTrade[]>([]);
  const [kpi, setKpi] = useState<BotKPIResponse | null>(null);
  const [sessions, setSessions] = useState<BotSession[]>([]);
  const [sessionFilter, setSessionFilter] = useState<string>('overall');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessionFilter('overall');
  }, [botId]);

  useEffect(() => {
    if (!botId) return;

    let cancelled = false;

    const load = async () => {
      const selectedSessionId = sessionFilter === 'overall' ? undefined : sessionFilter;
      try {
        const [botData, pf, tr, kpiData, sessionsData] = await Promise.all([
          fetchBot(botId),
          fetchBotPortfolio(botId),
          fetchBotTrades(botId, selectedSessionId),
          fetchBotKPI(botId, selectedSessionId),
          fetchBotSessions(botId),
        ]);

        if (cancelled) return;

        setBot(botData);
        setPortfolio(pf);
        setTrades(tr);
        setKpi(kpiData);
        setSessions(sessionsData);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load bot details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    void load();
    const interval = setInterval(load, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [botId, sessionFilter]);

  const handleDeposit = async (targetBotId: string, amount: number) => {
    await depositFunds(targetBotId, amount);
    const refreshed = await fetchBotPortfolio(targetBotId);
    setPortfolio(refreshed);
  };

  const activeSessionsCount = useMemo(
    () => sessions.filter((s) => s.status === 'active').length,
    [sessions]
  );

  if (!botId) {
    return (
      <div className="min-h-screen bg-bg-terminal text-text-primary">
        <Navbar />
        <div className="max-w-300 mx-auto px-6 py-8">
          <div className="dash-card p-6 text-sm text-red-500">Invalid bot id in route.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-terminal text-text-primary overflow-y-auto styling-scrollbar">
      <Navbar />
      <div className="max-w-300 mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-accent transition-colors mb-2 w-fit"
            >
              <ArrowLeft size={12} /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">{bot?.name ?? 'Bot Details'}</h1>
            <p className="text-xs text-text-secondary mt-1">Bot ID: {botId}</p>
          </div>
          <button
            onClick={() => navigate('/terminal')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors text-sm font-semibold cursor-pointer"
          >
            <ExternalLink size={14} />
            Open Terminal
          </button>
        </div>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">{error}</div>}

        <div className="dash-card p-5 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Activity size={16} className="text-[#5d8aff]" />
              <div className="text-xs text-text-secondary uppercase tracking-wider font-semibold">KPI Scope</div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                bot?.status === 'active'
                  ? 'bg-bull/10 text-bull border-bull/20'
                  : 'bg-red-500/10 text-red-500 border-red-500/20'
              }`}>
                {(bot?.status ?? 'unknown').toUpperCase()}
              </span>
            </div>

            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="appearance-none bg-bg-elevated border border-border-subtle rounded px-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:border-[#2962ff]/50 cursor-pointer hover:bg-[#2a2e39] transition-colors font-sans"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23787b86' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '30px' }}
            >
              <option value="overall">Overall History</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {sessionLabel(session)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Realized PnL" value={kpi ? signedUsd(kpi.realized_pnl) : '—'} positive={kpi ? kpi.realized_pnl >= 0 : undefined} />
            <KpiCard label="Sharpe Ratio" value={kpi ? fmt(kpi.sharpe_ratio) : '—'} positive={kpi ? kpi.sharpe_ratio >= 1 : undefined} />
            <KpiCard label="Win Rate" value={kpi ? fmtPct(kpi.win_rate * 100) : '—'} positive={kpi ? kpi.win_rate >= 0.5 : undefined} />
            <KpiCard label="Max Drawdown" value={kpi ? fmtPct(kpi.max_drawdown * 100) : '—'} positive={false} />
            <KpiCard label="Closed Trades" value={kpi ? kpi.total_trades.toLocaleString() : '—'} />
            <KpiCard label="Active Sessions" value={activeSessionsCount.toString()} />
          </div>

          {loading && <div className="text-sm text-text-secondary italic">Loading bot data...</div>}
        </div>

        <div className="dash-card overflow-hidden">
          <div className="px-5 py-4 dash-section-header flex items-center gap-3">
            <TrendingUp size={14} className="text-[#5d8aff]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Sessions</h2>
            <span className="text-[10px] font-mono text-text-secondary bg-bg-elevated px-2 py-0.5 rounded-full border border-border-subtle">
              {sessions.length} total
            </span>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto styling-scrollbar">
            {sessions.length === 0 ? (
              <div className="px-5 py-8 text-sm text-center text-text-secondary italic">No sessions recorded yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                    <th className="text-left px-5 py-3 sticky top-0 bg-bg-elevated/80 backdrop-blur-sm border-b border-border-subtle">Type</th>
                    <th className="text-left px-5 py-3 sticky top-0 bg-bg-elevated/80 backdrop-blur-sm border-b border-border-subtle">Status</th>
                    <th className="text-left px-5 py-3 sticky top-0 bg-bg-elevated/80 backdrop-blur-sm border-b border-border-subtle">Started</th>
                    <th className="text-left px-5 py-3 sticky top-0 bg-bg-elevated/80 backdrop-blur-sm border-b border-border-subtle">Ended</th>
                    <th className="text-right px-5 py-3 sticky top-0 bg-bg-elevated/80 backdrop-blur-sm border-b border-border-subtle">Realized PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr
                      key={s.id}
                      className={`dash-table-row cursor-pointer ${sessionFilter === s.id ? 'bg-accent/5' : ''}`}
                      onClick={() => setSessionFilter(s.id)}
                    >
                      <td className="px-5 py-3 font-mono text-[11px] text-text-primary uppercase">{s.session_type}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            s.status === 'active'
                              ? 'bg-bull/10 text-bull border-bull/20'
                              : 'bg-bg-elevated text-text-secondary border-border-subtle'
                          }`}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-text-secondary">{new Date(s.start_time).toLocaleString()}</td>
                      <td className="px-5 py-3 font-mono text-[11px] text-text-secondary">{s.end_time ? new Date(s.end_time).toLocaleString() : '—'}</td>
                      <td className={`px-5 py-3 text-right font-mono font-semibold ${s.realized_pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {signedUsd(s.realized_pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PortfolioSection botId={botId} portfolio={portfolio} onDeposit={handleDeposit} />
          <TradeHistorySection trades={trades} />
        </div>


      </div>
    </div>
  );
}
