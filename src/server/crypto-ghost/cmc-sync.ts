import { randomUUID } from "node:crypto";
import { and, eq, lt, ne } from "drizzle-orm";
import { db } from "~/lib/turso";
import { cachedMarketTokens, cmcSyncLease, syncRuns } from "../../../drizzle/schema";
import {
  fetchMoralisErc20Metadata,
  fetchMoralisErc20Owners,
  fetchMoralisErc20PriceBestEffort,
  fetchMoralisErc20Swaps,
  fetchMoralisErc20TopGainers,
  fetchMoralisErc20TopLosers,
  fetchMoralisErc20Transfers,
  fetchMoralisPairSnipers,
  fetchMoralisTokenAnalytics,
  fetchMoralisTokenPairs,
  fetchMoralisTokenScore,
  fetchMoralisTokenScoreHistorical,
  type MoralisWalletTokensResult,
} from "~/server/crypto-ghost/moralis-api";
import { moralisChainFromNetworkLabel } from "~/server/crypto-ghost/moralis-chain";
import { MARKET_CATEGORIES } from "~/server/crypto-ghost/market-category-constants";
import {
  GLOBAL_CMC_GLOBAL_METRICS,
  runAuxiliaryApiSnapshotSync,
  upsertGlobalSnapshot,
} from "~/server/crypto-ghost/api-snapshot-sync";
import { runPriceAlertEvaluation } from "~/server/crypto-ghost/price-alert-evaluator";
import {
  setSyncRunDbId,
  syncLogError,
  syncLogInfo,
  syncLogWarn,
  timedFetch,
  withSyncRun,
} from "~/server/crypto-ghost/sync-logger";

const BASE = "https://pro-api.coinmarketcap.com/v1";

/** Aggregated Moralis outcomes during token row sync (avoids per-token log spam). */
export type MoralisPerTokenSyncMetrics = {
  evmWithMoralisKey: number;
  skippedNoContractOrKey: number;
  moralisCore5AllOk: number;
  moralisCore5PartialFail: number;
  moralisSwapsAttempted: number;
  moralisSwapsOk: number;
  moralisSwapsFail: number;
  moralisAnalyticsAttempted: number;
  moralisAnalyticsOk: number;
  moralisAnalyticsFail: number;
  moralisInsightsAttempted: number;
  moralisInsightsBundleOk: number;
  moralisInsightsBundleFail: number;
  moralisTopLosersAttempted: number;
  moralisTopLosersOk: number;
  moralisTopLosersFail: number;
  moralisSnipersAttempted: number;
  moralisSnipersOk: number;
  moralisSnipersFail: number;
};

function emptyMoralisMetrics(): MoralisPerTokenSyncMetrics {
  return {
    evmWithMoralisKey: 0,
    skippedNoContractOrKey: 0,
    moralisCore5AllOk: 0,
    moralisCore5PartialFail: 0,
    moralisSwapsAttempted: 0,
    moralisSwapsOk: 0,
    moralisSwapsFail: 0,
    moralisAnalyticsAttempted: 0,
    moralisAnalyticsOk: 0,
    moralisAnalyticsFail: 0,
    moralisInsightsAttempted: 0,
    moralisInsightsBundleOk: 0,
    moralisInsightsBundleFail: 0,
    moralisTopLosersAttempted: 0,
    moralisTopLosersOk: 0,
    moralisTopLosersFail: 0,
    moralisSnipersAttempted: 0,
    moralisSnipersOk: 0,
    moralisSnipersFail: 0,
  };
}

/** Avoid duplicate CMC runs when several Node processes share one DB (remote Turso). */
const LEASE_MS = 45 * 60 * 1000;

async function tryAcquireCmcSyncLease(): Promise<boolean> {
  const now = Date.now();
  const until = now + LEASE_MS;
  await db.insert(cmcSyncLease).values({ id: 1, leaseUntil: 0 }).onConflictDoNothing();
  const updated = await db
    .update(cmcSyncLease)
    .set({ leaseUntil: until })
    .where(and(eq(cmcSyncLease.id, 1), lt(cmcSyncLease.leaseUntil, now)))
    .returning({ id: cmcSyncLease.id });
  return updated.length > 0;
}

async function releaseCmcSyncLease(): Promise<void> {
  await db.update(cmcSyncLease).set({ leaseUntil: 0 }).where(eq(cmcSyncLease.id, 1));
}

type TagCategory = "memes" | "ai-big-data" | "gaming" | "mineable";

/** CMC error 1006 / HTTP 403 = endpoint not included in API key plan (e.g. Basic free). */
function isCmcPlanUnsupported(status: number, bodyText: string): boolean {
  if (status === 403) return true;
  try {
    const j = JSON.parse(bodyText) as { status?: { error_code?: number } };
    return j?.status?.error_code === 1006;
  } catch {
    return false;
  }
}

/** When `listings/new` is paid-only, approximate "new" from `listings/latest` via `date_added`. */
function earlybirdTokensFromLatest(latestTokens: any[], max = 80): any[] {
  const withDate = latestTokens.filter((t) => t?.date_added);
  const sorted = [...withDate].sort((a, b) => {
    const da = new Date(String(a.date_added || 0)).getTime();
    const db = new Date(String(b.date_added || 0)).getTime();
    return db - da;
  });
  return sorted.slice(0, max);
}

