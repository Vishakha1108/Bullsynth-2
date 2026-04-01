import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Bot,
  Play,
  Square,
  Search,
  Check,
  ChevronDown,
  RefreshCw,
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
const BOT_COMPARE_SELECTED_STORAGE_KEY = 'nextbull.botCompare.selectedBotIds';

function readStoredSelectedBotIds(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.sessionStorage.getItem(BOT_COMPARE_SELECTED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}

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
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>(readStoredSelectedBotIds);
  const [running, setRunning] = useState(false);
  const [loadingBots, setLoadingBots] = useState(true);
  const [actionPhase, setActionPhase] = useState<ActionPhase>('idle');
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState(0);
  const [runtimeByBot, setRuntimeByBot] = useState<Record<string, BotRuntime>>({});
  const runtimeRef = useRef<Record<string, BotRuntime>>({});
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const actionLoading = actionPhase !== 'idle';

  useEffect(() => {
    runtimeRef.current = runtimeByBot;
  }, [runtimeByBot]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(BOT_COMPARE_SELECTED_STORAGE_KEY, JSON.stringify(selectedBotIds));
  }, [selectedBotIds]);

  const selectedSet = useMemo(() => new Set(selectedBotIds), [selectedBotIds]);

  const selectedBotsSummary = useMemo(() => {
    if (selectedBotIds.length === 0) return 'Choose bots to compare';
    if (selectedBotIds.length === 1) {
      const bot = bots.find((entry) => entry.id === selectedBotIds[0]);
      return bot?.name ?? selectedBotIds[0];
    }
    return `${selectedBotIds.length} bots selected`;
  }, [bots, selectedBotIds]);

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
    if (!running || !activeLapStartMs) return '00:00';
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - activeLapStartMs) / 1000));
    return formatDuration(elapsedSeconds);
  }, [running, activeLapStartMs, clockTick]);

  const visibleBots = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bots;
    return bots.filter((b) => b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
  }, [bots, query]);

  useEffect(() => {
    if (!selectorOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setSelectorOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [selectorOpen]);

  useEffect(() => {
    if (running) {
      setSelectorOpen(false);
    }
  }, [running]);

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

  const fetchActiveLapSessions = async (botIds: string[]) => {
    return await Promise.all(
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
  };

  const syncActiveLapsForSelection = async (botIds: string[]) => {
    if (botIds.length === 0) {
      if (bots.length === 0) {
        setRunning(false);
        return;
      }

      const acrossAllBots = await fetchActiveLapSessions(bots.map((bot) => bot.id));
      const activeEntries = acrossAllBots.filter((entry) => Boolean(entry.active));

      if (activeEntries.length === 0) {
        setRunning(false);
        return;
      }

      const activeBotIds = activeEntries.map((entry) => entry.botId);
      setSelectedBotIds(activeBotIds);

      setRuntimeByBot((prev) => {
        const next = { ...prev };
        for (const entry of activeEntries) {
          const current = next[entry.botId] ?? EMPTY_RUNTIME;
          next[entry.botId] = {
            ...current,
            sessionId: entry.active!.id,
            sessionStartTime: entry.active!.start_time,
            error: null,
          };
        }
        return next;
      });

      setRunning(true);
      return;
    }

    const activeByBot = await fetchActiveLapSessions(botIds);

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

  useEffect(() => {
    if (loadingBots) return;
    if (selectedBotIds.length > 0) return;
    void syncActiveLapsForSelection([]);
  }, [loadingBots, bots, selectedBotIds.length]);

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

  const selectAllVisibleBots = () => {
    if (running || visibleBots.length === 0) return;

    setSelectedBotIds((prev) => {
      const next = [...prev];
      for (const bot of visibleBots) {
        if (!next.includes(bot.id)) {
          next.push(bot.id);
        }
      }
      return next;
    });
  };

  const clearSelectedBots = () => {
    if (running) return;
    setSelectedBotIds([]);
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
          // Always restart from a fresh lap so timer and KPI scope start cleanly from now.
          try {
            const sessions = await fetchBotSessions(botId);
            const activeLap = findActiveLapSession(sessions);
            if (activeLap) {
              try {
                await stopLapSession(botId);
              } catch {
                // Continue and attempt a fresh start below.
              }
            }
          } catch {
            // Continue with explicit start below.
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
    <div className="flex h-full flex-col border-l border-border-subtle bg-bg-terminal text-text-primary font-sans">
      <div className="flex items-start justify-between border-b border-border-subtle bg-linear-to-r from-bg-elevated to-bg-terminal px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-accent/25 bg-accent/10">
            <BarChart3 size={14} className="text-accent" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-[0.13em] text-text-primary">Bot Compare</div>
            <div className="text-[10px] text-text-secondary truncate">Run synced lap sessions and compare performance.</div>
          </div>
          {running && (
            <span className="rounded border border-bull/30 bg-bull/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-bull">
              Live
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-text-secondary transition-colors hover:bg-border-subtle hover:text-text-primary cursor-pointer"
            aria-label="Close bot compare panel"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto styling-scrollbar p-4">
        <div className="flex flex-col gap-4">
          {panelError && (
            <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {panelError}
            </div>
          )}

          <section className="rounded-xl border border-border-subtle/80 bg-bg-elevated/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                Step 1 · Select Bots
              </div>
              <span className="rounded border border-border-subtle bg-bg-terminal/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                {selectedBotIds.length} selected
              </span>
            </div>

            <div ref={selectorRef} className="relative">
              <button
                type="button"
                disabled={running || loadingBots}
                onClick={() => setSelectorOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-terminal/70 px-3 py-2 text-left transition-colors hover:border-text-secondary/35 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.09em] text-text-secondary">
                    {loadingBots ? 'Loading bots...' : 'Multi-select dropdown'}
                  </div>
                  <div className="truncate text-sm font-semibold text-text-primary">{selectedBotsSummary}</div>
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-text-secondary transition-transform ${selectorOpen ? 'rotate-180' : 'rotate-0'}`}
                />
              </button>

              {selectorOpen && !running && (
                <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated shadow-[0_14px_32px_rgba(8,12,20,0.55)]">
                  <div className="border-b border-border-subtle/80 p-2">
                    <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-terminal/80 px-2.5 py-2">
                      <Search size={13} className="text-text-secondary" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name or id"
                        className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-secondary outline-none"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.08em]">
                      <span className="text-text-secondary">{visibleBots.length} matching</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={selectAllVisibleBots}
                          className="text-accent transition-colors hover:text-text-primary cursor-pointer"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={clearSelectedBots}
                          className="text-text-secondary transition-colors hover:text-text-primary cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto styling-scrollbar p-1.5">
                    {loadingBots ? (
                      <div className="px-2 py-2 text-xs italic text-text-secondary">Loading bots...</div>
                    ) : visibleBots.length === 0 ? (
                      <div className="px-2 py-2 text-xs italic text-text-secondary">No bots found for this query.</div>
                    ) : (
                      visibleBots.map((bot) => {
                        const selected = selectedSet.has(bot.id);
                        const active = bot.status.toLowerCase() === 'active';

                        return (
                          <button
                            type="button"
                            key={bot.id}
                            onClick={() => toggleSelected(bot.id)}
                            className={`mb-1 flex w-full items-start gap-2 rounded-md border px-2 py-2 text-left transition-colors cursor-pointer ${
                              selected
                                ? 'border-accent/45 bg-accent/12'
                                : 'border-transparent bg-bg-terminal/40 hover:border-border-subtle hover:bg-bg-terminal/70'
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                selected
                                  ? 'border-[#2962ff] bg-[#2962ff] text-white'
                                  : 'border-border-subtle text-transparent'
                              }`}
                            >
                              <Check size={12} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-text-primary">{bot.name}</span>
                              <span className="block truncate text-[10px] font-mono text-text-secondary">{bot.id}</span>
                            </span>
                            <span
                              className={`mt-0.5 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                                active
                                  ? 'border-bull/30 bg-bull/10 text-bull'
                                  : 'border-border-subtle bg-bg-terminal/70 text-text-secondary'
                              }`}
                            >
                              {active ? 'active' : bot.status}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {selectedBotIds.length === 0 ? (
                <span className="text-[11px] text-text-secondary">No bots selected yet.</span>
              ) : (
                selectedBotIds.map((botId) => {
                  const bot = bots.find((entry) => entry.id === botId);
                  return (
                    <button
                      type="button"
                      key={botId}
                      onClick={() => toggleSelected(botId)}
                      disabled={running}
                      className="inline-flex max-w-full items-center gap-1 rounded-md border border-accent/30 bg-accent/12 px-2 py-1 text-[11px] font-semibold text-text-primary disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                    >
                      <Bot size={11} className="shrink-0 text-accent" />
                      <span className="truncate">{bot?.name ?? botId}</span>
                      {!running && <X size={11} className="shrink-0 text-text-secondary" />}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border-subtle/80 bg-bg-elevated/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                Step 2 · Lap Controls
              </div>
              <button
                type="button"
                onClick={() => void syncActiveLapsForSelection(selectedBotIds)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-accent transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw size={11} />
                Sync
              </button>
            </div>

            <div className="rounded-lg border border-border-subtle/70 bg-bg-terminal/50 px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                  <Timer size={13} className="text-accent" />
                  Lap Timer
                </div>
                <div className={`text-base font-mono font-bold ${running ? 'text-bull' : 'text-text-primary'}`}>
                  {lapTimerLabel}
                </div>
              </div>
              <div className="mt-1 text-[10px] text-text-secondary">
                {running
                  ? 'Live polling every 3 seconds'
                  : hasLapSnapshot
                    ? 'Showing the last lap snapshot'
                    : 'Start a lap to collect comparable KPI'}
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                onClick={handleStart}
                disabled={running || actionLoading || selectedBotIds.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-bull/70 bg-bull/16 py-2.5 text-xs font-semibold uppercase tracking-[0.07em] text-bull transition-colors hover:bg-bull/24 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Play size={13} />
                Start
              </button>
              <button
                onClick={handleStop}
                disabled={!running || actionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-bear/70 bg-bear/16 py-2.5 text-xs font-semibold uppercase tracking-[0.07em] text-bear transition-colors hover:bg-bear/24 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Square size={13} />
                Stop
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-text-secondary font-mono">
              <span>{startDisabledReason ? `Start: ${startDisabledReason}` : 'Start: ready'}</span>
              <span>{stopDisabledReason ? `Stop: ${stopDisabledReason}` : 'Stop: ready'}</span>
            </div>

            {actionLoading && (
              <div className="mt-2 rounded-lg border border-border-subtle/60 bg-bg-terminal/50 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.08em] text-text-secondary">
                {actionPhase === 'starting' ? 'Starting lap session...' : 'Stopping lap session...'}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border-subtle/80 bg-bg-elevated/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Compared Bots KPI</div>
              <span className="text-[10px] text-text-secondary font-mono">
                {running ? 'Live lap polling' : hasLapSnapshot ? 'Last lap snapshot' : 'Waiting'}
              </span>
            </div>

            {selectedBotIds.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-subtle bg-bg-terminal/40 px-3 py-5 text-center text-xs text-text-secondary">
                Select bots in Step 1, then start a lap to compare KPI side-by-side.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedBotIds.map((botId) => {
                  const bot = bots.find((b) => b.id === botId);
                  const runtime = runtimeByBot[botId];
                  const kpi = runtime?.kpi;
                  const pf = runtime?.portfolio;

                  return (
                    <div key={botId} className="rounded-xl border border-border-subtle/60 bg-bg-terminal/45 p-3">
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-bold uppercase tracking-[0.11em] text-text-primary">
                            {bot?.name ?? botId}
                          </div>
                          <div className="truncate text-[10px] font-mono text-text-secondary">{botId}</div>
                        </div>
                        <span
                          className={`rounded border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                            running
                              ? 'border-bull/30 bg-bull/10 text-bull'
                              : runtime?.sessionId
                                ? 'border-accent/30 bg-accent/10 text-accent'
                                : 'border-border-subtle bg-bg-elevated text-text-secondary'
                          }`}
                        >
                          {running ? 'Live Lap' : runtime?.sessionId ? 'Lap Done' : 'Waiting'}
                        </span>
                      </div>

                      {runtime?.error && (
                        <div className="mb-2 rounded border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-400">
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
                        <div className="mt-2 text-[10px] text-text-secondary font-mono truncate">
                          session: {runtime.sessionId}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle bg-bg-elevated/70 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.09em] text-text-secondary">API Source</div>
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${apiConnected === false ? 'bg-bear' : apiConnected ? 'bg-bull' : 'bg-text-secondary'}`} />
          <div className="text-[10px] font-mono text-accent">
            Admin API {apiConnected === false ? '(disconnected)' : apiConnected ? '(connected)' : '(unknown)'}
          </div>
        </div>
      </div>
    </div>
  );
}
