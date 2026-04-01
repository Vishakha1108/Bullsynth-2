/**
 * Portfolio Engine
 * Calculates holdings, PnL, and portfolio metrics dynamically from order history
 */

export interface OrderRecord {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    timestamp: number;
}

export interface Holding {
    symbol: string;
    totalBuyQty: number;
    totalSellQty: number;
    netQty: number;
    avgBuyPrice: number;
    currentPrice: number;
    investment: number;
    marketValue: number;
    realizedPnL: number;
    unrealizedPnL: number;
    totalPnL: number;
    returnPercent: number;
    dailyPnL: number;
    minPrice: number;
    maxPrice: number;
}

export interface PortfolioMetrics {
    holdings: Holding[];
    totalInvestment: number;
    currentValue: number;
    cash: number;
    totalValue: number;
    totalPnL: number;
    totalUnrealizedPnL: number;
    totalRealizedPnL: number;
    returnPercent: number;
    dailyPnL: number;
    holdingCount: number;
}

/**
 * Calculate holdings from order history
 */
export function calculateHoldings(
    orders: OrderRecord[],
    currentPrices: Record<string, number>,
    previousPrices: Record<string, number> = {}
): PortfolioMetrics {
    const holdingsMap = new Map<string, Holding>();

    // Process each order
    orders.forEach((order) => {
        if (!holdingsMap.has(order.symbol)) {
            holdingsMap.set(order.symbol, {
                symbol: order.symbol,
                totalBuyQty: 0,
                totalSellQty: 0,
                netQty: 0,
                avgBuyPrice: 0,
                currentPrice: currentPrices[order.symbol] || 0,
                investment: 0,
                marketValue: 0,
                realizedPnL: 0,
                unrealizedPnL: 0,
                totalPnL: 0,
                returnPercent: 0,
                dailyPnL: 0,
                minPrice: Infinity,
                maxPrice: -Infinity,
            });
        }

        const holding = holdingsMap.get(order.symbol)!;

        if (order.side === 'BUY') {
            holding.totalBuyQty += order.quantity;
            holding.investment += order.quantity * order.price;
            holding.minPrice = Math.min(holding.minPrice, order.price);
            holding.maxPrice = Math.max(holding.maxPrice, order.price);
        } else {
            holding.totalSellQty += order.quantity;
            holding.realizedPnL += order.quantity * (order.price - holding.avgBuyPrice);
        }
    });

    // Calculate metrics for each holding
    let totalInvestment = 0;
    let currentValue = 0;
    let totalRealizedPnL = 0;
    let totalUnrealizedPnL = 0;
    let totalDailyPnL = 0;

    holdingsMap.forEach((holding) => {
        // Calculate average buy price (weighted average)
        if (holding.totalBuyQty > 0) {
            holding.avgBuyPrice = holding.investment / holding.totalBuyQty;
        }

        // Calculate net quantity
        holding.netQty = holding.totalBuyQty - holding.totalSellQty;

        // Update current price
        holding.currentPrice = currentPrices[holding.symbol] || holding.currentPrice;

        // Calculate unrealized PnL (for holdings we still own)
        if (holding.netQty > 0) {
            holding.unrealizedPnL = (holding.currentPrice - holding.avgBuyPrice) * holding.netQty;
        }

        // Market value
        holding.marketValue = holding.currentPrice * holding.netQty;

        // Total PnL
        holding.totalPnL = holding.unrealizedPnL + holding.realizedPnL;

        // Return percentage
        if (holding.investment > 0) {
            holding.returnPercent = (holding.totalPnL / holding.investment) * 100;
        }

        // Daily PnL based on price change
        const prevPrice = previousPrices[holding.symbol] || holding.currentPrice;
        holding.dailyPnL = (holding.currentPrice - prevPrice) * holding.netQty;

        // Only include active holdings (netQty > 0)
        if (holding.netQty > 0) {
            totalInvestment += holding.investment;
            currentValue += holding.marketValue;
            totalUnrealizedPnL += holding.unrealizedPnL;
            totalDailyPnL += holding.dailyPnL;
        }

        totalRealizedPnL += holding.realizedPnL;
    });

    // Filter out sold-out holdings
    const activeHoldings = Array.from(holdingsMap.values())
        .filter((h) => h.netQty > 0)
        .sort((a, b) => a.symbol.localeCompare(b.symbol));

    const totalPnL = totalUnrealizedPnL + totalRealizedPnL;
    let returnPercent = 0;
    if (totalInvestment > 0) {
        returnPercent = (totalPnL / totalInvestment) * 100;
    }

    return {
        holdings: activeHoldings,
        totalInvestment,
        currentValue,
        cash: 0, // Will be set by the store
        totalValue: currentValue,
        totalPnL,
        totalUnrealizedPnL,
        totalRealizedPnL,
        returnPercent,
        dailyPnL: totalDailyPnL,
        holdingCount: activeHoldings.length,
    };
}

/**
 * Calculate PnL for a specific holding
 */
export function calculateHoldingPnL(
    symbol: string,
    orders: OrderRecord[],
    currentPrice: number,
    previousPrice: number = currentPrice
): {
    totalBuyQty: number;
    totalSellQty: number;
    netQty: number;
    avgBuyPrice: number;
    unrealizedPnL: number;
    realizedPnL: number;
    totalPnL: number;
    returnPercent: number;
    dailyPnL: number;
} {
    const symbolOrders = orders.filter((o) => o.symbol === symbol);

    let totalBuyQty = 0;
    let totalSellQty = 0;
    let investment = 0;
    let realizedPnL = 0;
    let avgBuyPrice = 0;

    symbolOrders.forEach((order) => {
        if (order.side === 'BUY') {
            totalBuyQty += order.quantity;
            investment += order.quantity * order.price;
            avgBuyPrice = investment / totalBuyQty;
        } else {
            totalSellQty += order.quantity;
            realizedPnL += order.quantity * (order.price - avgBuyPrice);
        }
    });

    const netQty = totalBuyQty - totalSellQty;
    const unrealizedPnL = netQty > 0 ? (currentPrice - avgBuyPrice) * netQty : 0;
    const totalPnL = unrealizedPnL + realizedPnL;
    let returnPercent = 0;
    if (investment > 0) {
        returnPercent = (totalPnL / investment) * 100;
    }

    const dailyPnL = (currentPrice - previousPrice) * netQty;

    return {
        totalBuyQty,
        totalSellQty,
        netQty,
        avgBuyPrice,
        unrealizedPnL,
        realizedPnL,
        totalPnL,
        returnPercent,
        dailyPnL,
    };
}

/**
 * Get order history for a specific stock
 */
export function getStockOrderHistory(symbol: string, orders: OrderRecord[]): OrderRecord[] {
    return orders
        .filter((o) => o.symbol === symbol)
        .sort((a, b) => b.timestamp - a.timestamp);
}
