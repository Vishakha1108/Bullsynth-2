
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "./Navbar";
import { fetchBotPortfolio, fetchBotTrades, fetchBots, depositFunds, type BotPortfolio, type BotTrade, type Bot } from "../services/api";
import { ArrowLeft, Wallet, Activity, Clock, DollarSign } from "lucide-react";

export default function BotDetails() {
  const { id } = useParams<{ id: string }>();
  const [bot, setBot] = useState<Bot | null>(null);
  const [portfolio, setPortfolio] = useState<BotPortfolio | null>(null);
  const [trades, setTrades] = useState<BotTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  const handleDeposit = async () => {
    if (!id || !depositAmount) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepositError("Enter a valid positive amount");
      return;
    }
    setDepositing(true);
    setDepositError(null);
    try {
      await depositFunds(id, amount);
      setDepositAmount("");
    } catch (err: any) {
      setDepositError(err.message);
    } finally {
      setDepositing(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        // We lack a single bot fetch, so we find it in the list
        const bots = await fetchBots();
        const found = bots.find(b => b.id === id);
        if (found) setBot(found);

        const [pf, tr] = await Promise.all([
          fetchBotPortfolio(id),
          fetchBotTrades(id)
        ]);
        setPortfolio(pf);
        setTrades(tr);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    
    // Auto refresh every 3 seconds
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [id]);

  return (
    <div className="h-screen w-full dash-bg text-text-primary flex flex-col overflow-hidden font-sans">
      <Navbar />

      <main className="flex-1 overflow-y-auto p-8 flex justify-center">
        <div className="w-full max-w-5xl flex flex-col gap-6">
          <Link to="/admin/dashboard" className="text-text-secondary hover:text-accent flex items-center gap-2 mb-2 w-fit">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>

          {loading && !bot ? (
            <div className="text-center py-20 text-text-muted">Loading bot details...</div>
          ) : !bot ? (
            <div className="text-center py-20 text-red-500">Bot not found</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-text-primary flex items-center gap-3">
                    <Activity className="text-accent" size={28} />
                    {bot.name}
                  </h1>
                  <p className="text-text-secondary mt-1 text-sm font-mono">ID: {bot.id}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${bot.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                  <span className={`w-2 h-2 rounded-full ${bot.status === "active" ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></span>
                  {bot.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Portfolio Card */}
                <div className="dash-card p-6 flex flex-col gap-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-border-subtle pb-3">
                    <Wallet size={20} className="text-text-secondary" />
                    Portfolio & Holdings
                  </h2>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between py-2 border-b border-border-subtle/50">
                      <span className="text-text-secondary">Cash Balance</span>
                      <span className="font-mono text-lg text-accent">${portfolio?.cash_balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border-subtle/50">
                      <span className="text-text-secondary">Total Capital</span>
                      <span className="font-mono text-sm text-text-secondary">
                        ${portfolio?.initial_capital?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) ?? "100,000.00"}
                      </span>
                    </div>

                    {/* Deposit Funds */}
                    <div className="flex gap-2 items-center mt-2">
                      <DollarSign size={16} className="text-text-secondary" />
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="Amount to deposit"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="flex-1 bg-bg-terminal border border-border-subtle rounded px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
                      />
                      <button
                        onClick={handleDeposit}
                        disabled={depositing || !depositAmount}
                        className="px-4 py-2 rounded text-sm font-semibold bg-accent text-white hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        {depositing ? "Depositing..." : "Deposit"}
                      </button>
                    </div>
                    {depositError && (
                      <p className="text-xs text-red-500 mt-1">{depositError}</p>
                    )}

                    <div className="mt-2">
                      <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Active Positions</span>
                      {portfolio?.positions.length === 0 ? (
                        <p className="text-sm text-text-muted mt-2 italic">No active positions</p>
                      ) : (
                        <div className="mt-3 flex flex-col gap-2">
                          {portfolio?.positions.map(p => (
                            <div key={p.symbol} className="flex justify-between items-center bg-bg-secondary/30 p-2 rounded border border-border-subtle">
                              <span className="font-semibold">{p.symbol}</span>
                              <span className="font-mono text-sm">{p.qty > 0 ? "+" : ""}{p.qty.toFixed(4)} Units</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trade History Card */}
                <div className="dash-card flex flex-col overflow-hidden max-h-[500px]">
                  <div className="p-6 border-b border-border-subtle flex items-center gap-2">
                    <Clock size={20} className="text-text-secondary" />
                    <h2 className="text-lg font-semibold">Recent Trades</h2>
                  </div>
                  <div className="overflow-y-auto p-0 flex-1 styling-scrollbar">
                    {trades.length === 0 ? (
                      <p className="p-6 text-sm text-center text-text-muted italic">No trades executed yet.</p>
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-bg-secondary/20 text-text-secondary text-[10px] uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="px-4 py-3 font-semibold w-16">Side</th>
                            <th className="px-4 py-3 font-semibold">Symbol</th>
                            <th className="px-4 py-3 font-semibold">Qty</th>
                            <th className="px-4 py-3 font-semibold">Price</th>
                            <th className="px-4 py-3 font-semibold">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {trades.map(t => (
                            <tr key={t.id} className="hover:bg-bg-secondary/20 transition-colors">
                              <td className="px-4 py-3">
                                <span className={`text-xs font-bold ${t.side.toUpperCase() === "BUY" ? "text-green-500" : "text-red-500"}`}>
                                  {t.side.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold">{t.symbol}</td>
                              <td className="px-4 py-3 font-mono">{t.qty.toFixed(4)}</td>
                              <td className="px-4 py-3 font-mono">${t.price.toFixed(2)}</td>
                              <td className="px-4 py-3 text-text-secondary text-xs">
                                {new Date(t.timestamp).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

