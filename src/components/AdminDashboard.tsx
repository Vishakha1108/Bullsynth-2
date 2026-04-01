import { useEffect, useState } from 'react';
import { Navbar } from './Navbar';
import { fetchBots, createBot, type Bot } from '../services/api';
import { Check, Copy, Plus, Server, Cpu, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [newBotName, setNewBotName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const data = await fetchBots();
      setBots(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load bots');
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotName.trim()) return;
    
    setCreating(true);
    setError('');
    try {
      const bot = await createBot(newBotName);
      setBots([bot, ...bots]);
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

  return (
    <div className="h-screen w-full dash-bg text-text-primary flex flex-col overflow-hidden font-sans selection:bg-accent/20 selection:text-text-primary">
      <Navbar />
      
      <main className="flex-1 overflow-y-auto p-8 flex justify-center">
        <div className="w-full max-w-5xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-text-primary flex items-center gap-3">
                <ShieldAlert className="text-accent" size={28} />
                Bots Dashboard
              </h1>
              <p className="text-text-secondary mt-1 text-sm">Manage autonomous bots and generate API tokens.</p>
            </div>
          </div>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">{error}</div>}

          {/* Top Panel - Create Bot */}
          <div className="dash-card p-6 flex flex-col gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Cpu size={20} className="text-text-secondary" />
              Provision New Bot
            </h2>
            <form onSubmit={handleCreateBot} className="flex gap-3">
              <input 
                type="text" 
                value={newBotName}
                onChange={e => setNewBotName(e.target.value)}
                placeholder="Enter bot name (e.g., Alpha-01)"
                className="flex-1 bg-bg-primary border border-border-subtle rounded px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/40 placeholder:text-text-muted transition-colors"
                disabled={creating}
                autoComplete="off"
              />
              <button 
                type="submit" 
                disabled={creating || !newBotName.trim()}
                className="dash-btn px-5 py-2 font-semibold text-sm rounded flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                {creating ? 'Provisioning...' : 'Generate API Key'}
              </button>
            </form>
          </div>

          {/* Bot List Table */}
          <div className="dash-card flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border-subtle bg-bg-secondary/40 flex items-center gap-2">
              <Server size={18} className="text-text-secondary" />
              <h2 className="font-semibold text-sm">Active Bot Instances</h2>
            </div>
            
            <div className="overflow-x-hidden">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-bg-secondary/20 text-text-secondary text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold w-[28%]">Bot ID</th>
                    <th className="px-6 py-4 font-semibold w-[12%]">Bot Name</th>
                    <th className="px-6 py-4 font-semibold w-[12%]">Status</th>
                    <th className="px-6 py-4 font-semibold w-[33%]">API Key</th>
                    <th className="px-6 py-4 font-semibold w-[15%]">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {bots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-text-muted italic">
                        No bots provisioned yet.
                      </td>
                    </tr>
                  ) : (
                    bots.map((bot) => (
                      <tr key={bot.id} className="hover:bg-bg-secondary/20 transition-colors">
                        <td className="px-6 py-4">
                          <code className="block max-w-full truncate bg-bg-primary px-2 py-1 rounded text-xs text-text-secondary border border-border-subtle font-mono">
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
                            bot.status === 'active' 
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${bot.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            {bot.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 group">
                            <code className="block min-w-0 flex-1 truncate bg-bg-primary px-2 py-1 rounded text-xs text-text-primary border border-border-subtle font-mono select-all">
                              {bot.api_key}
                            </code>
                            <button 
                              onClick={() => handleCopy(bot.api_key)}
                              className="p-1.5 rounded bg-bg-primary border border-border-subtle text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
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
          </div>

        </div>
      </main>
    </div>
  );
}
