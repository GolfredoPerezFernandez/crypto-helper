import { $, component$, useComputed$, useSignal } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
// @ts-ignore qwik-speak types
import { useSpeak, inlineTranslate } from "qwik-speak";
import { LuShield } from "@qwikest/icons/lucide";
import { useDashboardAuth } from "../../../layout";
import { TokenLogoImg } from "~/components/crypto-dashboard/token-logo";
import { TradingViewAdvancedChart } from "~/components/crypto/tradingview-advanced-chart";
import { moralisChainFromNetworkLabel } from "~/server/crypto-ghost/moralis-chain";
import { parseTokenApiSnapshot } from "~/server/crypto-ghost/market-token-snapshot";
import { CATEGORY_DASHBOARD_PATH } from "~/server/crypto-ghost/market-category-constants";
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

/** Moralis batch price `securityScore` (0–100). */
function parseTokenSecurityScore(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function tokenSecurityScoreBadge(score: number): {
  label: string;
  hint: string;
  accentText: string;
  iconWrap: string;
  border: string;
  bg: string;
  shadow: string;
  barTrack: string;
  barFill: string;
} {
  if (score < 35) {
    return {
      label: "Alto riesgo",
      hint: "Pocas señales de confianza; extremar precaución.",
      accentText: "text-rose-200",
      iconWrap: "bg-rose-500/25 text-rose-100 ring-2 ring-rose-400/40",
      border: "border-rose-500/45",
      bg: "bg-gradient-to-br from-rose-950/80 via-[#1a0508]/90 to-black/40",
      shadow: "shadow-[0_0_28px_-4px_rgba(244,63,94,0.45)]",
      barTrack: "bg-black/50 ring-1 ring-rose-900/50",
      barFill: "bg-gradient-to-r from-rose-600 via-rose-500 to-orange-400",
    };
  }
  if (score < 55) {
    return {
      label: "Riesgo medio",
      hint: "Señales mixtas; revisa liquidez y contrato.",
      accentText: "text-orange-200",
      iconWrap: "bg-orange-500/20 text-orange-100 ring-2 ring-orange-400/35",
      border: "border-orange-500/40",
      bg: "bg-gradient-to-br from-orange-950/70 via-[#1a0f05]/85 to-black/40",
      shadow: "shadow-[0_0_24px_-6px_rgba(249,115,22,0.35)]",
      barTrack: "bg-black/50 ring-1 ring-orange-900/40",
      barFill: "bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400",
    };
  }
  if (score < 75) {
    return {
      label: "Aceptable",
      hint: "Nivel intermedio; conviene más due diligence.",
      accentText: "text-amber-200",
      iconWrap: "bg-amber-500/20 text-amber-100 ring-2 ring-amber-400/35",
      border: "border-amber-500/35",
      bg: "bg-gradient-to-br from-amber-950/55 via-[#0f1408]/80 to-black/35",
      shadow: "shadow-[0_0_20px_-8px_rgba(245,158,11,0.3)]",
      barTrack: "bg-black/50 ring-1 ring-amber-900/35",
      barFill: "bg-gradient-to-r from-amber-600 via-yellow-500 to-lime-400",
    };
  }
  if (score < 90) {
    return {
      label: "Bueno",
      hint: "Señales sólidas según el modelo de riesgo del proveedor.",
      accentText: "text-cyan-100",
      iconWrap: "bg-cyan-400/20 text-cyan-50 ring-2 ring-cyan-300/45",
      border: "border-cyan-400/40",
      bg: "bg-gradient-to-br from-[#043234]/90 via-[#021a1c]/90 to-black/40",
      shadow: "shadow-[0_0_26px_-6px_rgba(4,230,230,0.28)]",
      barTrack: "bg-black/50 ring-1 ring-[#043234]",
      barFill: "bg-gradient-to-r from-teal-600 via-[#04E6E6] to-cyan-300",
    };
  }
  return {
    label: "Excelente",
    hint: "Puntuación muy alta en el índice de seguridad.",
    accentText: "text-emerald-200",
    iconWrap: "bg-emerald-500/20 text-emerald-100 ring-2 ring-emerald-400/45",
    border: "border-emerald-500/40",
    bg: "bg-gradient-to-br from-emerald-950/75 via-[#03120c]/90 to-black/40",
    shadow: "shadow-[0_0_28px_-4px_rgba(52,211,153,0.4)]",
    barTrack: "bg-black/50 ring-1 ring-emerald-900/45",
    barFill: "bg-gradient-to-r from-emerald-600 via-green-400 to-[#04E6E6]",
  };
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
    try {
      return JSON.stringify(v);
    } catch {
      return "—";
    }
  }
  return String(v);
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

function shortenContract(addr: string): string {
  const a = String(addr).trim();
  if (a.length <= 18) return a;
  return `${a.slice(0, 10)}…${a.slice(-8)}`;
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

const TOKEN_ANALYTICS_WINDOWS = ["5m", "1h", "6h", "24h"] as const;

function tokenAnalyticsRecord(data: unknown): Record<string, unknown> | null {
  if (data == null || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.totalBuyVolume != null || o.total_buy_volume != null) return o;
  const inner = o.data;
  if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
    const n = inner as Record<string, unknown>;
    if (n.totalBuyVolume != null || n.total_buy_volume != null) return n;
  }
  return null;
}

function analyticsVolumeAt(vol: unknown, w: string): number | undefined {
  if (vol == null || typeof vol !== "object") return undefined;
  const o = vol as Record<string, unknown>;
  const v = o[w];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(String(v).replace(/,/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function analyticsScalarUsd(v: unknown): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  if (!Number.isFinite(n)) return "—";
  return formatUsdLiquidity(n);
}

function analyticsScalarPrice(v: unknown): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  if (!Number.isFinite(n)) return "—";
  return `$${formatTokenUsdPrice(n)}`;
}

type TokenAnalyticsMetricRow = {
  label: string;
  camel: string;
  snake: string;
  kind: "usd" | "pct";
};

const TOKEN_ANALYTICS_METRIC_ROWS: TokenAnalyticsMetricRow[] = [
  { label: "Vol. compra", camel: "totalBuyVolume", snake: "total_buy_volume", kind: "usd" },
  { label: "Vol. venta", camel: "totalSellVolume", snake: "total_sell_volume", kind: "usd" },
  { label: "Métrica compradores", camel: "totalBuyers", snake: "total_buyers", kind: "usd" },
  { label: "Métrica vendedores", camel: "totalSellers", snake: "total_sellers", kind: "usd" },
  { label: "Total compras", camel: "totalBuys", snake: "total_buys", kind: "usd" },
  { label: "Total ventas", camel: "totalSells", snake: "total_sells", kind: "usd" },
  { label: "Wallets únicos", camel: "uniqueWallets", snake: "unique_wallets", kind: "usd" },
  { label: "Δ precio %", camel: "pricePercentChange", snake: "price_percent_change", kind: "pct" },
];

function analyticsMetricVol(
  rec: Record<string, unknown>,
  camel: string,
  snake: string,
): unknown {
  return rec[camel] ?? rec[snake];
}

function formatAnalyticsMetricCell(kind: "usd" | "pct", n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (kind === "pct") return formatSignedPercent(n);
  return formatUsdLiquidity(n);
}

/** Coerce loader `unknown` fields into formatters' input type. */
function fmtScalar(v: unknown): string | number | null | undefined {
  return v as string | number | null | undefined;
}

function cmcUsdQuote(
  quotesPayload: unknown,
  cmcId: number,
): { price?: number; vol24?: number; pct24?: number; pct1h?: number; mcap?: number; updated?: string } | null {
  const root = quotesPayload as { data?: Record<string, { quote?: { USD?: Record<string, unknown> } }> };
  const entry = root?.data?.[String(cmcId)];
  const usd = entry?.quote?.USD;
  if (!usd) return null;
  return {
    price: usd.price != null ? Number(usd.price) : undefined,
    vol24: usd.volume_24h != null ? Number(usd.volume_24h) : undefined,
    pct24: usd.percent_change_24h != null ? Number(usd.percent_change_24h) : undefined,
    pct1h: usd.percent_change_1h != null ? Number(usd.percent_change_1h) : undefined,
    mcap: usd.market_cap != null ? Number(usd.market_cap) : undefined,
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

const missingApiSnapshot = {
  ok: false as const,
  error: "Sin snapshot en base de datos — ejecuta el sync diario.",
};

export const useTokenDetailLoader = routeLoader$(async (ev) => {
  const id = Number(ev.params.tokenId);
  if (!Number.isFinite(id) || id < 1) {
    throw ev.error(404, { message: "Invalid token id" });
  }
  /** Dynamic import keeps Turso/libsql out of the client SPA chunk (see Neon / drizzle-orm_libsql in browser). */
  const [{ db }, schema, { and, desc, eq, ne }] = await Promise.all([
    import("~/lib/turso"),
    import("../../../../../../drizzle/schema"),
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
    error: "Sin datos on-chain en el snapshot (contrato, claves del servidor o fila antigua).",
  };
  const topGainers = snap?.topGainers ?? evmOrSnapHint;
  const owners = snap?.owners ?? evmOrSnapHint;
  const moralisPrice = snap?.moralisPrice ?? evmOrSnapHint;
  const moralisTransfers = snap?.moralisTransfers ?? evmOrSnapHint;
  const moralisMeta = snap?.moralisMeta ?? evmOrSnapHint;
  const moralisSwaps =
    snap?.moralisSwaps ??
    ({
      ok: false as const,
      error:
        "Sin swaps en el snapshot. Vuelve a ejecutar el sync o usa la carga en vivo si está disponible.",
    } as const);

  const moralisTokenAnalytics =
    snap?.moralisTokenAnalytics ??
    ({
      ok: false as const,
      error:
        "Sin analytics en el snapshot. Prueba la carga en vivo o espera al próximo sync.",
    } as const);

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
    cmcQuotes,
    cmcInfo,
  };
});

export default component$(() => {
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const token = useTokenDetailLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const t = token.value as Record<string, unknown>;
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
      turso: tr("turso@@Cache"),
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
      tabHolders: tr("tabHolders@@Holders (snapshot)"),
      tabTraders: tr("tabTraders@@Top traders / PnL (snapshot)"),
      tabSwaps: tr("tabSwaps@@DEX swaps (snapshot)"),
      recentTransfers: tr("recentTransfers@@Recent transfers"),
      snapshotChainLabel: tr("snapshotChainLabel@@Cached snapshot · chain"),
      colTx: tr("colTx@@Tx"),
      colFrom: tr("colFrom@@From"),
      colTo: tr("colTo@@To"),
      colValue: tr("colValue@@Value"),
      noTransfersSnapshot: tr("noTransfersSnapshot@@No recent transfers in the snapshot."),
      topTradersPnl: tr("topTradersPnl@@Top traders (PnL)"),
      swapsDex: tr("swapsDex@@DEX swaps"),
      syncFooter: tr(
        "syncFooter@@Market and on-chain data is refreshed on a schedule (and can be synced manually). Token id:",
      ),
    };
  });
  const back = seg ? `/${L}/${seg}/` : `/${L}/home/`;
  const tvSymbols = buildTradingViewSymbolCandidates(String(t.symbol ?? ""), String(t.network ?? ""));
  const dexUrl = dexScreenerPathForNetwork(String(t.network), String(t.address));
  const dexEmbedUrl = dexScreenerEmbedUrl(String(t.network), String(t.address));
  const moralisChain = String(t.moralisChain ?? "base");
  const tab = useSignal<TabId>("overview");
  const syncedAtSec = t.syncedAt != null ? Number(t.syncedAt) : NaN;
  const syncedAtLabel = Number.isFinite(syncedAtSec)
    ? new Date(syncedAtSec * 1000).toISOString()
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

  const mp = t.moralisPrice as { ok: boolean; data?: unknown; error?: string };
  const morPrice = mp?.ok && mp.data ? (mp.data as Record<string, unknown>) : null;

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

  const mTokAnalytics = t.moralisTokenAnalytics as { ok?: boolean; data?: unknown; error?: string } | undefined;
  const snapAnalyticsRec = mTokAnalytics?.ok ? tokenAnalyticsRecord(mTokAnalytics.data) : null;

  const analyticsLive = useSignal<Record<string, unknown> | null>(null);
  const analyticsLoading = useSignal(false);
  const analyticsErr = useSignal("");
  const analyticsTsLoading = useSignal(false);
  const analyticsTsErr = useSignal("");
  const analyticsTsRows = useSignal<Record<string, unknown>[]>([]);
  const analyticsTsTf = useSignal<"1d" | "7d" | "30d">("7d");

  const analyticsDisplayRec = useComputed$(() => analyticsLive.value ?? snapAnalyticsRec);

  const tokenDbId = Number(t.id);
  const tokenAddrLower = String(t.address || "").trim().toLowerCase();
  const isEvmContract = /^0x[a-f0-9]{40}$/.test(tokenAddrLower);

  const loadTokenAnalytics$ = $(async () => {
    analyticsLoading.value = true;
    analyticsErr.value = "";
    try {
      if (!isEvmContract) {
        analyticsErr.value = "No es un contrato EVM.";
        return;
      }
      const u = new URL(`/api/crypto/moralis/tokens/${tokenAddrLower}/analytics`, window.location.origin);
      u.searchParams.set("tokenId", String(tokenDbId));
      u.searchParams.set("chain", moralisChain);
      const res = await fetch(u.toString());
      const j = (await res.json()) as { ok?: boolean; error?: string; data?: unknown };
      if (!j.ok) {
        analyticsErr.value = j.error || res.statusText || "Error";
        return;
      }
      const rec = tokenAnalyticsRecord(j.data);
      analyticsLive.value = rec;
      if (!rec) analyticsErr.value = "Respuesta sin campos de analytics.";
    } catch (e: unknown) {
      analyticsErr.value = e instanceof Error ? e.message : String(e);
    } finally {
      analyticsLoading.value = false;
    }
  });

  const loadTokenAnalyticsTimeseries$ = $(async () => {
    analyticsTsLoading.value = true;
    analyticsTsErr.value = "";
    try {
      const res = await fetch("/api/crypto/moralis/tokens/analytics/timeseries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: tokenDbId, timeframe: analyticsTsTf.value }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string; data?: unknown };
      if (!j.ok) {
        analyticsTsErr.value = j.error || res.statusText || "Error";
        analyticsTsRows.value = [];
        return;
      }
      const root = j.data as Record<string, unknown> | null;
      const arr = Array.isArray(root?.result) ? (root.result as Record<string, unknown>[]) : [];
      const first = arr[0];
      const ts = Array.isArray(first?.timeseries)
        ? (first.timeseries as Record<string, unknown>[])
        : [];
      analyticsTsRows.value = ts;
    } catch (e: unknown) {
      analyticsTsErr.value = e instanceof Error ? e.message : String(e);
      analyticsTsRows.value = [];
    } finally {
      analyticsTsLoading.value = false;
    }
  });

  const setOverview = $(() => {
    tab.value = "overview";
  });
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
    <div class="max-w-5xl">
      {/* Principal: resumen + chart siempre visibles arriba; las pestañas solo cambian el bloque inferior. */}
      <div class="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-3 mb-2 bg-[#000D0E]/97 backdrop-blur-md border-b border-[#043234]/60">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
          <Link href={back} class="text-sm font-medium text-cyan-200 hover:text-cyan-50 underline-offset-2 hover:underline inline-block">
            {tp.value.backTo}
          </Link>
          {dash.value.hasPro ? (
            <Link
              href={`/${L}/notifications-settings/?token=${String(t.id ?? "")}`}
              class="text-xs font-medium text-amber-100/90 hover:text-amber-50 underline-offset-2 hover:underline"
            >
              Pro · Set price alert
            </Link>
          ) : null}
        </div>
        <div class="rounded-2xl border border-[#043234]/90 bg-gradient-to-br from-[#001a1c] via-[#001318] to-[#000a0c] p-4 sm:p-5 shadow-lg shadow-black/30 ring-1 ring-white/[0.04]">
          <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
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
                  <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-400/15 text-cyan-100 border border-cyan-300/35">
                    {tp.value.categoryLabel}
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-1.5 leading-relaxed flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span>{String(t.network)}</span>
                  <span class="text-[#043234]">·</span>
                  <span>ID listado #{t.cmcId != null ? String(t.cmcId) : "—"}</span>
                  <span class="text-[#043234]">·</span>
                  <span class="font-mono text-slate-400">{moralisChain}</span>
                  {syncedAtLabel ? (
                    <>
                      <span class="text-[#043234]">·</span>
                      <span class="font-mono text-slate-400 text-[10px]">{syncedAtLabel}</span>
                    </>
                  ) : null}
                </p>
                {t.slug ? (
                  <p class="text-[10px] text-slate-400 font-mono mt-1 truncate" title={String(t.slug)}>
                    {String(t.slug)}
                  </p>
                ) : null}
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2 sm:gap-3 w-full lg:w-[min(100%,22rem)] xl:w-[24rem] shrink-0 lg:pt-0.5">
              <div class="rounded-xl bg-black/35 border border-[#043234]/40 px-2.5 py-2 sm:px-3 sm:py-2.5 min-w-0">
                <div class="text-[10px] font-semibold uppercase tracking-wide text-slate-300">{tp.value.price}</div>
                <div class="text-sm sm:text-base font-semibold text-white tabular-nums mt-0.5 leading-tight break-words">
                  ${formatTokenUsdPrice(fmtScalar(t.price))}
                </div>
                {showSync ? <div class="text-[9px] text-slate-500 mt-1">{tp.value.turso}</div> : null}
              </div>
              <div class="rounded-xl bg-black/35 border border-[#043234]/40 px-2.5 py-2 sm:px-3 sm:py-2.5 min-w-0">
                <div class="text-[10px] font-semibold uppercase tracking-wide text-slate-300">{tp.value.volume}</div>
                <div class="text-sm sm:text-base font-semibold text-slate-50 tabular-nums mt-0.5 leading-tight break-words">
                  {formatUsdLiquidity(fmtScalar(t.volume))}
                </div>
              </div>
              <div class="rounded-xl bg-black/35 border border-[#043234]/40 px-2.5 py-2 sm:px-3 sm:py-2.5 min-w-0">
                <div class="text-[10px] font-semibold uppercase tracking-wide text-slate-300">{tp.value.fdv}</div>
                <div class="text-sm sm:text-base font-semibold text-slate-50 tabular-nums mt-0.5 leading-tight break-words">
                  {formatUsdLiquidity(fmtScalar(t.fullyDilutedValuation))}
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 space-y-3">
            <div class="flex flex-wrap gap-1.5">
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-black/30 border border-[#043234]/35 px-2 py-1 text-[11px]">
                  <span class="text-slate-400 font-medium">1h</span>
                  <span class={`font-semibold tabular-nums ${percentToneClass(fmtScalar(t.percentChange1h))}`}>
                    {formatSignedPercent(fmtScalar(t.percentChange1h))}
                  </span>
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-black/30 border border-[#043234]/35 px-2 py-1 text-[11px]">
                  <span class="text-slate-400 font-medium">7d</span>
                  <span class={`font-semibold tabular-nums ${percentToneClass(fmtScalar(t.percentChange7d))}`}>
                    {formatSignedPercent(fmtScalar(t.percentChange7d))}
                  </span>
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-black/30 border border-[#043234]/35 px-2 py-1 text-[11px]">
                  <span class="text-slate-400 font-medium">30d</span>
                  <span class={`font-semibold tabular-nums ${percentToneClass(fmtScalar(t.percentChange30d))}`}>
                    {formatSignedPercent(fmtScalar(t.percentChange30d))}
                  </span>
                </span>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-black/25 border border-[#043234]/35 px-2.5 py-2 text-[11px]">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <span class="text-slate-300 shrink-0 font-semibold uppercase text-[10px] tracking-wide">{tp.value.contract}</span>
                  <code class="font-mono text-cyan-200 truncate" title={String(t.address)}>
                    {shortenContract(String(t.address))}
                  </code>
                </div>
                <div class="flex items-center gap-3 text-slate-400 shrink-0 border-t sm:border-t-0 sm:border-l border-[#043234]/40 pt-2 sm:pt-0 sm:pl-3">
                  <span>
                    <span class="text-slate-500">{tp.value.decimalsShort}</span> {String(t.decimals)}
                  </span>
                  <span class="truncate max-w-[11rem] sm:max-w-[15rem]" title={String(t.totalSupply)}>
                    <span class="text-slate-500">{tp.value.supply}</span>{" "}
                    <span class="text-slate-200 font-mono tabular-nums text-[10px] sm:text-[11px]">
                      {formatTokenSupply(fmtScalar(t.totalSupply))}
                    </span>
                  </span>
                </div>
              </div>

              {live ? (
            <div class="mt-4 rounded-xl border border-[#043234]/60 bg-black/25 p-3">
              <h3 class="text-sm font-semibold tracking-tight text-cyan-50 mb-2">
                {showSync ? "Cotización de mercado (sync diario)" : "Cotización de mercado"}
              </h3>
              <dl class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                {live.price != null ? (
                  <div>
                    <dt class="text-slate-400 font-medium">Precio USD</dt>
                    <dd class="text-white font-medium">${formatTokenUsdPrice(live.price)}</dd>
                  </div>
                ) : null}
                {live.mcap != null ? (
                  <div>
                    <dt class="text-slate-400 font-medium">Market cap</dt>
                    <dd class="text-slate-100">{formatUsdLiquidity(live.mcap)}</dd>
                  </div>
                ) : null}
                {live.vol24 != null ? (
                  <div>
                    <dt class="text-slate-400 font-medium">Vol 24h</dt>
                    <dd class="text-slate-100">{formatUsdLiquidity(live.vol24)}</dd>
                  </div>
                ) : null}
                {live.pct1h != null ? (
                  <div>
                    <dt class="text-slate-400 font-medium">Δ 1h</dt>
                    <dd class={live.pct1h >= 0 ? "text-emerald-400" : "text-rose-400"}>{live.pct1h.toFixed(2)}%</dd>
                  </div>
                ) : null}
                {live.pct24 != null ? (
                  <div>
                    <dt class="text-slate-400 font-medium">Δ 24h</dt>
                    <dd class={live.pct24 >= 0 ? "text-emerald-400" : "text-rose-400"}>{live.pct24.toFixed(2)}%</dd>
                  </div>
                ) : null}
                {live.updated ? (
                  <div class="col-span-2 sm:col-span-1">
                    <dt class="text-slate-400 font-medium">Actualizado (mercado)</dt>
                    <dd class="text-slate-400 truncate">{live.updated}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

              {morPrice ? (
            <div class="mt-3 rounded-xl border border-[#043234]/60 bg-black/25 p-3">
              <h3 class="text-sm font-semibold tracking-tight text-cyan-50 mb-1">
                {showSync ? "precio ERC-20 (sync)" : "precio ERC-20"}
              </h3>
              <p class="text-xs text-slate-400 mb-2 leading-relaxed">
                Precios agregados desde datos on-chain (DEX / pools).
              </p>
              <dl class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <dt class="text-slate-400 font-medium">usdPrice</dt>
                  <dd class="text-white">
                    ${formatTokenUsdPrice(fmtScalar(morPrice.usdPrice ?? morPrice.usd_price ?? 0))}
                  </dd>
                </div>
                {morPrice.exchangeName || morPrice.exchange_name ? (
                  <div>
                    <dt class="text-slate-400 font-medium">Exchange</dt>
                    <dd class="text-slate-100">{String(morPrice.exchangeName ?? morPrice.exchange_name)}</dd>
                  </div>
                ) : null}
                {morPrice.pairTotalLiquidityUsd != null || morPrice.pair_total_liquidity_usd != null ? (
                  <div>
                    <dt class="text-slate-400 font-medium">Pair liq USD</dt>
                    <dd class="text-slate-100">
                      {formatUsdLiquidity(
                        fmtScalar(morPrice.pairTotalLiquidityUsd ?? morPrice.pair_total_liquidity_usd),
                      )}
                    </dd>
                  </div>
                ) : null}
                {(() => {
                  const pct =
                    morPrice.usdPrice24hrPercentChange ??
                    morPrice.usd_price_24hr_percent_change ??
                    (morPrice["24hrPercentChange"] != null ? Number(morPrice["24hrPercentChange"]) : null);
                  if (pct == null || !Number.isFinite(Number(pct))) return null;
                  const n = Number(pct);
                  return (
                    <div>
                      <dt class="text-slate-400 font-medium">Δ 24h (on-chain)</dt>
                      <dd class={`tabular-nums ${percentToneClass(n)}`}>{formatSignedPercent(n)}</dd>
                    </div>
                  );
                })()}
                {(() => {
                  const rawScore = morPrice.securityScore ?? morPrice.security_score;
                  const sc = parseTokenSecurityScore(rawScore);
                  if (sc == null) return null;
                  const b = tokenSecurityScoreBadge(sc);
                  return (
                    <div class="col-span-2 sm:col-span-3">
                      <dt class="text-slate-400 font-medium mb-1.5">Security score</dt>
                      <dd class="m-0">
                        <div
                          class={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${b.border} ${b.bg} ${b.shadow}`}
                        >
                          <div class="flex min-w-0 flex-1 items-start gap-3">
                            <span
                              class={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${b.iconWrap}`}
                              aria-hidden="true"
                            >
                              <LuShield class="h-5 w-5" />
                            </span>
                            <div class="min-w-0 flex-1">
                              <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span class={`text-2xl font-bold tabular-nums tracking-tight ${b.accentText}`}>
                                  {sc}
                                </span>
                                <span class="text-sm font-medium text-slate-400">/ 100</span>
                                <span
                                  class={`ml-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:ml-1 ${b.border} ${b.accentText} bg-black/25`}
                                >
                                  {b.label}
                                </span>
                              </div>
                              <p class="mt-1 text-xs leading-snug text-slate-200/90">{b.hint}</p>
                            </div>
                          </div>
                          <div class="w-full shrink-0 sm:max-w-[220px] sm:flex-1">
                            <div
                              class={`relative h-2.5 overflow-hidden rounded-full ${b.barTrack}`}
                              role="progressbar"
                              aria-valuenow={sc}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`Security score ${sc} de 100`}
                            >
                              <div
                                class={`h-full rounded-full ${b.barFill} shadow-sm transition-[width] duration-500 ease-out`}
                                style={{ width: `${sc}%` }}
                              />
                            </div>
                            <p class="mt-1 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-400 sm:text-right">
ERC-20
                            </p>
                          </div>
                        </div>
                      </dd>
                    </div>
                  );
                })()}
                {morPrice.nativePrice != null && typeof morPrice.nativePrice === "object" ? (
                  <div class="col-span-2 sm:col-span-1">
                    <dt class="text-slate-400 font-medium">Precio (nativo)</dt>
                    <dd class="text-slate-200 font-mono text-[10px]">
                      {String((morPrice.nativePrice as Record<string, unknown>).value ?? "—")}{" "}
                      <span class="text-slate-400">
                        {String((morPrice.nativePrice as Record<string, unknown>).symbol ?? "")}
                      </span>
                    </dd>
                  </div>
                ) : null}
                {morPrice.pairAddress || morPrice.pair_address ? (
                  <div class="col-span-2 sm:col-span-3">
                    <dt class="text-slate-400 font-medium">Pair</dt>
                    <dd class="font-mono text-[10px] text-slate-300 truncate">
                      {String(morPrice.pairAddress ?? morPrice.pair_address)}
                    </dd>
                  </div>
                ) : null}
                {morPrice.possibleSpam === true || String(morPrice.possibleSpam) === "true" ? (
                  <div class="col-span-2 sm:col-span-3">
                    <span class="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/35">
                      possible spam (precio)
                    </span>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          {isEvmContract ? (
            <div class="mt-3 rounded-xl border border-[#043234]/60 bg-black/25 p-3">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                <h3 class="text-sm font-semibold tracking-tight text-cyan-50">
                  {showSync ? "Analytics de trading" : "Analytics de trading"}
                </h3>
                <button
                  type="button"
                  class="shrink-0 rounded-lg border border-cyan-400/45 bg-cyan-400/15 px-2.5 py-1 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-400/25 hover:text-white disabled:opacity-50"
                  disabled={analyticsLoading.value}
                  onClick$={loadTokenAnalytics$}
                >
                  {analyticsLoading.value ? "Cargando…" : "Actualizar en vivo"}
                </button>
              </div>
              <p class="text-xs text-slate-400 mb-2 leading-relaxed">
                Resumen de volumen, liquidez y valoración a partir de datos on-chain.
              </p>
              {analyticsErr.value ? (
                <p class="text-[11px] text-rose-400/90 mb-2">{analyticsErr.value}</p>
              ) : null}
              {analyticsDisplayRec.value ? (
                <>
                  <dl class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mb-3">
                    <div>
                      <dt class="text-slate-400 font-medium">usdPrice</dt>
                      <dd class="text-white tabular-nums">
                        {analyticsScalarPrice(
                          analyticsDisplayRec.value.usdPrice ?? analyticsDisplayRec.value.usd_price,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-slate-400 font-medium">Liquidez total</dt>
                      <dd class="text-slate-100 tabular-nums">
                        {analyticsScalarUsd(
                          analyticsDisplayRec.value.totalLiquidity ?? analyticsDisplayRec.value.total_liquidity,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-slate-400 font-medium">FDV</dt>
                      <dd class="text-slate-100 tabular-nums">
                        {analyticsScalarUsd(
                          analyticsDisplayRec.value.totalFullyDilutedValuation ??
                            analyticsDisplayRec.value.total_fully_diluted_valuation,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-slate-400 font-medium">chainId</dt>
                      <dd class="text-slate-300 font-mono text-[10px]">
                        {String(analyticsDisplayRec.value.chainId ?? analyticsDisplayRec.value.chain_id ?? "—")}
                      </dd>
                    </div>
                  </dl>
                  <div class="overflow-x-auto text-[10px] mb-4">
                    <table class="w-full text-left">
                      <thead>
                        <tr class="border-b border-[#043234] text-slate-400 font-medium">
                          <th class="py-1.5 pr-2">Métrica</th>
                          {TOKEN_ANALYTICS_WINDOWS.map((w) => (
                            <th key={w} class="py-1.5 pr-2 tabular-nums">
                              {w}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TOKEN_ANALYTICS_METRIC_ROWS.map((row) => {
                          const vol = analyticsMetricVol(
                            analyticsDisplayRec.value!,
                            row.camel,
                            row.snake,
                          );
                          return (
                            <tr key={row.camel} class="border-b border-[#043234]/35 text-slate-200">
                              <td class="py-1.5 pr-2 text-slate-300">{row.label}</td>
                              {TOKEN_ANALYTICS_WINDOWS.map((w) => {
                                const n = analyticsVolumeAt(vol, w);
                                const cls =
                                  row.kind === "pct" && n != null && Number.isFinite(n)
                                    ? percentToneClass(n)
                                    : "";
                                return (
                                  <td key={w} class={`py-1.5 pr-2 tabular-nums ${cls}`}>
                                    {formatAnalyticsMetricCell(row.kind, n)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div class="border-t border-[#043234]/40 pt-3">
                    <h4 class="text-xs font-semibold text-slate-200 mb-1">Serie temporal (Pro)</h4>
                    <p class="text-[9px] text-slate-400 mb-2 leading-relaxed">
                      Histórico de métricas para el token (requiere plan Pro).
                    </p>
                    <div class="flex flex-wrap items-center gap-2 mb-2">
                      <span class="text-[10px] font-medium text-slate-400">Ventana:</span>
                      <button
                        type="button"
                        class={`rounded px-2 py-0.5 text-[10px] font-medium border ${
                          analyticsTsTf.value === "1d"
                            ? "border-cyan-400/55 bg-cyan-400/15 text-cyan-50"
                            : "border-[#043234] text-slate-300 hover:border-cyan-400/35"
                        }`}
                        onClick$={() => {
                          analyticsTsTf.value = "1d";
                        }}
                      >
                        1d
                      </button>
                      <button
                        type="button"
                        class={`rounded px-2 py-0.5 text-[10px] font-medium border ${
                          analyticsTsTf.value === "7d"
                            ? "border-cyan-400/55 bg-cyan-400/15 text-cyan-50"
                            : "border-[#043234] text-slate-300 hover:border-cyan-400/35"
                        }`}
                        onClick$={() => {
                          analyticsTsTf.value = "7d";
                        }}
                      >
                        7d
                      </button>
                      <button
                        type="button"
                        class={`rounded px-2 py-0.5 text-[10px] font-medium border ${
                          analyticsTsTf.value === "30d"
                            ? "border-cyan-400/55 bg-cyan-400/15 text-cyan-50"
                            : "border-[#043234] text-slate-300 hover:border-cyan-400/35"
                        }`}
                        onClick$={() => {
                          analyticsTsTf.value = "30d";
                        }}
                      >
                        30d
                      </button>
                      <button
                        type="button"
                        class="ml-auto rounded-lg border border-[#043234] bg-black/20 px-2.5 py-1 text-[10px] text-slate-200 hover:border-cyan-400/40 hover:text-cyan-50 disabled:opacity-50"
                        disabled={analyticsTsLoading.value}
                        onClick$={loadTokenAnalyticsTimeseries$}
                      >
                        {analyticsTsLoading.value ? "Cargando…" : "Cargar serie"}
                      </button>
                    </div>
                    {analyticsTsErr.value ? (
                      <p class="text-[11px] text-rose-400/90 mb-2">{analyticsTsErr.value}</p>
                    ) : null}
                    {analyticsTsRows.value.length > 0 ? (
                      <div class="overflow-x-auto max-h-56 overflow-y-auto">
                        <table class="w-full text-left font-mono text-[9px]">
                          <thead class="sticky top-0 bg-[#001a1c]">
                            <tr class="border-b border-[#043234] text-slate-400 font-medium">
                              <th class="py-1 pr-2">Tiempo</th>
                              <th class="py-1 pr-2">Compra</th>
                              <th class="py-1 pr-2">Venta</th>
                              <th class="py-1 pr-2">Liq USD</th>
                              <th class="py-1">FDV</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analyticsTsRows.value.slice(-24).map((pt, i) => {
                              const ts = String(pt.timestamp ?? pt.time ?? i);
                              const buy = metricNum(pt, "buyVolume", "buy_volume");
                              const sell = metricNum(pt, "sellVolume", "sell_volume");
                              const liq = metricNum(pt, "liquidityUsd", "liquidity_usd");
                              const fdv = metricNum(
                                pt,
                                "fullyDilutedValuation",
                                "fully_diluted_valuation",
                              );
                              return (
                                <tr key={`${ts}-${i}`} class="border-b border-[#043234]/30 text-slate-300">
                                  <td class="py-1 pr-2 truncate max-w-[6rem]">{ts}</td>
                                  <td class="py-1 pr-2 tabular-nums">{buy != null ? formatUsdLiquidity(buy) : "—"}</td>
                                  <td class="py-1 pr-2 tabular-nums">{sell != null ? formatUsdLiquidity(sell) : "—"}</td>
                                  <td class="py-1 pr-2 tabular-nums">{liq != null ? formatUsdLiquidity(liq) : "—"}</td>
                                  <td class="py-1 tabular-nums">{fdv != null ? formatUsdLiquidity(fdv) : "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <p class="text-xs text-slate-400 leading-relaxed">
                  {mTokAnalytics?.ok === false && mTokAnalytics?.error
                    ? mTokAnalytics.error
                    : "Sin datos de analytics. Usa el botón en vivo o activa el sync."}
                </p>
              )}
            </div>
          ) : null}

          {scoreRec ? (
            <div class="mt-3 rounded-xl border border-[#043234]/60 bg-black/25 p-3">
              <h3 class="text-sm font-semibold tracking-tight text-cyan-50 mb-2">
                {showSync ? "Token Score (sync)" : "Token Score"}
              </h3>
              <dl class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <dt class="text-slate-400 font-medium">Score</dt>
                  <dd class="text-white font-semibold tabular-nums">
                    {scoreRec.score != null ? String(scoreRec.score) : "—"}
                  </dd>
                </div>
                {scoreRec.updatedAt != null || scoreRec.updated_at != null ? (
                  <div class="col-span-2 sm:col-span-2">
                    <dt class="text-slate-400 font-medium">Actualizado</dt>
                    <dd class="text-slate-300 truncate">
                      {String(scoreRec.updatedAt ?? scoreRec.updated_at)}
                    </dd>
                  </div>
                ) : null}
                {scoreMetrics ? (
                  <>
                    {metricNum(scoreMetrics, "liquidityUsd", "liquidity_usd", "totalLiquidityUsd") != null ? (
                      <div>
                        <dt class="text-slate-400 font-medium">Liquidez (métricas)</dt>
                        <dd class="text-slate-100">
                          {formatUsdLiquidity(
                            metricNum(scoreMetrics, "liquidityUsd", "liquidity_usd", "totalLiquidityUsd"),
                          )}
                        </dd>
                      </div>
                    ) : null}
                    {scoreMetrics.volumeUsd != null || scoreMetrics.volume_usd != null ? (
                      <div>
                        <dt class="text-slate-400 font-medium">Volumen (métricas)</dt>
                        <dd class="text-slate-100">{formatMetricScalar(scoreMetrics.volumeUsd ?? scoreMetrics.volume_usd)}</dd>
                      </div>
                    ) : null}
                    {scoreMetrics.transactions != null || scoreMetrics.transaction_count != null ? (
                      <div>
                        <dt class="text-slate-400 font-medium">Transacciones</dt>
                        <dd class="text-slate-100 tabular-nums">
                          {String(scoreMetrics.transactions ?? scoreMetrics.transaction_count ?? "—")}
                        </dd>
                      </div>
                    ) : null}
                    {scoreMetrics.supply != null || scoreMetrics.total_supply != null ? (
                      <div>
                        <dt class="text-slate-400 font-medium">Supply (métricas)</dt>
                        <dd class="text-slate-100 font-mono text-[10px]">
                          {String(scoreMetrics.supply ?? scoreMetrics.total_supply)}
                        </dd>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </dl>
            </div>
          ) : null}

          {mTokHist != null && mTokHist.ok && histRows.length > 0 ? (
            <div class="mt-3 rounded-xl border border-[#043234]/60 bg-black/25 p-3">
              <h3 class="text-sm font-semibold tracking-tight text-cyan-50 mb-1">
                {showSync ? "Score histórico (sync)" : "Score histórico"}
              </h3>
              <p class="text-xs text-slate-400 mb-2 leading-relaxed">
                Evolución del score del token (ventana típica 7d cuando el sync lo incluye).
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

          {mTokPairs != null && mTokPairs.ok && pairRows.length > 0 ? (
            <div class="mt-3 rounded-xl border border-[#043234]/60 bg-black/25 p-3">
              <h3 class="text-sm font-semibold tracking-tight text-cyan-50 mb-1">
                {showSync ? "Pares DEX (sync)" : "Pares DEX"}
              </h3>
              <p class="text-xs text-slate-400 mb-2 leading-relaxed">
                Pares en DEX con liquidez y volumen. Gráficos OHLC vía TradingView en esta ficha.
              </p>
              <div class="overflow-x-auto text-[11px]">
                <table class="w-full text-left">
                  <thead>
                    <tr class="border-b border-[#043234] text-slate-400 font-medium">
                      <th class="py-1.5 pr-2">DEX</th>
                      <th class="py-1.5 pr-2">Par</th>
                      <th class="py-1.5 pr-2">Contrato par</th>
                      <th class="py-1.5 pr-2">Precio</th>
                      <th class="py-1.5 pr-2">Δ 24h</th>
                      <th class="py-1.5 pr-2">Liquidez</th>
                      <th class="py-1.5 pr-2">Vol 24h</th>
                      <th class="py-1.5">Estado</th>
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
                        <tr key={String(r.pair_address ?? r.pairAddress ?? i)} class="border-b border-[#043234]/35 text-slate-200">
                          <td class="py-1.5 pr-2">
                            <div class="flex items-center gap-1.5">
                              {exLogo ? (
                                <img src={exLogo} alt="" class="h-5 w-5 shrink-0 rounded object-contain bg-white/5" loading="lazy" />
                              ) : null}
                              <span>{ex}</span>
                            </div>
                          </td>
                          <td class="py-1.5 pr-2 font-mono text-[10px]">{pairLabel(r)}</td>
                          <td class="py-1.5 pr-2 font-mono text-[10px]">
                            {pairIsAddr ? (
                              <EvmAddrLinks
                                locale={L}
                                moralisChain={moralisChain}
                                address={pairAddr}
                                variant="token"
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td class="py-1.5 pr-2 tabular-nums text-white">
                            {usdPrice != null ? `$${formatTokenUsdPrice(usdPrice)}` : "—"}
                          </td>
                          <td class={`py-1.5 pr-2 tabular-nums ${pct24 != null ? percentToneClass(pct24) : "text-slate-400"}`}>
                            {pct24 != null ? formatSignedPercent(pct24) : "—"}
                          </td>
                          <td class="py-1.5 pr-2 tabular-nums">
                            {liq != null ? formatUsdLiquidity(liq) : "—"}
                          </td>
                          <td class="py-1.5 pr-2 tabular-nums">
                            {vol24 != null                              ? formatUsdLiquidity(vol24)
                              : formatMetricScalar(volFallback)}
                          </td>
                          <td class="py-1.5">
                            {inactive ? (
                              <span class="text-[9px] font-semibold uppercase text-amber-300/90">inactivo</span>
                            ) : (
                              <span class="text-[9px] text-emerald-400/80">activo</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {morMeta0 ? (
            <div class="mt-3 rounded-xl border border-[#043234]/50 bg-black/20 p-3 space-y-2">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-sm font-semibold tracking-tight text-cyan-50">metadata</span>
                {morMeta0.possible_spam === true || String(morMeta0.possible_spam) === "true" ? (
                  <span class="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/35">
                    possible spam
                  </span>
                ) : null}
                {morMeta0.verified_contract === true || String(morMeta0.verified_contract) === "true" ? (
                  <span class="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
                    verified
                  </span>
                ) : null}
              </div>
              <p class="text-xs text-slate-400 leading-relaxed">Metadatos enriquecidos del contrato ERC-20.</p>
              {morMeta0.address_label ? (
                <p class="text-xs text-slate-300 leading-relaxed">
                  <span class="font-medium text-slate-400">Label:</span> {String(morMeta0.address_label)}
                </p>
              ) : null}
              <p class="text-sm text-slate-100 font-medium leading-snug">
                {String(morMeta0.name ?? "")}
                {morMeta0.symbol != null ? (
                  <>
                    {" "}
                    <span class="text-cyan-200 font-semibold">({String(morMeta0.symbol)})</span>
                  </>
                ) : null}
              </p>
              <dl class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] border-t border-[#043234]/35 pt-2">
                {morMeta0.decimals != null ? (
                  <div>
                    <dt class="text-slate-400 font-medium">Decimals (on-chain)</dt>
                    <dd class="text-slate-100 tabular-nums">{String(morMeta0.decimals)}</dd>
                  </div>
                ) : null}
                {morMeta0.total_supply_formatted != null ? (
                  <div class="col-span-2 sm:col-span-2">
                    <dt class="text-slate-400 font-medium">Total supply (formatted)</dt>
                    <dd class="text-slate-100 font-mono text-[10px] break-all">
                      {String(morMeta0.total_supply_formatted)}
                    </dd>
                  </div>
                ) : morMeta0.total_supply != null ? (
                  <div class="col-span-2 sm:col-span-2">
                    <dt class="text-slate-400 font-medium">Total supply (raw)</dt>
                    <dd class="text-slate-100 font-mono text-[10px] break-all">
                      {formatTokenSupply(fmtScalar(morMeta0.total_supply))}
                    </dd>
                  </div>
                ) : null}
                {morMeta0.circulating_supply != null ? (
                  <div class="col-span-2 sm:col-span-3">
                    <dt class="text-slate-400 font-medium">Circulating supply</dt>
                    <dd class="text-slate-100 font-mono text-[10px]">{String(morMeta0.circulating_supply)}</dd>
                  </div>
                ) : null}
                {morMeta0.market_cap != null ? (
                  <div>
                    <dt class="text-slate-400 font-medium">Market cap (on-chain)</dt>
                    <dd class="text-slate-100">{formatUsdLiquidity(fmtScalar(morMeta0.market_cap))}</dd>
                  </div>
                ) : null}
                {morMeta0.fully_diluted_valuation != null ? (
                  <div>
                    <dt class="text-slate-400 font-medium">FDV (on-chain)</dt>
                    <dd class="text-slate-100">{formatUsdLiquidity(fmtScalar(morMeta0.fully_diluted_valuation))}</dd>
                  </div>
                ) : null}
                {morMeta0.created_at != null ? (
                  <div class="col-span-2 sm:col-span-3">
                    <dt class="text-slate-400 font-medium">Contract created (API)</dt>
                    <dd class="text-slate-300 truncate">{String(morMeta0.created_at)}</dd>
                  </div>
                ) : null}
              </dl>
              {Array.isArray(morMeta0.implementations) && morMeta0.implementations.length > 0 ? (
                <div class="border-t border-[#043234]/35 pt-2">
                  <div class="text-[10px] font-semibold uppercase tracking-wide text-slate-300 mb-1.5">
                    Otros chains (implementations)
                  </div>
                  <ul class="space-y-1 text-[11px]">
                    {(morMeta0.implementations as Record<string, unknown>[]).map((imp, i) => {
                      const chainHint = String(imp.chain ?? imp.chainName ?? "eth").toLowerCase();
                      const add = String(imp.address ?? "").trim();
                      const lab = String(imp.chainName ?? imp.chain ?? chainHint);
                      return (
                        <li key={i} class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span class="text-slate-400 shrink-0 font-medium">{lab}</span>
                          {/^0x[a-fA-F0-9]{40}$/.test(add) ? (
                            <EvmAddrLinks locale={L} moralisChain={chainHint} address={add} variant="token" />
                          ) : (
                            <span class="font-mono text-slate-400">{shortenContract(add)}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {Array.isArray(morMeta0.categories) && morMeta0.categories.length > 0 ? (
                <div class="flex flex-wrap gap-1">
                  {(morMeta0.categories as unknown[]).map((c, i) => (
                    <span
                      key={i}
                      class="text-[9px] px-1.5 py-0.5 rounded-md bg-[#043234]/50 text-slate-200 border border-[#043234]/80"
                    >
                      {String(c)}
                    </span>
                  ))}
                </div>
              ) : null}
              {morMeta0.links != null && typeof morMeta0.links === "object" && !Array.isArray(morMeta0.links) ? (
                <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                  {Object.entries(morMeta0.links as Record<string, unknown>).map(([k, v]) => {
                    const href = firstLinkHref(v);
                    if (!href) return null;
                    const label = k.replace(/_/g, " ");
                    return (
                      <a
                        key={k}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        class="font-medium text-cyan-200 hover:text-cyan-50 underline-offset-2 hover:underline"
                      >
                        {label}
                        {" \u2197"}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {(urls.website || urls.explorer) ? (
            <div class="mt-3 flex flex-wrap gap-2 text-[11px]">
              {urls.website ? (
                <a href={urls.website} target="_blank" rel="noreferrer" class="font-medium text-cyan-200 hover:text-cyan-50 underline-offset-2 hover:underline">
                  Website (listado) ↗
                </a>
              ) : null}
              {urls.explorer ? (
                <a href={urls.explorer} target="_blank" rel="noreferrer" class="font-medium text-cyan-200 hover:text-cyan-50 underline-offset-2 hover:underline">
                  Explorer (listado) ↗
                </a>
              ) : null}
              {Number.isFinite(cmcId) ? (
                <a
                  href={`https://coinmarketcap.com/currencies/${encodeURIComponent(String(t.slug ?? "token"))}/`}
                  target="_blank"
                  rel="noreferrer"
                  class="font-medium text-slate-400 hover:text-cyan-200 underline underline-offset-2"
                >
                  Listado ↗
                </a>
              ) : null}
            </div>
          ) : null}

          {urls.desc ? (
            <p class="text-xs text-slate-300 mt-2 leading-relaxed line-clamp-4" title={urls.desc}>
              {urls.desc}
              {urls.desc.length >= 400 ? "…" : ""}
            </p>
          ) : null}

          {showSync ? (
            <p class="text-xs text-slate-400 mt-4 leading-relaxed">
              {tp.value.syncFooter}{" "}
              <span class="font-mono text-slate-300">{String(t.id)}</span>
            </p>
          ) : null}
          </div>
        </div>

        <div class="mt-5 flex flex-wrap items-end justify-between gap-3 mb-2">
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
            height={520}
          />
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2 border-b border-[#043234] pb-2" role="tablist" aria-label="Token sections">
        {tabBtn("overview", tp.value.tabTransfers, setOverview)}
        {tabBtn("holders", tp.value.tabHolders, setHolders)}
        {tabBtn("traders", tp.value.tabTraders, setTraders)}
        {tabBtn("swaps", tp.value.tabSwaps, setSwaps)}
      </div>

      {tab.value === "overview" ? (
        <section class="mt-6 rounded-xl border border-[#043234] bg-[#001a1c] p-4" role="tabpanel">
          <h2 class="text-lg font-semibold tracking-tight text-cyan-50 mb-2">{tp.value.recentTransfers}</h2>
          <p class="text-xs text-slate-400 mb-4 leading-relaxed">
            Transferencias recientes del token en <span class="font-mono">{moralisChain}</span> (snapshot).
          </p>
          <div class="overflow-x-auto text-xs font-mono">
            <table class="w-full text-left">
              <thead>
                <tr class="border-b border-[#043234] text-slate-400 font-medium">
                  <th class="py-2 pr-2">{tp.value.colTx}</th>
                  <th class="py-2 pr-2">{tp.value.colFrom}</th>
                  <th class="py-2 pr-2">{tp.value.colTo}</th>
                  <th class="py-2">{tp.value.colValue}</th>
                </tr>
              </thead>
              <tbody>
                {transferRows.length > 0 ? (
                  transferRows.map((r: Record<string, unknown>, i: number) => {
                    const h = String(r.transaction_hash ?? r.hash ?? i);
                    return (
                      <tr key={h} class="border-b border-[#043234]/40 text-slate-200">
                        <td class="py-2 pr-2">
                          <TxHashLink
                            locale={L}
                            moralisChain={moralisChain}
                            hash={h}
                            mode="hash10"
                            linkClass="font-medium text-cyan-200 hover:text-cyan-50 underline-offset-2 hover:underline"
                          />
                        </td>
                        <td class="py-2 pr-2 align-top max-w-[140px]">
                          <EvmAddrLinks
                            locale={L}
                            moralisChain={moralisChain}
                            address={r.from_address}
                            variant="wallet"
                          />
                        </td>
                        <td class="py-2 pr-2 align-top max-w-[140px]">
                          <EvmAddrLinks
                            locale={L}
                            moralisChain={moralisChain}
                            address={r.to_address}
                            variant="wallet"
                          />
                        </td>
                        <td class="py-2">{String(r.value_decimal ?? r.value ?? "—")}</td>
                      </tr>
                    );
                  })
                ) : mt?.ok ? (
                  <tr>
                    <td colSpan={4} class="py-10 text-center text-slate-400">
                      {tp.value.noTransfersSnapshot}
                    </td>
                  </tr>
                ) : showSync ? (
                  <tr>
                    <td colSpan={4} class="py-10 text-center text-amber-400/90 text-[13px] font-sans">
                      {mt?.error || "No disponible"}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={4} class="py-10 text-center text-slate-400">
                      Datos de transferencias no disponibles en este momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab.value === "holders" ? (
        <section class="mt-6 rounded-xl border border-[#043234] bg-[#001a1c] p-4" role="tabpanel">
          <h2 class="text-lg font-semibold tracking-tight text-cyan-50 mb-2">Token holders</h2>
          <p class="text-xs text-slate-400 mb-4 leading-relaxed">
            Principales holders en <span class="font-mono">{moralisChain}</span> (snapshot).
          </p>
          <div class="overflow-x-auto text-xs">
            <table class="w-full text-left">
              <thead>
                <tr class="border-b border-[#043234] text-slate-400 font-medium">
                  <th class="py-2 pr-2">Owner</th>
                  <th class="py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {owners?.ok && holderRows.length > 0 ? (
                  holderRows.map((r: Record<string, unknown>) => {
                    const w = holderWallet(r);
                    return (
                      <tr key={w || JSON.stringify(r)} class="border-b border-[#043234]/40 text-slate-200">
                        <td class="py-2 pr-2 font-mono">
                          {w ? (
                            <EvmAddrLinks locale={L} moralisChain={moralisChain} address={w} variant="wallet" />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td class="py-2 tabular-nums">
                          {String(r.balance_formatted ?? r.balance ?? r.owner_balance ?? "—")}
                        </td>
                      </tr>
                    );
                  })
                ) : owners?.ok ? (
                  <tr>
                    <td colSpan={2} class="py-10 text-center text-slate-400">
                      {showSync
                        ? "Sin holders en el resultado (puede ser plan o indexación)."
                        : "Sin holders en los datos actuales."}
                    </td>
                  </tr>
                ) : showSync ? (
                  <tr>
                    <td colSpan={2} class="py-10 text-center text-amber-400/90 text-[13px]">
                      {owners?.error || "No disponible"}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={2} class="py-10 text-center text-slate-400">
                      Datos de holders no disponibles en este momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab.value === "traders" ? (
        <section class="mt-6 rounded-xl border border-[#043234] bg-[#001a1c] p-4" role="tabpanel">
          <h2 class="text-lg font-semibold tracking-tight text-cyan-50 mb-2">{tp.value.topTradersPnl}</h2>
          <p class="text-xs text-slate-400 mb-4 leading-relaxed">
            Wallets con mejor PnL estimado para este token (requiere datos DEX indexados).
          </p>
          <div class="overflow-x-auto text-xs">
            <table class="w-full text-left">
              <thead>
                <tr class="border-b border-[#043234] text-slate-400 font-medium">
                  <th class="py-2 pr-2">Wallet</th>
                  <th class="py-2 pr-2">Realized PnL USD</th>
                  <th class="py-2">Trades</th>
                </tr>
              </thead>
              <tbody>
                {topGainers?.ok && gainRows.length > 0 ? (
                  gainRows.map((r: Record<string, unknown>, i: number) => {
                    const w = gainerWallet(r);
                    return (
                      <tr key={w || i} class="border-b border-[#043234]/40 text-slate-200">
                        <td class="py-2 pr-2 font-mono">
                          {w ? (
                            <EvmAddrLinks locale={L} moralisChain={moralisChain} address={w} variant="wallet" />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td class="py-2 pr-2 tabular-nums">
                          ${formatUsdBalance(fmtScalar(r.realized_profit_usd ?? r.realizedProfitUsd ?? 0))}
                        </td>
                        <td class="py-2">{String(r.count_of_trades ?? r.trades ?? "—")}</td>
                      </tr>
                    );
                  })
                ) : topGainers?.ok ? (
                  <tr>
                    <td colSpan={3} class="py-10 text-center text-slate-400">
                      {showSync
                        ? "Sin filas en la respuesta para este token/cadena."
                        : "Sin datos de traders para este token en este momento."}
                    </td>
                  </tr>
                ) : showSync ? (
                  <tr>
                    <td colSpan={3} class="py-10 text-center text-amber-400/90 text-[13px]">
                      {topGainers?.error || "No disponible"}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={3} class="py-10 text-center text-slate-400">
                      Datos de traders no disponibles en este momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab.value === "swaps" ? (
        <section class="mt-6 rounded-xl border border-[#043234] bg-[#001a1c] p-4" role="tabpanel">
          <h2 class="text-lg font-semibold tracking-tight text-cyan-50 mb-2">{tp.value.swapsDex}</h2>
          <p class="text-xs text-slate-400 mb-4 leading-relaxed">
            Swaps DEX detectados para este token en <span class="font-mono">{moralisChain}</span> (snapshot).
          </p>
          <div class="overflow-x-auto text-xs">
            <table class="w-full text-left">
              <thead>
                <tr class="border-b border-[#043234] text-slate-400 font-medium">
                  <th class="py-2 pr-2">Tx</th>
                  <th class="py-2 pr-2">Fecha / bloque</th>
                  <th class="py-2 pr-2">Tipo</th>
                  <th class="py-2 pr-2">Sub</th>
                  <th class="py-2 pr-2">Par</th>
                  <th class="py-2 pr-2">DEX</th>
                  <th class="py-2 pr-2">Wallet</th>
                  <th class="py-2 pr-2">USD</th>
                  <th class="py-2 pr-2">Precio par</th>
                  <th class="py-2">Compra / Venta</th>
                </tr>
              </thead>
              <tbody>
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
                      <tr key={h} class="border-b border-[#043234]/40 text-slate-200">
                        <td class="py-2 pr-2 font-mono">
                          <TxHashLink
                            locale={L}
                            moralisChain={moralisChain}
                            hash={h}
                            mode="hash10"
                            linkClass="font-medium text-cyan-200 hover:text-cyan-50 underline-offset-2 hover:underline"
                          />
                        </td>
                        <td class="py-2 pr-2 text-[10px] text-slate-300">
                          <div class="text-slate-100">{when}</div>
                          <div class="font-mono text-[9px]">{block}</div>
                        </td>
                        <td class="py-2 pr-2 uppercase text-[10px]">
                          {String(r.transactionType ?? r.transaction_type ?? "—")}
                        </td>
                        <td class="py-2 pr-2 text-[10px] capitalize text-slate-300">{sub}</td>
                        <td class="py-2 pr-2">
                          <div class="text-[11px]">{String(r.pairLabel ?? r.pair_label ?? "—")}</div>
                          {pairIsAddr ? (
                            <div class="mt-0.5">
                              <EvmAddrLinks
                                locale={L}
                                moralisChain={moralisChain}
                                address={pairAddr}
                                variant="token"
                              />
                            </div>
                          ) : null}
                        </td>
                        <td class="py-2 pr-2">
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
                        <td class="py-2 pr-2">
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
                        <td class="py-2 pr-2 tabular-nums">
                          {r.totalValueUsd != null || r.total_value_usd != null
                            ? formatUsdLiquidity(fmtScalar(r.totalValueUsd ?? r.total_value_usd))
                            : "—"}
                        </td>
                        <td class="py-2 pr-2 font-mono text-[10px] tabular-nums text-slate-300">{bqpStr}</td>
                        <td class="py-2 text-[10px] text-slate-300">
                          <span class="text-emerald-400/90">+{buyStr}</span>
                          {" / "}
                          <span class="text-rose-400/80">−{sellStr}</span>
                        </td>
                      </tr>
                    );
                  })
                ) : mSwaps?.ok ? (
                  <tr>
                    <td colSpan={10} class="py-10 text-center text-slate-400">
                      Sin swaps en el snapshot.
                    </td>
                  </tr>
                ) : showSync ? (
                  <tr>
                    <td colSpan={10} class="py-10 text-center text-amber-400/90 text-[13px] font-sans">
                      {mSwaps?.error || "No disponible"}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={10} class="py-10 text-center text-slate-400">
                      Datos de swaps no disponibles.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
});
