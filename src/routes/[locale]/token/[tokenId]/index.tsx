import { $, component$, useComputed$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
// @ts-ignore qwik-speak types
import { useSpeak, inlineTranslate } from "qwik-speak";
import { useDashboardAuth } from "../../layout";
import { TokenLogoImg } from "~/components/crypto-dashboard/token-logo";
import { TradingViewAdvancedChart } from "~/components/crypto/tradingview-advanced-chart";
import { moralisChainFromNetworkLabel } from "~/server/crypto-helper/moralis-chain";
import { parseTokenApiSnapshot } from "~/server/crypto-helper/market-token-snapshot";
import { CATEGORY_DASHBOARD_PATH } from "~/server/crypto-helper/market-category-constants";
import {
  formatSignedPercent,
  formatTokenSupply,
  formatTokenUsdPrice,
  formatUsdBalance,
  formatUsdLiquidity,
  percentToneClass,
} from "~/utils/format-market";
import {
  buildTradingViewSymbolCandidates,
  dexScreenerEmbedUrl,
  dexScreenerPathForNetwork,
} from "~/utils/tradingview-symbol";
import { EvmAddrLinks, TxHashLink, txExplorerBase } from "~/components/crypto-dashboard/evm-dash-links";
import { upsertWatchlistItem } from "~/server/watchlist-actions";
import { MiniSparkline } from "~/components/crypto-dashboard/mini-sparkline";
import {
  LuBadgeCheck,
  LuCalendar,
  LuCopy,
  LuExternalLink,
  LuFileText,
  LuGlobe,
  LuLayers,
  LuLink2,
  LuSearch,
  LuWaves,
} from "@qwikest/icons/lucide";

const CAT_LABEL: Record<string, string> = {
  memes: "Meme",
  "ai-big-data": "AI & data",
  gaming: "Gaming",
  mineable: "Mineable",
  volume: "Top volume",
  trending: "Trending",
  "most-visited": "Most visited",
  earlybird: "New listings",
};

type TabId = "overview" | "holders" | "traders" | "swaps";

/** Moralis list endpoints vary: { result: [] }, { data: [] }, or raw array */
export function moralisResultRows(data: unknown): Record<string, unknown>[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.result)) return o.result as Record<string, unknown>[];
  if (Array.isArray(o.pairs)) return o.pairs as Record<string, unknown>[];
  if (Array.isArray(o.data)) return o.data as Record<string, unknown>[];
  return [];
}

/** ERC20 metadata often returns a map keyed by lowercase address */
export function moralisMetadataRows(data: unknown): Record<string, unknown>[] {
  const rows = moralisResultRows(data);
  if (rows.length) return rows;
  if (data == null || typeof data !== "object") return [];
  const vals = Object.values(data as Record<string, unknown>).filter(
    (v) => v != null && typeof v === "object" && !Array.isArray(v),
  ) as Record<string, unknown>[];
  if (vals.some((v) => v.address != null || v.token_address != null)) return vals;
  return [];
}

/** Token score payload: root or nested under `data`. */
function moralisTokenScoreRecord(data: unknown): Record<string, unknown> | null {
  if (data == null || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.score != null || o.metrics != null || o.updatedAt != null || o.updated_at != null) return o;
  const inner = o.data;
  if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
    const n = inner as Record<string, unknown>;
    if (n.score != null || n.metrics != null) return n;
  }
  return Object.keys(o).length ? o : null;
}

/** Score timeseries: `timeseries`, `result`, or nested. */
function moralisScoreTimeseriesRows(data: unknown): Record<string, unknown>[] {
  if (data == null || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  const a = o.timeseries ?? o.result;
  if (Array.isArray(a)) return a as Record<string, unknown>[];
  const inner = o.data;
  if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
    const t = (inner as Record<string, unknown>).timeseries ?? (inner as Record<string, unknown>).result;
    if (Array.isArray(t)) return t as Record<string, unknown>[];
  }
  return [];
}

function metricNum(m: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = m[k];
    if (v == null) continue;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function pairLabel(r: Record<string, unknown>): string {
  const a = String(r.pair_label ?? r.pairLabel ?? "").trim();
  if (a) return a;
  const t0 = r.token0 as Record<string, unknown> | undefined;
  const t1 = r.token1 as Record<string, unknown> | undefined;
  const s0 = String(t0?.symbol ?? t0?.name ?? "").trim();
  const s1 = String(t1?.symbol ?? t1?.name ?? "").trim();
  if (s0 && s1) return `${s0} / ${s1}`;
  return String(r.pair_address ?? r.pairAddress ?? "—").slice(0, 14);
}

function formatMetricScalar(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number" && Number.isFinite(v)) return formatUsdLiquidity(v);
  if (typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const leaf =
      o.usd ??
      o["24h"] ??
      o.h24 ??
      o.volumeUsd ??
      o.volume_usd ??
      o.totalUsd ??
      o.total_usd;
    if (typeof leaf === "number" && Number.isFinite(leaf)) return formatUsdLiquidity(leaf);
    const windows = [
      ["10m", o["10m"]],
      ["30m", o["30m"]],
      ["1h", o["1h"]],
      ["4h", o["4h"]],
      ["12h", o["12h"]],
      ["1d", o["1d"]],
      ["7d", o["7d"]],
      ["30d", o["30d"]],
    ] as const;
    const parts = windows
      .map(([k, raw]) => {
        const n = Number(raw);
        if (!Number.isFinite(n)) return null;
        return `${k} ${formatUsdLiquidity(n)}`;
      })
      .filter(Boolean) as string[];
    if (parts.length > 0) return parts.slice(0, 3).join(" · ");
    const anyNum = Object.values(o).find((x) => Number.isFinite(Number(x)));
    if (anyNum != null) return formatUsdLiquidity(Number(anyNum));
    return "—";
  }
  return String(v);
}

function formatDateMaybe(raw: unknown): string {
  if (raw == null) return "—";
  const d = new Date(String(raw));
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
  return String(raw);
}

function firstLinkHref(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v)) {
    const s = v.find((x) => typeof x === "string" && x.trim());
    return typeof s === "string" ? s.trim() : null;
  }
  return null;
}

function holderWallet(r: Record<string, unknown>): string {
  return String(r.owner_address ?? r.ownerAddress ?? r.address ?? r.wallet ?? "").toLowerCase();
}

function gainerWallet(r: Record<string, unknown>): string {
  return String(r.address ?? r.wallet_address ?? r.wallet ?? "").toLowerCase();
}

/** Shorter display for large token amounts (holder balances, transfer values). */
function formatCompactAmount(raw: unknown): string {
  if (raw == null) return "—";
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "").replace(/\s/g, ""));
  if (!Number.isFinite(n)) return String(raw);
  const abs = Math.abs(n);
  if (abs >= 1e12)
    return `${(n / 1e12).toLocaleString(undefined, { maximumFractionDigits: 3 })}T`;
  if (abs >= 1e9)
    return `${(n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 3 })}B`;
  if (abs >= 1e6)
    return `${(n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 3 })}M`;
  if (abs >= 1e3) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (abs >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumSignificantDigits: 8 });
}

function holderSharePct(balanceRaw: unknown, totalSupplyStr: string | undefined): string | null {
  const total = Number(String(totalSupplyStr ?? "").replace(/,/g, ""));
  const bal = Number(String(balanceRaw ?? "").replace(/,/g, ""));
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(bal)) return null;
  const pct = (bal / total) * 100;
  if (!Number.isFinite(pct) || pct <= 0) return null;
  return pct < 0.0001 ? "<0.0001%" : `${pct.toLocaleString(undefined, { maximumFractionDigits: 4 })}%`;
}

function shortenContract(addr: string): string {
  const a = String(addr).trim();
  if (a.length <= 18) return a;
  return `${a.slice(0, 10)}…${a.slice(-8)}`;
}

/** Tailwind classes for a chain pill (border/bg/text) given a chain hint or name. */
function chainBadgeClass(chain: string): string {
  const c = String(chain || "").toLowerCase();
  if (c === "eth" || c === "ethereum" || c === "0x1") return "bg-indigo-500/15 text-indigo-200 border-indigo-400/35";
  if (c === "bsc" || c === "bnb" || c.includes("binance smart") || c.includes("bnb smart") || c === "0x38") return "bg-amber-500/15 text-amber-200 border-amber-400/35";
  if (c.includes("polygon") || c.includes("matic") || c === "0x89") return "bg-violet-500/15 text-violet-200 border-violet-400/35";
  if (c.includes("arbitrum") || c === "0xa4b1") return "bg-sky-500/15 text-sky-200 border-sky-400/35";
  if (c.includes("optimism") || /\bop mainnet\b/.test(c)) return "bg-rose-500/15 text-rose-200 border-rose-400/35";
  if (c.includes("avalanche") || c.includes("avax")) return "bg-red-500/15 text-red-200 border-red-400/35";
  if (c === "base" || c === "0x2105") return "bg-blue-500/15 text-blue-200 border-blue-400/35";
  if (c.includes("harmony")) return "bg-emerald-500/15 text-emerald-200 border-emerald-400/35";
  if (c.includes("ronin")) return "bg-cyan-500/15 text-cyan-200 border-cyan-400/35";
  if (c.includes("energi")) return "bg-teal-500/15 text-teal-200 border-teal-400/35";
  if (c.includes("fantom")) return "bg-blue-500/15 text-blue-200 border-blue-400/35";
  if (c.includes("gnosis") || c.includes("xdai")) return "bg-emerald-500/15 text-emerald-200 border-emerald-400/35";
  if (c.includes("linea")) return "bg-slate-500/20 text-slate-200 border-slate-400/35";
  if (c.includes("blast")) return "bg-orange-500/15 text-orange-200 border-orange-400/35";
  if (c.includes("cronos")) return "bg-blue-500/15 text-blue-200 border-blue-400/35";
  if (c.includes("moonbeam") || c.includes("moonriver")) return "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/35";
  if (c.includes("pulse")) return "bg-pink-500/15 text-pink-200 border-pink-400/35";
  if (c.includes("sei")) return "bg-orange-500/15 text-orange-200 border-orange-400/35";
  return "bg-[#043234]/55 text-slate-300 border-[#043234]/80";
}

function formatSwapBlockTime(r: Record<string, unknown>): { when: string; block: string } {
  const ts = String(r.blockTimestamp ?? r.block_timestamp ?? "").trim();
  const bn = r.blockNumber ?? r.block_number;
  let when = "—";
  if (ts) {
    const d = Date.parse(ts);
    if (Number.isFinite(d)) {
      when = new Date(d).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
    } else {
      when = ts.length > 20 ? `${ts.slice(0, 19)}…` : ts;
    }
  }
  const block =
    bn != null && bn !== "" && (typeof bn === "number" || typeof bn === "string") ? `#${bn}` : "—";
  return { when, block };
}

function formatSwapTokenSide(t: Record<string, unknown> | undefined): string {
  if (!t || typeof t !== "object") return "—";
  const sym = String(t.symbol ?? "?");
  const amt = String(t.amount ?? "").trim();
  const usdAmt = metricNum(t, "usdAmount", "usd_amount");
  const usdP = metricNum(t, "usdPrice", "usd_price");
  let s = amt ? `${sym} ${amt}` : sym;
  if (usdAmt != null) s += ` · ${formatUsdLiquidity(usdAmt)}`;
  if (usdP != null) s += ` @${formatTokenUsdPrice(usdP)}`;
  return s;
}

function formatMoralisStatScalar(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (typeof v === "string") return v.length > 120 ? `${v.slice(0, 117)}…` : v;
  if (Array.isArray(v)) return `[${v.length} items]`;
  if (typeof v === "object") {
    const j = JSON.stringify(v);
    return j.length > 100 ? `${j.slice(0, 97)}…` : j;
  }
  return String(v);
}

