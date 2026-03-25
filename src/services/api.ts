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
        return [
            { symbol: 'BTC', name: 'Bitcoin', price: 65000.00, change24h: 2.14, volume: 34200, category: 'Crypto' },
            { symbol: 'ETH', name: 'Ethereum', price: 3500.00, change24h: -0.72, volume: 28100, category: 'Crypto' },
            { symbol: 'AAPL', name: 'Apple Inc.', price: 185.00, change24h: 0.45, volume: 52300, category: 'Stocks' },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 175.00, change24h: 1.23, volume: 18700, category: 'Stocks' },
            { symbol: 'MSFT', name: 'Microsoft Corp.', price: 420.00, change24h: -0.15, volume: 31200, category: 'Stocks' },
            { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 185.00, change24h: 0.85, volume: 45600, category: 'Stocks' },
            { symbol: 'TSLA', name: 'Tesla Inc.', price: 250.00, change24h: -2.15, volume: 31200, category: 'Stocks' },
            { symbol: 'META', name: 'Meta Platforms', price: 500.00, change24h: 3.42, volume: 18700, category: 'Stocks' },
            { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 880.00, change24h: 4.56, volume: 45600, category: 'Stocks' },
            { symbol: 'JPM', name: 'JPMorgan Chase', price: 195.00, change24h: 0.25, volume: 21200, category: 'Stocks' },
        ];

    }
}
