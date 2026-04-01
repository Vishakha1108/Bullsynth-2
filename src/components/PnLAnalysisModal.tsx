import { useMemo, useState, useEffect, useCallback } from 'react';
import { X, Download, RefreshCw, Wand2, LoaderCircle } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../store/ThemeContext';
import { fetchBotPnL } from '../services/api';
import type { BotPnLData, PnLDataPoint } from '../services/api';

interface PnLAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
}

export default function PnLAnalysisModal({ isOpen, onClose, botId }: PnLAnalysisModalProps) {
  const [apiPrompt, setApiPrompt] = useState('');
  const [generatedEndpoint, setGeneratedEndpoint] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pnlData, setPnlData] = useState<BotPnLData | null>(null);
  const [period, setPeriod] = useState('1d');
  const { theme } = useTheme();

  const chartData = useMemo(() => {
    if (!pnlData?.history?.length) return [];

    // Recharts still benefits from deterministic sorting and deduped timestamps.
    return pnlData.history
      .map((point: PnLDataPoint) => ({
        ts: Math.floor(point.timestamp),
        pnl: point.pnl,
      }))
      .sort((a, b) => a.ts - b.ts)
      .reduce((acc, curr) => {
        if (acc.length === 0 || acc[acc.length - 1].ts !== curr.ts) {
          acc.push(curr);
        }
        return acc;
      }, [] as Array<{ ts: number; pnl: number }>)
      .map((point) => ({
        ...point,
        label: new Date(point.ts * 1000).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));
  }, [pnlData]);

  // Fetch PnL data from backend
  const fetchPnLData = useCallback(async (selectedPeriod: string) => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchBotPnL(botId, selectedPeriod);
      setPnlData(data);
    } catch (err) {
      setError('Failed to load PnL data: ' + (err instanceof Error ? err.message : String(err)));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    if (isOpen && botId) {
      fetchPnLData(period);
    }
  }, [isOpen, botId, period, fetchPnLData]);

  const handleGenerateEndpoint = async () => {
    if (!apiPrompt.trim()) {
      alert('Please enter your API requirements');
      return;
    }

    setIsGenerating(true);
    try {
      // Simulate API call to generate endpoint
      // In real scenario, this would call an AI service or your backend
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const endpoint = `GET /api/bots/${botId}/pnl?period=${period}
Authorization: Bearer <YOUR_API_KEY>

Request Endpoint:
POST /api/analytics/pnl/${botId}/generate-endpoint

{
  "description": "${apiPrompt.replace(/"/g, '\\"')}",
  "period": "${period}"
}

Response:
{
  "endpoint": "/api/bots/${botId}/pnl",
  "method": "GET",
  "params": {
    "period": "1d|7d|30d"
  },
  "data": ${pnlData ? JSON.stringify({
    bot_id: pnlData.bot_id,
    current_pnl: pnlData.current_pnl,
    total_equity: pnlData.total_equity,
    history: "[ { timestamp: number, pnl: number, equity: number } ]"
  }, null, 2) : '{}'}
}`;

      setGeneratedEndpoint(endpoint);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadEndpoint = () => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(generatedEndpoint));
    element.setAttribute('download', `pnl-api-${botId}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Blur Background */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50 bg-bg-terminal text-text-primary border border-border-subtle rounded-2xl shadow-2xl styling-scrollbar">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-elevated">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <TrendingUpIcon size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">PnL Analysis</h2>
              <p className="text-xs text-text-secondary">Bot ID: {botId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-border-subtle rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoaderCircle size={24} className="text-accent animate-spin" />
            </div>
          ) : pnlData ? (
            <>
              {/* Period Selector */}
              <div className="flex gap-2">
                {(['1d', '7d', '30d'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                      period === p
                        ? 'bg-accent text-white'
                        : 'bg-bg-elevated border border-border-subtle text-text-secondary hover:border-accent'
                    }`}
                  >
                    {p === '1d' ? '24H' : p === '7d' ? '7D' : '30D'}
                  </button>
                ))}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-elevated/50 p-4 rounded-lg border border-border-subtle/50">
                  <p className="text-xs text-text-secondary uppercase font-bold mb-1">Current PnL</p>
                  <p className={`text-2xl font-bold font-mono ${pnlData.current_pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                    {pnlData.current_pnl >= 0 ? '+' : ''}${pnlData.current_pnl.toFixed(2)}
                  </p>
                </div>
                <div className="bg-bg-elevated/50 p-4 rounded-lg border border-border-subtle/50">
                  <p className="text-xs text-text-secondary uppercase font-bold mb-1">Total Equity</p>
                  <p className="text-2xl font-bold font-mono text-accent">${pnlData.total_equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Chart */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-text-secondary">PnL Timeline</p>
                  <button
                    onClick={() => fetchPnLData(period)}
                    className="p-1.5 hover:bg-bg-elevated rounded transition-colors"
                    title="Refresh data"
                  >
                    <RefreshCw size={16} className="text-text-secondary" />
                  </button>
                </div>
                <div className="w-full h-80 rounded-lg border border-border-subtle/50 bg-bg-elevated/30 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2a2e39' : '#d9dde5'} />
                      <XAxis
                        dataKey="label"
                        minTickGap={32}
                        tick={{ fill: theme === 'dark' ? '#8a91a3' : '#667085', fontSize: 11 }}
                        axisLine={{ stroke: theme === 'dark' ? '#2a2e39' : '#d9dde5' }}
                        tickLine={{ stroke: theme === 'dark' ? '#2a2e39' : '#d9dde5' }}
                      />
                      <YAxis
                        tickFormatter={(value: number) => `$${value.toFixed(0)}`}
                        width={70}
                        tick={{ fill: theme === 'dark' ? '#8a91a3' : '#667085', fontSize: 11 }}
                        axisLine={{ stroke: theme === 'dark' ? '#2a2e39' : '#d9dde5' }}
                        tickLine={{ stroke: theme === 'dark' ? '#2a2e39' : '#d9dde5' }}
                      />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'PnL']}
                        labelFormatter={(label) => `Time: ${label}`}
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#171b26' : '#ffffff',
                          border: `1px solid ${theme === 'dark' ? '#2a2e39' : '#d9dde5'}`,
                          borderRadius: '8px',
                          color: theme === 'dark' ? '#e5e7eb' : '#111827',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="pnl"
                        stroke="#2962ff"
                        fill="#2962ff"
                        fillOpacity={0.22}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : null}

          {/* API Endpoint Generator */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold text-text-secondary">Generate API Endpoint</p>

            {/* Prompt Input */}
            <textarea
              value={apiPrompt}
              onChange={(e) => setApiPrompt(e.target.value)}
              placeholder="Describe the API endpoint you need... (e.g., 'I need a PnL endpoint that returns hourly data for the last 7 days')"
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-xs font-mono text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent resize-none h-20"
            />

            {/* Generate Button */}
            <button
              onClick={handleGenerateEndpoint}
              disabled={isGenerating}
              className="w-full bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Wand2 size={16} />
              {isGenerating ? 'Generating...' : 'Generate Endpoint'}
            </button>

            {/* Generated Endpoint Display */}
            {generatedEndpoint && (
              <div className="flex flex-col gap-2">
                <div className="bg-bg-elevated/50 border border-border-subtle/50 rounded-lg p-3">
                  <pre className="text-xs font-mono text-text-primary overflow-x-auto whitespace-pre-wrap break-word max-h-40 overflow-y-auto">
                    {generatedEndpoint}
                  </pre>
                </div>
                <button
                  onClick={downloadEndpoint}
                  className="w-full bg-bg-elevated hover:bg-bg-elevated/80 border border-accent/50 text-accent font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download size={16} />
                  Download Endpoint
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Simple trending up icon
function TrendingUpIcon({ size, className }: { size: number; className: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="23 6 13.46 15.46 8 9.92 1 17"></polyline>
      <polyline points="23 6 23 16 13 16"></polyline>
    </svg>
  );
}