/** First-level (and one nested `data`) keys from Moralis getTokenStats for a compact dl. */
function moralisErc20StatsFlatEntries(data: unknown): [string, string][] {
  if (data == null) return [];
  let root: Record<string, unknown>;
  if (typeof data === "object" && !Array.isArray(data)) {
    root = data as Record<string, unknown>;
  } else return [];
  const inner = root.data;
  if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
    root = inner as Record<string, unknown>;
  }
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(root)) {
    if (v != null && typeof v === "object" && !Array.isArray(v) && k !== "data") {
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        out.push([`${k}.${k2}`, formatMoralisStatScalar(v2)]);
      }
    } else {
      out.push([k, formatMoralisStatScalar(v)]);
    }
  }
  return out.slice(0, 36);
}

/** Coerce loader `unknown` fields into formatters' input type. */
function fmtScalar(v: unknown): string | number | null | undefined {
  return v as string | number | null | undefined;
}

function cmcUsdQuote(
  quotesPayload: unknown,
  cmcId: number,
): {
  price?: number;
  vol24?: number;
  pct24?: number;
  pct1h?: number;
  pct7d?: number;
  pct30d?: number;
  mcap?: number;
  fdv?: number;
  circSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  marketCapDominance?: number;
  rank?: number;
  updated?: string;
} | null {
  const root = quotesPayload as {
    data?: Record<
      string,
      {
        quote?: { USD?: Record<string, unknown> };
        circulating_supply?: number | string;
        total_supply?: number | string;
        max_supply?: number | string;
        cmc_rank?: number | string;
      }
    >;
  };
  const entry = root?.data?.[String(cmcId)];
  const usd = entry?.quote?.USD;
  if (!usd) return null;
  const num = (v: unknown): number | undefined =>
    v != null && Number.isFinite(Number(v)) ? Number(v) : undefined;
  return {
    price: num(usd.price),
    vol24: num(usd.volume_24h),
    pct24: num(usd.percent_change_24h),
    pct1h: num(usd.percent_change_1h),
    pct7d: num(usd.percent_change_7d),
    pct30d: num(usd.percent_change_30d),
    mcap: num(usd.market_cap),
    fdv: num(usd.fully_diluted_market_cap),
    marketCapDominance: num(usd.market_cap_dominance),
    rank: num(entry?.cmc_rank),
    circSupply: num(entry?.circulating_supply),
    totalSupply: num(entry?.total_supply),
    maxSupply: num(entry?.max_supply),
    updated: usd.last_updated != null ? String(usd.last_updated) : undefined,
  };
}

function cmcInfoUrls(infoPayload: unknown, cmcId: number): { website?: string; explorer?: string; desc?: string } {
  const root = infoPayload as { data?: Record<string, { urls?: { website?: string[]; explorer?: string[] }; description?: string }> };
  const entry = root?.data?.[String(cmcId)];
  const urls = entry?.urls;
  return {
    website: urls?.website?.[0],
    explorer: urls?.explorer?.[0],
    desc: entry?.description ? String(entry.description).slice(0, 400) : undefined,
  };
}

function nansenRoot(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  return data as Record<string, unknown>;
}

function nansenDataObject(data: unknown): Record<string, unknown> | null {
  const root = nansenRoot(data);
  if (!root) return null;
  const inner = root.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) return inner as Record<string, unknown>;
  return root;
}

function nansenDataRows(data: unknown): Record<string, unknown>[] {
  const root = nansenRoot(data);
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data as Record<string, unknown>[];
  const inner = root.data;
  if (inner && typeof inner === "object" && Array.isArray((inner as Record<string, unknown>).data)) {
    return (inner as Record<string, unknown>).data as Record<string, unknown>[];
  }
  return [];
}

const missingApiSnapshot = {
  ok: false as const,
  error: "Sin datos en base de datos — ejecuta la actualización diaria.",
};

export const useTokenDetailLoader = routeLoader$(async (ev) => {
  const id = Number(ev.params.tokenId);
  if (!Number.isFinite(id) || id < 1) {
    throw ev.error(404, { message: "Invalid token id" });
  }
  /** Dynamic import keeps Turso/libsql out of the client SPA chunk (see Neon / drizzle-orm_libsql in browser). */
  const [{ db }, schema, { and, desc, eq, ne }] = await Promise.all([
    import("~/lib/turso"),
    import("../../../../../drizzle/schema"),
    import("drizzle-orm"),
  ]);
  const { cachedMarketTokens } = schema;
  let row;
  try {
    row = await db.select().from(cachedMarketTokens).where(eq(cachedMarketTokens.id, id)).get();
  } catch (e) {
    console.error("[useTokenDetailLoader] Turso", e);
    throw ev.error(503, { message: "No se pudo consultar la base de datos." });
  }
  if (!row) {
    throw ev.error(404, { message: "Token no encontrado — ejecuta la sincronización o vuelve más tarde." });
  }

  // If duplicate rows exist for the same CMC asset in the same category, always use one canonical id.
  if (row.cmcId != null && Number.isFinite(Number(row.cmcId))) {
    const canonical = await db
      .select({ id: cachedMarketTokens.id })
      .from(cachedMarketTokens)
      .where(
        and(
          eq(cachedMarketTokens.category, row.category),
          eq(cachedMarketTokens.cmcId, Number(row.cmcId)),
        ),
      )
      .orderBy(desc(cachedMarketTokens.updatedAt), desc(cachedMarketTokens.id))
      .limit(1)
      .get();
    if (canonical?.id && canonical.id !== row.id) {
      throw ev.redirect(302, `/${ev.params.locale}/token/${canonical.id}/`);
    }
  }

  const snap = parseTokenApiSnapshot(row.apiSnapshot ?? null);
  const moralisChain =
    snap?.moralisChain ?? moralisChainFromNetworkLabel(String(row.network ?? ""));

  const cmcQuotes = snap?.cmcQuotes ?? missingApiSnapshot;
  const cmcInfo = snap?.cmcInfo ?? missingApiSnapshot;
  const evmOrSnapHint = {
    ok: false as const,
    error: "Sin datos on-chain en caché (contrato, claves del servidor o fila antigua).",
  };
  let topGainers = snap?.topGainers ?? evmOrSnapHint;
  let owners = snap?.owners ?? evmOrSnapHint;
  const moralisPrice = snap?.moralisPrice ?? evmOrSnapHint;
  let moralisTransfers = snap?.moralisTransfers ?? evmOrSnapHint;
  const moralisMeta = snap?.moralisMeta ?? evmOrSnapHint;
  let moralisSwaps =
    snap?.moralisSwaps ??
    ({
      ok: false as const,
      error:
        "Sin swaps en caché aún: se intentará cargar desde Moralis al abrir la ficha (si no desactivaste la carga en vivo).",
    } as const);

  const moralisTokenAnalytics =
    snap?.moralisTokenAnalytics ??
    ({
      ok: false as const,
      error:
        "Sin analytics en caché. Prueba la carga en vivo o espera a la próxima actualización.",
    } as const);

  const addr = String(row.address || "").trim().toLowerCase();
  const evm = /^0x[a-f0-9]{40}$/.test(addr);
  const moralisKey = Boolean(process.env.MORALIS_API_KEY?.trim());
  /** Default: fetch swaps/traders live when missing from snapshot. Opt out with MORALIS_TOKEN_PAGE_LIVE_SWAPS=0 / MORALIS_TOKEN_PAGE_LIVE_TRADERS=0 */
  const disableLiveSwaps = /^0|false|no$/i.test(String(process.env.MORALIS_TOKEN_PAGE_LIVE_SWAPS ?? ""));
  const disableLiveTraders = /^0|false|no$/i.test(String(process.env.MORALIS_TOKEN_PAGE_LIVE_TRADERS ?? ""));

  if (evm && moralisKey) {
    const {
      fetchMoralisErc20Transfers,
      fetchMoralisErc20Swaps,
      fetchMoralisErc20TopGainers,
      fetchMoralisErc20Owners,
    } = await import("~/server/crypto-helper/moralis-api");
    const {
      isStaleMoralisOrderCacheError,
      tokenSnapshotNeverHadSwaps,
      ownersLimitForTokenSync,
    } = await import("~/server/crypto-helper/token-detail-moralis-heal");

    let healed = false;

    if (!moralisTransfers.ok && isStaleMoralisOrderCacheError(moralisTransfers.error)) {
      moralisTransfers = await fetchMoralisErc20Transfers(addr, moralisChain, 25);
      healed = true;
    }
    if (!owners.ok && isStaleMoralisOrderCacheError(owners.error)) {
      owners = await fetchMoralisErc20Owners(addr, moralisChain, ownersLimitForTokenSync());
      healed = true;
    }
    const shouldFetchGainersLive =
      (!topGainers.ok && isStaleMoralisOrderCacheError(topGainers.error)) ||
      (!disableLiveTraders && snap?.topGainers == null);

    if (shouldFetchGainersLive) {
      topGainers = await fetchMoralisErc20TopGainers(addr, moralisChain, 20);
      healed = true;
    }

    const shouldFetchSwapsLive =
      (!moralisSwaps.ok && isStaleMoralisOrderCacheError(moralisSwaps.error)) ||
      (!disableLiveSwaps && tokenSnapshotNeverHadSwaps(snap));

    if (shouldFetchSwapsLive) {
      moralisSwaps = await fetchMoralisErc20Swaps(addr, moralisChain, 18, "DESC");
      healed = true;
    }

    if (healed) {
      const prev = parseTokenApiSnapshot(row.apiSnapshot ?? null) ?? {};
      const merged = {
        ...prev,
        topGainers,
        owners,
        moralisTransfers,
        moralisSwaps,
        moralisChain,
        syncedAt: Math.floor(Date.now() / 1000),
      };
      try {
        await db
          .update(cachedMarketTokens)
          .set({ apiSnapshot: JSON.stringify(merged) })
          .where(eq(cachedMarketTokens.id, id));
      } catch (e) {
        console.error("[useTokenDetailLoader] persist healed snapshot", e);
      }
    }
  }

  const {
    getGlobalSnapshotJson,
    GLOBAL_NANSEN_TGM_TOKEN_INFORMATION,
    GLOBAL_NANSEN_TGM_INDICATORS,
    GLOBAL_NANSEN_TGM_WHO_BOUGHT_SOLD,
    GLOBAL_NANSEN_TGM_TRANSFERS,
    GLOBAL_NANSEN_TGM_PERP_PNL,
    GLOBAL_NANSEN_TGM_TOKEN_OHLCV,
  } = await import("~/server/crypto-helper/api-snapshot-sync");

  const [
    nansenTokenInformation,
    nansenIndicators,
    nansenWhoBoughtSold,
    nansenTransfers,
    nansenPerpPnl,
    nansenTokenOhlcv,
  ] = await Promise.all([
    getGlobalSnapshotJson<Record<string, unknown> | null>(GLOBAL_NANSEN_TGM_TOKEN_INFORMATION),
    getGlobalSnapshotJson<Record<string, unknown> | null>(GLOBAL_NANSEN_TGM_INDICATORS),
    getGlobalSnapshotJson<Record<string, unknown> | null>(GLOBAL_NANSEN_TGM_WHO_BOUGHT_SOLD),
    getGlobalSnapshotJson<Record<string, unknown> | null>(GLOBAL_NANSEN_TGM_TRANSFERS),
    getGlobalSnapshotJson<Record<string, unknown> | null>(GLOBAL_NANSEN_TGM_PERP_PNL),
    getGlobalSnapshotJson<Record<string, unknown> | null>(GLOBAL_NANSEN_TGM_TOKEN_OHLCV),
  ]);

  return {
    ...row,
    moralisChain,
    syncedAt: snap?.syncedAt ?? null,
    topGainers,
    owners,
    moralisPrice,
    moralisTransfers,
    moralisMeta,
    moralisSwaps,
    /** Opcional: solo si el sync tiene `MORALIS_SYNC_TOKEN_INSIGHTS` (Pro+). */
    moralisTokenScore: snap?.moralisTokenScore,
    moralisTokenScoreHistorical: snap?.moralisTokenScoreHistorical,
    moralisTokenPairs: snap?.moralisTokenPairs,
    moralisTokenAnalytics,
    moralisErc20Stats: snap?.moralisErc20Stats,
    nansenTokenInformation,
    nansenIndicators,
    nansenWhoBoughtSold,
    nansenTransfers,
    nansenPerpPnl,
    nansenTokenOhlcv,
    cmcQuotes,
    cmcInfo,
  };
});

