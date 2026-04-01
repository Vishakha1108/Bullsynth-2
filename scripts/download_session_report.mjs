import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:8000';
const DEFAULT_OUT_DIR = 'reports';

function usage() {
  return [
    'Usage:',
    '  npm run report:session -- --bot-id <BOT_ID> --session-id <SESSION_ID> [--api-base <URL>] [--out-dir <DIR>]',
    '  npm run report:session -- <BOT_ID> <SESSION_ID>',
    '',
    'Example:',
    '  npm run report:session -- --bot-id 72b412d7-3b2a-41f1-bc69-606c590afc21 --session-id aaaa-bbbb-cccc',
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    botId: '',
    sessionId: '',
    apiBase: DEFAULT_API_BASE,
    outDir: DEFAULT_OUT_DIR,
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--bot-id') {
      options.botId = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (arg === '--session-id') {
      options.sessionId = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (arg === '--api-base') {
      options.apiBase = argv[i + 1] ?? DEFAULT_API_BASE;
      i += 1;
      continue;
    }
    if (arg === '--out-dir') {
      options.outDir = argv[i + 1] ?? DEFAULT_OUT_DIR;
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }

    positional.push(arg);
  }

  if (!options.botId && positional.length >= 1) {
    options.botId = positional[0];
  }
  if (!options.sessionId && positional.length >= 2) {
    options.sessionId = positional[1];
  }

  if (!options.botId || !options.sessionId) {
    throw new Error(`Missing required parameters.\n\n${usage()}`);
  }

  return options;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status} for ${url}\n${body}`);
  }
  return response.json();
}

function buildUrl(apiBase, pathname, query = {}) {
  const url = new URL(pathname, apiBase.endsWith('/') ? apiBase : `${apiBase}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function fetchAllSessionTrades(apiBase, botId, sessionId) {
  const limit = 500;
  let skip = 0;
  const allTrades = [];

  while (true) {
    const url = buildUrl(apiBase, `/api/bots/${encodeURIComponent(botId)}/trades`, {
      session_id: sessionId,
      skip,
      limit,
    });

    const batch = await fetchJson(url);
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    allTrades.push(...batch);

    if (batch.length < limit) {
      break;
    }

    skip += limit;
  }

  return allTrades;
}

function summarizeTrades(trades) {
  let buyCount = 0;
  let sellCount = 0;
  let buyQty = 0;
  let sellQty = 0;
  let buyNotional = 0;
  let sellNotional = 0;

  const symbols = new Set();

  for (const trade of trades) {
    const qty = Number(trade.qty) || 0;
    const price = Number(trade.price) || 0;
    const side = String(trade.side || '').toLowerCase();

    symbols.add(trade.symbol);

    if (side === 'buy') {
      buyCount += 1;
      buyQty += qty;
      buyNotional += qty * price;
    } else if (side === 'sell') {
      sellCount += 1;
      sellQty += qty;
      sellNotional += qty * price;
    }
  }

  const avgBuyPrice = buyQty > 0 ? buyNotional / buyQty : 0;
  const avgSellPrice = sellQty > 0 ? sellNotional / sellQty : 0;

  return {
    total_trades: trades.length,
    symbols: Array.from(symbols).sort(),
    buy_count: buyCount,
    sell_count: sellCount,
    buy_qty: buyQty,
    sell_qty: sellQty,
    buy_notional: buyNotional,
    sell_notional: sellNotional,
    avg_buy_price: avgBuyPrice,
    avg_sell_price: avgSellPrice,
    first_trade_at: trades.length > 0 ? trades[trades.length - 1].timestamp : null,
    last_trade_at: trades.length > 0 ? trades[0].timestamp : null,
  };
}

function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function tradesToCsv(trades) {
  const header = ['id', 'bot_id', 'session_id', 'symbol', 'side', 'price', 'qty', 'timestamp'];
  const rows = trades.map((trade) => [
    trade.id,
    trade.bot_id,
    trade.session_id,
    trade.symbol,
    trade.side,
    trade.price,
    trade.qty,
    trade.timestamp,
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => toCsvValue(cell)).join(','))
    .join('\n');
}

function safeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const botUrl = buildUrl(args.apiBase, `/api/bots/${encodeURIComponent(args.botId)}`);
  const sessionsUrl = buildUrl(args.apiBase, `/api/bots/${encodeURIComponent(args.botId)}/sessions`);
  const kpiUrl = buildUrl(args.apiBase, `/api/bots/${encodeURIComponent(args.botId)}/kpi`, {
    session_id: args.sessionId,
  });

  const [bot, sessions, kpi, trades] = await Promise.all([
    fetchJson(botUrl),
    fetchJson(sessionsUrl),
    fetchJson(kpiUrl),
    fetchAllSessionTrades(args.apiBase, args.botId, args.sessionId),
  ]);

  const session = Array.isArray(sessions)
    ? sessions.find((item) => item.id === args.sessionId)
    : null;

  if (!session) {
    throw new Error(`Session ${args.sessionId} not found for bot ${args.botId}.`);
  }

  const summary = summarizeTrades(trades);

  const report = {
    generated_at: new Date().toISOString(),
    api_base: args.apiBase,
    bot: {
      id: bot.id,
      name: bot.name,
      status: bot.status,
    },
    session,
    kpi,
    trade_summary: summary,
    trades,
  };

  const botTag = safeFileName(bot.name || bot.id || 'bot');
  const sessionTag = safeFileName(args.sessionId);
  const outputDir = path.resolve(args.outDir);
  const jsonPath = path.join(outputDir, `${botTag}-${sessionTag}.report.json`);
  const csvPath = path.join(outputDir, `${botTag}-${sessionTag}.trades.csv`);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  await fs.writeFile(csvPath, tradesToCsv(trades), 'utf8');

  console.log(`Session report saved: ${jsonPath}`);
  console.log(`Session trades CSV saved: ${csvPath}`);
  console.log(`Trades exported: ${trades.length}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
