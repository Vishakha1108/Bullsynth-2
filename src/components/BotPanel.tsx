import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Bot,
  Play,
  Square,
  Search,
  Circle,
  CheckCircle2,
  BarChart3,
  Timer,
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

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
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
  sessionStartTime: string | null;
  error: string | null;
};

type ActionPhase = 'idle' | 'starting' | 'stopping';

const EMPTY_RUNTIME: BotRuntime = {
  kpi: null,
  portfolio: null,
  sessionId: null,
  sessionStartTime: null,
  error: null,
};

export default function BotPanel({ onClose }: { onClose?: () => void }) {
  const [bots, setBots] = useState<AdminBot[]>([]);
  const [query, setQuery] = useState('');
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [loadingBots, setLoadingBots] = useState(true);
  const [actionPhase, setActionPhase] = useState<ActionPhase>('idle');
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState(0);
  const [runtimeByBot, setRuntimeByBot] = useState<Record<string, BotRuntime>>({});
  const runtimeRef = useRef<Record<string, BotRuntime>>({});

  const actionLoading = actionPhase !== 'idle';

  useEffect(() => {
    runtimeRef.current = runtimeByBot;
  }, [runtimeByBot]);

  const selectedSet = useMemo(() => new Set(selectedBotIds), [selectedBotIds]);

  const startDisabledReason = useMemo(() => {
    if (running) return 'Lap already running';
    if (actionLoading) return actionPhase === 'starting' ? 'Starting...' : 'Stopping in progress...';
    if (selectedBotIds.length === 0) return 'Select at least one bot';
    return null;
  }, [running, actionLoading, actionPhase, selectedBotIds.length]);

  const stopDisabledReason = useMemo(() => {
    if (actionLoading) return actionPhase === 'starting' ? 'Start in progress...' : 'Stopping...';
    if (!running) return 'No active lap';
    return null;
  }, [running, actionLoading, actionPhase]);

  const hasLapSnapshot = useMemo(
    () => selectedBotIds.some((botId) => Boolean(runtimeByBot[botId]?.sessionId)),
    [runtimeByBot, selectedBotIds]
  );

  const activeLapStartMs = useMemo(() => {
    const starts = selectedBotIds
      .map((botId) => runtimeByBot[botId]?.sessionStartTime)
      .filter((value): value is string => Boolean(value))
      .map((value) => Date.parse(value))
      .filter((value) => Number.isFinite(value));

    if (starts.length === 0) return null;
    return Math.min(...starts);
  }, [runtimeByBot, selectedBotIds]);

  const lapTimerLabel = useMemo(() => {
    if (!activeLapStartMs) return '00:00';
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - activeLapStartMs) / 1000));
    return formatDuration(elapsedSeconds);
  }, [activeLapStartMs, clockTick]);

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
      setApiConnected(true);
      setPanelError(null);
      setSelectedBotIds((prev) => prev.filter((id) => list.some((b) => b.id === id)));
    } catch (err) {
      setApiConnected(false);
      setPanelError(parseErrorMessage(err));
    } finally {
      setLoadingBots(false);
    }
  };

  useEffect(() => {
    void loadBots();
  }, []);

  useEffect(() => {
    setRuntimeByBot((prev) => {
      const next: Record<string, BotRuntime> = {};
      for (const botId of selectedBotIds) {
        next[botId] = prev[botId] ?? EMPTY_RUNTIME;
      }
      return next;
    });
  }, [selectedBotIds]);

  useEffect(() => {
    if (!running || !activeLapStartMs) return;
    const timer = setInterval(() => setClockTick((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [running, activeLapStartMs]);

  const syncActiveLapsForSelection = async (botIds: string[]) => {
    if (botIds.length === 0) {
      setRunning(false);
      return;
    }

    const activeByBot = await Promise.all(
      botIds.map(async (botId) => {
        try {
          const sessions = await fetchBotSessions(botId);
          const active = findActiveLapSession(sessions);
          return { botId, active };
        } catch {
          return { botId, active: null as BotSession | null };
        }
      })
    );

    const anyActive = activeByBot.some((entry) => Boolean(entry.active));

    setRuntimeByBot((prev) => {
      const next = { ...prev };
      for (const { botId, active } of activeByBot) {
        const current = next[botId] ?? EMPTY_RUNTIME;
        if (active) {
          next[botId] = {
            ...current,
            sessionId: active.id,
            sessionStartTime: active.start_time,
            error: null,
          };
        } else {
          next[botId] = current;
        }
      }
      return next;
    });

    setRunning(anyActive);
  };

  useEffect(() => {
    void syncActiveLapsForSelection(selectedBotIds);
  }, [selectedBotIds]);

  const loadRuntime = async (botId: string, sessionId: string | null, requireSession = false) => {
    if (requireSession && !sessionId) {
      return {
        kpi: null,
        portfolio: null,
        error: 'No lap session available for this bot.',
      };
    }

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
    if (!running || selectedBotIds.length === 0) return;

    const entries = await Promise.all(
      selectedBotIds.map(async (botId) => {
        const current = runtimeRef.current[botId];
        let sessionId = current?.sessionId ?? null;
        let sessionStartTime = current?.sessionStartTime ?? null;

        if (!sessionId) {
          try {
            const sessions = await fetchBotSessions(botId);
            const activeLap = findActiveLapSession(sessions);
            sessionId = activeLap?.id ?? null;
            sessionStartTime = activeLap?.start_time ?? sessionStartTime;
          } catch {
            // If session sync fails, the requireSession flag below will surface the error state.
          }
        }

        const next = await loadRuntime(botId, sessionId, true);
        return [
          botId,
          {
            kpi: next.kpi,
            portfolio: next.portfolio,
            sessionId,
            sessionStartTime,
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
    if (!running) return;
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

    if (actionLoading) return;

    setActionPhase('starting');
    setPanelError(null);

    try {
      const startedByBot = await Promise.all(
        selectedBotIds.map(async (botId) => {
          // Reuse an already-active lap to avoid race errors when the user retries Start.
          try {
            const sessions = await fetchBotSessions(botId);
            const activeLap = findActiveLapSession(sessions);
            if (activeLap) {
              return { botId, session: activeLap, error: null as string | null };
            }
          } catch {
            // Continue to explicit start below.
          }

          try {
            const started = await startLapSession(botId);
            return { botId, session: started, error: null as string | null };
          } catch (err) {
            const startErr = parseErrorMessage(err);
            try {
              const sessions = await fetchBotSessions(botId);
              const activeLap = findActiveLapSession(sessions);
              if (activeLap) {
                return { botId, session: activeLap, error: null as string | null };
              }
            } catch {
              // Ignore nested fetch errors and use start error.
            }
            return { botId, session: null, error: startErr };
          }
        })
      );

      const nextRuntimeEntries = await Promise.all(
        startedByBot.map(async ({ botId, session, error }) => {
          if (!session) {
            return [
              botId,
              {
                kpi: null,
                portfolio: null,
                sessionId: null,
                sessionStartTime: null,
                error: error ?? 'Could not start lap session.',
              } as BotRuntime,
            ] as const;
          }

          const loaded = await loadRuntime(botId, session.id, true);
          return [
            botId,
            {
              kpi: loaded.kpi,
              portfolio: loaded.portfolio,
              sessionId: session.id,
              sessionStartTime: session.start_time,
              error: loaded.error,
            } as BotRuntime,
          ] as const;
        })
      );

      const nextRuntime = Object.fromEntries(nextRuntimeEntries) as Record<string, BotRuntime>;
      const startedCount = startedByBot.filter((entry) => Boolean(entry.session)).length;

      setRuntimeByBot(nextRuntime);
      setRunning(startedCount > 0);

      if (startedCount === 0) {
        setPanelError('Could not start lap session for the selected bots.');
      } else if (startedCount < selectedBotIds.length) {
        setPanelError(`Started lap for ${startedCount}/${selectedBotIds.length} selected bots.`);
      } else {
        setPanelError(null);
      }
      setApiConnected(true);
    } catch (err) {
      setApiConnected(false);
      setPanelError(parseErrorMessage(err));
      setRunning(false);
    } finally {
      setActionPhase('idle');
    }
  };

  const handleStop = async () => {
    if (actionLoading) return;

    setActionPhase('stopping');
    setPanelError(null);

    try {
      const runtimeSnapshot = runtimeRef.current;

      const stopTargetEntries = await Promise.all(
        selectedBotIds.map(async (botId) => {
          const current = runtimeSnapshot[botId];
          if (current?.sessionId) {
            return {
              botId,
              sessionId: current.sessionId,
              sessionStartTime: current.sessionStartTime,
            };
          }

          try {
            const sessions = await fetchBotSessions(botId);
            const activeLap = findActiveLapSession(sessions);
            if (activeLap) {
              return {
                botId,
                sessionId: activeLap.id,
                sessionStartTime: activeLap.start_time,
              };
            }
          } catch {
            // Ignore and skip stop for this bot.
          }

          return null;
        })
      );

      const stopTargets = stopTargetEntries.filter((entry) => Boolean(entry?.sessionId));

      await Promise.all(
        stopTargets.map(async (entry) => {
          try {
            await stopLapSession(entry!.botId);
          } catch {
            // Ignore stop race conditions (already stopped or no active lap).
          }
        })
      );

      setRunning(false);

      const nextRuntimeEntries = await Promise.all(
        selectedBotIds.map(async (botId) => {
          const current = runtimeSnapshot[botId];
          const stopped = stopTargets.find((entry) => entry?.botId === botId);
          const sessionId = stopped?.sessionId ?? current?.sessionId ?? null;
          const sessionStartTime = stopped?.sessionStartTime ?? current?.sessionStartTime ?? null;
          const loaded = await loadRuntime(botId, sessionId, Boolean(sessionId));

          return [
            botId,
            {
              kpi: loaded.kpi,
              portfolio: loaded.portfolio,
              sessionId,
              sessionStartTime,
              error: loaded.error,
            } as BotRuntime,
          ] as const;
        })
      );

      setRuntimeByBot(Object.fromEntries(nextRuntimeEntries) as Record<string, BotRuntime>);
      setApiConnected(true);
    } catch (err) {
      setApiConnected(false);
      setPanelError(parseErrorMessage(err));
    } finally {
      setActionPhase('idle');
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-terminal text-text-primary font-sans border-l border-border-subtle">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-bg-elevated">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-accent" />
          <span className="text-xs font-bold uppercase tracking-wider">Bot Compare</span>
          {running && <span className="text-[10px] font-bold text-bull uppercase">Lap Live</span>}
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
          Step 2: Start Compare Lap Timer
        </div>

        <div className="flex items-center justify-between bg-bg-elevated/30 border border-border-subtle/70 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] text-text-secondary font-semibold uppercase tracking-wide">
            <Timer size={13} className="text-accent" />
            Lap Timer
          </div>
          <div className={`text-sm font-mono font-bold ${running ? 'text-bull' : 'text-text-primary'}`}>
            {lapTimerLabel}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold">
            Session Controls
          </div>
          <button
            onClick={() => void syncActiveLapsForSelection(selectedBotIds)}
            disabled={actionLoading}
            className="text-[10px] uppercase tracking-wider font-semibold text-accent hover:text-text-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            Sync
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleStart}
            disabled={running || actionLoading || selectedBotIds.length === 0}
            className="w-full py-2.5 rounded-lg border border-bull bg-bull/20 text-bull font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Play size={13} />
            Start
          </button>
          <button
            onClick={handleStop}
            disabled={!running || actionLoading}
            className="w-full py-2.5 rounded-lg border border-bear bg-bear/20 text-bear font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Square size={13} />
            Stop
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-text-secondary font-mono">
          <span>{startDisabledReason ? `Start: ${startDisabledReason}` : 'Start: ready'}</span>
          <span>{stopDisabledReason ? `Stop: ${stopDisabledReason}` : 'Stop: ready'}</span>
        </div>

        {actionLoading && (
          <div className="bg-bg-elevated/30 border border-border-subtle/60 rounded-lg px-3 py-2">
            <span className="text-[10px] text-text-secondary font-mono uppercase tracking-wider">
              {actionPhase === 'starting' ? 'starting lap session...' : 'stopping lap session...'}
            </span>
          </div>
        )}

        <div className="h-px bg-border-subtle my-1" />

        <div className="flex items-center justify-between">
          <div className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold">Compared Bots KPI</div>
          <span className="text-[10px] text-text-secondary font-mono">
            {running ? 'Lap live polling' : hasLapSnapshot ? 'Last lap snapshot' : 'Lap scope'}
          </span>
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
                      running
                        ? 'bg-bull/10 border-bull/20 text-bull'
                        : runtime?.sessionId
                          ? 'bg-accent/10 border-accent/30 text-accent'
                          : 'bg-bg-elevated border-border-subtle text-text-secondary'
                    }`}>
                      {running ? 'Live Lap' : runtime?.sessionId ? 'Lap Done' : 'Waiting'}
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

                  {runtime?.sessionId && (
                    <div className="text-[10px] text-text-secondary font-mono">
                      session: {runtime.sessionId}
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
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${apiConnected === false ? 'bg-bear' : apiConnected ? 'bg-bull' : 'bg-text-secondary'}`} />
          <div className="text-[10px] text-accent font-mono">
            Admin API {apiConnected === false ? '(disconnected)' : apiConnected ? '(connected)' : '(unknown)'}
          </div>
        </div>
      </div>
    </div>
  );
}
