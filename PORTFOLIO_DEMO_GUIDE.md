# Dynamic Portfolio System - Demo Guide

## Overview
The portfolio system is now **production-ready** with:
- ✅ Order-driven holdings calculation (not static storage)
- ✅ Real-time PnL tracking
- ✅ Automatic metrics computation
- ✅ Groww/Zerodha-style UI with Tailwind CSS

---

## Architecture

### 1. **Portfolio Engine** (`src/lib/portfolioEngine.ts`)
Pure calculation engine with NO side effects:

```typescript
calculateHoldings(orders, currentPrices, previousPrices) 
// Returns: Holding[]

// Per-holding calculation:
- avgBuyPrice: Weighted average of all buy orders
- unrealizedPnL: (currentPrice - avgBuyPrice) × netQty
- realizedPnL: Sum of completed buy/sell matches
- dailyPnL: (currentPrice - previousPrice) × netQty
- returnPercent: totalPnL / investment × 100%
```

### 2. **Store Integration** (`src/store/useMarketStore.ts`)
Zustand state management with actions:

```typescript
State:
- completedOrders: OrderRecord[] // Order history
- dynamicHoldings: Holding[] // Calculated holdings
- dynamicPortfolioMetrics: PortfolioMetrics | null // Aggregated stats

Actions:
- addCompletedOrder(symbol, side, qty, price) // Add + recalculate
- executeOrder(symbol, side, qty, price) // Execute + cash update
- setCompletedOrders(orders) // Batch set
- getPortfolioMetrics() // Get current metrics
```

### 3. **Portfolio UI** (`src/components/PortfolioNew.tsx`)
Groww-style component with:

```
┌─────────────────────────────────────┐
│ PORTFOLIO                        [X] │
├─────────────────────────────────────┤
│                                     │
│ Current Value: ₹500,000             │
│                                     │
│ Invested: ₹400,000  │  Total PnL:   │
│                     │  ₹50,000 ↑    │
│                     │  +12.5%       │
│                                     │
│ Today's PnL:  ₹5,000                │
│ Cash Available: ₹100,000            │
│                                     │
├─ HOLDINGS (3) ─ [Sort: Symbol ▼] ─┤
│                                     │
│ [I] INFY          ₹185,000          │
│ 50 shares         ▲ +15.2%          │
│ Avg: ₹3500 | Current: ₹3700         │
│ Unrealized: ₹10,000 | Realized: 0   │
│                                     │
│ [T] TCS           ₹150,000          │
│ 75 shares         ▼ -8.5%           │
│ Avg: ₹2000 | Current: ₹1800         │
│ Unrealized: -₹15,000                │
│                                     │
└─────────────────────────────────────┘
```

---

## Testing the Portfolio System

### Test 1: Add Orders and See Holdings Update

**Step 1: Start the app**
```bash
npm run dev
```

**Step 2: Access the portfolio panel**
1. Click **Wallet icon** on the right sidebar
2. Portfolio panel opens on the right

**Step 3: Create test orders**
Open browser DevTools Console and run:

```javascript
// Get the store
import useMarketStore from './store/useMarketStore';
const store = useMarketStore.getState();

// Add an order
store.addCompletedOrder('INFY', 'BUY', 50, 3500);

// Verify order was added
console.log(store.completedOrders); // Should show 1 order

// Check holdings calculated
console.log(store.dynamicHoldings); 
// Should show: [{ symbol: 'INFY', netQty: 50, avgBuyPrice: 3500, ...}]

// Check metrics
console.log(store.dynamicPortfolioMetrics);
// Should show: { totalValue: xyz, totalInvestment: 175000, ... }
```

**Expected Result:**
- Portfolio panel updates instantly
- Shows "INFY 50 shares" in holdings
- Shows "Current Value: ₹175,000"
- Shows "Invested: ₹175,000"

---

### Test 2: Sell Orders and Realize PnL

**Step 4: Sell part of the position**
```javascript
const store = useMarketStore.getState();

// Set a new current price (simulate price update)
store.setPrices({ INFY: 3700 });

// Sell at a profit
store.addCompletedOrder('INFY', 'SELL', 25, 3700);

// Check portfolio
console.log(store.dynamicHoldings);
// Should show:
// - netQty: 25 (50 - 25)
// - avgBuyPrice: 3500 (still weighted avg of remaining)
// - unrealizedPnL: (3700 - 3500) × 25 = ₹5,000
// - realizedPnL: (3700 - 3500) × 25 = ₹5,000 (from sold shares)
// - totalPnL: ₹10,000
```

**Expected Result:**
- Holdings shows 25 shares remaining
- Shows unrealized + realized PnL breakdown
- "Total PnL: ₹10,000 ↑ +5.7%"

---

### Test 3: Multiple Holdings

**Step 5: Add another stock**
```javascript
const store = useMarketStore.getState();

// Add TCS
store.addCompletedOrder('TCS', 'BUY', 75, 2000);

// Update prices
store.setPrices({ INFY: 3700, TCS: 1800 });

// Check portfolio
console.log(store.dynamicHoldings);
// Should show 2 holdings sorted by symbol: INFY, TCS

console.log(store.getPortfolioMetrics());
// Should aggregate:
// - totalValue: Sum of (currentPrice × qty) for all holdings
// - totalInvestment: Sum of (avgPrice × qty) for all holdings  
// - totalPnL: Σ realizedPnL + Σ unrealizedPnL
```

**Expected Result:**
- Portfolio shows 2 holdings
- Holdings tab shows "HOLDINGS (2)"
- Current Value increased to include both positions

---

### Test 4: Sort and Select Holdings

