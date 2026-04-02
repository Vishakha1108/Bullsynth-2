import { useEffect, useMemo, useState } from 'react';
import { Navbar } from './Navbar';
import { fetchBots, createBot, type Bot } from '../services/api';
import { Check, Copy, Plus, Server, Cpu, ShieldAlert, Search, RefreshCw, Bot as BotIcon, Activity, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function AdminDashboard() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [newBotName, setNewBotName] = useState('');
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    void loadBots();
  }, []);

  const loadBots = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    }

    try {
      setError('');
      const data = await fetchBots();
      setBots(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load bots');
    } finally {
      if (isManualRefresh) {
        setRefreshing(false);
      }
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotName.trim()) return;
    
    setCreating(true);
    setError('');
    try {
      const bot = await createBot(newBotName);
      setBots((prev) => [bot, ...prev]);
      setNewBotName('');
    } catch (err) {
      console.error(err);
      setError('Failed to create bot');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(apiKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredBots = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bots.filter((bot) => {
      const statusValue = bot.status.toLowerCase();
      const statusMatches =
        statusFilter === 'all' ||
        (statusFilter === 'active' && statusValue === 'active') ||
        (statusFilter === 'inactive' && statusValue !== 'active');

      if (!statusMatches) return false;
      if (!q) return true;

      return (
        bot.name.toLowerCase().includes(q) ||
        bot.id.toLowerCase().includes(q) ||
        bot.api_key.toLowerCase().includes(q)
      );
    });
  }, [bots, query, statusFilter]);

  const stats = useMemo(() => {
    const total = bots.length;
    const active = bots.filter((bot) => bot.status.toLowerCase() === 'active').length;
    const inactive = total - active;

    const todayIso = new Date().toISOString().slice(0, 10);
    const createdToday = bots.filter((bot) => bot.created_at.slice(0, 10) === todayIso).length;

    return { total, active, inactive, createdToday };
  }, [bots]);

  const handleRefresh = async () => {
    await loadBots(true);
  };

  return (
    <div className="h-screen w-full dash-root text-text-primary flex flex-col overflow-hidden font-sans selection:bg-accent/20 selection:text-text-primary">
      <Navbar />

      <main className="relative flex-1 overflow-y-auto styling-scrollbar">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 right-[20%] h-72 w-72 rounded-full bg-[#6366f122] blur-[120px]" />
          <div className="absolute bottom-10 left-[8%] h-80 w-80 rounded-full bg-[#2563eb1d] blur-[130px]" />
        </div>

        <div className="relative mx-auto flex w-full max-w-[1760px] flex-col gap-5 px-4 pb-5 pt-4 sm:px-6 lg:px-8">
          <section className="dash-card relative overflow-hidden border-white/12 bg-white/4.5 px-5 py-5 sm:px-6">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-[#6366f1aa] to-transparent" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#6366f14d] bg-[#6366f117] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a5b4fc]">
                  <Sparkles size={12} />
                  Automation Control Layer
                </span>
                <h1 className="dash-hero-title mt-3 text-2xl font-black tracking-tight sm:text-3xl">Bots Command Center</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
                  Provision bots, manage credentials, and monitor operational status in a unified and production-ready workspace.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => void handleRefresh()}
                    disabled={refreshing}
                    className="tv-glass-btn px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Refreshing' : 'Refresh Bots'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="dash-mini-stat rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-text-secondary">Total Bots</div>
                  <div className="mt-1 text-lg font-mono font-bold text-text-primary">{stats.total}</div>
                </div>
                <div className="dash-mini-stat rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-text-secondary">Active</div>
                  <div className="mt-1 text-lg font-mono font-bold text-bull">{stats.active}</div>
                </div>
                <div className="dash-mini-stat rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-text-secondary">Inactive</div>
                  <div className="mt-1 text-lg font-mono font-bold text-bear">{stats.inactive}</div>
                </div>
                <div className="dash-mini-stat rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-text-secondary">Created Today</div>
                  <div className="mt-1 text-lg font-mono font-bold text-[#a5b4fc]">{stats.createdToday}</div>
                </div>
              </div>
            </div>
          </section>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">{error}</div>}

          <section className="dash-card border-white/12 bg-white/[0.035] p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <Cpu size={18} className="text-[#a5b4fc]" />
                Provision New Bot
              </h2>
              <span className="dash-pill-muted rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-mono text-text-secondary">
                {bots.length} provisioned
              </span>
            </div>

            <form onSubmit={handleCreateBot} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newBotName}
                onChange={(e) => setNewBotName(e.target.value)}
                placeholder="Enter bot name (e.g., Alpha-01)"
                className="dash-admin-input flex-1 rounded-lg border border-white/14 bg-white/[0.03] px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary backdrop-blur-md focus:outline-none focus:border-accent/45"
                disabled={creating}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={creating || !newBotName.trim()}
                className="tv-glass-btn tv-glass-btn-accent px-5 py-2.5 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                {creating ? 'Provisioning...' : 'Generate API Key'}
              </button>
            </form>
          </section>

          <section className="dash-card overflow-hidden border-white/12 bg-white/[0.035]">
            <div className="flex flex-col gap-3 border-b border-white/8 bg-linear-to-r from-[#6366f117] via-transparent to-transparent px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Server size={16} className="text-text-secondary" />
                  <h2 className="font-semibold text-sm uppercase tracking-[0.08em] text-text-secondary">Bot Instances</h2>
                </div>
                <span className="dash-pill-muted rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-mono text-text-secondary">
                  {filteredBots.length} shown
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <div className="dash-admin-search-wrap flex items-center gap-2 rounded-lg border border-white/14 bg-white/[0.03] px-3 py-2 backdrop-blur-md">
                  <Search size={14} className="text-text-secondary" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search bot by name, id, or API key"
                    className="dash-admin-search-input w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`tv-glass-btn px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] cursor-pointer ${statusFilter === 'all' ? 'tv-glass-btn-accent' : ''}`}
                  >
                    <BotIcon size={13} />
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={`tv-glass-btn px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] cursor-pointer ${statusFilter === 'active' ? 'tv-glass-btn-accent' : ''}`}
                  >
                    <Activity size={13} />
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('inactive')}
                    className={`tv-glass-btn px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] cursor-pointer ${statusFilter === 'inactive' ? 'tv-glass-btn-accent' : ''}`}
                  >
                    <ShieldAlert size={13} />
                    Inactive
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-hidden">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="dash-thead text-text-secondary text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold w-[28%] sticky top-0 z-20">Bot ID</th>
                    <th className="px-6 py-4 font-semibold w-[14%] sticky top-0 z-20">Bot Name</th>
                    <th className="px-6 py-4 font-semibold w-[11%] sticky top-0 z-20">Status</th>
                    <th className="px-6 py-4 font-semibold w-[31%] sticky top-0 z-20">API Key</th>
                    <th className="px-6 py-4 font-semibold w-[16%] sticky top-0 z-20">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-text-muted italic">
                        No bots found for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredBots.map((bot) => (
                      <tr key={bot.id} className="dash-table-row">
                        <td className="px-6 py-4">
                          <code className="dash-admin-code block max-w-full truncate bg-white/[0.03] px-2 py-1 rounded text-xs text-text-secondary border border-white/10 font-mono">
                            {bot.id}
                          </code>
                        </td>
                        <td className="px-6 py-4 font-medium text-text-primary">
                          <Link to={`/admin/dashboard/bot/${bot.id}`} className="hover:text-accent hover:underline flex items-center gap-2 transition-colors">
                            {bot.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${
                            bot.status.toLowerCase() === 'active'
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${bot.status.toLowerCase() === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            {bot.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 group">
                            <code className="dash-admin-code block min-w-0 flex-1 truncate bg-white/[0.03] px-2 py-1 rounded text-xs text-text-primary border border-white/10 font-mono select-all">
                              {bot.api_key}
                            </code>
                            <button 
                              onClick={() => handleCopy(bot.api_key)}
                              className="tv-glass-btn p-1.5 cursor-pointer"
                              title="Copy API Key"
                            >
                              {copiedKey === bot.api_key ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-secondary text-xs">
                          {new Date(bot.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
