/**
 * Solo servidor — importado con `await import(...)` desde el `routeLoader$` del dashboard home
 * para no arrastrar `~/lib/turso` al bundle del cliente.
 */
import type { RequestEventBase } from "@builder.io/qwik-city";
import { count, desc, eq, gt } from "drizzle-orm";
import { db } from "~/lib/turso";
import {
  GLOBAL_CMC_GLOBAL_METRICS,
  GLOBAL_MORALIS_DISCOVERY_FILTERED,
  GLOBAL_MORALIS_DISCOVERY_TOP_GAINERS_ETH,
  GLOBAL_MORALIS_ENTITY_CATEGORIES,
  GLOBAL_MORALIS_ENTITY_CATEGORY_SAMPLE,
  GLOBAL_MORALIS_ENTITY_DETAIL_SAMPLE,
  GLOBAL_MORALIS_ENTITY_SEARCH,
  GLOBAL_MORALIS_NATIVE_BALANCES_BATCH,
  GLOBAL_MORALIS_PAIR_STATS_SAMPLE,
  GLOBAL_MORALIS_PAIR_SWAPS_SAMPLE,
  GLOBAL_MORALIS_RESOLVE_ENS_SAMPLE,
  GLOBAL_MORALIS_RESOLVE_REVERSE_SAMPLE,
  GLOBAL_MORALIS_SOL_BONDING_STATUS_SAMPLE,
  GLOBAL_MORALIS_SOL_PAIR_STATS_SAMPLE,
  GLOBAL_MORALIS_SOL_PUMPFUN_BONDING,
  GLOBAL_MORALIS_SOL_PUMPFUN_GRADUATED,
  GLOBAL_MORALIS_SOL_PUMPFUN_NEW,
  GLOBAL_MORALIS_TOKEN_SEARCH,
  GLOBAL_MORALIS_TOP_PROFITABLE_SAMPLE,
  GLOBAL_MORALIS_TRENDING_BASE,
  GLOBAL_MORALIS_TRENDING_ETH,
  GLOBAL_MORALIS_TX_VERBOSE_SAMPLE,
  GLOBAL_MORALIS_VOLUME_CAT_BASE,
  GLOBAL_MORALIS_VOLUME_CAT_ETH,
  GLOBAL_MORALIS_VOLUME_CHAINS,
  getGlobalSnapshotJson,
  getWalletSnapshotJson,
  GLOBAL_NANSEN_TOKEN_SCREENER,
  GLOBAL_NFT_HOTTEST,
} from "~/server/crypto-helper/api-snapshot-sync";
import type { MoralisWalletTokensResult } from "~/server/crypto-helper/moralis-api";
import {
  getLatestSyncRun,
  MARKET_TOKEN_LIGHT_SELECT,
  queryMarketTokens,
  queryMostVisitedOrFallback,
  queryRecentSyncRuns,
  queryTrendingOrFallback,
} from "~/server/crypto-helper/market-queries";
import { getUserProAccess } from "~/server/crypto-helper/user-access";
import {
  erc20LogoUrl,
  isSolanaWalletAddress,
  normalizeWalletSnapshotAddress,
} from "~/server/crypto-helper/wallet-snapshot";
import { formatUsdBalance } from "~/utils/format-market";
import { getUserId } from "~/utils/auth";
import {
  cachedMarketTokens,
  freshSignals,
  signalTraders,
  signalWhales,
  users,
} from "../../../drizzle/schema";

function normalizeMoralisTokenList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as { result?: unknown[] }).result)) {
    return (raw as { result: unknown[] }).result;
  }
  return [];
}