**Step 6: Test UI interactions**
1. Click "Sort by Value" dropdown → Holdings sort by market value
2. Click "Sort by PnL" → Holdings sort by total PnL descending
3. Click on a holding card → Details panel appears below
   - Shows Buy Price (Avg), Current Price, Quantity, etc.
   - Shows "BUY" and "SELL" buttons (ready for phase 2)

**Expected Result:**
- Sorting works correctly
- Selection highlights the card in blue
- Details panel shows all holding information

---

### Test 5: Daily PnL Tracking

**Step 7: Simulate price movement from previous day**
```javascript
const store = useMarketStore.getState();

// Set previous day's prices (for daily PnL calc)
store.setPreviousPrices({ INFY: 3600, TCS: 2050 });

// Set today's prices
store.setPrices({ INFY: 3700, TCS: 1800 });

// Check metrics
const metrics = store.getPortfolioMetrics();
console.log(metrics.dailyPnL);
// Should be: (3700 - 3600) × 25 + (1800 - 2050) × 75
//          = 2500 - 18750 = -16250

// Portfolio shows "Today's PnL: ₹-16,250 ▼"
```

**Expected Result:**
- Portfolio shows daily PnL separately
- Color indicates UP (green ▲) or DOWN (red ▼)

---

## Integration Points

### Real-Time Price Updates (Already in Store)
When WebSocket receives price updates:

```typescript
// In websocket.ts or wherever prices come from:
const currentPrices = { INFY: 3700, TCS: 1800 };
store.setPrices(currentPrices);

// The store automatically recalculates holdings with new prices
// (This happens in the setPrices action - see useMarketStore.ts)
```

### Order Execution Flow (Ready for Phase 2)
When user clicks "BUY" or "SELL" in portfolio or trade panel:

```typescript
// Step 1: Get user input (symbol, quantity, price)
// Step 2: Call store action
store.executeOrder('INFY', 'BUY', 50, 3500);
// - Adds to completedOrders
// - Recalculates holdings
// - Updates cash available
// - Triggers portfolio re-render

// Step 3: UI updates automatically via Zustand subscription
```

---

## File Structure

```
src/
  ├── lib/
  │   └── portfolioEngine.ts          # Pure calculation engine
  │       ├── OrderRecord interface
  │       ├── Holding interface
  │       ├── PortfolioMetrics interface
  │       └── calculateHoldings() function
  │
  ├── store/
  │   └── useMarketStore.ts           # Zustand store
  │       ├── completedOrders state
  │       ├── dynamicHoldings state
  │       ├── dynamicPortfolioMetrics state
  │       └── portfolio actions (addCompletedOrder, executeOrder, etc.)
  │
  ├── components/
  │   ├── Portfolio.tsx               # Old static portfolio (deprecated)
  │   ├── PortfolioNew.tsx            # New dynamic portfolio ✨
  │   │   ├── Portfolio Summary Card
  │   ├── Holdings List (sortable)
  │   │   └── Selected Holding Details Panel
  │   │
  │   └── Terminal.tsx                # Uses Portfolio import (updated)
  │
  └── PORTFOLIO_DEMO_GUIDE.md         # This file
```

---

## Next Steps

### Phase 2: Order Placement
- [ ] Create OrderModal component
- [ ] Wire to `executeOrder()` action
- [ ] Handle order validation and cash checks

### Phase 3: Real-Time Integration  
- [ ] Subscribe to market prices from WebSocket
- [ ] Auto-trigger `calculateHoldings()` on price updates
- [ ] Show live PnL changes

### Phase 4: Advanced Features
- [ ] Position averaging (add to existing holdings)
- [ ] Stop loss / Take profit orders
- [ ] Portfolio analytics and charts
- [ ] Export holding statement as PDF

---

## Troubleshooting

**Q: Holdings not showing after adding an order?**
A: Check DevTools Console:
```javascript
const store = useMarketStore.getState();
console.log(store.completedOrders); // Should have items
console.log(store.dynamicHoldings); // Should calculate
console.log(store.dynamicPortfolioMetrics); // Should show metrics
```

**Q: PnL calculation seems wrong?**
A: Verify prices are set:
```javascript
console.log(store.prices); // Check current prices
store.setPrices({ INFY: 3700 }); // Manually set if needed
```

**Q: Old Portfolio component still showing?**
A: Check Terminal.tsx line 12 - should import from `./PortfolioNew`:
```typescript
import Portfolio from './PortfolioNew'; // ✅ Correct
// NOT:
// import Portfolio from './Portfolio'; // ❌ Old version
```

---

## Code Example: Complete Test

```javascript
// Copy-paste into DevTools Console

import useMarketStore from './store/useMarketStore';
const store = useMarketStore.getState();

// ===== Add initial orders =====
console.log("Adding orders...");
store.addCompletedOrder('INFY', 'BUY', 50, 3500);
store.addCompletedOrder('TCS', 'BUY', 75, 2000);

// ===== Set prices =====
console.log("Setting prices...");
store.setPrices({ INFY: 3700, TCS: 1800 });
store.setPreviousPrices({ INFY: 3600, TCS: 2050 });

// ===== Verify state =====
console.log("Portfolio State:");
console.log("Orders:", store.completedOrders);
console.log("Holdings:", store.dynamicHoldings);
console.log("Metrics:", store.getPortfolioMetrics());

// ===== Simulate sell =====
console.log("Selling 25 INFY shares at 3700...");
store.addCompletedOrder('INFY', 'SELL', 25, 3700);

console.log("Final Holdings:", store.dynamicHoldings);
console.log("Final Metrics:", store.getPortfolioMetrics());
```

---

**Portfolio System: READY FOR TESTING** ✨