function pickTagCategory(tags: string[] | undefined): TagCategory | null {
  if (!tags?.length) return null;
  if (tags.includes("memes")) return "memes";
  if (tags.includes("ai-big-data")) return "ai-big-data";
  if (tags.includes("gaming")) return "gaming";
  if (tags.includes("mineable")) return "mineable";
  return null;
}

async function fetchInfoMap(headers: Headers, ids: number[]): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  const uniq = [...new Set(ids.filter((n) => Number.isFinite(n)))];
  const batchSize = 100;
  const totalBatches = Math.max(1, Math.ceil(uniq.length / batchSize));
  for (let i = 0; i < uniq.length; i += batchSize) {
    const batch = uniq.slice(i, i + batchSize).join(",");
    const batchNo = Math.floor(i / batchSize) + 1;
    const infoRes = await timedFetch(
      `CMC cryptocurrency/info batch ${batchNo}/${totalBatches}`,
      `${BASE}/cryptocurrency/info?id=${batch}`,
      { headers },
    );
    if (!infoRes.ok) {
      if (infoRes.status === 429) {
        syncLogWarn("CMC info 429 — partial map", { batchNo, idsInBatch: batch.split(",").length });
        break;
      }
      const t = await infoRes.text();
      throw new Error(`info ${infoRes.status}: ${t}`);
    }
    const infoJson: any = await infoRes.json();
    Object.assign(out, infoJson.data || {});
  }
  syncLogInfo("CMC info map built", { uniqueIds: uniq.length, entries: Object.keys(out).length });
  return out;
}

/** quotes/latest — same ids as listings; used to refresh rows no longer in the current listing batch. */
async function fetchQuotesLatestMap(headers: Headers, ids: number[]): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  const uniq = [...new Set(ids.filter((n) => Number.isFinite(n)))];
  const batchSize = 100;
  const totalBatches = Math.max(1, Math.ceil(uniq.length / batchSize));
  for (let i = 0; i < uniq.length; i += batchSize) {
    const batch = uniq.slice(i, i + batchSize).join(",");
    const batchNo = Math.floor(i / batchSize) + 1;
    const res = await timedFetch(
      `CMC cryptocurrency/quotes/latest batch ${batchNo}/${totalBatches}`,
      `${BASE}/cryptocurrency/quotes/latest?id=${batch}&convert=USD`,
      { headers },
    );
    if (!res.ok) {
      if (res.status === 429) {
        syncLogWarn("CMC quotes/latest 429 — partial stale refresh", {
          batchNo,
          idsInBatch: batch.split(",").length,
        });
        break;
      }
      const t = await res.text();
      throw new Error(`quotes/latest ${res.status}: ${t}`);
    }
    const j: any = await res.json();
    Object.assign(out, j.data || {});
  }
  syncLogInfo("CMC quotes/latest map built", { uniqueIds: uniq.length, entries: Object.keys(out).length });
  return out;
}

type SnapshotBundle = {
  syncedAt: number;
  moralisChain: string;
  cmcQuotes: MoralisWalletTokensResult;
  cmcInfo: MoralisWalletTokensResult;
  topGainers: MoralisWalletTokensResult;
  topLosers?: MoralisWalletTokensResult;
  owners: MoralisWalletTokensResult;
  moralisPrice: MoralisWalletTokensResult;
  moralisTransfers: MoralisWalletTokensResult;
  moralisMeta: MoralisWalletTokensResult;
  moralisTokenScore?: MoralisWalletTokensResult;
  moralisTokenScoreHistorical?: MoralisWalletTokensResult;
  moralisTokenPairs?: MoralisWalletTokensResult;
  moralisSwaps?: MoralisWalletTokensResult;
  moralisTokenAnalytics?: MoralisWalletTokensResult;
  moralisPairSnipers?: MoralisWalletTokensResult;
};

/** First DEX pair address from Moralis `/erc20/.../pairs` (or similar) payload. */
function firstMoralisPairAddress(data: unknown): string | null {
  if (data == null) return null;
  let rows: Record<string, unknown>[] = [];
  if (Array.isArray(data)) rows = data as Record<string, unknown>[];
  else if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.result)) rows = o.result as Record<string, unknown>[];
    else if (Array.isArray(o.pairs)) rows = o.pairs as Record<string, unknown>[];
  }
  for (const r of rows) {
    const p = String(r.pair_address ?? r.pairAddress ?? "").toLowerCase();
    if (/^0x[a-f0-9]{40}$/.test(p)) return p;
  }
  return null;
}

/** Shapes match token page `cmcUsdQuote` / `cmcInfoUrls` expectations (quotes/latest + info). */
function wrapCmcQuotesForRow(cmcId: number, token: any): MoralisWalletTokensResult {
  return {
    ok: true,
    data: {
      data: {
        [String(cmcId)]: {
          quote: token.quote ?? { USD: {} },
        },
      },
    },
  };
}

