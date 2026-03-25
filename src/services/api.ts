const API_BASE = 'http://localhost:8000';

export interface Ticker {
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    volume: number;
    category: string;
}

export async function fetchTickers(): Promise<Ticker[]> {
    try {
        const res = await fetch(`${API_BASE}/api/tickers`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('Failed to fetch tickers:', err);
        // Return fallback data if API is unreachable
        return [
            { symbol: 'SYNTH/USD', name: 'Synthetic Asset', price: 100.00, change24h: 1.85, volume: 12450, category: 'Synthetic' },
            { symbol: 'BTC/USD', name: 'Bitcoin', price: 67432.50, change24h: 2.14, volume: 34200, category: 'Crypto' },
            { symbol: 'ETH/USD', name: 'Ethereum', price: 3521.80, change24h: -0.72, volume: 28100, category: 'Crypto' },
            { symbol: 'SOL/USD', name: 'Solana', price: 142.35, change24h: 4.21, volume: 19800, category: 'Crypto' },
            { symbol: 'AAPL', name: 'Apple Inc.', price: 178.72, change24h: 0.45, volume: 52300, category: 'Stocks' },
            { symbol: 'META', name: 'Meta Platforms', price: 505.35, change24h: 1.23, volume: 18700, category: 'Stocks' },
            { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.42, change24h: -2.15, volume: 31200, category: 'Stocks' },
            { symbol: 'NVDA', name: 'NVIDIA', price: 875.30, change24h: 3.42, volume: 45600, category: 'Stocks' },
        ];
    }
}