export default component$(() => {
  const dash = useDashboardAuth();
  const token = useTokenDetailLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const t = token.value as Record<string, unknown>;
  const totalSupplyStr = String(t.totalSupply ?? "");
  const cat = String(t.category || "");
  const seg = CATEGORY_DASHBOARD_PATH[cat];

  useSpeak({ runtimeAssets: ["tokenPage"] });
  const tp = useComputed$(() => {
    const tr = inlineTranslate();
    const row = token.value as Record<string, unknown>;
    const c = String(row.category || "");
    const fb = CAT_LABEL[c] || c;
    const catTr = tr(`categories.${c}@@${fb}`);
    const left = tr("backToLeft@@← Back to ");
    const right = tr("backToRight@@ list");
    return {
      categoryLabel: catTr,
      backTo: `${left}${catTr}${right}`.trim(),
      price: tr("price@@Price"),
      volume: tr("volume@@Volume"),
      fdv: tr("fdv@@FDV"),
      contract: tr("contract@@Contract"),
      decimalsShort: tr("decimalsShort@@dec"),
      supply: tr("supply@@supply"),
      priceChart: tr("priceChart@@Price chart"),
      chartHintDex: tr(
        "chartHintDex@@On-chain chart by default (Dexscreener). CEX tab for TradingView — first pair ",
      ),
      chartHintTv: tr("chartHintTv@@TradingView · first pair "),
      chartHintSuffix: tr("chartHintSuffix@@ — switch CEX pair if it does not load."),
      tabTransfers: tr("tabTransfers@@Transfers"),
      tabHolders: tr("tabHolders@@Holders"),
      tabTraders: tr("tabTraders@@Top traders / PnL"),
      tabSwaps: tr("tabSwaps@@DEX swaps"),
      recentTransfers: tr("recentTransfers@@Recent transfers"),
      snapshotChainLabel: tr("snapshotChainLabel@@Red de referencia"),
      colTx: tr("colTx@@Tx"),
      colFrom: tr("colFrom@@From"),
      colTo: tr("colTo@@To"),
      colValue: tr("colValue@@Value"),
      noTransfersSnapshot: tr("noTransfersSnapshot@@No recent transfers available."),
      transfersSnapshotFailed: tr(
        "transfersSnapshotFailed@@Could not load cached transfers.",
      ),
      colWhen: tr("colWhen@@When"),
      colBlock: tr("colBlock@@Block"),
      holderRank: tr("holderRank@@#"),
      holderOwner: tr("holderOwner@@Owner"),
      supplyPct: tr("supplyPct@@% supply"),
      topTradersPnl: tr("topTradersPnl@@Top traders (PnL)"),
      tradersNoData: tr(
        "tradersNoData@@Moralis may not publish realized PnL for this token yet, or the pair is thin. Live fetch runs by default when trader data is missing from cache; set MORALIS_TOKEN_PAGE_LIVE_TRADERS=0 to disable.",
      ),
      swapsFeedHeading: tr("swapsFeedHeading@@Recent DEX swaps"),
      swapsSectionSubtitle: tr(
        "swapsSectionSubtitle@@Indexed swap fills from Moralis for this chain; they are cached after the first load. Optional backfill: set MORALIS_SYNC_TOKEN_SWAPS=1 in the daily sync. Live fetch is on by default — set MORALIS_TOKEN_PAGE_LIVE_SWAPS=0 to disable.",
      ),
      swapsEnvHint: tr(
        "swapsEnvHint@@Could not load swap rows (API error, thin liquidity, or Moralis has not indexed this pool). Live fetch is on by default; set MORALIS_TOKEN_PAGE_LIVE_SWAPS=0 to skip. You can also enable MORALIS_SYNC_TOKEN_SWAPS in the daily sync.",
      ),
      swapsLoadFailedTitle: tr("swapsLoadFailedTitle@@Could not load swaps"),
      resourcesCardTitle: tr("resourcesCardTitle@@Resources & information"),
      resourcesQuickLinks: tr("resourcesQuickLinks@@Quick links"),
      resourcesAbout: tr("resourcesAbout@@About"),
      resourcesContract: tr("resourcesContract@@Contract"),
      resourcesCopy: tr("resourcesCopy@@Copy"),
      resourcesCopied: tr("resourcesCopied@@Copied"),
      resourcesSeeMore: tr("resourcesSeeMore@@Show full description"),
      resourcesSeeLess: tr("resourcesSeeLess@@Collapse"),
      resourcesCreated: tr("resourcesCreated@@Contract deployed"),
      resourcesOtherChains: tr("resourcesOtherChains@@Bridged / other chains"),
      resourcesWebsite: tr("resourcesWebsite@@Website"),
      resourcesExplorer: tr("resourcesExplorer@@Explorer"),
      resourcesDex: tr("resourcesDex@@DEX chart"),
      resourcesVerified: tr("resourcesVerified@@Verified"),
    };
  });
  const back = seg ? `/${L}/${seg}/` : `/${L}/home/`;
  const tvSymbols = buildTradingViewSymbolCandidates(String(t.symbol ?? ""), String(t.network ?? ""));
  const dexUrl = dexScreenerPathForNetwork(String(t.network), String(t.address));
  const dexEmbedUrl = dexScreenerEmbedUrl(String(t.network), String(t.address));
  const moralisChain = String(t.moralisChain ?? "base");
  const tab = useSignal<TabId>("overview");
  const resourceDescExpanded = useSignal(false);
  const resourcesCopied = useSignal(false);
  /** Sidebar ref + dynamic chart height: chart matches sidebar height on lg+ screens. */
  const sidebarRef = useSignal<HTMLElement>();
  const chartHeight = useSignal<number>(620);
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const el = sidebarRef.value;
    if (!el || typeof window === "undefined") return;
    const apply = () => {
      const isLg = window.matchMedia("(min-width: 1024px)").matches;
      if (!isLg) {
        chartHeight.value = 620;
        return;
      }
      /** ~110px = chart header (price/Δ/sparkline) + chart-toolbar + paddings; clamp to sane range. */
      const target = Math.max(620, Math.min(1200, el.offsetHeight - 110));
      if (Math.abs(target - chartHeight.value) > 8) chartHeight.value = target;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    const onResize = () => apply();
    window.addEventListener("resize", onResize);
    cleanup(() => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    });
  });
  const syncedAtSec = t.syncedAt != null ? Number(t.syncedAt) : NaN;
  const syncedAtLabel = Number.isFinite(syncedAtSec)
    ? new Date(syncedAtSec * 1000).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  const cmcId = t.cmcId != null ? Number(t.cmcId) : NaN;
  const cmcQuotes = t.cmcQuotes as { ok: boolean; data?: unknown; error?: string };
  const cmcInfo = t.cmcInfo as { ok: boolean; data?: unknown; error?: string };
  const live =
    Number.isFinite(cmcId) && cmcQuotes?.ok !== false ? cmcUsdQuote(cmcQuotes.data, cmcId) : null;
  const urls = Number.isFinite(cmcId) && cmcInfo?.ok !== false ? cmcInfoUrls(cmcInfo.data, cmcId) : {};

  const topGainers = t.topGainers as { ok: boolean; data?: unknown; error?: string };
  const owners = t.owners as { ok: boolean; data?: unknown; error?: string };
  const gainRows = topGainers?.ok ? moralisResultRows(topGainers.data) : [];
  const holderRows = owners?.ok ? moralisResultRows(owners.data) : [];

  const mt = t.moralisTransfers as { ok: boolean; data?: unknown; error?: string };
  const transferRows = mt?.ok ? moralisResultRows(mt.data) : [];

  const mm = t.moralisMeta as { ok: boolean; data?: unknown; error?: string };
  const metaList = mm?.ok ? moralisMetadataRows(mm.data) : [];
  const morMeta0 = metaList[0] as Record<string, unknown> | undefined;

  const mTokScore = t.moralisTokenScore as { ok?: boolean; data?: unknown; error?: string } | undefined;
  const mTokHist = t.moralisTokenScoreHistorical as { ok?: boolean; data?: unknown; error?: string } | undefined;
  const mTokPairs = t.moralisTokenPairs as { ok?: boolean; data?: unknown; error?: string } | undefined;
  const scoreRec = mTokScore?.ok ? moralisTokenScoreRecord(mTokScore.data) : null;
  const scoreMetrics =
    scoreRec?.metrics != null && typeof scoreRec.metrics === "object" && !Array.isArray(scoreRec.metrics)
      ? (scoreRec.metrics as Record<string, unknown>)
      : null;
  const histRows = mTokHist?.ok ? moralisScoreTimeseriesRows(mTokHist.data) : [];
  const pairRows = mTokPairs?.ok ? moralisResultRows(mTokPairs.data) : [];

  const mSwaps = t.moralisSwaps as { ok: boolean; data?: unknown; error?: string } | undefined;
  const swapRows = mSwaps?.ok ? moralisResultRows(mSwaps.data) : [];

  const mErc20Stats = t.moralisErc20Stats as { ok?: boolean; data?: unknown; error?: string } | undefined;
  const erc20StatsEntries = mErc20Stats?.ok ? moralisErc20StatsFlatEntries(mErc20Stats.data) : [];

  const nInfoSnap = (t.nansenTokenInformation as Record<string, unknown> | null) ?? null;
  const nIndicatorsSnap = (t.nansenIndicators as Record<string, unknown> | null) ?? null;
  const nWhoSnap = (t.nansenWhoBoughtSold as Record<string, unknown> | null) ?? null;
  const nTransfersSnap = (t.nansenTransfers as Record<string, unknown> | null) ?? null;
  const nPerpSnap = (t.nansenPerpPnl as Record<string, unknown> | null) ?? null;
  const nOhlcvSnap = (t.nansenTokenOhlcv as Record<string, unknown> | null) ?? null;

  const tokenDbId = Number(t.id);
  const tokenAddrLower = String(t.address || "").trim().toLowerCase();
  const isEvmContract = /^0x[a-f0-9]{40}$/.test(tokenAddrLower);
  const nansenTokenMatches = String(nInfoSnap?.token ?? "").toLowerCase() === tokenAddrLower;
  const nInfoRec = nansenTokenMatches ? nansenDataObject(nInfoSnap?.data) : null;
  const nInfoDetails =
    nInfoRec?.token_details && typeof nInfoRec.token_details === "object"
      ? (nInfoRec.token_details as Record<string, unknown>)
      : null;
  const nInfoSpot =
    nInfoRec?.spot_metrics && typeof nInfoRec.spot_metrics === "object"
      ? (nInfoRec.spot_metrics as Record<string, unknown>)
      : null;
  const nIndicators = nansenTokenMatches ? nansenDataObject(nIndicatorsSnap?.data) : null;
  const nRiskIndicators = Array.isArray(nIndicators?.risk_indicators)
    ? (nIndicators?.risk_indicators as Record<string, unknown>[])
    : [];
  const nRewardIndicators = Array.isArray(nIndicators?.reward_indicators)
    ? (nIndicators?.reward_indicators as Record<string, unknown>[])
    : [];
  const nWhoRows = nansenTokenMatches ? nansenDataRows(nWhoSnap?.data) : [];
  const nTransferRows = nansenTokenMatches ? nansenDataRows(nTransfersSnap?.data) : [];
  const nPerpRows = Array.isArray((nPerpSnap?.data as Record<string, unknown> | null)?.data)
    ? (((nPerpSnap?.data as Record<string, unknown> | null)?.data ?? []) as Record<string, unknown>[])
    : [];
  const nOhlcvRows = nansenTokenMatches ? nansenDataRows(nOhlcvSnap?.data) : [];

  /** Build a 7-day sparkline from candle data (close prices), proportional to time. */
  const sparkPoints7d: { x: number; y: number }[] = (() => {
    if (!Array.isArray(nOhlcvRows) || nOhlcvRows.length < 2) return [];
    const cutoffMs = Date.now() - 7 * 24 * 3600 * 1000;
    const out: { x: number; y: number }[] = [];
    for (const r of nOhlcvRows) {
      const tsRaw = r.interval_start ?? r.time ?? r.timestamp;
      if (tsRaw == null) continue;
      const ts = Date.parse(String(tsRaw));
      if (!Number.isFinite(ts) || ts < cutoffMs) continue;
      const closeNum = Number(r.close ?? r.c);
      if (!Number.isFinite(closeNum)) continue;
      out.push({ x: ts, y: closeNum });
    }
    out.sort((a, b) => a.x - b.x);
    return out;
  })();

  const setOverview = $(() => {
    tab.value = "overview";
  });
  const addingFavorite = useSignal(false);
  const setHolders = $(() => {
    tab.value = "holders";
  });
  const setTraders = $(() => {
    tab.value = "traders";
  });
  const setSwaps = $(() => {
    tab.value = "swaps";
  });

  const tabBtn = (id: TabId, label: string, onSelect: () => void) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab.value === id}
      class={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        tab.value === id ? "bg-[#04E6E6] text-black" : "bg-[#043234] text-slate-200 hover:bg-[#054a4e] hover:text-white"
      }`}
      onClick$={onSelect}
    >
      {label}
    </button>
  );

  return (
    <div class="mx-auto w-full max-w-[1800px] 2xl:max-w-[2200px]">
      {/* Principal: resumen + chart siempre visibles arriba; las pestañas solo cambian el bloque inferior. */}
      <div class="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-3 mb-2 bg-[#000D0E]/97 backdrop-blur-md border-b border-[#043234]/60">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
          <Link href={back} class="text-sm font-medium text-cyan-200 hover:text-cyan-50 underline-offset-2 hover:underline inline-block">
            {tp.value.backTo}
          </Link>
          {dash.value.hasPro ? (
            <Link
              href={`/${L}/alerts/?token=${String(t.id ?? "")}`}
              class="text-xs font-medium text-amber-100/90 hover:text-amber-50 underline-offset-2 hover:underline"
            >
              Pro · Alerta de precio
            </Link>
          ) : null}
          <button
            type="button"
            class="text-xs font-medium text-[#04E6E6] hover:text-cyan-100 underline-offset-2 hover:underline disabled:opacity-60"
            disabled={addingFavorite.value}
            onClick$={async () => {
              addingFavorite.value = true;
              try {
                const r = await upsertWatchlistItem({
                  itemType: "token",
                  itemKey: String(t.id),
                  label: `${String(t.name)} (${String(t.symbol)})`,
                  meta: { symbol: String(t.symbol), name: String(t.name), logo: String(t.logo ?? "") },
                });
                if (!r.ok && r.requiresLogin) {
                  window.alert("Debes iniciar sesión para guardar favoritos.");
                }
              } finally {
                addingFavorite.value = false;
              }
            }}
          >
            ☆ Guardar en favoritos
          </button>
        </div>
      </div>

      <div class="mt-2 grid gap-4 lg:grid-cols-12 items-start">
        <aside ref={sidebarRef} class="lg:col-span-4 xl:col-span-3 2xl:col-span-2 lg:sticky lg:top-2 lg:self-start space-y-3">
        <div class="rounded-2xl border border-[#043234]/90 bg-gradient-to-br from-[#001a1c] via-[#001318] to-[#000a0c] p-4 sm:p-5 shadow-lg shadow-black/30 ring-1 ring-white/[0.04]">
          <div class="flex flex-col gap-4">
            <div class="flex gap-3 sm:gap-4 min-w-0 flex-1">
              <TokenLogoImg
                src={String(t.logo ?? "")}
                symbol={String(t.symbol)}
                size={64}
                class="shrink-0 rounded-2xl ring-2 ring-[#043234]/70 shadow-md self-start"
              />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h1 class="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {String(t.name)}{" "}
                    <span class="text-cyan-200 font-semibold">({String(t.symbol)})</span>
                  </h1>
                  {live?.rank != null ? (
                    <span
                      class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-100 border border-amber-300/35"
                      title="Ranking global por capitalización de mercado"
                    >
                      Rank #{live.rank}
                    </span>
                  ) : null}
                  <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-400/15 text-cyan-100 border border-cyan-300/35">
                    {tp.value.categoryLabel}
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-1.5 leading-relaxed flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span class="capitalize">{String(t.network)}</span>
                  {t.cmcId != null ? (
                    <>
                      <span class="text-[#043234]">·</span>
                      <span class="font-mono text-slate-400">#{String(t.cmcId)}</span>
                    </>
                  ) : null}
                  {t.slug ? (
                    <>
                      <span class="text-[#043234]">·</span>
                      <span class="font-mono text-slate-400 truncate max-w-[10rem]" title={String(t.slug)}>
                        {String(t.slug)}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div class="w-full">
              {(() => {
                const priceVal = live?.price ?? Number(t.price);
                const pct24 = live?.pct24 != null ? Number(live.pct24) : NaN;
                const pct24Valid = Number.isFinite(pct24);
                const tone = pct24Valid
                  ? pct24 >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                  : "text-slate-300";
                const pillBg = pct24Valid
                  ? pct24 >= 0
                    ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
                    : "bg-rose-500/15 border-rose-400/40 text-rose-200"
                  : "bg-black/30 border-[#043234]/40 text-slate-300";
                const arrow = pct24Valid ? (pct24 >= 0 ? "▲" : "▼") : "·";
                return (
                  <div class="flex flex-col items-start gap-2">
                    <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {tp.value.price} (USD)
                    </div>
                    <div class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span class={`text-3xl sm:text-[2rem] xl:text-[2.1rem] font-extrabold tabular-nums tracking-tight leading-none break-all ${tone}`}>
                        ${formatTokenUsdPrice(fmtScalar(priceVal))}
                      </span>
                      {pct24Valid ? (
                        <span class={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-sm font-bold tabular-nums ${pillBg}`}>
                          <span class="text-[10px]">{arrow}</span>
                          {Math.abs(pct24).toFixed(2)}% (24h)
                        </span>
                      ) : null}
                    </div>
                    {sparkPoints7d.length >= 2 ? (
                      <div class="flex items-center gap-2">
                        <span class="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">7d</span>
                        <MiniSparkline points={sparkPoints7d} width={150} height={36} />
                      </div>
                    ) : null}
                    {live?.updated ? (
                      <p class="text-[10px] text-slate-500 leading-tight">
                        {formatDateMaybe(live.updated)}
                      </p>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          </div>

          <div class="mt-4 space-y-3">
            <div>
              <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Variación
              </div>
              <div class="grid grid-cols-4 gap-1.5">
                {[
                  { lbl: "1h", v: live?.pct1h ?? fmtScalar(t.percentChange1h) },
                  { lbl: "24h", v: live?.pct24 ?? fmtScalar(t.percentChange24h) },
                  { lbl: "7d", v: live?.pct7d ?? fmtScalar(t.percentChange7d) },
                  { lbl: "30d", v: live?.pct30d ?? fmtScalar(t.percentChange30d) },
                ].map((p) => {
                  const n = Number(p.v);
                  const ok = Number.isFinite(n);
                  return (
                    <div
                      key={p.lbl}
                      class={`flex flex-col items-center justify-center rounded-xl px-2 py-1.5 border ${
                        ok
                          ? n >= 0
                            ? "border-emerald-400/30 bg-emerald-500/10"
                            : "border-rose-400/30 bg-rose-500/10"
                          : "border-[#043234]/45 bg-black/30"
                      }`}
                    >
                      <span class="text-[9px] font-semibold uppercase text-slate-400 tracking-wide">{p.lbl}</span>
                      <span class={`text-[12px] font-bold tabular-nums ${percentToneClass(p.v as number | string | null | undefined)}`}>
                        {ok ? formatSignedPercent(p.v as number | string | null | undefined) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Estadísticas clave
              </div>
              <div class="flex flex-col divide-y divide-[#043234]/45 rounded-lg border border-[#0d5357]/55 bg-black/35 text-[11px] overflow-hidden">
                {(() => {
                  const mcap = live?.mcap ?? fmtScalar(t.marketCap);
                  const vol24 = live?.vol24 ?? fmtScalar(t.volume);
                  const fdv = live?.fdv ?? fmtScalar(t.fullyDilutedValuation);
                  const mcapN = Number(mcap);
                  const volN = Number(vol24);
                  const ratio = Number.isFinite(mcapN) && mcapN > 0 && Number.isFinite(volN)
                    ? (volN / mcapN) * 100
                    : NaN;
                  const circ = live?.circSupply ?? fmtScalar(t.circulatingSupply);
                  const total = live?.totalSupply ?? fmtScalar(t.totalSupply);
                  const maxSup = live?.maxSupply ?? fmtScalar(t.maxSupply);
                  const circN = Number(circ);
                  const totN = Number(total);
                  const supplyPct = Number.isFinite(circN) && Number.isFinite(totN) && totN > 0
                    ? (circN / totN) * 100
                    : NaN;
                  const cells: { label: string; val: string; extra?: string; bar?: number }[] = [
                    {
                      label: "Market cap",
                      val: Number.isFinite(mcapN) ? formatUsdLiquidity(mcapN) : "—",
                      extra:
                        live?.marketCapDominance != null && Number.isFinite(live.marketCapDominance)
                          ? `Dom. ${live.marketCapDominance.toFixed(2)}%`
                          : undefined,
                    },
                    {
                      label: "Volumen 24h",
                      val: Number.isFinite(volN) ? formatUsdLiquidity(volN) : "—",
                    },
                    {
                      label: "Vol / Mcap",
                      val: Number.isFinite(ratio) ? `${ratio.toFixed(2)}%` : "—",
                      bar: Number.isFinite(ratio) ? Math.min(100, ratio) : undefined,
                    },
                    {
                      label: "FDV",
                      val: Number.isFinite(Number(fdv)) ? formatUsdLiquidity(Number(fdv)) : "—",
                    },
                    {
                      label: "Circulating",
                      val: Number.isFinite(circN) ? formatTokenSupply(circN) : "—",
                      extra: Number.isFinite(supplyPct) ? `${supplyPct.toFixed(1)}% del total` : undefined,
                      bar: Number.isFinite(supplyPct) ? Math.min(100, supplyPct) : undefined,
                    },
                    {
                      label: "Total supply",
                      val: Number.isFinite(Number(total)) ? formatTokenSupply(Number(total)) : "—",
                      extra: Number.isFinite(Number(maxSup)) ? `Max: ${formatTokenSupply(Number(maxSup))}` : "Sin max",
                    },
                  ];
                  return cells.map((c) => (
                    <div
                      key={c.label}
                      class="flex items-center justify-between gap-3 px-2.5 py-2 hover:bg-black/30 transition-colors"
                    >
                      <div class="flex flex-col min-w-0">
                        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                          {c.label}
                        </span>
                        {c.extra ? (
                          <span class="text-[9px] text-slate-500 truncate" title={c.extra}>
                            {c.extra}
                          </span>
                        ) : null}
                      </div>
                      <div class="flex flex-col items-end shrink-0 min-w-0">
                        <span class="text-[12px] font-semibold text-white tabular-nums leading-tight truncate max-w-[8rem]">
                          {c.val}
                        </span>
                        {c.bar != null ? (
                          <div class="mt-1 h-[3px] w-20 rounded-full bg-[#043234]/70 overflow-hidden">
                            <div
                              class="h-full rounded-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-300"
                              style={{ width: `${c.bar}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {scoreRec ? (
            <div class="mt-3 rounded-lg border border-[#0d5357]/55 bg-black/35 p-2.5">
              <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Calidad del token
              </div>
              {(() => {
                const sc = scoreRec.score != null ? Number(scoreRec.score) : NaN;
                const valid = Number.isFinite(sc);
                const tier = !valid ? "—" : sc >= 80 ? "Excelente" : sc >= 60 ? "Buena" : sc >= 40 ? "Mixta" : "Riesgo";
                const tierColor = !valid
                  ? "text-slate-300"
                  : sc >= 80
                    ? "text-emerald-300"
                    : sc >= 60
                      ? "text-cyan-300"
                      : sc >= 40
                        ? "text-amber-300"
                        : "text-rose-300";
                const barColor = !valid
                  ? "from-slate-500 to-slate-400"
                  : sc >= 80
                    ? "from-emerald-500 to-emerald-300"
                    : sc >= 60
                      ? "from-cyan-500 to-cyan-300"
                      : sc >= 40
                        ? "from-amber-500 to-amber-300"
                        : "from-rose-500 to-rose-300";
                const w = valid ? Math.max(0, Math.min(100, sc)) : 0;
                return (
                  <div class="space-y-2">
                    <div class="flex items-baseline justify-between gap-2">
                      <span class={`text-2xl font-extrabold tabular-nums leading-none ${tierColor}`}>
                        {valid ? sc.toFixed(0) : "—"}
                      </span>
                      <span class={`text-[10px] font-semibold uppercase tracking-wider ${tierColor}`}>{tier}</span>
                    </div>
                    <div class="h-[5px] w-full rounded-full bg-[#043234]/70 overflow-hidden">
                      <div
                        class={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
              {nRiskIndicators.length > 0 || nRewardIndicators.length > 0 ? (
                <div class="mt-2 space-y-1.5">
                  {nRewardIndicators.length > 0 ? (
                    <div class="flex flex-wrap items-center gap-1">
                      <span class="text-[9px] font-semibold uppercase tracking-wider text-emerald-400/90 mr-1">+</span>
                      {nRewardIndicators.slice(0, 3).map((r, i) => (
                        <span
                          key={`mini-rw-${i}`}
                          class="text-[9px] font-medium px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 truncate max-w-[8.5rem]"
                          title={String(r.indicator_type ?? "")}
                        >
                          {String(r.indicator_type ?? "—")}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {nRiskIndicators.length > 0 ? (
                    <div class="flex flex-wrap items-center gap-1">
                      <span class="text-[9px] font-semibold uppercase tracking-wider text-rose-400/90 mr-1">!</span>
                      {nRiskIndicators.slice(0, 3).map((r, i) => (
                        <span
                          key={`mini-rk-${i}`}
                          class="text-[9px] font-medium px-1.5 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-200 truncate max-w-[8.5rem]"
                          title={String(r.indicator_type ?? "")}
                        >
                          {String(r.indicator_type ?? "—")}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {(() => {
            const socialEntries: { label: string; href: string }[] = [];
            if (morMeta0?.links && typeof morMeta0.links === "object" && !Array.isArray(morMeta0.links)) {
              for (const [k, v] of Object.entries(morMeta0.links as Record<string, unknown>)) {
                const norm = k.toLowerCase();
                if (norm === "moralis" || norm === "nansen" || norm === "cmc" || norm === "coinmarketcap") continue;
                const href = firstLinkHref(v);
                if (!href) continue;
                if (norm === "website" || norm === "homepage") continue;
                socialEntries.push({ label: norm.charAt(0).toUpperCase() + norm.slice(1), href });
              }
            }
            const categories = Array.isArray(morMeta0?.categories) ? (morMeta0!.categories as unknown[]).map((x) => String(x)).filter(Boolean) : [];
            const isVerified = morMeta0?.verified_contract === true || String(morMeta0?.verified_contract) === "true";
            const isSpam = morMeta0?.possible_spam === true || String(morMeta0?.possible_spam) === "true";
            const createdRaw = morMeta0?.created_at;
            const hasAddr = Boolean(String(t.address || "").trim());
            const hasAnything =
              hasAddr ||
              urls.website ||
              urls.explorer ||
              urls.desc ||
              dexUrl ||
              socialEntries.length > 0 ||
              categories.length > 0 ||
              isVerified ||
              isSpam ||
              createdRaw;
            if (!hasAnything) return null;
            const descText = urls.desc ? String(urls.desc) : "";
            const descLong = descText.length > 280;
            const sym = String(t.symbol ?? "");
            const netLabel = String(t.network ?? "—");
            return (
              <div class="mt-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#001f24]/95 via-[#001319] to-[#00080c] p-4 shadow-xl shadow-black/40 ring-1 ring-white/[0.04] space-y-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="flex items-start gap-3 min-w-0">
                    <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/25 to-cyan-600/10 text-cyan-200 ring-1 ring-cyan-400/35">
                      <LuLayers class="h-5 w-5" />
                    </span>
                    <div class="min-w-0">
                      <h3 class="text-sm font-bold tracking-tight text-white leading-tight">{tp.value.resourcesCardTitle}</h3>
                      <p class="mt-1 text-[11px] text-slate-400 leading-snug">
                        <span class={`inline-flex items-center gap-1 rounded-md px-1.5 py-px ${chainBadgeClass(moralisChain)}`}>
                          {netLabel}
                        </span>
                        {sym ? (
                          <span class="text-slate-500">
                            {" "}
                            · {sym}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center justify-end gap-1.5">
                    {isVerified ? (
                      <span class="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                        <LuBadgeCheck class="h-3.5 w-3.5" />
                        {tp.value.resourcesVerified}
                      </span>
                    ) : null}
                    {isSpam ? (
                      <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/35">
                        Spam?
                      </span>
                    ) : null}
                  </div>
                </div>

                {hasAddr ? (
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#0d5357]/55 bg-[#000d10]/80 px-3 py-2.5">
                    <div class="min-w-0 flex-1">
                      <div class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{tp.value.resourcesContract}</div>
                      <code class="mt-0.5 block font-mono text-[12px] text-cyan-100/95 truncate" title={String(t.address)}>
                        {String(t.address)}
                      </code>
                    </div>
                    <button
                      type="button"
                      class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-500/20 transition-colors"
                      aria-label={tp.value.resourcesCopy}
                      onClick$={$(async () => {
                        try {
                          await navigator.clipboard.writeText(String(t.address));
                          resourcesCopied.value = true;
                          window.setTimeout(() => {
                            resourcesCopied.value = false;
                          }, 2000);
                        } catch {
                          /** clipboard denied */
                        }
                      })}
                    >
                      <LuCopy class="h-3.5 w-3.5" />
                      {resourcesCopied.value ? tp.value.resourcesCopied : tp.value.resourcesCopy}
                    </button>
                  </div>
                ) : null}

                {(urls.website || urls.explorer || dexUrl || socialEntries.length > 0) ? (
                  <div>
                    <div class="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      <LuLink2 class="h-3.5 w-3.5 text-violet-300/90" />
                      {tp.value.resourcesQuickLinks}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {urls.website ? (
                        <a
                          href={urls.website}
                          target="_blank"
                          rel="noreferrer"
                          class="group flex items-center gap-2 rounded-xl border border-[#0d5357]/55 bg-[#000d10]/70 px-3 py-2.5 text-[13px] font-semibold text-slate-100 transition-all hover:border-cyan-400/45 hover:bg-cyan-500/[0.08]"
                        >
                          <LuGlobe class="h-4 w-4 shrink-0 text-cyan-400" />
                          <span class="truncate">{tp.value.resourcesWebsite}</span>
                          <LuExternalLink class="ml-auto h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                        </a>
                      ) : null}
                      {urls.explorer ? (
                        <a
                          href={urls.explorer}
                          target="_blank"
                          rel="noreferrer"
                          class="group flex items-center gap-2 rounded-xl border border-[#0d5357]/55 bg-[#000d10]/70 px-3 py-2.5 text-[13px] font-semibold text-slate-100 transition-all hover:border-cyan-400/45 hover:bg-cyan-500/[0.08]"
                        >
                          <LuSearch class="h-4 w-4 shrink-0 text-sky-400" />
                          <span class="truncate">{tp.value.resourcesExplorer}</span>
                          <LuExternalLink class="ml-auto h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                        </a>
                      ) : null}
                      {dexUrl ? (
                        <a
                          href={dexUrl}
                          target="_blank"
                          rel="noreferrer"
                          class="group flex items-center gap-2 rounded-xl border border-[#0d5357]/55 bg-[#000d10]/70 px-3 py-2.5 text-[13px] font-semibold text-slate-100 transition-all hover:border-cyan-400/45 hover:bg-cyan-500/[0.08]"
                        >
                          <LuWaves class="h-4 w-4 shrink-0 text-emerald-400" />
                          <span class="truncate">{tp.value.resourcesDex}</span>
                          <LuExternalLink class="ml-auto h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                        </a>
                      ) : null}
                      {socialEntries.slice(0, 8).map((s, i) => (
                        <a
                          key={`soc-${i}`}
                          href={s.href}
                          target="_blank"
                          rel="noreferrer"
                          class="group flex items-center gap-2 rounded-xl border border-[#0d5357]/45 bg-black/35 px-3 py-2.5 text-[13px] font-medium text-slate-200 transition-all hover:border-violet-400/40 hover:bg-violet-500/[0.07]"
                        >
                          <LuLink2 class="h-4 w-4 shrink-0 text-violet-300/90" />
                          <span class="truncate">{s.label}</span>
                          <LuExternalLink class="ml-auto h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {categories.length > 0 ? (
                  <div class="flex flex-wrap gap-2">
                    {categories.slice(0, 8).map((c, i) => (
                      <span
                        key={`cat-${i}`}
                        class="rounded-full border border-slate-600/50 bg-slate-900/60 px-2.5 py-1 text-[11px] font-medium text-slate-200 shadow-sm truncate max-w-[14rem]"
                        title={c}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : null}
                {(() => {
                  const impls = Array.isArray(morMeta0?.implementations)
                    ? (morMeta0!.implementations as Record<string, unknown>[])
                    : [];
                  if (impls.length === 0) return null;
                  return (
                    <div class="rounded-xl border border-[#0d5357]/45 bg-black/30 px-3 py-2.5 space-y-2">
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {tp.value.resourcesOtherChains}
                        </span>
                        <span class="text-[10px] tabular-nums font-semibold text-slate-500">{impls.length}</span>
                      </div>
                      <div class="flex flex-wrap gap-1">
                        {impls.slice(0, 8).map((imp, i) => {
                          const chainHint = String(imp.chain ?? imp.chainName ?? "eth").toLowerCase();
                          const add = String(imp.address ?? "").trim();
                          const lab = String(imp.chainName ?? imp.chain ?? chainHint);
                          const isEvm = /^0x[a-fA-F0-9]{40}$/.test(add);
                          const colorCls = chainBadgeClass(chainHint);
                          if (isEvm) {
                            const exHref = `${txExplorerBase(chainHint)}/address/${add.toLowerCase()}`;
                            return (
                              <a
                                key={`impl-${i}`}
                                href={exHref}
                                target="_blank"
                                rel="noreferrer"
                                title={`${lab} · ${add}`}
                                class={`inline-flex max-w-[12rem] items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold transition-all hover:brightness-125 ${colorCls}`}
                              >
                                <span class="truncate">{lab}</span>
                                <span class="opacity-70">↗</span>
                              </a>
                            );
                          }
                          return (
                            <span
                              key={`impl-${i}`}
                              title={`${lab} · ${add}`}
                              class={`inline-flex max-w-[12rem] items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${colorCls}`}
                            >
                              <span class="truncate">{lab}</span>
                            </span>
                          );
                        })}
                        {impls.length > 8 ? (
                          <span class="inline-flex items-center rounded-md border border-[#043234]/80 bg-[#043234]/40 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">
                            +{impls.length - 8}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })()}
                {createdRaw ? (
                  <div class="flex items-center justify-between gap-3 rounded-xl border border-[#0d5357]/45 bg-black/25 px-3 py-2.5">
                    <span class="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <LuCalendar class="h-4 w-4 text-cyan-400/90 shrink-0" />
                      {tp.value.resourcesCreated}
                    </span>
                    <span class="text-[12px] font-medium text-slate-100 tabular-nums text-right" title={String(createdRaw)}>
                      {formatDateMaybe(createdRaw)}
                    </span>
                  </div>
                ) : null}
                {descText ? (
                  <div class="border-t border-cyan-500/15 pt-3">
                    <div class="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      <LuFileText class="h-3.5 w-3.5 text-slate-400" />
                      {tp.value.resourcesAbout}
                    </div>
                    <p
                      class={
                        resourceDescExpanded.value
                          ? "text-[12px] text-slate-300/95 leading-relaxed whitespace-pre-line"
                          : "text-[12px] text-slate-300/95 leading-relaxed line-clamp-6"
                      }
                      title={descLong && !resourceDescExpanded.value ? descText : undefined}
                    >
                      {descText}
                    </p>
                    {descLong ? (
                      <button
                        type="button"
                        class="mt-2 text-[11px] font-semibold text-cyan-400 hover:text-cyan-200 underline-offset-2 hover:underline"
                        onClick$={$(() => {
                          resourceDescExpanded.value = !resourceDescExpanded.value;
                        })}
                      >
                        {resourceDescExpanded.value ? tp.value.resourcesSeeLess : tp.value.resourcesSeeMore}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })()}

          <div class="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-black/25 border border-[#043234]/35 px-2.5 py-2 text-[11px]">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="text-slate-300 shrink-0 font-semibold uppercase text-[10px] tracking-wide">{tp.value.contract}</span>
              <code class="font-mono text-cyan-200 truncate" title={String(t.address)}>
                {shortenContract(String(t.address))}
              </code>
              <button
                type="button"
                class="shrink-0 rounded-md border border-[#043234]/60 bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-300 hover:text-cyan-100 hover:border-cyan-400/40"
                onClick$={async () => {
                  try {
                    await navigator.clipboard.writeText(String(t.address));
                  } catch {
                    /** clipboard might be blocked */
                  }
                }}
                aria-label="Copiar dirección del contrato"
                title="Copiar dirección"
              >
                Copy
              </button>
              {urls.explorer ? (
                <a
                  href={urls.explorer}
                  target="_blank"
                  rel="noreferrer"
                  class="shrink-0 rounded-md border border-[#043234]/60 bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-300 hover:text-cyan-100 hover:border-cyan-400/40"
                  title="Abrir en explorador"
                >
                  Explorer ↗
                </a>
              ) : null}
            </div>
            <div class="flex items-center gap-3 text-slate-400 shrink-0 border-t sm:border-t-0 sm:border-l border-[#043234]/40 pt-2 sm:pt-0 sm:pl-3">
              <span>
                <span class="text-slate-500">{tp.value.decimalsShort}</span> {String(t.decimals)}
              </span>
            </div>
          </div>
        </div>
        </aside>

        <section class="lg:col-span-8 xl:col-span-9 2xl:col-span-10 space-y-4 min-w-0">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold tracking-tight text-cyan-50">{tp.value.priceChart}</h2>
              <p class="text-xs text-slate-400 mt-1 leading-relaxed">
                {dexEmbedUrl ? tp.value.chartHintDex : tp.value.chartHintTv}
                <span class="font-mono text-slate-300">{tvSymbols[0]}</span>
                {dexEmbedUrl ? "." : tvSymbols.length > 1 ? tp.value.chartHintSuffix : null}
              </p>
            </div>
            {dexUrl ? (
              <a
                href={dexUrl}
                target="_blank"
                rel="noreferrer"
                class="text-xs font-medium text-cyan-200 hover:text-cyan-50 underline-offset-2 hover:underline shrink-0"
              >
                Dexscreener ↗
              </a>
            ) : null}
          </div>
          <div class="rounded-xl border border-[#043234]/80 overflow-hidden bg-[#0a1214] p-2">
            <TradingViewAdvancedChart
              key={`tv-${String(t.id)}`}
              symbols={tvSymbols}
              dexUrl={dexUrl}
              dexEmbedUrl={dexEmbedUrl}
              tokenAddress={String(t.address)}
              height={chartHeight.value}
            />
          </div>

          <div class="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">

          {erc20StatsEntries.length > 0 ? (
            <div class="mt-3 rounded-xl border border-[#0d5357]/70 bg-[#000f12]/80 p-3 shadow-md shadow-black/20">
              <h3 class="text-sm font-semibold tracking-tight text-cyan-50 mb-1">Métricas on-chain del token</h3>
              <p class="text-xs text-slate-400 mb-2 leading-relaxed">
                Datos agregados de holders y supply cuando están disponibles para este contrato.
              </p>
              <dl class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                {erc20StatsEntries.map(([k, v]) => (
                  <div key={k}>
                    <dt class="text-slate-400 font-medium truncate" title={k}>
                      {k}
                    </dt>
                    <dd class="text-slate-100 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {mTokHist != null && mTokHist.ok && histRows.length > 0 ? (
            <div class="mt-3 rounded-xl border border-[#043234]/60 bg-black/25 p-3">
              <h3 class="text-sm font-semibold tracking-tight text-cyan-50 mb-1">
                Score histórico
              </h3>
              <p class="text-xs text-slate-400 mb-2 leading-relaxed">
                Evolución del score cuando hay serie histórica disponible (p. ej. ventana 7d).
              </p>
              <div class="overflow-x-auto text-[11px]">
                <table class="w-full text-left font-mono">
                  <thead>
                    <tr class="border-b border-[#043234] text-slate-400 font-medium">
                      <th class="py-1.5 pr-2">Tiempo</th>
                      <th class="py-1.5">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {histRows.slice(-12).map((row, i) => {
                      const ts = String(row.timestamp ?? row.date ?? row.block_timestamp ?? row.t ?? i);
                      const sc = row.score ?? row.token_score ?? row.value;
                      return (
                        <tr key={`${ts}-${i}`} class="border-b border-[#043234]/35 text-slate-200">
                          <td class="py-1.5 pr-2 truncate max-w-[10rem]">{ts}</td>
                          <td class="py-1.5 tabular-nums">{sc != null ? String(sc) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {nInfoRec && (nInfoSpot?.total_holders != null || nInfoSpot?.volume_total_usd != null) ? (
            <div class="mt-3 rounded-xl border border-[#043234]/60 bg-black/25 p-3">
              <h3 class="text-sm font-semibold tracking-tight text-cyan-50 mb-2">
                Métricas adicionales
              </h3>
              <dl class="grid grid-cols-2 gap-2 text-[11px]">
                {nInfoSpot?.total_holders != null ? (
                  <div>
                    <dt class="text-slate-400 font-medium">Holders</dt>
                    <dd class="text-slate-100 tabular-nums">{Number(nInfoSpot.total_holders).toLocaleString(undefined)}</dd>
                  </div>
                ) : null}
                {nInfoSpot?.volume_total_usd != null ? (
                  <div>
                    <dt class="text-slate-400 font-medium">Volumen acumulado</dt>
                    <dd class="text-slate-100">{formatUsdLiquidity(fmtScalar(nInfoSpot.volume_total_usd))}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
          {(nRiskIndicators.length > 0 || nRewardIndicators.length > 0) ? (
            <div class="xl:col-span-2 2xl:col-span-2 mt-3 rounded-xl border border-[#043234]/60 bg-black/25 p-3">
              <h3 class="text-sm font-semibold tracking-tight text-cyan-50 mb-2">
                Indicadores de riesgo y recompensa
              </h3>
              <div class="grid gap-3 sm:grid-cols-2 text-[11px]">
                <div>
                  <p class="text-slate-300 font-semibold mb-1">Risk</p>
                  <ul class="space-y-1">
                    {nRiskIndicators.slice(0, 6).map((r, i) => (
                      <li key={`risk-${i}`} class="flex items-center justify-between gap-2">
                        <span class="text-slate-400">{String(r.indicator_type ?? "—")}</span>
                        <span class="text-slate-100 tabular-nums">{String(r.score ?? "—")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p class="text-slate-300 font-semibold mb-1">Reward</p>
                  <ul class="space-y-1">
                    {nRewardIndicators.slice(0, 6).map((r, i) => (
                      <li key={`reward-${i}`} class="flex items-center justify-between gap-2">
                        <span class="text-slate-400">{String(r.indicator_type ?? "—")}</span>
                        <span class="text-slate-100 tabular-nums">{String(r.score ?? "—")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
          {nOhlcvRows.length > 0 ? (
            <div class="xl:col-span-2 2xl:col-span-3 mt-3 rounded-xl border border-[#043234]/60 bg-black/25 p-3">
              <h3 class="text-sm font-semibold tracking-tight text-cyan-50 mb-2">
                Histórico de precio (últimas velas)
              </h3>
              <div class="overflow-x-auto text-[10px]">
                <table class="w-full text-left">
                  <thead>
                    <tr class="border-b border-[#043234] text-slate-400">
                      <th class="py-1.5 pr-2">Tiempo</th>
                      <th class="py-1.5 pr-2">Open</th>
                      <th class="py-1.5 pr-2">High</th>
                      <th class="py-1.5 pr-2">Low</th>
                      <th class="py-1.5 pr-2">Close</th>
                      <th class="py-1.5">Vol USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nOhlcvRows.slice(-10).map((r, i) => (
                      <tr key={`ohlcv-${i}`} class="border-b border-[#043234]/35 text-slate-200">
                        <td class="py-1.5 pr-2">{String(r.interval_start ?? "—")}</td>
                        <td class="py-1.5 pr-2">{String(r.open ?? "—")}</td>
                        <td class="py-1.5 pr-2">{String(r.high ?? "—")}</td>
                        <td class="py-1.5 pr-2">{String(r.low ?? "—")}</td>
                        <td class="py-1.5 pr-2">{String(r.close ?? "—")}</td>
                        <td class="py-1.5">{formatUsdLiquidity(fmtScalar(r.volume_usd))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          </div>
        </section>
      </div>

      <div class="mt-4 flex flex-wrap gap-2 border-b border-[#043234] pb-2" role="tablist" aria-label="Token sections">
        {tabBtn("overview", tp.value.tabTransfers, setOverview)}
        {tabBtn("holders", tp.value.tabHolders, setHolders)}
        {tabBtn("traders", tp.value.tabTraders, setTraders)}
        {tabBtn("swaps", tp.value.tabSwaps, setSwaps)}
      </div>

      {tab.value === "overview" ? (
        <section class="mt-6 rounded-2xl border border-[#0d5357]/70 bg-gradient-to-br from-[#001317] via-[#001a1c] to-[#000c10] p-4 sm:p-5 shadow-lg shadow-black/25" role="tabpanel">
          <header class="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold tracking-tight text-cyan-50">{tp.value.recentTransfers}</h2>
              <p class="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">
                On-chain ERC-20 transfers on <span class="font-mono text-cyan-100/90">{moralisChain}</span>
                {syncedAtLabel ? (
                  <span class="text-slate-500">
                    {" "}
                    · snapshot {syncedAtLabel}
                  </span>
                ) : null}
              </p>
            </div>
          </header>
          <div class="overflow-x-auto rounded-xl border border-[#0d5357]/60 bg-[#000d10]/55">
            <table class="w-full min-w-[880px] text-left text-[13px]">
              <thead class="sticky top-0 z-10 bg-[#00151a]/98 text-[10px] uppercase tracking-wide text-slate-400 backdrop-blur-sm border-b border-[#0d5357]/80">
                <tr>
                  <th class="px-3 py-2.5 font-semibold">{tp.value.colTx}</th>
                  <th class="px-3 py-2.5 font-semibold">{tp.value.colWhen}</th>
                  <th class="px-3 py-2.5 font-semibold text-right">{tp.value.colBlock}</th>
                  <th class="px-3 py-2.5 font-semibold">{tp.value.colFrom}</th>
                  <th class="px-3 py-2.5 font-semibold">{tp.value.colTo}</th>
                  <th class="px-3 py-2.5 font-semibold text-right">{tp.value.colValue}</th>
                </tr>
              </thead>
              <tbody class="text-slate-200">
                {transferRows.length > 0 ? (
                  transferRows.map((r: Record<string, unknown>, i: number) => {
                    const h = String(r.transaction_hash ?? r.hash ?? i);
                    const tsRaw = r.block_timestamp ?? r.blockTimestamp ?? r.timestamp;
                    const blk = r.block_number ?? r.blockNumber;
                    return (
                      <tr
                        key={h}
                        class="border-t border-[#043234]/35 odd:bg-black/[0.12] hover:bg-cyan-500/[0.06] transition-colors"
                      >
                        <td class="px-3 py-2.5 align-top">
                          <TxHashLink
                            locale={L}
                            moralisChain={moralisChain}
                            hash={h}
                            mode="hash10"
                            linkClass="font-mono text-[12px] font-medium text-cyan-200 hover:text-cyan-50 underline-offset-2 hover:underline"
                          />
                        </td>
                        <td class="px-3 py-2.5 align-top text-[12px] text-slate-300 whitespace-nowrap">
                          {formatDateMaybe(tsRaw)}
                        </td>
                        <td class="px-3 py-2.5 align-top text-right font-mono text-[11px] text-slate-400 tabular-nums">
                          {blk != null && String(blk).trim() ? String(blk) : "—"}
                        </td>
                        <td class="px-3 py-2.5 align-top max-w-[min(200px,28vw)]">
                          <EvmAddrLinks
                            locale={L}
                            moralisChain={moralisChain}
                            address={r.from_address}
                            variant="wallet"
                          />
                        </td>
                        <td class="px-3 py-2.5 align-top max-w-[min(200px,28vw)]">
                          <EvmAddrLinks
                            locale={L}
                            moralisChain={moralisChain}
                            address={r.to_address}
                            variant="wallet"
                          />
                        </td>
                        <td class="px-3 py-2.5 text-right tabular-nums text-slate-100 font-medium">
                          {formatCompactAmount(r.value_decimal ?? r.value)}
                        </td>
                      </tr>
                    );
                  })
                ) : mt?.ok ? (
                  <tr>
                    <td colSpan={6} class="px-3 py-12 text-center text-slate-400">
                      {tp.value.noTransfersSnapshot}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={6} class="px-3 py-12 text-center text-slate-400">
                      <p class="text-slate-200 mb-2 font-medium">{tp.value.transfersSnapshotFailed}</p>
                      {mt?.error ? (
                        <p class="text-slate-500 text-xs font-mono break-words max-w-xl mx-auto leading-relaxed">
                          {String(mt.error)}
                        </p>
                      ) : (
                        <p>{tp.value.noTransfersSnapshot}</p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {nTransferRows.length > 0 ? (
            <div class="mt-5">
              <h3 class="text-sm font-semibold tracking-tight text-cyan-50 mb-2">
                Transferencias destacadas (smart money / CEX / DEX)
              </h3>
              <div class="overflow-x-auto text-[11px]">
                <table class="w-full text-left">
                  <thead>
                    <tr class="border-b border-[#043234] text-slate-400">
                      <th class="py-1.5 pr-2">Time</th>
                      <th class="py-1.5 pr-2">From</th>
                      <th class="py-1.5 pr-2">To</th>
                      <th class="py-1.5 pr-2">Type</th>
                      <th class="py-1.5">USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nTransferRows.slice(0, 15).map((r, i) => (
                      <tr key={`nt-${i}`} class="border-b border-[#043234]/35 text-slate-200">
                        <td class="py-1.5 pr-2">{String(r.block_timestamp ?? "—")}</td>
                        <td class="py-1.5 pr-2 font-mono">{String(r.from_address ?? "—")}</td>
                        <td class="py-1.5 pr-2 font-mono">{String(r.to_address ?? "—")}</td>
                        <td class="py-1.5 pr-2">{String(r.transaction_type ?? "—")}</td>
                        <td class="py-1.5">{formatUsdLiquidity(fmtScalar(r.transfer_value_usd))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab.value === "holders" ? (
        <section class="mt-6 rounded-2xl border border-[#0d5357]/70 bg-gradient-to-br from-[#001317] via-[#001a1c] to-[#000c10] p-4 sm:p-5 shadow-lg shadow-black/25" role="tabpanel">
          <header class="mb-4">
            <h2 class="text-lg font-semibold tracking-tight text-cyan-50">{tp.value.tabHolders}</h2>
            <p class="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">
              Top token balances on <span class="font-mono text-cyan-100/90">{moralisChain}</span> (Moralis
              token owners).{""}
              {totalSupplyStr ? (
                <span class="text-slate-500"> % supply uses CMC total supply when available.</span>
              ) : null}
            </p>
          </header>
          <div class="overflow-x-auto rounded-xl border border-[#0d5357]/60 bg-[#000d10]/55">
            <table class="w-full min-w-[640px] text-left text-[13px]">
              <thead class="sticky top-0 z-10 bg-[#00151a]/98 text-[10px] uppercase tracking-wide text-slate-400 backdrop-blur-sm border-b border-[#0d5357]/80">
                <tr>
                  <th class="px-3 py-2.5 w-10 text-center font-semibold">{tp.value.holderRank}</th>
                  <th class="px-3 py-2.5 font-semibold">{tp.value.holderOwner}</th>
                  <th class="px-3 py-2.5 text-right font-semibold">{tp.value.colValue}</th>
                  <th class="px-3 py-2.5 text-right font-semibold">{tp.value.supplyPct}</th>
                </tr>
              </thead>
              <tbody class="text-slate-200">
                {owners?.ok && holderRows.length > 0 ? (
                  holderRows.map((r: Record<string, unknown>, idx: number) => {
                    const w = holderWallet(r);
                    const rawBal = r.balance_formatted ?? r.balance ?? r.owner_balance;
                    const pct = holderSharePct(rawBal, totalSupplyStr);
                    return (
                      <tr
                        key={w || JSON.stringify(r)}
                        class="border-t border-[#043234]/35 odd:bg-black/[0.12] hover:bg-violet-500/[0.05] transition-colors"
                      >
                        <td class="px-3 py-2.5 text-center text-[11px] font-semibold tabular-nums text-slate-500">
                          {idx + 1}
                        </td>
                        <td class="px-3 py-2.5 align-top">
                          {w ? (
                            <EvmAddrLinks locale={L} moralisChain={moralisChain} address={w} variant="wallet" />
                          ) : (
                            <span class="font-mono text-slate-500">—</span>
                          )}
                        </td>
                        <td class="px-3 py-2.5 text-right tabular-nums font-medium text-slate-100">
                          {formatCompactAmount(rawBal)}
                        </td>
                        <td class="px-3 py-2.5 text-right tabular-nums text-[12px] text-violet-200/95">
                          {pct ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                ) : owners?.ok ? (
                  <tr>
                    <td colSpan={4} class="px-3 py-12 text-center text-slate-400">
                      No hay holders en los datos actuales.
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={4} class="px-3 py-12 text-center text-slate-400">
                      Datos de holders no disponibles en este momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {nWhoRows.length > 0 ? (
            <div class="mt-5">
              <h3 class="text-sm font-semibold tracking-tight text-cyan-50 mb-2">
                Quién compró / vendió
              </h3>
              <div class="overflow-x-auto text-[11px]">
                <table class="w-full text-left">
                  <thead>
                    <tr class="border-b border-[#043234] text-slate-400">
                      <th class="py-1.5 pr-2">Address</th>
                      <th class="py-1.5 pr-2">Label</th>
                      <th class="py-1.5 pr-2">Bought USD</th>
                      <th class="py-1.5 pr-2">Sold USD</th>
                      <th class="py-1.5">Trade USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nWhoRows.slice(0, 20).map((r, i) => (
                      <tr key={`nwho-${i}`} class="border-b border-[#043234]/35 text-slate-200">
                        <td class="py-1.5 pr-2 font-mono">{String(r.address ?? "—")}</td>
                        <td class="py-1.5 pr-2">{String(r.address_label ?? "—")}</td>
                        <td class="py-1.5 pr-2">{formatUsdLiquidity(fmtScalar(r.bought_volume_usd))}</td>
                        <td class="py-1.5 pr-2">{formatUsdLiquidity(fmtScalar(r.sold_volume_usd))}</td>
                        <td class="py-1.5">{formatUsdLiquidity(fmtScalar(r.trade_volume_usd))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {nPerpRows.length > 0 ? (
            <div class="mt-5">
              <h3 class="text-sm font-semibold tracking-tight text-cyan-50 mb-2">
                Top traders de perpetuos
              </h3>
              <div class="overflow-x-auto text-[11px]">
                <table class="w-full text-left">
                  <thead>
                    <tr class="border-b border-[#043234] text-slate-400">
                      <th class="py-1.5 pr-2">Trader</th>
                      <th class="py-1.5 pr-2">Realized</th>
                      <th class="py-1.5 pr-2">Unrealized</th>
                      <th class="py-1.5 pr-2">ROI total</th>
                      <th class="py-1.5">Trades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nPerpRows.slice(0, 20).map((r, i) => (
                      <tr key={`nperp-${i}`} class="border-b border-[#043234]/35 text-slate-200">
                        <td class="py-1.5 pr-2 font-mono">{String(r.trader_address ?? "—")}</td>
                        <td class="py-1.5 pr-2">{formatUsdLiquidity(fmtScalar(r.pnl_usd_realised))}</td>
                        <td class="py-1.5 pr-2">{formatUsdLiquidity(fmtScalar(r.pnl_usd_unrealised))}</td>
                        <td class="py-1.5 pr-2">{formatSignedPercent(fmtScalar(r.roi_percent_total))}</td>
                        <td class="py-1.5">{String(r.nof_trades ?? "—")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab.value === "traders" ? (
        <section class="mt-6 rounded-2xl border border-[#0d5357]/70 bg-gradient-to-br from-[#001317] via-[#001a1c] to-[#000c10] p-4 sm:p-5 shadow-lg shadow-black/25" role="tabpanel">
          <header class="mb-4">
            <h2 class="text-lg font-semibold tracking-tight text-cyan-50">{tp.value.topTradersPnl}</h2>
            <p class="text-xs text-slate-400 mt-1 leading-relaxed max-w-2xl">
              Moralis “top profitable wallets” for this token (DEX-indexed). Empty lists are normal for thin pairs.
            </p>
          </header>
          <div class="overflow-x-auto rounded-xl border border-[#0d5357]/60 bg-[#000d10]/55">
            <table class="w-full min-w-[520px] text-left text-[13px]">
              <thead class="sticky top-0 z-10 bg-[#00151a]/98 text-[10px] uppercase tracking-wide text-slate-400 backdrop-blur-sm border-b border-[#0d5357]/80">
                <tr>
                  <th class="px-3 py-2.5 font-semibold">Wallet</th>
                  <th class="px-3 py-2.5 text-right font-semibold">Realized PnL</th>
                  <th class="px-3 py-2.5 text-right font-semibold">Trades</th>
                </tr>
              </thead>
              <tbody class="text-slate-200">
                {topGainers?.ok && gainRows.length > 0 ? (
                  gainRows.map((r: Record<string, unknown>, i: number) => {
                    const w = gainerWallet(r);
                    return (
                      <tr
                        key={w || i}
                        class="border-t border-[#043234]/35 odd:bg-black/[0.12] hover:bg-emerald-500/[0.05] transition-colors"
                      >
                        <td class="px-3 py-2.5 align-top">
                          {w ? (
                            <EvmAddrLinks locale={L} moralisChain={moralisChain} address={w} variant="wallet" />
                          ) : (
                            <span class="font-mono text-slate-500">—</span>
                          )}
                        </td>
                        <td class="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-200/95">
                          ${formatUsdBalance(fmtScalar(r.realized_profit_usd ?? r.realizedProfitUsd ?? 0))}
                        </td>
                        <td class="px-3 py-2.5 text-right tabular-nums text-slate-300">
                          {String(r.count_of_trades ?? r.trades ?? "—")}
                        </td>
                      </tr>
                    );
                  })
                ) : topGainers?.ok ? (
                  <tr>
                    <td colSpan={3} class="px-3 py-12 text-center text-slate-400">
                      <p class="text-slate-300 mb-2">No indexed trader rows for this token right now.</p>
                      <p class="text-[11px] text-slate-500 max-w-md mx-auto">{tp.value.tradersNoData}</p>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={3} class="px-3 py-12 text-center text-slate-400">
                      <p class="text-slate-300 mb-2">Datos de traders no disponibles en este momento.</p>
                      <p class="text-[11px] text-slate-500 max-w-md mx-auto">{tp.value.tradersNoData}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab.value === "swaps" ? (
        <section class="mt-6 rounded-2xl border border-[#0d5357]/70 bg-gradient-to-br from-[#001317] via-[#001a1c] to-[#000c10] p-4 sm:p-5 shadow-lg shadow-black/25" role="tabpanel">
          <header class="mb-4">
            <h2 class="text-lg font-semibold tracking-tight text-cyan-50">{tp.value.swapsFeedHeading}</h2>
            <p class="text-xs text-slate-400 mt-1 leading-relaxed max-w-2xl">
              <span class="font-mono text-cyan-100/90">{moralisChain}</span>
              <span class="text-slate-500"> · </span>
              {tp.value.swapsSectionSubtitle}
            </p>
          </header>
          <div class="overflow-x-auto rounded-xl border border-[#0d5357]/60 bg-[#000d10]/55">
            <table class="w-full min-w-[1100px] text-left text-[12px]">
              <thead class="sticky top-0 z-10 bg-[#00151a]/98 text-[10px] uppercase tracking-wide text-slate-400 backdrop-blur-sm border-b border-[#0d5357]/80">
                <tr>
                  <th class="px-2 py-2.5 font-semibold">Tx</th>
                  <th class="px-2 py-2.5 font-semibold">Time / block</th>
                  <th class="px-2 py-2.5 font-semibold">Tipo</th>
                  <th class="px-2 py-2.5 font-semibold">Sub</th>
                  <th class="px-2 py-2.5 font-semibold">Pair</th>
                  <th class="px-2 py-2.5 font-semibold">DEX</th>
                  <th class="px-2 py-2.5 font-semibold">Wallet</th>
                  <th class="px-2 py-2.5 text-right font-semibold">USD</th>
                  <th class="px-2 py-2.5 text-right font-semibold">Price</th>
                  <th class="px-2 py-2.5 font-semibold">Buy / Sell</th>
                </tr>
              </thead>
              <tbody class="text-slate-200">
                {mSwaps?.ok && swapRows.length > 0 ? (
                  swapRows.map((r: Record<string, unknown>, i: number) => {
                    const h = String(r.transactionHash ?? r.transaction_hash ?? i);
                    const w = String(r.walletAddress ?? r.wallet_address ?? "").toLowerCase();
                    const bought = r.bought as Record<string, unknown> | undefined;
                    const sold = r.sold as Record<string, unknown> | undefined;
                    const buyStr = formatSwapTokenSide(bought);
                    const sellStr = formatSwapTokenSide(sold);
                    const { when, block } = formatSwapBlockTime(r);
                    const sub = String(r.subCategory ?? r.sub_category ?? "—");
                    const pairAddr = String(r.pairAddress ?? r.pair_address ?? "").toLowerCase();
                    const pairIsAddr = /^0x[a-f0-9]{40}$/.test(pairAddr);
                    const exLogo = String(r.exchangeLogo ?? r.exchange_logo ?? "").trim();
                    const exName = String(r.exchangeName ?? r.exchange_name ?? "—");
                    const wLabel = String(r.walletAddressLabel ?? r.wallet_address_label ?? "").trim();
                    const entity = String(r.entity ?? "").trim();
                    const entityLogo = String(r.entityLogo ?? r.entity_logo ?? "").trim();
                    const bqpRaw = r.baseQuotePrice ?? r.base_quote_price;
                    const bqpStr =
                      bqpRaw != null && String(bqpRaw).trim() ? String(bqpRaw).trim() : "—";
                    return (
                      <tr
                        key={h}
                        class="border-t border-[#043234]/35 odd:bg-black/[0.12] hover:bg-cyan-500/[0.05] transition-colors"
                      >
                        <td class="px-2 py-2 align-top font-mono">
                          <TxHashLink
                            locale={L}
                            moralisChain={moralisChain}
                            hash={h}
                            mode="hash10"
                            linkClass="text-[11px] font-medium text-cyan-200 hover:text-cyan-50 underline-offset-2 hover:underline"
                          />
                        </td>
                        <td class="px-2 py-2 text-[10px] text-slate-300 align-top">
                          <div class="text-slate-100">{when}</div>
                          <div class="font-mono text-[9px] text-slate-500">{block}</div>
                        </td>
                        <td class="px-2 py-2 uppercase text-[10px] align-top">
                          {String(r.transactionType ?? r.transaction_type ?? "—")}
                        </td>
                        <td class="px-2 py-2 text-[10px] capitalize text-slate-300 align-top">{sub}</td>
                        <td class="px-2 py-2 align-top">
                          <div class="text-[11px]">{String(r.pairLabel ?? r.pair_label ?? "—")}</div>
                          {pairIsAddr ? (
                            <div class="mt-0.5">
                              <EvmAddrLinks
                                locale={L}
                                moralisChain={moralisChain}
                                address={pairAddr}
                                variant="contract"
                              />
                            </div>
                          ) : null}
                        </td>
                        <td class="px-2 py-2 align-top">
                          <div class="flex items-center gap-1.5">
                            {exLogo ? (
                              <img
                                src={exLogo}
                                alt=""
                                class="h-4 w-4 shrink-0 rounded object-contain bg-white/5"
                                loading="lazy"
                              />
                            ) : null}
                            <span class="text-[11px]">{exName}</span>
                          </div>
                        </td>
                        <td class="px-2 py-2 align-top">
                          {w ? (
                            <div class="flex flex-col gap-0.5">
                              <div class="flex items-center gap-1">
                                {entityLogo ? (
                                  <img
                                    src={entityLogo}
                                    alt=""
                                    class="h-4 w-4 shrink-0 rounded-full object-cover"
                                    loading="lazy"
                                  />
                                ) : null}
                                <EvmAddrLinks locale={L} moralisChain={moralisChain} address={w} variant="wallet" />
                              </div>
                              {wLabel || entity ? (
                                <span class="text-[9px] text-slate-400 line-clamp-2">
                                  {[wLabel, entity].filter(Boolean).join(" · ")}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td class="px-2 py-2 text-right tabular-nums align-top">
                          {r.totalValueUsd != null || r.total_value_usd != null
                            ? formatUsdLiquidity(fmtScalar(r.totalValueUsd ?? r.total_value_usd))
                            : "—"}
                        </td>
                        <td class="px-2 py-2 text-right font-mono text-[10px] tabular-nums text-slate-300 align-top">
                          {bqpStr}
                        </td>
                        <td class="px-2 py-2 text-[10px] text-slate-300 align-top">
                          <span class="text-emerald-400/90">+{buyStr}</span>
                          {" / "}
                          <span class="text-rose-400/80">−{sellStr}</span>
                        </td>
                      </tr>
                    );
                  })
                ) : mSwaps?.ok ? (
                  <tr>
                    <td colSpan={10} class="px-3 py-12 text-center text-slate-400">
                      Sin swaps disponibles para este token en el índice actual.
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={10} class="px-3 py-12 text-center text-slate-400">
                      <p class="text-slate-300 mb-2 font-medium">{tp.value.swapsLoadFailedTitle}</p>
                      <p class="text-[11px] text-slate-500 max-w-lg mx-auto leading-relaxed">{tp.value.swapsEnvHint}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {mTokPairs != null && mTokPairs.ok && pairRows.length > 0 ? (
        <section class="mt-6 rounded-2xl border border-[#0d5357]/80 bg-gradient-to-br from-[#001317] via-[#001a1c] to-[#000c10] p-4 sm:p-5 shadow-lg shadow-black/25">
          <header class="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30">
                <LuWaves class="h-5 w-5" />
              </span>
              <div class="min-w-0">
                <h2 class="text-base font-semibold text-cyan-50">Pares DEX</h2>
                <p class="mt-0.5 max-w-xl text-[11px] leading-snug text-slate-400">
                  Pares listados en exchanges descentralizados con su precio, variación 24h, liquidez y volumen.
                  Toca el contrato para abrir su ficha.
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 text-[10px] text-slate-400">
              <span class="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-emerald-300">
                {pairRows.filter((r) => !(r.inactive_pair === true || r.inactivePair === true)).length} activos
              </span>
              <span class="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-amber-300">
                {pairRows.filter((r) => r.inactive_pair === true || r.inactivePair === true).length} inactivos
              </span>
            </div>
          </header>
          <div class="overflow-x-auto rounded-xl border border-[#043234]/65 bg-[#000d10]/55">
            <table class="w-full min-w-[820px] text-[11px]">
              <thead class="bg-[#00151a]/95 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th class="px-3 py-2 text-left">DEX</th>
                  <th class="px-3 py-2 text-left">Par</th>
                  <th class="px-3 py-2 text-left">Contrato par</th>
                  <th class="px-3 py-2 text-right">Precio</th>
                  <th class="px-3 py-2 text-right">Δ 24h</th>
                  <th class="px-3 py-2 text-right">Liquidez</th>
                  <th class="px-3 py-2 text-right">Vol 24h</th>
                  <th class="px-3 py-2 text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pairRows.map((r, i) => {
                  const ex = String(
                    r.exchange_name ?? r.exchangeName ?? r.dex_name ?? r.name ?? r.dex ?? "—",
                  );
                  const exLogo = String(r.exchange_logo ?? r.exchangeLogo ?? "").trim();
                  const pairAddr = String(r.pair_address ?? r.pairAddress ?? "").toLowerCase();
                  const pairIsAddr = /^0x[a-f0-9]{40}$/.test(pairAddr);
                  const liq = metricNum(r, "liquidity_usd", "liquidityUsd", "total_liquidity_usd");
                  const vol24 = metricNum(r, "volume_24h_usd", "volume24hUsd", "volume_usd", "volumeUsd");
                  const volFallback = r.volume_usd ?? r.volumeUsd ?? r.volume_24h_usd ?? r.volume24hUsd;
                  const usdPrice = metricNum(r, "usd_price", "usdPrice");
                  const pct24 = metricNum(r, "usd_price_24hr_percent_change", "usdPrice24hrPercentChange");
                  const inactive = r.inactive_pair === true || r.inactivePair === true;
                  return (
                    <tr
                      key={String(r.pair_address ?? r.pairAddress ?? i)}
                      class={`border-t border-[#043234]/40 transition-colors hover:bg-cyan-500/[0.04] ${inactive ? "opacity-60" : ""}`}
                    >
                      <td class="px-3 py-2 align-middle">
                        <div class="flex items-center gap-2">
                          {exLogo ? (
                            <img
                              src={exLogo}
                              alt=""
                              class="h-5 w-5 shrink-0 rounded object-contain bg-white/5"
                              loading="lazy"
                            />
                          ) : (
                            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#043234]/60 text-[8px] font-bold uppercase text-slate-400">
                              {String(ex).charAt(0)}
                            </span>
                          )}
                          <span class="truncate font-medium text-slate-200">{ex}</span>
                        </div>
                      </td>
                      <td class="px-3 py-2 align-middle font-mono text-[10px] text-slate-200">{pairLabel(r)}</td>
                      <td class="px-3 py-2 align-middle font-mono text-[10px]">
                        {pairIsAddr ? (
                          <EvmAddrLinks
                            locale={L}
                            moralisChain={moralisChain}
                            address={pairAddr}
                            variant="contract"
                          />
                        ) : (
                          <span class="text-slate-600">—</span>
                        )}
                      </td>
                      <td class="px-3 py-2 text-right tabular-nums text-white">
                        {usdPrice != null ? `$${formatTokenUsdPrice(usdPrice)}` : "—"}
                      </td>
                      <td class={`px-3 py-2 text-right tabular-nums ${pct24 != null ? percentToneClass(pct24) : "text-slate-400"}`}>
                        {pct24 != null ? formatSignedPercent(pct24) : "—"}
                      </td>
                      <td class="px-3 py-2 text-right tabular-nums text-cyan-100">
                        {liq != null ? formatUsdLiquidity(liq) : "—"}
                      </td>
                      <td class="px-3 py-2 text-right tabular-nums text-slate-200">
                        {vol24 != null ? formatUsdLiquidity(vol24) : formatMetricScalar(volFallback)}
                      </td>
                      <td class="px-3 py-2 text-right">
                        {inactive ? (
                          <span class="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300">
                            <span class="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            inactivo
                          </span>
                        ) : (
                          <span class="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
                            <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            activo
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
});