function wrapCmcInfoForRow(cmcId: number, info: any): MoralisWalletTokensResult {
  if (!info) return { ok: false, error: "No CMC info for id" };
  return {
    ok: true,
    data: {
      data: {
        [String(cmcId)]: info,
      },
    },
  };
}

/** Update only CMC quote + info inside snapshot; keep Moralis payloads from previous full sync. */
function mergeApiSnapshotCmcOnly(
  existingJson: string | null | undefined,
  cmcId: number,
  quoteData: any,
  info: any,
  now: number,
): string {
  let parsed: Record<string, unknown> = {};
  if (existingJson) {
    try {
      parsed = JSON.parse(existingJson) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }
  parsed.syncedAt = now;
  parsed.cmcQuotes = wrapCmcQuotesForRow(cmcId, quoteData);
  parsed.cmcInfo = info
    ? wrapCmcInfoForRow(cmcId, info)
    : ({ ok: false, error: "No CMC info" } as MoralisWalletTokensResult);
  if (typeof parsed.moralisChain !== "string" || !parsed.moralisChain) {
    const network = info?.platform?.name || quoteData?.platform?.name || "Unknown";
    parsed.moralisChain = moralisChainFromNetworkLabel(network);
  }
  return JSON.stringify(parsed);
}

/**
 * Rows in this category whose cmcId was not part of today’s listing batch still stay in Turso;
 * refresh price/volume/% and CMC snapshot via quotes/latest (no full Moralis pass).
 */
async function refreshStaleCategoryRows(
  category: string,
  processedCmcIds: Set<number>,
  headers: Headers,
  now: number,
): Promise<number> {
  const maxPerCat = Math.max(
    0,
    Math.min(5000, Number(process.env.CMC_STALE_REFRESH_PER_CATEGORY ?? 800) || 800),
  );
  if (maxPerCat === 0) return 0;

  const rows = await db.select().from(cachedMarketTokens).where(eq(cachedMarketTokens.category, category)).all();

  const stale = rows
    .filter((r) => r.cmcId != null && Number.isFinite(r.cmcId) && !processedCmcIds.has(r.cmcId))
    .sort((a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0))
    .slice(0, maxPerCat);

  if (stale.length === 0) return 0;

  syncLogInfo("stale category refresh — fetching quotes + info", {
    category,
    staleRows: stale.length,
    uniqueCmcIds: new Set(stale.map((r) => r.cmcId!)).size,
  });

  const staleIds = [...new Set(stale.map((r) => r.cmcId!))];
  const quotes = await fetchQuotesLatestMap(headers, staleIds);
  const infos = await fetchInfoMap(headers, staleIds);

  let n = 0;
  for (const row of stale) {
    const cid = row.cmcId!;
    const q = quotes[String(cid)] as any;
    if (!q?.quote?.USD) continue;
    const info = infos[cid] ?? infos[String(cid)];
    const patch = {
      name: String(q.name ?? row.name),
      symbol: String(q.symbol ?? row.symbol),
      decimals: String(q.decimals ?? row.decimals ?? "18"),
      logo: (info?.logo as string | undefined) || row.logo || "",
      totalSupply:
        q.total_supply != null
          ? String(q.total_supply)
          : q.circulating_supply != null
            ? String(q.circulating_supply)
            : row.totalSupply,
      percentChange1h: String(q.quote?.USD?.percent_change_1h ?? row.percentChange1h ?? "0"),
      percentChange24h: String(q.quote?.USD?.percent_change_24h ?? "0"),
      percentChange7d: String(q.quote?.USD?.percent_change_7d ?? row.percentChange7d ?? "0"),
      percentChange30d: String(q.quote?.USD?.percent_change_30d ?? row.percentChange30d ?? "0"),
      percentChange90d: String(
        q.quote?.USD?.percent_change_90d ?? q.quote?.USD?.percent_change_30d ?? row.percentChange90d ?? "0",
      ),
      fullyDilutedValuation: String(q.quote?.USD?.fully_diluted_market_cap ?? row.fullyDilutedValuation ?? "0"),
      price: String(q.quote?.USD?.price ?? row.price ?? "0"),
      volume: String(q.quote?.USD?.volume_24h ?? row.volume ?? "0"),
      network: (info?.platform?.name as string | undefined) || row.network || "Unknown",
      slug: String(q.slug ?? row.slug ?? ""),
      cmcId: cid,
      updatedAt: now,
      apiSnapshot: mergeApiSnapshotCmcOnly(row.apiSnapshot, cid, q, info, now),
    };

    await db
      .update(cachedMarketTokens)
      .set(patch)
      .where(and(eq(cachedMarketTokens.category, category), eq(cachedMarketTokens.address, row.address)));
    n++;
  }
  return n;
}

async function buildTokenApiSnapshot(
  cmcId: number,
  token: any,
  info: any,
  rowAddressLower: string,
  now: number,
  metrics?: MoralisPerTokenSyncMetrics,
): Promise<string> {
  const network = info?.platform?.name || token?.platform?.name || "Unknown";
  const chain = moralisChainFromNetworkLabel(network);
  const addr = rowAddressLower.toLowerCase();
  const isEvm = /^0x[a-fA-F0-9]{40}$/.test(addr);

  const cmcQuotes = wrapCmcQuotesForRow(cmcId, token);
  const cmcInfo = wrapCmcInfoForRow(cmcId, info);

  let topGainers: MoralisWalletTokensResult = { ok: false, error: "Sin contrato EVM" };
  let owners: MoralisWalletTokensResult = { ok: false, error: "Sin contrato EVM" };
  let moralisPrice: MoralisWalletTokensResult = { ok: false, error: "Sin contrato EVM" };
  let moralisTransfers: MoralisWalletTokensResult = { ok: false, error: "Sin contrato EVM" };
  let moralisMeta: MoralisWalletTokensResult = { ok: false, error: "Sin contrato EVM" };

  let moralisSwaps: MoralisWalletTokensResult | undefined;
  const swapsSyncOn = /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_TOKEN_SWAPS ?? ""));
  const topLosersSyncOn = /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_TOKEN_TOP_LOSERS ?? ""));
  let topLosers: MoralisWalletTokensResult | undefined;
  const moralisKey = Boolean(process.env.MORALIS_API_KEY?.trim());
  const ownersLimitRaw = Number(process.env.MORALIS_SYNC_TOKEN_OWNERS_LIMIT ?? "25");
  const ownersLimit = Number.isFinite(ownersLimitRaw)
    ? Math.min(100, Math.max(5, Math.floor(ownersLimitRaw)))
    : 25;

  if (isEvm && moralisKey) {
    if (metrics) metrics.evmWithMoralisKey++;
    try {
      if (topLosersSyncOn) {
        [topGainers, topLosers, owners, moralisPrice, moralisTransfers, moralisMeta] = await Promise.all([
          fetchMoralisErc20TopGainers(addr, chain, 20),
          fetchMoralisErc20TopLosers(addr, chain, 20),
          fetchMoralisErc20Owners(addr, chain, ownersLimit),
          fetchMoralisErc20PriceBestEffort(addr, chain),
          fetchMoralisErc20Transfers(addr, chain, 18),
          fetchMoralisErc20Metadata(addr, chain),
        ]);
      } else {
        [topGainers, owners, moralisPrice, moralisTransfers, moralisMeta] = await Promise.all([
          fetchMoralisErc20TopGainers(addr, chain, 20),
          fetchMoralisErc20Owners(addr, chain, ownersLimit),
          fetchMoralisErc20PriceBestEffort(addr, chain),
          fetchMoralisErc20Transfers(addr, chain, 18),
          fetchMoralisErc20Metadata(addr, chain),
        ]);
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      const err: MoralisWalletTokensResult = { ok: false, error: msg };
      topGainers = owners = moralisPrice = moralisTransfers = moralisMeta = err;
      if (topLosersSyncOn) topLosers = err;
    }
    if (metrics) {
      const fiveOk = [topGainers, owners, moralisPrice, moralisTransfers, moralisMeta].every((r) => r.ok);
      if (fiveOk) metrics.moralisCore5AllOk++;
      else metrics.moralisCore5PartialFail++;
    }
    if (swapsSyncOn) {
      try {
        moralisSwaps = await fetchMoralisErc20Swaps(addr, chain, 18, "DESC");
      } catch (e: any) {
        moralisSwaps = { ok: false, error: e?.message || String(e) };
      }
      if (metrics) {
        metrics.moralisSwapsAttempted++;
        if (moralisSwaps?.ok) metrics.moralisSwapsOk++;
        else metrics.moralisSwapsFail++;
      }
    }
    if (metrics && topLosersSyncOn) {
      metrics.moralisTopLosersAttempted++;
      if (topLosers?.ok) metrics.moralisTopLosersOk++;
      else metrics.moralisTopLosersFail++;
    }
  } else if (metrics) {
    metrics.skippedNoContractOrKey++;
  }

  if (topLosersSyncOn && (!isEvm || !moralisKey)) {
    topLosers = {
      ok: false,
      error: !moralisKey ? "MORALIS_API_KEY missing" : "Sin contrato EVM",
    };
  }

  let moralisTokenScore: MoralisWalletTokensResult | undefined;
  let moralisTokenScoreHistorical: MoralisWalletTokensResult | undefined;
  let moralisTokenPairs: MoralisWalletTokensResult | undefined;
  let moralisTokenAnalytics: MoralisWalletTokensResult | undefined;

  const analyticsSyncOn = /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_TOKEN_ANALYTICS ?? ""));
  if (analyticsSyncOn && isEvm && moralisKey) {
    if (metrics) metrics.moralisAnalyticsAttempted++;
    try {
      moralisTokenAnalytics = await fetchMoralisTokenAnalytics(addr, chain);
    } catch (e: any) {
      moralisTokenAnalytics = { ok: false, error: e?.message || String(e) };
    }
    if (metrics) {
      if (moralisTokenAnalytics?.ok) metrics.moralisAnalyticsOk++;
      else metrics.moralisAnalyticsFail++;
    }
  }

  const insightsOn = /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_TOKEN_INSIGHTS ?? ""));
  if (insightsOn && isEvm && moralisKey) {
    const histOn = /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_TOKEN_SCORE_HISTORICAL ?? ""));
    if (metrics) metrics.moralisInsightsAttempted++;
    try {
      if (histOn) {
        [moralisTokenScore, moralisTokenPairs, moralisTokenScoreHistorical] = await Promise.all([
          fetchMoralisTokenScore(addr, chain),
          fetchMoralisTokenPairs(addr, chain, 12),
          fetchMoralisTokenScoreHistorical(addr, chain, "7d"),
        ]);
      } else {
        [moralisTokenScore, moralisTokenPairs] = await Promise.all([
          fetchMoralisTokenScore(addr, chain),
          fetchMoralisTokenPairs(addr, chain, 12),
        ]);
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      const err: MoralisWalletTokensResult = { ok: false, error: msg };
      moralisTokenScore = err;
      moralisTokenPairs = err;
      if (histOn) moralisTokenScoreHistorical = err;
    }
    if (metrics) {
      const bundleOk = histOn
        ? !!(moralisTokenScore?.ok && moralisTokenPairs?.ok && moralisTokenScoreHistorical?.ok)
        : !!(moralisTokenScore?.ok && moralisTokenPairs?.ok);
      if (bundleOk) metrics.moralisInsightsBundleOk++;
      else metrics.moralisInsightsBundleFail++;
    }
  }

  let moralisPairSnipers: MoralisWalletTokensResult | undefined;
  const snipersSyncOn = /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_TOKEN_SNIPERS ?? ""));
  if (snipersSyncOn && isEvm && moralisKey && moralisTokenPairs?.ok && moralisTokenPairs.data != null) {
    const pairAddr = firstMoralisPairAddress(moralisTokenPairs.data);
    if (pairAddr) {
      if (metrics) metrics.moralisSnipersAttempted++;
      try {
        const blocksRaw = Number(process.env.MORALIS_SYNC_TOKEN_SNIPERS_BLOCKS ?? "3");
        const blocks = Number.isFinite(blocksRaw) ? Math.min(1000, Math.max(0, blocksRaw)) : 3;
        moralisPairSnipers = await fetchMoralisPairSnipers(pairAddr, chain, blocks);
      } catch (e: any) {
        moralisPairSnipers = { ok: false, error: e?.message || String(e) };
      }
      if (metrics) {
        if (moralisPairSnipers?.ok) metrics.moralisSnipersOk++;
        else metrics.moralisSnipersFail++;
      }
    }
  }

  const bundle: SnapshotBundle = {
    syncedAt: now,
    moralisChain: chain,
    cmcQuotes,
    cmcInfo,
    topGainers,
    owners,
    moralisPrice,
    moralisTransfers,
    moralisMeta,
  };
  if (topLosers) bundle.topLosers = topLosers;
  if (moralisTokenScore) bundle.moralisTokenScore = moralisTokenScore;
  if (moralisTokenPairs) bundle.moralisTokenPairs = moralisTokenPairs;
  if (moralisTokenScoreHistorical) bundle.moralisTokenScoreHistorical = moralisTokenScoreHistorical;
  if (moralisSwaps) bundle.moralisSwaps = moralisSwaps;
  if (moralisTokenAnalytics) bundle.moralisTokenAnalytics = moralisTokenAnalytics;
  if (moralisPairSnipers) bundle.moralisPairSnipers = moralisPairSnipers;

  return JSON.stringify(bundle);
}

