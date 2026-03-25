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
            { symbol: 'AAPL', name: 'Apple Inc.', price: 185.00, change24h: 0.45, volume: 52300, category: 'Tech' },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 175.00, change24h: 0.62, volume: 27400, category: 'Tech' },
            { symbol: 'MSFT', name: 'Microsoft Corp.', price: 420.00, change24h: 0.31, volume: 29800, category: 'Tech' },
            { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 185.00, change24h: -0.21, volume: 19600, category: 'Tech' },
            { symbol: 'TSLA', name: 'Tesla Inc.', price: 250.00, change24h: -2.15, volume: 31200, category: 'Tech' },
            { symbol: 'META', name: 'Meta Platforms', price: 500.00, change24h: 1.23, volume: 18700, category: 'Tech' },
            { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 880.00, change24h: 3.42, volume: 45600, category: 'Tech' },
            { symbol: 'JPM', name: 'JPMorgan Chase', price: 195.00, change24h: 0.17, volume: 14500, category: 'Financial' },
            { symbol: 'BTC', name: 'Bitcoin', price: 50000.00, change24h: 2.14, volume: 34200, category: 'Crypto' },
            { symbol: 'ETH', name: 'Ethereum', price: 3500.00, change24h: -0.72, volume: 28100, category: 'Crypto' },
        ];
    }
}
