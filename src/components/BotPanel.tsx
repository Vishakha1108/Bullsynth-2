import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Bot,
  Play,
  Square,
  Search,
  Circle,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import {
  fetchBots,
  fetchBotKPI,
  fetchBotPortfolio,
  fetchBotSessions,
  startLapSession,
  stopLapSession,
  type Bot as AdminBot,
  type BotKPIResponse,
  type BotSession,
  type BotPortfolio,
} from '../services/api';

const POLL_MS = 3000;

function fmt(value: number, digits = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function usd(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}$${fmt(Math.abs(value))}`;
}

function pctRatio(value: number): string {
  return `${fmt(value * 100)}%`;
}

function parseErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Request failed';
  return err.message;
}

function findActiveLapSession(sessions: BotSession[]): BotSession | null {
  return sessions.find((s) => s.session_type === 'lap' && s.status === 'active') ?? null;
}

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const color = positive === undefined ? 'text-text-primary' : positive ? 'text-bull' : 'text-bear';
  return (
    <div className="bg-bg-elevated/60 p-2.5 rounded-lg border border-border-subtle">
      <div className="text-[9px] text-text-secondary uppercase font-bold tracking-tight">{label}</div>
      <div className={`text-sm font-mono font-bold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

type BotRuntime = {
  kpi: BotKPIResponse | null;
  portfolio: BotPortfolio | null;
  sessionId: string | null;
  error: string | null;
};

export default function BotPanel({ onClose }: { onClose?: () => void }) {
  const [bots, setBots] = useState<AdminBot[]>([]);
  const [query, setQuery] = useState('');
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [loadingBots, setLoadingBots] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [runtimeByBot, setRuntimeByBot] = useState<Record<string, BotRuntime>>({});

  const selectedSet = useMemo(() => new Set(selectedBotIds), [selectedBotIds]);

  const visibleBots = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bots;
    return bots.filter((b) => b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
  }, [bots, query]);

  const loadBots = async () => {
    setLoadingBots(true);
    try {
      const list = await fetchBots();
      setBots(list);
      setPanelError(null);
      setSelectedBotIds((prev) => prev.filter((id) => list.some((b) => b.id === id)));
    } catch (err) {
      setPanelError(parseErrorMessage(err));
    } finally {
      setLoadingBots(false);
    }
  };

  useEffect(() => {
    void loadBots();
  }, []);

  const loadRuntime = async (botId: string, sessionId: string | null) => {
    try {
      const [kpi, portfolio] = await Promise.all([
        fetchBotKPI(botId, sessionId ?? undefined),
        fetchBotPortfolio(botId),
      ]);
      return { kpi, portfolio, error: null };
    } catch (err) {
      return {
        kpi: null,
        portfolio: null,
        error: parseErrorMessage(err),
      };
    }
  };

  const refreshSelectedRuntime = async () => {
    if (selectedBotIds.length === 0) return;

    const entries = await Promise.all(
      selectedBotIds.map(async (botId) => {
        const current = runtimeByBot[botId];
        const sessionId = running ? current?.sessionId ?? null : null;
        const next = await loadRuntime(botId, sessionId);
        return [
          botId,
          {
            kpi: next.kpi,
            portfolio: next.portfolio,
            sessionId,
            error: next.error,
          } as BotRuntime,
        ] as const;
      })
    );

    setRuntimeByBot((prev) => {
      const copy = { ...prev };
      for (const [botId, runtime] of entries) {
        copy[botId] = runtime;
      }
      return copy;
    });
  };

  useEffect(() => {
    void refreshSelectedRuntime();
    const t = setInterval(() => {
      void refreshSelectedRuntime();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [selectedBotIds, running]);

  const toggleSelected = (botId: string) => {
    if (running) return;
    setSelectedBotIds((prev) =>
      prev.includes(botId) ? prev.filter((id) => id !== botId) : [...prev, botId]
    );
  };

  const handleStart = async () => {
    if (selectedBotIds.length === 0) {
      setPanelError('Select at least one bot to compare.');
      return;
    }

    setActionLoading(true);
    setPanelError(null);

    const sessionMap: Record<string, string | null> = {};

    for (const botId of selectedBotIds) {
      try {
        const started = await startLapSession(botId);
        sessionMap[botId] = started.id;
      } catch {
        try {
          const sessions = await fetchBotSessions(botId);
          const activeLap = findActiveLapSession(sessions);
          sessionMap[botId] = activeLap?.id ?? null;
        } catch {
          sessionMap[botId] = null;
        }
      }
    }

    const nextRuntime: Record<string, BotRuntime> = { ...runtimeByBot };

    for (const botId of selectedBotIds) {
      const sessionId = sessionMap[botId] ?? null;
      const loaded = await loadRuntime(botId, sessionId);
      nextRuntime[botId] = {
        kpi: loaded.kpi,
        portfolio: loaded.portfolio,
        sessionId,
        error: loaded.error,
      };
    }

    setRuntimeByBot(nextRuntime);
    setRunning(true);
    setActionLoading(false);
  };

  const handleStop = async () => {
    setActionLoading(true);

    await Promise.all(
      selectedBotIds.map(async (botId) => {
        try {
          await stopLapSession(botId);
        } catch {
          // Ignore stop race conditions (already stopped or no active lap).
        }
      })
    );

    setRunning(false);

    const nextRuntime: Record<string, BotRuntime> = { ...runtimeByBot };
    for (const botId of selectedBotIds) {
      const loaded = await loadRuntime(botId, null);
      nextRuntime[botId] = {
        kpi: loaded.kpi,
        portfolio: loaded.portfolio,
        sessionId: null,
        error: loaded.error,
      };
    }

    setRuntimeByBot(nextRuntime);
    setActionLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-bg-terminal text-text-primary font-sans border-l border-border-subtle">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-bg-elevated">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-accent" />
          <span className="text-xs font-bold uppercase tracking-wider">Bot Compare</span>
          {running && <span className="text-[10px] font-bold text-bull uppercase">Live Session</span>}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-border-subtle rounded transition-colors cursor-pointer">
            <X size={16} className="text-text-secondary" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto styling-scrollbar flex flex-col p-4 gap-4">
        <div className="flex items-center gap-2 bg-bg-elevated/40 border border-border-subtle rounded-lg px-3 py-2">
          <Search size={14} className="text-text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bots by name or id"
            className="bg-transparent w-full text-sm text-text-primary placeholder:text-text-secondary outline-none"
          />
        </div>

        <div className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold">
          Step 1: Select Bots ({selectedBotIds.length} selected)
        </div>

        <div className="grid grid-cols-1 gap-2">
          {loadingBots ? (
            <div className="text-xs text-text-secondary italic p-3">Loading bots...</div>
          ) : visibleBots.length === 0 ? (
            <div className="text-xs text-text-secondary italic p-3">No bots found.</div>
          ) : (
            visibleBots.map((bot) => {
              const selected = selectedSet.has(bot.id);
              return (
                <button
                  key={bot.id}
                  onClick={() => toggleSelected(bot.id)}
                  disabled={running}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selected
                      ? 'bg-accent/10 border-accent text-text-primary'
                      : 'bg-bg-elevated/40 border-border-subtle text-text-secondary hover:text-text-primary hover:border-text-secondary/40'
                  } ${running ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Bot size={14} className="shrink-0" />
                      <span className="font-semibold truncate text-sm">{bot.name}</span>
                    </div>
                    {selected ? <CheckCircle2 size={14} className="text-accent shrink-0" /> : <Circle size={14} className="shrink-0" />}
                  </div>
                  <div className="text-[10px] mt-1 font-mono truncate">{bot.id}</div>
                </button>
              );
            })
          )}
        </div>

        {panelError && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {panelError}
          </div>
        )}

        <div className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold mt-1">
          Step 2: Start Compare Session
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleStart}
            disabled={running || actionLoading || selectedBotIds.length === 0}
            className="py-2 rounded-lg border border-accent bg-accent/15 text-accent font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Play size={13} />
            Start
          </button>
          <button
            onClick={handleStop}
            disabled={!running || actionLoading}
            className="py-2 rounded-lg border border-bear bg-bear/15 text-bear font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Square size={13} />
            Stop
          </button>
        </div>

        <div className="h-px bg-border-subtle my-1" />

        <div className="flex items-center justify-between">
          <div className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold">Compared Bots KPI</div>
          <span className="text-[10px] text-text-secondary font-mono">{running ? 'Live polling' : 'Overall scope'}</span>
        </div>

        {selectedBotIds.length === 0 ? (
          <div className="text-xs text-text-secondary italic">Select bots and press Start to compare KPI side-by-side.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {selectedBotIds.map((botId) => {
              const bot = bots.find((b) => b.id === botId);
              const runtime = runtimeByBot[botId];
              const kpi = runtime?.kpi;
              const pf = runtime?.portfolio;

              return (
                <div key={botId} className="bg-bg-elevated/30 p-3 rounded-xl border border-border-subtle/60 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-text-primary truncate">
                        {bot?.name ?? botId}
                      </div>
                      <div className="text-[10px] text-text-secondary font-mono truncate">{botId}</div>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                      running ? 'bg-bull/10 border-bull/20 text-bull' : 'bg-bg-elevated border-border-subtle text-text-secondary'
                    }`}>
                      {running ? 'Session' : 'Overall'}
                    </span>
                  </div>

                  {runtime?.error && (
                    <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
                      {runtime.error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Metric label="Realized PnL" value={kpi ? usd(kpi.realized_pnl) : '—'} positive={kpi ? kpi.realized_pnl >= 0 : undefined} />
                    <Metric label="Win Rate" value={kpi ? pctRatio(kpi.win_rate) : '—'} positive={kpi ? kpi.win_rate >= 0.5 : undefined} />
                    <Metric label="Sharpe" value={kpi ? fmt(kpi.sharpe_ratio) : '—'} positive={kpi ? kpi.sharpe_ratio >= 1 : undefined} />
                    <Metric label="Max DD" value={kpi ? pctRatio(kpi.max_drawdown) : '—'} positive={false} />
                    <Metric label="Closed Trades" value={kpi ? String(kpi.total_trades) : '—'} />
                    <Metric label="Cash" value={pf ? `$${fmt(pf.cash_balance)}` : '—'} />
                  </div>

                  {running && (
                    <div className="text-[10px] text-text-secondary font-mono">
                      session: {runtime?.sessionId ?? 'not-found'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border-subtle bg-bg-elevated/70 flex items-center justify-between">
        <div className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">API Source</div>
        <div className="text-[10px] text-accent font-mono">Admin API</div>
      </div>
    </div>
  );
}
