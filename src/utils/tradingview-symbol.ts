/**
 * Best-effort TradingView symbols for the free embed widget (CEX pairs).
 * Many small-cap / chain-native tokens are not on Binance USDT — try several venues or Dexscreener.
 */

const PAIR_OVERRIDES: Record<string, string> = {
  BTC: "BINANCE:BTCUSDT",
  ETH: "BINANCE:ETHUSDT",
  WETH: "BINANCE:ETHUSDT",
  BNB: "BINANCE:BNBUSDT",
  SOL: "BINANCE:SOLUSDT",
  XRP: "BINANCE:XRPUSDT",
  DOGE: "BINANCE:DOGEUSDT",
  ADA: "BINANCE:ADAUSDT",
  AVAX: "BINANCE:AVAXUSDT",
  LINK: "BINANCE:LINKUSDT",
  DOT: "BINANCE:DOTUSDT",
  MATIC: "BINANCE:MATICUSDT",
  POL: "BINANCE:POLUSDT",
  PEPE: "BINANCE:PEPEUSDT",
  SHIB: "BINANCE:SHIBUSDT",
  USDT: "BINANCE:USDTUSD", // proxy chart
  USDC: "COINBASE:USDCUSD",
  DAI: "BINANCE:DAIUSDT",
  WBTC: "BINANCE:BTCUSDT",
  STETH: "BINANCE:ETHUSDT",
};