function pickCmcTokenAddress(token: any, info: any, cmcNumericId: number): string {
  const fromInfo = String(info?.platform?.token_address ?? "").trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(fromInfo)) return fromInfo.toLowerCase();
  const fromListing = String(token?.platform?.token_address ?? "").trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(fromListing)) return fromListing.toLowerCase();
  const slugOrId = String(token?.slug ?? cmcNumericId ?? "").trim();
  return slugOrId || String(cmcNumericId);
}

async function upsertMarketCategory(
  category: string,
  token: any,
  info: any,
  now: number,
  moralisMetrics?: MoralisPerTokenSyncMetrics,
): Promise<void> {
  const id = token.id as number;
  const addr = pickCmcTokenAddress(token, info, id);
  const addressLower = String(addr).toLowerCase();
  const apiSnapshot = await buildTokenApiSnapshot(id, token, info, addressLower, now, moralisMetrics);

  const row = {
    category,
    address: addressLower,
    name: token.name as string,
    symbol: token.symbol as string,
    decimals: String(token.decimals ?? 18),
    logo: info?.logo || "https://via.placeholder.com/20",
    totalSupply: token.total_supply != null ? String(token.total_supply) : "0",
    percentChange1h: String(token.quote?.USD?.percent_change_1h ?? "0"),
    percentChange24h: String(token.quote?.USD?.percent_change_24h ?? "0"),
    percentChange7d: String(token.quote?.USD?.percent_change_7d ?? "0"),
    percentChange30d: String(token.quote?.USD?.percent_change_30d ?? "0"),
    percentChange90d: String(
      token.quote?.USD?.percent_change_90d ?? token.quote?.USD?.percent_change_30d ?? "0",
    ),
    fullyDilutedValuation: String(token.quote?.USD?.fully_diluted_market_cap ?? "0"),
    price: String(token.quote?.USD?.price ?? "0"),
    volume: String(token.quote?.USD?.volume_24h ?? "0"),
    network: info?.platform?.name || "Unknown",
    slug: token.slug || "",
    cmcId: id,
    updatedAt: now,
    apiSnapshot,
  };

  // Canonical key is (category + cmcId). Address can change between snapshots,
  // so we resolve/merge conflicting rows before writing to avoid unique(cat,address) collisions.
  const [byCmc, byAddress] = await Promise.all([
    db
      .select({ id: cachedMarketTokens.id })
      .from(cachedMarketTokens)
      .where(and(eq(cachedMarketTokens.category, category), eq(cachedMarketTokens.cmcId, id)))
      .limit(1)
      .get(),
    db
      .select({ id: cachedMarketTokens.id, cmcId: cachedMarketTokens.cmcId })
      .from(cachedMarketTokens)
      .where(and(eq(cachedMarketTokens.category, category), eq(cachedMarketTokens.address, row.address)))
      .limit(1)
      .get(),
  ]);

  const keepId = byCmc?.id ?? byAddress?.id ?? null;
  if (keepId != null) {
    // If the incoming address is currently held by another row, remove it first.
    if (byAddress?.id != null && byAddress.id !== keepId) {
      await db.delete(cachedMarketTokens).where(eq(cachedMarketTokens.id, byAddress.id));
    }

    await db
      .update(cachedMarketTokens)
      .set({
        address: row.address,
        name: row.name,
        symbol: row.symbol,
        decimals: row.decimals,
        logo: row.logo,
        totalSupply: row.totalSupply,
        percentChange1h: row.percentChange1h,
        percentChange24h: row.percentChange24h,
        percentChange7d: row.percentChange7d,
        percentChange30d: row.percentChange30d,
        percentChange90d: row.percentChange90d,
        fullyDilutedValuation: row.fullyDilutedValuation,
        price: row.price,
        volume: row.volume,
        network: row.network,
        slug: row.slug,
        cmcId: row.cmcId,
        updatedAt: now,
        apiSnapshot: row.apiSnapshot,
      })
      .where(eq(cachedMarketTokens.id, keepId));

    // Cleanup duplicate rows with same canonical key.
    await db
      .delete(cachedMarketTokens)
      .where(
        and(
          eq(cachedMarketTokens.category, category),
          eq(cachedMarketTokens.cmcId, id),
          ne(cachedMarketTokens.id, keepId),
        ),
      );
    return;
  }

  await db
    .insert(cachedMarketTokens)
    .values(row)
    .onConflictDoUpdate({
      target: [cachedMarketTokens.category, cachedMarketTokens.address],
      set: {
        name: row.name,
        symbol: row.symbol,
        decimals: row.decimals,
        logo: row.logo,
        totalSupply: row.totalSupply,
        percentChange1h: row.percentChange1h,
        percentChange24h: row.percentChange24h,
        percentChange7d: row.percentChange7d,
        percentChange30d: row.percentChange30d,
        percentChange90d: row.percentChange90d,
        fullyDilutedValuation: row.fullyDilutedValuation,
        price: row.price,
        volume: row.volume,
        network: row.network,
        slug: row.slug,
        cmcId: row.cmcId,
        updatedAt: now,
        apiSnapshot: row.apiSnapshot,
      },
    });
}