function dedupeRows<T extends { cmcId?: number | null; slug?: string | null; symbol?: string | null }>(
  rows: T[],
): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const cmc = row.cmcId;
    const key =
      cmc != null && Number.isFinite(Number(cmc))
        ? `cmc:${Number(cmc)}`
        : `slug:${String(row.slug ?? "").toLowerCase()}|sym:${String(row.symbol ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export type MoralisDiscoveryHomePack = {
  trendingEth: unknown;
  trendingBase: unknown;
  volumeChains: unknown;
  volumeCatEth: unknown;
  volumeCatBase: unknown;
  discoveryTopGainersEth: unknown;
  discoveryFiltered: unknown;
  entityCategories: unknown;
  entitySearch: unknown;
  entityCategorySample: unknown;
  entityDetailSample: unknown;
  resolveEnsSample: unknown;
  resolveReverseSample: unknown;
  pairSwapsSample: unknown;
  pairStatsSample: unknown;
  topProfitableSample: unknown;
  nativeBalancesBatch: unknown;
  txVerboseSample: unknown;
  solPumpfunNew: unknown;
  solPumpfunBonding: unknown;
  solPumpfunGraduated: unknown;
  solBondingStatusSample: unknown;
  solPairStatsSample: unknown;
  tokenSearch: unknown;
};

async function loadMoralisDiscoveryHomePack(): Promise<MoralisDiscoveryHomePack> {
  const [
    trendingEth,
    trendingBase,
    volumeChains,
    volumeCatEth,
    volumeCatBase,
    discoveryTopGainersEth,
    discoveryFiltered,
    entityCategories,
    entitySearch,
    entityCategorySample,
    entityDetailSample,
    resolveEnsSample,
    resolveReverseSample,
    pairSwapsSample,
    pairStatsSample,
    topProfitableSample,
    nativeBalancesBatch,
    txVerboseSample,
    solPumpfunNew,
    solPumpfunBonding,
    solPumpfunGraduated,
    solBondingStatusSample,
    solPairStatsSample,
    tokenSearch,
  ] = await Promise.all([
    getGlobalSnapshotJson(GLOBAL_MORALIS_TRENDING_ETH),
    getGlobalSnapshotJson(GLOBAL_MORALIS_TRENDING_BASE),
    getGlobalSnapshotJson(GLOBAL_MORALIS_VOLUME_CHAINS),
    getGlobalSnapshotJson(GLOBAL_MORALIS_VOLUME_CAT_ETH),
    getGlobalSnapshotJson(GLOBAL_MORALIS_VOLUME_CAT_BASE),
    getGlobalSnapshotJson(GLOBAL_MORALIS_DISCOVERY_TOP_GAINERS_ETH),
    getGlobalSnapshotJson(GLOBAL_MORALIS_DISCOVERY_FILTERED),
    getGlobalSnapshotJson(GLOBAL_MORALIS_ENTITY_CATEGORIES),
    getGlobalSnapshotJson(GLOBAL_MORALIS_ENTITY_SEARCH),
    getGlobalSnapshotJson(GLOBAL_MORALIS_ENTITY_CATEGORY_SAMPLE),
    getGlobalSnapshotJson(GLOBAL_MORALIS_ENTITY_DETAIL_SAMPLE),
    getGlobalSnapshotJson(GLOBAL_MORALIS_RESOLVE_ENS_SAMPLE),
    getGlobalSnapshotJson(GLOBAL_MORALIS_RESOLVE_REVERSE_SAMPLE),
    getGlobalSnapshotJson(GLOBAL_MORALIS_PAIR_SWAPS_SAMPLE),
    getGlobalSnapshotJson(GLOBAL_MORALIS_PAIR_STATS_SAMPLE),
    getGlobalSnapshotJson(GLOBAL_MORALIS_TOP_PROFITABLE_SAMPLE),
    getGlobalSnapshotJson(GLOBAL_MORALIS_NATIVE_BALANCES_BATCH),
    getGlobalSnapshotJson(GLOBAL_MORALIS_TX_VERBOSE_SAMPLE),
    getGlobalSnapshotJson(GLOBAL_MORALIS_SOL_PUMPFUN_NEW),
    getGlobalSnapshotJson(GLOBAL_MORALIS_SOL_PUMPFUN_BONDING),
    getGlobalSnapshotJson(GLOBAL_MORALIS_SOL_PUMPFUN_GRADUATED),
    getGlobalSnapshotJson(GLOBAL_MORALIS_SOL_BONDING_STATUS_SAMPLE),
    getGlobalSnapshotJson(GLOBAL_MORALIS_SOL_PAIR_STATS_SAMPLE),
    getGlobalSnapshotJson(GLOBAL_MORALIS_TOKEN_SEARCH),
  ]);
  return {
    trendingEth,
    trendingBase,
    volumeChains,
    volumeCatEth,
    volumeCatBase,
    discoveryTopGainersEth,
    discoveryFiltered,
    entityCategories,
    entitySearch,
    entityCategorySample,
    entityDetailSample,
    resolveEnsSample,
    resolveReverseSample,
    pairSwapsSample,
    pairStatsSample,
    topProfitableSample,
    nativeBalancesBatch,
    txVerboseSample,
    solPumpfunNew,
    solPumpfunBonding,
    solPumpfunGraduated,
    solBondingStatusSample,
    solPairStatsSample,
    tokenSearch,
  };
}

export async function loadDashboardHome(ev: RequestEventBase) {
  try {
  const since24h = Math.floor(Date.now() / 1000) - 86_400;

  const [
    meme,
    ai,
    gaming,
    mineable,
    earlybird,
    totalRow,
    lastSync,
    topVolume,
    topVolumeForPulse,
    trendingPack,
    mostVisitedPack,
    whale24,
    trader24,
    smart24,
    syncHistory,
    globalMetricsSnap,
    nansenTokenScreenerSnap,
    moralisDiscovery,
  ] = await Promise.all([
      db
        .select(MARKET_TOKEN_LIGHT_SELECT)
        .from(cachedMarketTokens)
        .where(eq(cachedMarketTokens.category, "memes"))
        .orderBy(desc(cachedMarketTokens.updatedAt))
        .limit(30)
        .all(),
      db
        .select(MARKET_TOKEN_LIGHT_SELECT)
        .from(cachedMarketTokens)
        .where(eq(cachedMarketTokens.category, "ai-big-data"))
        .orderBy(desc(cachedMarketTokens.updatedAt))
        .limit(30)
        .all(),
      db
        .select(MARKET_TOKEN_LIGHT_SELECT)
        .from(cachedMarketTokens)
        .where(eq(cachedMarketTokens.category, "gaming"))
        .orderBy(desc(cachedMarketTokens.updatedAt))
        .limit(30)
        .all(),
      db
        .select(MARKET_TOKEN_LIGHT_SELECT)
        .from(cachedMarketTokens)
        .where(eq(cachedMarketTokens.category, "mineable"))
        .orderBy(desc(cachedMarketTokens.updatedAt))
        .limit(30)
        .all(),
      db
        .select(MARKET_TOKEN_LIGHT_SELECT)
        .from(cachedMarketTokens)
        .where(eq(cachedMarketTokens.category, "earlybird"))
        .orderBy(desc(cachedMarketTokens.updatedAt))
        .limit(30)
        .all(),
      db.select({ n: count() }).from(cachedMarketTokens).get(),
      getLatestSyncRun(),
      queryMarketTokens({ category: "volume", limit: 30, offset: 0 }),
      queryMarketTokens({ category: "volume", limit: 120, offset: 0 }),
      queryTrendingOrFallback(30),
      queryMostVisitedOrFallback(30),
      db
        .select({ n: count() })
        .from(signalWhales)
        .where(gt(signalWhales.time, since24h))
        .get(),
      db
        .select({ n: count() })
        .from(signalTraders)
        .where(gt(signalTraders.time, since24h))
        .get(),
      db
        .select({ n: count() })
        .from(freshSignals)
        .where(gt(freshSignals.createdAt, since24h))
        .get(),
      queryRecentSyncRuns(20),
      getGlobalSnapshotJson<any>(GLOBAL_CMC_GLOBAL_METRICS),
      getGlobalSnapshotJson<any>(GLOBAL_NANSEN_TOKEN_SCREENER),
      loadMoralisDiscoveryHomePack(),
    ]);

  const parseNum = (v: unknown): number => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };
  const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
  const clamp100 = (n: number): number => Math.max(0, Math.min(100, n));
  const sampleMarketCap = topVolumeForPulse.reduce((acc, t: any) => acc + parseNum(t.fullyDilutedValuation), 0);
  const sampleVolume24h = topVolumeForPulse.reduce((acc, t: any) => acc + parseNum(t.volume), 0);
  const advanced = topVolumeForPulse.reduce(
    (acc, t: any) => acc + (parseNum(t.percentChange24h) > 0 ? 1 : 0),
    0,
  );
  const declined = topVolumeForPulse.reduce(
    (acc, t: any) => acc + (parseNum(t.percentChange24h) < 0 ? 1 : 0),
    0,
  );
  const avg24hChange =
    topVolumeForPulse.length > 0
      ? topVolumeForPulse.reduce((acc, t: any) => acc + parseNum(t.percentChange24h), 0) / topVolumeForPulse.length
      : 0;
  const gmData = globalMetricsSnap?.data ?? {};
  const gmUsd = gmData?.quote?.USD ?? {};
  const marketCap = parseNum(gmUsd?.total_market_cap) || sampleMarketCap;
  const volume24h = parseNum(gmUsd?.total_volume_24h) || sampleVolume24h;
  const activeCryptocurrencies = Math.max(0, Math.floor(parseNum(gmData?.active_cryptocurrencies)));
  const hasGlobalMetrics = parseNum(gmUsd?.total_market_cap) > 0 || parseNum(gmUsd?.total_volume_24h) > 0;
  const btc = topVolumeForPulse.find((t: any) => String(t.symbol ?? "").toUpperCase() === "BTC");
  const btcDominanceFromGlobal = parseNum(gmData?.btc_dominance);
  const btcDominance =
    btcDominanceFromGlobal > 0
      ? btcDominanceFromGlobal
      : marketCap > 0
        ? (parseNum(btc?.fullyDilutedValuation) / marketCap) * 100
        : null;
  const btcPerf90d = parseNum(btc?.percentChange90d);
  const altCandidates = topVolumeForPulse
    .filter((t: any) => String(t.symbol ?? "").toUpperCase() !== "BTC")
    .slice(0, 60);
  const altOutperformers = altCandidates.reduce(
    (acc, t: any) => acc + (parseNum(t.percentChange90d) > btcPerf90d ? 1 : 0),
    0,
  );
  const altcoinSeason = altCandidates.length > 0 ? (altOutperformers / altCandidates.length) * 100 : 0;
  const rsiCandidates = topVolumeForPulse.slice(0, 80);
  const avgRsi =
    rsiCandidates.length > 0
      ? rsiCandidates.reduce((acc, t: any) => {
          const p24 = parseNum(t.percentChange24h);
          const p7d = parseNum(t.percentChange7d);
          // Proxy RSI from momentum mix when OHLC candles are unavailable in cache.
          const momentum = p24 * 0.6 + p7d * 0.4;
          const normalized = clamp100(50 + momentum * 2.2);
          return acc + normalized;
        }, 0) / rsiCandidates.length
      : 50;
  const fearGreed = (() => {
    const breadthRatio = topVolumeForPulse.length > 0 ? (advanced - declined) / topVolumeForPulse.length : 0;
    const breadthScore = clamp100(50 + breadthRatio * 50);
    const perfScore = clamp100(50 + avg24hChange * 3.5);
    const dominancePenalty = btcDominance == null ? 0.5 : clamp01((btcDominance - 35) / 35);
    return clamp100(breadthScore * 0.45 + perfScore * 0.4 + (1 - dominancePenalty) * 100 * 0.15);
  })();

  const pro = await getUserProAccess(ev);

  const nftHotSnap = await getGlobalSnapshotJson<MoralisWalletTokensResult | null>(GLOBAL_NFT_HOTTEST);
  const nftHottestCount = nftHotSnap?.ok ? normalizeMoralisTokenList(nftHotSnap.data).length : 0;

  let wallet: {
    address: string | null;
    authProvider?: string | null;
    tokens: { symbol: string; usdLabel: string; logo: string | null; tokenAddress: string }[];
    walletTokensError?: string;
  } = { address: null, tokens: [] };

  const uid = getUserId(ev);
  if (uid) {
    const row = await db
      .select({ walletAddress: users.walletAddress, authProvider: users.authProvider })
      .from(users)
      .where(eq(users.id, Number(uid)))
      .get();
    const addr = row?.walletAddress?.trim() || null;
    wallet = { address: addr, authProvider: row?.authProvider ?? null, tokens: [] };
    if (addr) {
      const snap = await getWalletSnapshotJson(addr.toLowerCase());
      const m = snap?.tokBase;
      if (m?.ok) {
        const list = normalizeMoralisTokenList(m.data);
        wallet.tokens = list.slice(0, 8).map((t: any, i: number) => {
          const rowT = t as Record<string, unknown>;
          const sym = String(t?.symbol ?? t?.symbol_token ?? "?");
          const usd =
            t?.usd_value != null && t?.usd_value !== ""
              ? `$${formatUsdBalance(t.usd_value)}`
              : t?.balance_formatted
                ? `${t.balance_formatted} ${sym}`
                : "—";
          const tokenAddress = String(
            t?.token_address ?? t?.contract_address ?? t?.address ?? `idx-${i}`,
          );
          return { symbol: sym, usdLabel: usd, logo: erc20LogoUrl(rowT), tokenAddress };
        });
      } else {
        const err =
          m && !m.ok
            ? m.error
            : "Sin snapshot Base en Turso (sync diario). Registra la wallet o espera al próximo sync.";
        wallet.walletTokensError = err.length > 160 ? `${err.slice(0, 160)}…` : err;
      }
    }
  }

  return {
    meme: dedupeRows(meme),
    ai: dedupeRows(ai),
    gaming: dedupeRows(gaming),
    mineable: dedupeRows(mineable),
    earlybird: dedupeRows(earlybird),
    wallet,
    stats: {
      totalTokens: totalRow?.n ?? 0,
      lastSync,
      syncHistory,
      signals24h: {
        whales: whale24?.n ?? 0,
        traders: trader24?.n ?? 0,
        smart: smart24?.n ?? 0,
      },
    },
    topVolume: dedupeRows(topVolume),
    marketPulse: {
      sampleSize: topVolumeForPulse.length,
      marketCap,
      volume24h,
      activeCryptocurrencies,
      hasGlobalMetrics,
      advanced,
      declined,
      avg24hChange,
      btcDominance,
      fearGreed,
      altcoinSeason,
      avgRsi,
    },
    trending: { ...trendingPack, rows: dedupeRows(trendingPack.rows) },
    mostVisited: { ...mostVisitedPack, rows: dedupeRows(mostVisitedPack.rows) },
    access: pro,
    nftGlobal: {
      hottestCount: nftHottestCount,
      ok: nftHotSnap?.ok ?? false,
      error:
        nftHotSnap == null
          ? "Sin snapshot NFT en Turso."
          : nftHotSnap.ok
            ? null
            : nftHotSnap.error,
    },
    nansenTokenScreener: nansenTokenScreenerSnap,
    moralisDiscovery,
  };
  } catch (e) {
    console.error("[loadDashboardHome]", e);
    const pro = await getUserProAccess(ev);
    return {
      meme: [],
      ai: [],
      gaming: [],
      mineable: [],
      earlybird: [],
      wallet: { address: null, authProvider: null, tokens: [] },
      stats: {
        totalTokens: 0,
        lastSync: undefined,
        syncHistory: [],
        signals24h: { whales: 0, traders: 0, smart: 0 },
      },
      topVolume: [],
      marketPulse: {
        sampleSize: 0,
        marketCap: 0,
        volume24h: 0,
        activeCryptocurrencies: 0,
        hasGlobalMetrics: false,
        advanced: 0,
        declined: 0,
        avg24hChange: 0,
        btcDominance: null,
        fearGreed: 50,
        altcoinSeason: 50,
        avgRsi: 50,
      },
      trending: { rows: [], usedFallback: true },
      mostVisited: { rows: [], usedFallback: true },
      access: pro,
      nftGlobal: {
        hottestCount: 0,
        ok: false,
        error: "Base de datos no disponible temporalmente.",
      },
      nansenTokenScreener: null,
      moralisDiscovery: null,
    };
  }
}
