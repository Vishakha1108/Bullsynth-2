# Synthetic Bull — Frontend Folder Structure

> **Stack:** React · TypeScript · Vite · Zustand · Shadcn/ui

---

```
Synthetic-Bull-Frontend/
│
├── public/                         # Static assets served directly
│   ├── favicon.svg                 # App favicon
│   └── icons.svg                   # Shared SVG icon sprite
│
├── scripts/                        # Utility / one-off scripts
│   └── inject_history.py           # Script to seed historical candle data
│
├── src/                            # Main application source
│   │
│   ├── assets/                     # Bundled static assets (images, SVGs)
│   │   └── vite.svg
│   │
│   ├── components/                 # Reusable React components
│   │   │
│   │   ├── ui/                     # Low-level Shadcn/ui primitives
│   │   │   ├── button.tsx          # Button primitive
│   │   │   └── dropdown-menu.tsx   # Dropdown menu primitive
│   │   │
│   │   ├── AdminDashboard.tsx      # Admin control panel view
│   │   ├── AlertModal.tsx          # Generic alert / confirmation modal
│   │   ├── BotDetails.tsx          # Detailed view of a single trading bot
│   │   ├── BotPanel.tsx            # Bot management sidebar panel
│   │   ├── BottomBar.tsx           # Status bar at the bottom of the screen
│   │   ├── Chart.tsx               # Core candlestick / trading chart (canvas)
│   │   ├── ChartToolbar.tsx        # Toolbar above the chart (timeframes, tools)
│   │   ├── Dashboard.tsx           # Main trading dashboard layout
│   │   ├── DrawingOverlay.tsx      # SVG drawing tools overlay on the chart
│   │   ├── Header.tsx              # Top navigation header
│   │   ├── keyboard-shortcuts.tsx  # Keyboard shortcut definitions & handler
│   │   ├── KeyboardShortcutsModal.tsx # Modal displaying all keyboard shortcuts
│   │   ├── LandingPage.tsx         # Public landing / marketing page
│   │   ├── mode-toggle.tsx         # Light / dark theme toggle button
│   │   ├── Navbar.tsx              # Top navigation bar
│   │   ├── Notification.tsx        # Toast / notification component
│   │   ├── OpenOrders.tsx          # Panel listing currently open orders
│   │   ├── OrderBook.tsx           # Live order book depth display
│   │   ├── PnLAnalysisModal.tsx    # Profit & Loss analysis modal / report
│   │   ├── Portfolio.tsx           # User portfolio summary panel
│   │   ├── ReplayControls.tsx      # Bar-replay playback control bar
│   │   ├── RightPanel.tsx          # Right sidebar container
│   │   ├── Terminal.tsx            # In-app trade terminal / command interface
│   │   ├── ToolPopover.tsx         # Popover menu for chart drawing tools
│   │   ├── TradePanel.tsx          # Buy / sell order entry panel
│   │   └── Watchlist.tsx           # Watchlist of tracked symbols
│   │
│   ├── hooks/                      # Custom React hooks
│   │   └── useBotPolling.ts        # Polls bot status from the backend API
│   │
│   ├── lib/                        # Pure utility / helper modules
│   │   ├── drawingUtils.ts         # Canvas drawing helpers for chart tools
│   │   ├── indicators.ts           # Technical indicator calculations (MA, RSI…)
│   │   └── utils.ts                # General-purpose utility functions
│   │
│   ├── services/                   # API & real-time communication layer
│   │   ├── api.ts                  # REST API client (fetch wrappers, endpoints)
│   │   ├── botsApi.ts              # Bot-specific REST API calls
│   │   └── websocket.ts            # WebSocket client & message handlers
│   │
│   ├── store/                      # Global state management (Zustand)
│   │   ├── ThemeContext.tsx        # React context provider for theme state
│   │   └── useMarketStore.ts       # Zustand store — market data, orders, UI
│   │
│   ├── workers/                    # Web Workers (off-main-thread processing)
│   │   └── candleWorker.ts         # Aggregates tick data into OHLC candles
│   │
│   ├── App.css                     # App-level component styles
│   ├── App.tsx                     # Root application component & routing
│   ├── index.css                   # Global styles & CSS design tokens
│   └── main.tsx                    # Vite entry point — mounts React root
│
├── .env                            # Local environment variables (gitignored)
├── .env.example                    # Environment variable template
├── .gitignore
├── components.json                 # Shadcn/ui component registry config
├── Dockerfile                      # Production Docker image definition
├── eslint.config.js                # ESLint flat-config rules
├── index.html                      # Vite HTML entry template
├── package.json                    # NPM dependencies & scripts
├── patch_chart.js                  # Post-install patch for chart library
├── tsconfig.app.json               # TypeScript config for app source
├── tsconfig.json                   # Root TypeScript config (references)
├── tsconfig.node.json              # TypeScript config for Node tooling
└── vite.config.ts                  # Vite bundler configuration
```

---

## Directory Responsibilities

| Directory | Responsibility |
|---|---|
| `src/components/` | All React UI components — page-level views and reusable widgets |
| `src/components/ui/` | Atomic Shadcn/ui primitives (button, dropdown, etc.) |
| `src/hooks/` | Encapsulated React side-effect logic (polling, subscriptions) |
| `src/lib/` | Framework-agnostic pure functions (math, canvas, formatting) |
| `src/services/` | External communication — REST API calls and WebSocket management |
| `src/store/` | Global client state via Zustand and React Context |
| `src/workers/` | Computationally intensive tasks moved off the main thread |
| `src/assets/` | Static files bundled by Vite (SVGs, images) |
| `public/` | Static files served as-is (favicon, icon sprite) |
| `scripts/` | Developer / DevOps utility scripts (not bundled) |