export async function runDailyMarketSync(): Promise<{
  ok: boolean;
  error?: string;
  Upserted?: number;
  skipped?: boolean;
}> {
  const runId = randomUUID().slice(0, 8);
  return withSyncRun(runId, () => runDailyMarketSyncBody());
}

async function runDailyMarketSyncBody(): Promise<{
  ok: boolean;
  error?: string;
  Upserted?: number;
  skipped?: boolean;
}> {
  const hasMoralis = Boolean(process.env.MORALIS_API_KEY?.trim());
  syncLogInfo("daily market sync — start", {
    hasCmcKey: Boolean(process.env.CMC_API_KEY?.trim()),
    hasMoralisKey: hasMoralis,
    moralisSwaps: /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_TOKEN_SWAPS ?? "")),
    moralisAnalytics: /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_TOKEN_ANALYTICS ?? "")),
    moralisInsights: /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_TOKEN_INSIGHTS ?? "")),
    moralisTopLosers: /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_TOKEN_TOP_LOSERS ?? "")),
    moralisSnipers: /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_TOKEN_SNIPERS ?? "")),
    moralisWalletDefi: /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_WALLET_DEFI ?? "")),
    moralisWalletPnlDetail: /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_WALLET_PROFITABILITY_DETAIL ?? "")),
    moralisWalletApprovals: /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_WALLET_APPROVALS ?? "")),
    moralisGlobalCategories: /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_GLOBAL_TOKEN_CATEGORIES ?? "")),
    moralisGlobalTopLosers: /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_GLOBAL_DISCOVERY_TOP_LOSERS ?? "")),
    moralisGlobalLatestBlocks: /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_GLOBAL_LATEST_BLOCKS ?? "")),
  });

  const apiKey = process.env.CMC_API_KEY?.trim();
  if (!apiKey) {
    syncLogWarn("CMC_API_KEY missing — skip CMC market fill; running auxiliary APIs only");
    try {
      await runAuxiliaryApiSnapshotSync();
      syncLogInfo("daily market sync — finished (auxiliary only, no CMC)", { ok: false });
    } catch (e: unknown) {
      syncLogError("auxiliary snapshot sync failed", e instanceof Error ? e : { error: String(e) });
    }
    return { ok: false, error: "CMC_API_KEY missing" };
  }

  const gotLease = await tryAcquireCmcSyncLease();
  if (!gotLease) {
    syncLogInfo("CMC lease busy — skip full CMC run; still running auxiliary snapshots");
    try {
      await runAuxiliaryApiSnapshotSync();
      syncLogInfo("daily market sync — finished (skipped CMC, auxiliary done)", { skipped: true });
    } catch (e: unknown) {
      syncLogError("auxiliary snapshot sync failed", e instanceof Error ? e : { error: String(e) });
    }
    return { ok: true, skipped: true };
  }

  const startMs = Date.now();
  const started = Math.floor(startMs / 1000);
  const [runRow] = await db
    .insert(syncRuns)
    .values({ startedAt: started, status: "running", source: "daily-market-sync" })
    .returning();
  if (runRow?.id != null) setSyncRunDbId(runRow.id);

  let upserted = 0;
  const moralisMetrics = emptyMoralisMetrics();
  try {
    const headers = new Headers({
      Accept: "application/json",
      "X-CMC_PRO_API_KEY": apiKey,
    });

    syncLogInfo("phase: CMC global-metrics/quotes/latest");
    const globalMetricsRes = await timedFetch(
      "CMC global-metrics/quotes/latest",
      `${BASE}/global-metrics/quotes/latest?convert=USD`,
      { headers },
    );
    if (globalMetricsRes.ok) {
      const globalMetricsJson: any = await globalMetricsRes.json();
      await upsertGlobalSnapshot(GLOBAL_CMC_GLOBAL_METRICS, {
        syncedAt: Math.floor(Date.now() / 1000),
        source: "coinmarketcap.global-metrics",
        ...globalMetricsJson,
      });
      syncLogInfo("CMC global metrics snapshot saved");
    } else {
      syncLogWarn("CMC global-metrics unavailable", {
        bodyPreview: (await globalMetricsRes.text()).slice(0, 200),
      });
    }

    syncLogInfo("phase: CMC listings/latest");
    const latestRes = await timedFetch(
      "CMC cryptocurrency/listings/latest",
      `${BASE}/cryptocurrency/listings/latest?limit=200&convert=USD`,
      { headers },
    );
    if (!latestRes.ok) {
      const t = await latestRes.text();
      throw new Error(`listings/latest ${latestRes.status}: ${t}`);
    }
    const latestJson: any = await latestRes.json();
    const latestTokens: any[] = latestJson.data || [];
    syncLogInfo("CMC listings/latest parsed", { count: latestTokens.length });

    syncLogInfo("phase: CMC listings/new");
    let newTokens: any[] = [];
    const newRes = await timedFetch(
      "CMC cryptocurrency/listings/new",
      `${BASE}/cryptocurrency/listings/new?convert=USD`,
      { headers },
    );
    if (newRes.ok) {
      const newJson: any = await newRes.json();
      newTokens = newJson.data || [];
      syncLogInfo("CMC listings/new parsed", { count: newTokens.length });
    } else {
      const t = await newRes.text();
      if (isCmcPlanUnsupported(newRes.status, t)) {
        syncLogWarn(
          "CMC listings/new not on plan — using listings/latest date_added for earlybird",
          { status: newRes.status },
        );
        newTokens = [];
      } else {
        throw new Error(`listings/new ${newRes.status}: ${t}`);
      }
    }

    const map = new Map<number, any>();
    for (const tok of [...latestTokens, ...newTokens]) map.set(tok.id, tok);
    const allTokens = [...map.values()];

    const ids = allTokens.map((t) => t.id);
    syncLogInfo("phase: CMC cryptocurrency/info (all listing ids)", { idCount: ids.length });
    const tokenInfo = await fetchInfoMap(headers, ids);

    const now = Math.floor(Date.now() / 1000);

    const processedCmcByCategory = new Map<string, Set<number>>();
    async function upsertTracked(category: string, token: any, info: any, t: number) {
      await upsertMarketCategory(category, token, info, t, moralisMetrics);
      const cid = token.id as number;
      if (Number.isFinite(cid)) {
        if (!processedCmcByCategory.has(category)) processedCmcByCategory.set(category, new Set());
        processedCmcByCategory.get(category)!.add(cid);
      }
    }

    syncLogInfo("phase: upsert tag verticals (meme/ai/gaming/mineable)");
    for (const token of allTokens) {
      const tagCat = pickTagCategory(token.tags);
      if (!tagCat) continue;
      const id = token.id as number;
      await upsertTracked(tagCat, token, tokenInfo[id], now);
      upserted++;
    }

    const earlybirdSource =
      newTokens.length > 0 ? newTokens : earlybirdTokensFromLatest(latestTokens);
    syncLogInfo("phase: upsert earlybird", { source: newTokens.length > 0 ? "listings/new" : "latest by date_added", rows: earlybirdSource.length });
    for (const token of earlybirdSource) {
      const id = token.id as number;
      await upsertTracked("earlybird", token, tokenInfo[id], now);
      upserted++;
    }

    syncLogInfo("phase: upsert volume (top 150 by 24h vol)");
    const byVol = [...latestTokens].sort(
      (a, b) => (Number(b.quote?.USD?.volume_24h) || 0) - (Number(a.quote?.USD?.volume_24h) || 0),
    );
    for (const token of byVol.slice(0, 150)) {
      const id = token.id as number;
      await upsertTracked("volume", token, tokenInfo[id], now);
      upserted++;
    }

    syncLogInfo("phase: CMC trending/gainers-losers + upsert");
    const trendRes = await timedFetch(
      "CMC cryptocurrency/trending/gainers-losers",
      `${BASE}/cryptocurrency/trending/gainers-losers`,
      { headers },
    );
    if (trendRes.ok) {
      const trendJson: any = await trendRes.json();
      const trendTokens: any[] = trendJson.data || [];
      syncLogInfo("CMC gainers-losers parsed", { count: trendTokens.length });
      const tIds = trendTokens.map((t) => t.id);
      const tInfo = { ...tokenInfo, ...(await fetchInfoMap(headers, tIds)) };
      for (const token of trendTokens) {
        const id = token.id as number;
        await upsertTracked("trending", token, tInfo[id], now);
        upserted++;
      }
    } else {
      syncLogWarn("CMC trending/gainers-losers unusable", { bodyPreview: (await trendRes.text()).slice(0, 200) });
    }

    syncLogInfo("phase: CMC trending/most-visited + upsert");
    const visitRes = await timedFetch(
      "CMC cryptocurrency/trending/most-visited",
      `${BASE}/cryptocurrency/trending/most-visited`,
      { headers },
    );
    if (visitRes.ok) {
      const visitJson: any = await visitRes.json();
      const visitTokens: any[] = visitJson.data || [];
      syncLogInfo("CMC most-visited parsed", { count: visitTokens.length });
      const vIds = visitTokens.map((t) => t.id);
      const vInfo = { ...tokenInfo, ...(await fetchInfoMap(headers, vIds)) };
      for (const token of visitTokens) {
        const id = token.id as number;
        await upsertTracked("most-visited", token, vInfo[id], now);
        upserted++;
      }
    } else {
      syncLogWarn("CMC trending/most-visited unusable", { bodyPreview: (await visitRes.text()).slice(0, 200) });
    }

    syncLogInfo("phase: stale row refresh (quotes/latest + info per category)");
    let staleRefreshed = 0;
    for (const cat of MARKET_CATEGORIES) {
      const processed = processedCmcByCategory.get(cat) ?? new Set<number>();
      staleRefreshed += await refreshStaleCategoryRows(cat, processed, headers, now);
    }
    if (staleRefreshed > 0) {
      syncLogInfo("stale CMC quote-only refresh done", {
        rowsUpdated: staleRefreshed,
        hint: "tokens outside current listing batch",
      });
    } else {
      syncLogInfo("stale CMC refresh — no rows needed");
    }

    syncLogInfo("Moralis aggregate (per token row during CMC upserts)", moralisMetrics);

    if (runRow?.id) {
      const endMs = Date.now();
      await db
        .update(syncRuns)
        .set({
          finishedAt: Math.floor(endMs / 1000),
          status: "success",
          durationMs: Math.round(endMs - startMs),
        })
        .where(eq(syncRuns.id, runRow.id));
    }

    syncLogInfo("CMC + Turso upsert pass complete", {
      upsertOperations: upserted,
      staleRefreshed,
      durationMs: Math.round(Date.now() - startMs),
    });
    try {
      await runAuxiliaryApiSnapshotSync();
      syncLogInfo("daily market sync — success (CMC + auxiliary)", {
        Upserted: upserted + staleRefreshed,
        durationMs: Math.round(Date.now() - startMs),
      });
    } catch (e: unknown) {
      syncLogError("auxiliary snapshot sync failed after successful CMC", e instanceof Error ? e : { error: String(e) });
    }
    void runPriceAlertEvaluation();
    return { ok: true, Upserted: upserted + staleRefreshed };
  } catch (e: any) {
    syncLogError("daily market sync failed", { message: e?.message || String(e) });
    if (runRow?.id) {
      const endMs = Date.now();
      await db
        .update(syncRuns)
        .set({
          finishedAt: Math.floor(endMs / 1000),
          status: "error",
          errorMessage: e?.message || String(e),
          durationMs: Math.round(endMs - startMs),
        })
        .where(eq(syncRuns.id, runRow.id));
    }
    try {
      await runAuxiliaryApiSnapshotSync();
      syncLogInfo("auxiliary snapshots attempted after CMC error");
    } catch (auxErr: unknown) {
      syncLogError("auxiliary snapshot sync failed", auxErr instanceof Error ? auxErr : { error: String(auxErr) });
    }
    return { ok: false, error: e?.message || String(e) };
  } finally {
    await releaseCmcSyncLease().catch(() => {});
  }
}