function normalizeTicker(symbol: string | undefined | null): string {
  return String(symbol || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Full pool of CEX prefixes that TradingView commonly supports (order filled in per-chain below).
 * @see https://www.tradingview.com/symbols/
 */
const EXCHANGE_POOL = [
  "BINANCE",
  "BYBIT",
  "KUCOIN",
  "OKX",
  "MEXC",
  "GATEIO",
  "BITGET",
  "HTX",
  "BINGX",
  "CRYPTOCOM",
  "LBANK",
  "COINEX",
  "BITSTAMP",
  "KRAKEN",
  "COINBASE",
] as const;

/** Prefer venues that often list small caps on this chain first; rest append from EXCHANGE_POOL. */
function preferredExchanges(network: string | undefined | null): string[] {
  const n = String(network || "").toLowerCase();
  if (
    n === "bnb" ||
    /\bbsc\b/.test(n) ||
    /\bbnb\b/.test(n) ||
    n.includes("bnb smart") ||
    n.includes("binance smart") ||
    n.includes("bep20") ||
    n.includes("bep-20")
  ) {
    return ["MEXC", "KUCOIN", "GATEIO", "BINANCE", "BITGET", "BYBIT", "OKX", "HTX", "BINGX", "LBANK", "COINEX"];
  }
  if (n.includes("solana") || /\bsol\b/.test(n)) {
    return ["BINANCE", "BYBIT", "OKX", "MEXC", "KUCOIN", "GATEIO", "BITGET", "HTX"];
  }
  if (/\bbase\b/.test(n) || n === "base" || n.includes("coinbase layer")) {
    return ["COINBASE", "BINANCE", "BYBIT", "OKX", "MEXC", "KUCOIN", "GATEIO"];
  }
  if (n.includes("arbitrum")) {
    return ["BINANCE", "BYBIT", "OKX", "MEXC", "KUCOIN", "GATEIO", "BITGET", "COINBASE"];
  }
  if (n.includes("optimism") || /\bop mainnet\b/.test(n)) {
    return ["BINANCE", "OKX", "BYBIT", "MEXC", "KUCOIN", "GATEIO", "COINBASE"];
  }
  if (n.includes("polygon") || n.includes("matic")) {
    return ["BINANCE", "OKX", "MEXC", "KUCOIN", "GATEIO", "BYBIT", "BITGET", "COINBASE"];
  }
  if (n.includes("avalanche") || n.includes("avax")) {
    return ["BINANCE", "BYBIT", "OKX", "MEXC", "KUCOIN", "GATEIO", "BITGET"];
  }
  if (n.includes("fantom")) {
    return ["BINANCE", "MEXC", "KUCOIN", "GATEIO", "BYBIT"];
  }
  if (n.includes("linea") || n.includes("blast")) {
    return ["BINANCE", "OKX", "MEXC", "GATEIO", "BYBIT", "KUCOIN"];
  }
  return ["BINANCE", "BYBIT", "KUCOIN", "OKX", "MEXC", "GATEIO", "BITGET", "HTX", "BINGX"];
}

function exchangesForNetwork(network: string | undefined | null): string[] {
  const pref = preferredExchanges(network);
  const rest = EXCHANGE_POOL.filter((e) => !pref.includes(e));
  return [...pref, ...rest];
}

/**
 * Ordered list of TradingView symbols to try (user can switch in the chart UI).
 * @param network CMC-style network label (e.g. "BNB Smart Chain (BEP20)").
 */
export function buildTradingViewSymbolCandidates(
  symbol: string | undefined | null,
  network?: string | null,
): string[] {
  const s = normalizeTicker(symbol);
  if (!s) return ["BINANCE:BTCUSDT"];
  if (PAIR_OVERRIDES[s]) return [PAIR_OVERRIDES[s]];

  const quotes = ["USDT", "USDC", "BUSD"] as const;
  const out: string[] = [];
  for (const ex of exchangesForNetwork(network)) {
    for (const q of quotes) {
      out.push(`${ex}:${s}${q}`);
    }
  }
  out.push(`COINBASE:${s}USD`, `KRAKEN:${s}USD`, `BITSTAMP:${s}USD`);
  const seen = new Set<string>();
  return out.filter((pair) => {
    const k = pair.toUpperCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** First candidate only — use {@link buildTradingViewSymbolCandidates} for the chart. */
export function guessTradingViewSymbol(symbol: string | undefined | null, network?: string | null): string {
  const c = buildTradingViewSymbolCandidates(symbol, network);
  return c[0] ?? "BINANCE:BTCUSDT";
}

/** Dexscreener chain slug from CMC-style network label */
export function dexScreenerPathForNetwork(network: string | undefined | null, address: string): string | null {
  const addr = String(address || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
  const n = String(network || "").toLowerCase();
  let slug = "ethereum";
  if (/\bbase\b/.test(n) || n === "base" || n.includes("coinbase layer")) slug = "base";
  else if (n.includes("arbitrum")) slug = "arbitrum";
  else if (n.includes("optimism") || /\bop mainnet\b/.test(n)) slug = "optimism";
  else if (n.includes("polygon") || n.includes("matic")) slug = "polygon";
  else if (
    n === "bnb" ||
    /\bbsc\b/.test(n) ||
    /\bbnb\b/.test(n) ||
    n.includes("bnb smart") ||
    n.includes("binance smart") ||
    n.includes("bep20") ||
    n.includes("bep-20")
  )
    slug = "bsc";
  else if (n.includes("avalanche") || n.includes("avax")) slug = "avalanche";
  else if (n.includes("fantom")) slug = "fantom";
  else if (n.includes("gnosis") || n.includes("xdai")) slug = "gnosis";
  else if (n.includes("linea")) slug = "linea";
  else if (n.includes("blast")) slug = "blast";

  return `https://dexscreener.com/${slug}/${addr}`;
}

/**
 * Dexscreener chart in an iframe (pair/token page). Use when CEX symbols are missing on TradingView.
 * @see embed query params used by Dexscreener share/embed flows */
export function dexScreenerEmbedUrl(network: string | undefined | null, address: string): string | null {
  const base = dexScreenerPathForNetwork(network, address);
  if (!base) return null;
  const q = new URLSearchParams({
    embed: "1",
    loadChartSettings: "0",
    chartLeftToolbar: "0",
    chartTheme: "dark",
    theme: "dark",
    chartType: "usd",
    // Best-effort defaults for "Full" look at load.
    interval: "1d",
    full: "1",
    timeframe: "max",
    range: "max",
  });
  return `${base}?${q.toString()}`;
}
