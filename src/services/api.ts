const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const REQUEST_TIMEOUT_MS = 12000;

async function requestJson<T>(
    url: string,
    init?: RequestInit,
    timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        return (await res.json()) as T;
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new Error(`Request timed out (${timeoutMs}ms)`);
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

export interface Ticker {
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    volume: number;
    category: string;
}

export interface Bot {
    id: string;
    name: string;
    api_key: string;
    status: string;
    created_at: string;
}

export async function fetchTickers(): Promise<Ticker[]> {
    const res = await fetch(`${API_BASE}/api/tickers`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export async function fetchBots(): Promise<Bot[]> {
    return await requestJson<Bot[]>(`${API_BASE}/api/bots`);
}

export async function fetchBot(botId: string): Promise<Bot> {
    return await requestJson<Bot>(`${API_BASE}/api/bots/${botId}`);
}

export async function createBot(name: string): Promise<Bot> {
    const res = await fetch(`${API_BASE}/api/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export interface BotTrade {
    id: string;
    bot_id: string;
    session_id?: string | null;
    symbol: string;
    side: string;
    price: number;
    qty: number;
    timestamp: string;
}

export interface BotPortfolio {
    cash_balance: number;
    initial_capital: number;
    positions: {
        symbol: string;
        qty: number;
        avg_entry_price: number;
    }[];
}

export interface DepositResponse {
    bot_id: string;
    amount: number;
    new_cash_balance: number;
}

export async function fetchBotTrades(botId: string, sessionId?: string): Promise<BotTrade[]> {
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
    return await requestJson<BotTrade[]>(`${API_BASE}/api/bots/${botId}/trades${query}`);
}

export async function fetchBotPortfolio(botId: string): Promise<BotPortfolio> {
    return await requestJson<BotPortfolio>(`${API_BASE}/api/bots/${botId}/portfolio`);
}

export async function depositFunds(botId: string, amount: number): Promise<DepositResponse> {
    const res = await fetch(`${API_BASE}/api/bots/${botId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return await res.json();
}

export interface PnLDataPoint {
    timestamp: number;
    pnl: number;
    equity: number;
}

export interface BotPnLData {
    bot_id: string;
    current_pnl: number;
    total_equity: number;
    history: PnLDataPoint[];
}

export async function fetchBotPnL(botId: string, period: string = '1d'): Promise<BotPnLData> {
    const res = await fetch(`${API_BASE}/api/bots/${botId}/pnl?period=${period}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export interface BotKPIResponse {
    bot_id: string;
    session_id?: string;
    total_trades: number;
    win_rate: number;
    realized_pnl: number;
    sharpe_ratio: number;
    max_drawdown: number;
}

export interface BotSession {
    id: string;
    bot_id: string;
    session_type: string;
    status: string;
    start_time: string;
    end_time: string | null;
    starting_equity: number;
    max_equity: number;
    min_equity: number;
    realized_pnl: number;
}

export async function fetchBotKPI(botId: string, sessionId?: string): Promise<BotKPIResponse> {
    let url = `${API_BASE}/api/bots/${botId}/kpi`;
    if (sessionId) {
        url += `?session_id=${sessionId}`;
    }
    return await requestJson<BotKPIResponse>(url);
}

export async function fetchBotSessions(botId: string): Promise<BotSession[]> {
    return await requestJson<BotSession[]>(`${API_BASE}/api/bots/${botId}/sessions`);
}

export async function startLapSession(botId: string): Promise<BotSession> {
    return await requestJson<BotSession>(`${API_BASE}/api/bots/${botId}/sessions/start`, {
        method: 'POST',
    });
}

export async function stopLapSession(botId: string): Promise<BotSession> {
    return await requestJson<BotSession>(`${API_BASE}/api/bots/${botId}/sessions/stop`, {
        method: 'POST',
    });
}

