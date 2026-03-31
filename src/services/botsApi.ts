export type Position = 'LONG' | 'SHORT' | 'FLAT';
export type Regime = 'trending' | 'random' | 'mean_reverting';

export interface AlphaStatus {
  equity: number;
  pnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  position: Position;
  trades: number;
  winRate: number;
  sharpe: number;
  maxDrawdown: number;
  halted: boolean;
  regime?: Regime;
}

export interface MarketMakerStatus {
  equity: number;
  pnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  position: Position;
  holdings: number;
  totalFills: number;
  bidFills: number;
  askFills: number;
  fillBalance: number;
  maxDrawdown: number;
  halted: boolean;
}

export interface BotHealth {
  status: string;
  bot: string;
  port: number;
}

export interface BotApiConfig {
  alphaBaseUrl: string;
  mmBaseUrl: string;
}

export const BOT_API_CONFIG: BotApiConfig = {
  alphaBaseUrl: import.meta.env.VITE_ALPHA_API_BASE || 'http://localhost:3001',
  mmBaseUrl: import.meta.env.VITE_MM_API_BASE || 'http://localhost:3002',
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url} -> ${res.status}`);
  }
  return (await res.json()) as T;
}

export function getAlphaStatus(baseUrl = BOT_API_CONFIG.alphaBaseUrl): Promise<AlphaStatus> {
  return fetchJson<AlphaStatus>(`${baseUrl}/bot/status`);
}

export function getMarketMakerStatus(baseUrl = BOT_API_CONFIG.mmBaseUrl): Promise<MarketMakerStatus> {
  return fetchJson<MarketMakerStatus>(`${baseUrl}/bot/status`);
}

export function getAlphaHealth(baseUrl = BOT_API_CONFIG.alphaBaseUrl): Promise<BotHealth> {
  return fetchJson<BotHealth>(`${baseUrl}/health`);
}

export function getMarketMakerHealth(baseUrl = BOT_API_CONFIG.mmBaseUrl): Promise<BotHealth> {
  return fetchJson<BotHealth>(`${baseUrl}/health`);
}