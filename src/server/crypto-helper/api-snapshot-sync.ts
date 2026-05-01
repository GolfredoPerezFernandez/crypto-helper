import { eq, isNotNull } from "drizzle-orm";
import { db } from "~/lib/turso";
import {
  apiGlobalSnapshots,
  apiWalletSnapshots,
  users,
} from "../../../drizzle/schema";
import { fetchIcarusTopUsersBySwaps } from "~/server/crypto-helper/icarus-top-users";
import {
  fetchNansenSmartMoney,
  fetchNansenTgm,
  fetchNansenTgmPnlLeaderboard,
  getDefaultTgmRequest,
  type SmartMoneySection,
} from "~/server/crypto-helper/nansen-smart-money";
import {
  fetchMoralisDiscoveryFilteredTokens,
  fetchMoralisDiscoveryTopGainers,
  fetchMoralisDiscoveryTopLosers,
  fetchMoralisEntitiesByCategory,
  fetchMoralisEntityCategories,
  fetchMoralisEntitySearch,
  fetchMoralisEntityById,
  fetchMoralisErc20TopGainers,
  fetchMoralisErc20TopProfitableWallets,
  fetchMoralisLatestBlock,
  fetchMoralisNativeBalancesForAddresses,
  fetchMoralisNftHottestCollections,
  fetchMoralisNftTopCollections,
  fetchMoralisPairStats,
  fetchMoralisResolveAddressReverse,
  fetchMoralisResolveEnsDomain,
  fetchMoralisSolanaAggregatedTokenPairStats,
  fetchMoralisSolanaExchangeTokens,
  fetchMoralisSolanaTokenBondingStatus,
  fetchMoralisSwapsByPairAddress,
  fetchMoralisTokenCategories,
  fetchMoralisTokensSearch,
  fetchMoralisTransactionVerbose,
  fetchMoralisTrendingTokens,
  fetchMoralisVolumeCategories,
  fetchMoralisVolumeChains,
  type MoralisTokenSearchSortBy,
} from "~/server/crypto-helper/moralis-api";
import { buildDexActivityHighlightFromApiData } from "~/server/crypto-helper/dex-activity-highlight";
import { TRADER_WATCH_WALLETS } from "~/server/crypto-helper/trader-wallets";
import {
  buildWalletPageSnapshot,
  isSolanaWalletAddress,
  normalizeWalletSnapshotAddress,
  summarizeWalletSnapshotApiResults,
  type WalletPageSnapshot,
} from "~/server/crypto-helper/wallet-snapshot";
import { syncLogError, syncLogInfo, syncLogWarn } from "~/server/crypto-helper/sync-logger";
import { recordNansenCall } from "~/server/crypto-helper/sync-usage-context";
import { fetchWhaleAlertBundleForSync } from "~/server/crypto-helper/whale-alert-api";
import { runUserBrowsedNftCollectionsRefresh } from "~/server/crypto-helper/api-resource-cache";

export const GLOBAL_NFT_HOTTEST = "moralis_nft_hottest";
export const GLOBAL_NFT_TOP = "moralis_nft_top";
export const GLOBAL_ICARUS_TOP_USERS = "icarus_top_users_swaps";
export const GLOBAL_TOKEN_CATEGORIES = "moralis_token_categories";
export const GLOBAL_DISCOVERY_TOP_LOSERS = "moralis_discovery_top_losers";
/** Moralis GET /tokens/search — on by default; set MORALIS_SYNC_TOKEN_SEARCH=0 to skip */
export const GLOBAL_MORALIS_TOKEN_SEARCH = "moralis_tokens_search";
export const GLOBAL_MORALIS_TRENDING_ETH = "moralis_trending_eth";
export const GLOBAL_MORALIS_TRENDING_BASE = "moralis_trending_base";
export const GLOBAL_MORALIS_VOLUME_CHAINS = "moralis_volume_chains";
export const GLOBAL_MORALIS_VOLUME_CAT_ETH = "moralis_volume_categories_eth";
export const GLOBAL_MORALIS_VOLUME_CAT_BASE = "moralis_volume_categories_base";
export const GLOBAL_MORALIS_DISCOVERY_TOP_GAINERS_ETH = "moralis_discovery_top_gainers_eth";
export const GLOBAL_MORALIS_DISCOVERY_FILTERED = "moralis_discovery_filtered_tokens";
export const GLOBAL_MORALIS_ENTITY_CATEGORIES = "moralis_entity_categories";
export const GLOBAL_MORALIS_ENTITY_SEARCH = "moralis_entity_search";
export const GLOBAL_MORALIS_ENTITY_CATEGORY_SAMPLE = "moralis_entity_category_sample";
export const GLOBAL_MORALIS_ENTITY_DETAIL_SAMPLE = "moralis_entity_detail_sample";
export const GLOBAL_MORALIS_RESOLVE_ENS_SAMPLE = "moralis_resolve_ens_sample";
export const GLOBAL_MORALIS_RESOLVE_REVERSE_SAMPLE = "moralis_resolve_reverse_sample";
export const GLOBAL_MORALIS_PAIR_SWAPS_SAMPLE = "moralis_pair_swaps_sample_eth";
export const GLOBAL_MORALIS_PAIR_STATS_SAMPLE = "moralis_pair_stats_sample_eth";
export const GLOBAL_MORALIS_TOP_PROFITABLE_SAMPLE = "moralis_top_profitable_sample_eth";
export const GLOBAL_MORALIS_NATIVE_BALANCES_BATCH = "moralis_native_balances_batch_eth";
export const GLOBAL_MORALIS_TX_VERBOSE_SAMPLE = "moralis_tx_verbose_sample";
export const GLOBAL_MORALIS_SOL_PUMPFUN_NEW = "moralis_sol_pumpfun_new";
export const GLOBAL_MORALIS_SOL_PUMPFUN_BONDING = "moralis_sol_pumpfun_bonding";
export const GLOBAL_MORALIS_SOL_PUMPFUN_GRADUATED = "moralis_sol_pumpfun_graduated";
export const GLOBAL_MORALIS_SOL_BONDING_STATUS_SAMPLE = "moralis_sol_bonding_status_sample";
export const GLOBAL_MORALIS_SOL_PAIR_STATS_SAMPLE = "moralis_sol_pair_stats_sample";
export const GLOBAL_LATEST_BLOCKS_EVM = "moralis_latest_blocks_evm";
export const GLOBAL_CMC_GLOBAL_METRICS = "cmc_global_metrics";
export const GLOBAL_NANSEN_SMART_MONEY_NETFLOW = "nansen_smart_money_netflow";
export const GLOBAL_NANSEN_SMART_MONEY_HOLDINGS = "nansen_smart_money_holdings";
export const GLOBAL_NANSEN_SMART_MONEY_HIST_HOLDINGS = "nansen_smart_money_historical_holdings";
export const GLOBAL_NANSEN_SMART_MONEY_DEX_TRADES = "nansen_smart_money_dex_trades";
export const GLOBAL_NANSEN_SMART_MONEY_PERP_TRADES = "nansen_smart_money_perp_trades";
export const GLOBAL_NANSEN_SMART_MONEY_DCAS = "nansen_smart_money_dcas";
export const GLOBAL_NANSEN_TGM_PNL = "nansen_tgm_pnl_leaderboard";
export const GLOBAL_NANSEN_TGM_TOKEN_INFORMATION = "nansen_tgm_token_information";
export const GLOBAL_NANSEN_TGM_INDICATORS = "nansen_tgm_indicators";
export const GLOBAL_NANSEN_TGM_TOKEN_OHLCV = "nansen_tgm_token_ohlcv";
export const GLOBAL_NANSEN_TGM_WHO_BOUGHT_SOLD = "nansen_tgm_who_bought_sold";
export const GLOBAL_NANSEN_TGM_TRANSFERS = "nansen_tgm_transfers";
export const GLOBAL_NANSEN_TGM_PERP_PNL = "nansen_tgm_perp_pnl_leaderboard";
export const GLOBAL_NANSEN_TOKEN_SCREENER = "nansen_token_screener";
/** Multi-asset top performer wallets — filled in auxiliary sync only (neutral product surface). */
export const GLOBAL_TOP_PERFORMERS_BY_TOKEN = "top_performers_by_token_bundle";
/** Wallets aggregated from DEX trade panel — derived during main market sync (neutral key). */
export const GLOBAL_DEX_ACTIVITY_HIGHLIGHT = "dex_activity_highlight";
/** Whale Alert — Enterprise + deprecated v1 sample responses (auxiliary sync). */
export const GLOBAL_WHALE_ALERT_BUNDLE = "whale_alert_bundle";

const NANSEN_SMART_MONEY_SNAPSHOT_KEYS: Record<SmartMoneySection, string> = {
  netflow: GLOBAL_NANSEN_SMART_MONEY_NETFLOW,
  holdings: GLOBAL_NANSEN_SMART_MONEY_HOLDINGS,
  "historical-holdings": GLOBAL_NANSEN_SMART_MONEY_HIST_HOLDINGS,
  "dex-trades": GLOBAL_NANSEN_SMART_MONEY_DEX_TRADES,
  "perp-trades": GLOBAL_NANSEN_SMART_MONEY_PERP_TRADES,
  dcas: GLOBAL_NANSEN_SMART_MONEY_DCAS,
};

function extractSnapshotApiErrors(snap: WalletPageSnapshot): Record<string, string> {
  const out: Record<string, string> = {};
  const take = (key: string, value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const v = value as { ok?: unknown; error?: unknown };
    if (v.ok === false && typeof v.error === "string" && v.error.trim()) {
      out[key] = v.error.trim();
    }
  };
  for (const [key, value] of Object.entries(snap as Record<string, unknown>)) {
    if (key === "nftCollectionsByChain" && value && typeof value === "object" && !Array.isArray(value)) {
      for (const [ch, r] of Object.entries(value as Record<string, unknown>)) {
        take(`nftCollections_${ch}`, r);
      }
      continue;
    }
    if (key === "nftsByChain" && value && typeof value === "object" && !Array.isArray(value)) {
      for (const [ch, r] of Object.entries(value as Record<string, unknown>)) {
        take(`walletNfts_${ch}`, r);
      }
      continue;
    }
    take(key, value);
  }
  return out;
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function envFalsy(key: string): boolean {
  return /^0|false|no|off$/i.test(String(process.env[key] ?? ""));
}

/** Default Uniswap v3 WETH/USDC 0.05% pool on Ethereum mainnet */
const DEFAULT_SAMPLE_PAIR_ETH = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640";
const DEFAULT_SAMPLE_TOKEN_TOP_TRADERS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

function firstEntityCategoryId(categoriesPayload: unknown): string | null {
  const list = (() => {
    if (Array.isArray(categoriesPayload)) return categoriesPayload;
    if (categoriesPayload && typeof categoriesPayload === "object") {
      const o = categoriesPayload as Record<string, unknown>;
      if (Array.isArray(o.result)) return o.result;
      if (Array.isArray(o.categories)) return o.categories;
      if (Array.isArray(o.data)) return o.data as unknown[];
    }
    return null;
  })();
  if (!list?.length) return null;
  const first = list[0] as Record<string, unknown>;
  const id = first?.id ?? first?.category_id ?? first?.categoryId;
  return id != null && String(id).trim() ? String(id).trim() : null;
}

function firstEntityIdFromSearch(searchPayload: unknown): string | null {
  const list = (() => {
    if (Array.isArray(searchPayload)) return searchPayload;
    if (searchPayload && typeof searchPayload === "object") {
      const o = searchPayload as Record<string, unknown>;
      if (Array.isArray(o.result)) return o.result;
      if (Array.isArray(o.entities)) return o.entities;
      if (Array.isArray(o.data)) return o.data as unknown[];
    }
    return null;
  })();
  if (!list?.length) return null;
  const first = list[0] as Record<string, unknown>;
  const id = first?.entity_id ?? first?.entityId ?? first?.id;
  return id != null && String(id).trim() ? String(id).trim() : null;
}

/**
 * Moralis discovery + market globals (cached in Turso). Runs during auxiliary sync so routes
 * do not call Moralis per request. Set MORALIS_SYNC_SKIP_EXTENDED_DISCOVERY=1 to skip the
 * extended bundle (trending, volume, entities, Solana pump.fun, samples). Token search is on
 * by default; set MORALIS_SYNC_TOKEN_SEARCH=0 to skip.
 */
async function runMoralisExtendedDiscoverySnapshots(traders: { account?: string | null }[]): Promise<void> {
  const skipExtended = /^1|true|yes|on$/i.test(
    String(process.env.MORALIS_SYNC_SKIP_EXTENDED_DISCOVERY ?? ""),
  );
  /** Unset or empty = run token search; set to 0|false|no|off to skip */
  const runTokenSearch = !envFalsy("MORALIS_SYNC_TOKEN_SEARCH");

  const tasks: Promise<void>[] = [];
  const keys: string[] = [];

  const pair =
    String(process.env.MORALIS_SYNC_SAMPLE_PAIR ?? DEFAULT_SAMPLE_PAIR_ETH).trim().toLowerCase() ||
    DEFAULT_SAMPLE_PAIR_ETH;
  const sampleToken =
    String(process.env.MORALIS_SYNC_SAMPLE_TOKEN ?? DEFAULT_SAMPLE_TOKEN_TOP_TRADERS).trim().toLowerCase() ||
    DEFAULT_SAMPLE_TOKEN_TOP_TRADERS;
  const sampleTx = process.env.MORALIS_SYNC_SAMPLE_TX_HASH?.trim();
  const sampleSolMint = process.env.MORALIS_SYNC_SOLANA_SAMPLE_MINT?.trim();
  const entityQuery =
    String(process.env.MORALIS_SYNC_ENTITY_SEARCH_QUERY ?? "uniswap").trim() || "uniswap";
  const ensDomain = String(process.env.MORALIS_SYNC_ENS_SAMPLE_DOMAIN ?? "vitalik.eth").trim() || "vitalik.eth";
  const reverseAddr =
    String(
      process.env.MORALIS_SYNC_REVERSE_SAMPLE_ADDRESS ?? "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    ).trim() || "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  const filteredBody: Record<string, unknown> = (() => {
    const raw = process.env.MORALIS_SYNC_DISCOVERY_FILTERED_BODY?.trim();
    if (raw) {
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        syncLogWarn("MORALIS_SYNC_DISCOVERY_FILTERED_BODY invalid JSON — using default body");
      }
    }
    return { chains: ["eth"], limit: 25 };
  })();

  if (!skipExtended) {
    keys.push(
      GLOBAL_MORALIS_TRENDING_ETH,
      GLOBAL_MORALIS_TRENDING_BASE,
      GLOBAL_MORALIS_VOLUME_CHAINS,
      GLOBAL_MORALIS_VOLUME_CAT_ETH,
      GLOBAL_MORALIS_VOLUME_CAT_BASE,
      GLOBAL_MORALIS_DISCOVERY_TOP_GAINERS_ETH,
      GLOBAL_MORALIS_DISCOVERY_FILTERED,
      GLOBAL_MORALIS_ENTITY_CATEGORIES,
      GLOBAL_MORALIS_ENTITY_SEARCH,
      GLOBAL_MORALIS_RESOLVE_ENS_SAMPLE,
      GLOBAL_MORALIS_RESOLVE_REVERSE_SAMPLE,
      GLOBAL_MORALIS_PAIR_SWAPS_SAMPLE,
      GLOBAL_MORALIS_PAIR_STATS_SAMPLE,
      GLOBAL_MORALIS_TOP_PROFITABLE_SAMPLE,
      GLOBAL_MORALIS_NATIVE_BALANCES_BATCH,
      GLOBAL_MORALIS_SOL_PUMPFUN_NEW,
      GLOBAL_MORALIS_SOL_PUMPFUN_BONDING,
      GLOBAL_MORALIS_SOL_PUMPFUN_GRADUATED,
    );
    tasks.push(
      fetchMoralisTrendingTokens("eth", { limit: 40 }).then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_TRENDING_ETH, { chain: "eth", syncedAt: nowSec(), ...r }),
      ),
      fetchMoralisTrendingTokens("base", { limit: 40 }).then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_TRENDING_BASE, { chain: "base", syncedAt: nowSec(), ...r }),
      ),
      fetchMoralisVolumeChains().then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_VOLUME_CHAINS, { syncedAt: nowSec(), ...r }),
      ),
      fetchMoralisVolumeCategories("eth").then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_VOLUME_CAT_ETH, { chain: "eth", syncedAt: nowSec(), ...r }),
      ),
      fetchMoralisVolumeCategories("base").then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_VOLUME_CAT_BASE, { chain: "base", syncedAt: nowSec(), ...r }),
      ),
      fetchMoralisDiscoveryTopGainers("eth", { time_frame: "24h" }).then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_DISCOVERY_TOP_GAINERS_ETH, {
          chain: "eth",
          syncedAt: nowSec(),
          ...r,
        }),
      ),
      fetchMoralisDiscoveryFilteredTokens(filteredBody).then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_DISCOVERY_FILTERED, {
          body: filteredBody,
          syncedAt: nowSec(),
          ...r,
        }),
      ),
      fetchMoralisEntityCategories(50).then(async (r) => {
        await upsertGlobalSnapshot(GLOBAL_MORALIS_ENTITY_CATEGORIES, { syncedAt: nowSec(), ...r });
        if (r.ok && r.data) {
          const catId = firstEntityCategoryId(r.data);
          if (catId) {
            const byCat = await fetchMoralisEntitiesByCategory(catId, 20);
            await upsertGlobalSnapshot(GLOBAL_MORALIS_ENTITY_CATEGORY_SAMPLE, {
              categoryId: catId,
              syncedAt: nowSec(),
              ...byCat,
            });
          }
        }
      }),
      fetchMoralisEntitySearch(entityQuery, 25).then(async (r) => {
        await upsertGlobalSnapshot(GLOBAL_MORALIS_ENTITY_SEARCH, {
          query: entityQuery,
          syncedAt: nowSec(),
          ...r,
        });
        if (r.ok && r.data) {
          const eid = firstEntityIdFromSearch(r.data);
          if (eid) {
            const detail = await fetchMoralisEntityById(eid);
            await upsertGlobalSnapshot(GLOBAL_MORALIS_ENTITY_DETAIL_SAMPLE, {
              entityId: eid,
              syncedAt: nowSec(),
              ...detail,
            });
          }
        }
      }),
      fetchMoralisResolveEnsDomain(ensDomain).then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_RESOLVE_ENS_SAMPLE, {
          domain: ensDomain,
          syncedAt: nowSec(),
          ...r,
        }),
      ),
      fetchMoralisResolveAddressReverse(reverseAddr).then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_RESOLVE_REVERSE_SAMPLE, {
          address: reverseAddr,
          syncedAt: nowSec(),
          ...r,
        }),
      ),
      fetchMoralisSwapsByPairAddress(pair, "eth", { limit: 25 }).then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_PAIR_SWAPS_SAMPLE, {
          pairAddress: pair,
          chain: "eth",
          syncedAt: nowSec(),
          ...r,
        }),
      ),
      fetchMoralisPairStats(pair, "eth").then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_PAIR_STATS_SAMPLE, {
          pairAddress: pair,
          chain: "eth",
          syncedAt: nowSec(),
          ...r,
        }),
      ),
      fetchMoralisErc20TopProfitableWallets(sampleToken, "eth", { limit: 15 }).then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_TOP_PROFITABLE_SAMPLE, {
          tokenAddress: sampleToken,
          chain: "eth",
          syncedAt: nowSec(),
          ...r,
        }),
      ),
      (async () => {
        const fromWatch = TRADER_WATCH_WALLETS.map((a) => a.toLowerCase());
        const fromIca = traders
          .map((t) => String(t.account ?? "").toLowerCase())
          .filter((a) => /^0x[a-f0-9]{40}$/.test(a));
        const addrs = [...new Set([...fromWatch, ...fromIca])].slice(0, 25);
        const r = await fetchMoralisNativeBalancesForAddresses(addrs, "eth");
        await upsertGlobalSnapshot(GLOBAL_MORALIS_NATIVE_BALANCES_BATCH, {
          chain: "eth",
          addresses: addrs,
          syncedAt: nowSec(),
          ...r,
        });
      })(),
      fetchMoralisSolanaExchangeTokens("mainnet", "pumpfun", "new", { limit: 40 }).then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_SOL_PUMPFUN_NEW, { syncedAt: nowSec(), ...r }),
      ),
      fetchMoralisSolanaExchangeTokens("mainnet", "pumpfun", "bonding", { limit: 40 }).then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_SOL_PUMPFUN_BONDING, { syncedAt: nowSec(), ...r }),
      ),
      fetchMoralisSolanaExchangeTokens("mainnet", "pumpfun", "graduated", { limit: 40 }).then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_SOL_PUMPFUN_GRADUATED, { syncedAt: nowSec(), ...r }),
      ),
    );

    if (sampleTx) {
      keys.push(GLOBAL_MORALIS_TX_VERBOSE_SAMPLE);
      tasks.push(
        fetchMoralisTransactionVerbose(sampleTx, "eth").then((r) =>
          upsertGlobalSnapshot(GLOBAL_MORALIS_TX_VERBOSE_SAMPLE, {
            txHash: sampleTx,
            chain: "eth",
            syncedAt: nowSec(),
            ...r,
          }),
        ),
      );
    }

    if (sampleSolMint) {
      keys.push(GLOBAL_MORALIS_SOL_BONDING_STATUS_SAMPLE, GLOBAL_MORALIS_SOL_PAIR_STATS_SAMPLE);
      tasks.push(
        fetchMoralisSolanaTokenBondingStatus(sampleSolMint, "mainnet").then((r) =>
          upsertGlobalSnapshot(GLOBAL_MORALIS_SOL_BONDING_STATUS_SAMPLE, {
            mint: sampleSolMint,
            syncedAt: nowSec(),
            ...r,
          }),
        ),
        fetchMoralisSolanaAggregatedTokenPairStats(sampleSolMint, "mainnet").then((r) =>
          upsertGlobalSnapshot(GLOBAL_MORALIS_SOL_PAIR_STATS_SAMPLE, {
            mint: sampleSolMint,
            syncedAt: nowSec(),
            ...r,
          }),
        ),
      );
    }
  }

  if (runTokenSearch) {
    keys.push(GLOBAL_MORALIS_TOKEN_SEARCH);
    const chains =
      String(process.env.MORALIS_SYNC_TOKEN_SEARCH_CHAINS ?? "eth,base").trim() || "eth,base";
    const limitRaw = parseInt(String(process.env.MORALIS_SYNC_TOKEN_SEARCH_LIMIT ?? "40"), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(1000, Math.max(1, limitRaw)) : 40;
    const sortRaw = String(process.env.MORALIS_SYNC_TOKEN_SEARCH_SORT ?? "volume24hDesc").trim();
    const allowed: MoralisTokenSearchSortBy[] = [
      "volume1hDesc",
      "volume24hDesc",
      "liquidityDesc",
      "marketCapDesc",
    ];
    const sortBy = (allowed.includes(sortRaw as MoralisTokenSearchSortBy)
      ? sortRaw
      : "volume24hDesc") as MoralisTokenSearchSortBy;
    const queryOpt = process.env.MORALIS_SYNC_TOKEN_SEARCH_QUERY?.trim();
    tasks.push(
      fetchMoralisTokensSearch({
        query: queryOpt || undefined,
        chains,
        limit,
        sortBy,
      }).then((r) =>
        upsertGlobalSnapshot(GLOBAL_MORALIS_TOKEN_SEARCH, {
          chains,
          limit,
          sortBy,
          syncedAt: nowSec(),
          ...r,
        }),
      ),
    );
  }

  if (tasks.length === 0) {
    syncLogInfo("Moralis extended snapshots — nothing to run (all skipped)");
    return;
  }

  const t0 = Date.now();
  await Promise.all(tasks);
  syncLogInfo("Moralis extended + token search snapshots — done", {
    ms: Date.now() - t0,
    keys: [...new Set(keys)],
    skipExtended,
    tokenSearch: runTokenSearch,
  });
}

type TopPerformerTokenSpec = {
  chain: string;
  address: string;
  label?: string;
  limit?: number;
  days?: string;
};

/**
 * Per-asset top wallets by realized swap performance — runs only during auxiliary sync.
 * Configure with MARKET_SYNC_TOP_PERFORMER_TOKENS (JSON array). UI copy stays provider-agnostic.
 */
async function runTopPerformersByTokenBundleSync(): Promise<void> {
  if (!process.env.MORALIS_API_KEY?.trim()) return;
  if (/^1|true|yes|on$/i.test(String(process.env.MARKET_SYNC_SKIP_TOP_PERFORMERS ?? ""))) {
    syncLogInfo("top performers bundle — skipped (MARKET_SYNC_SKIP_TOP_PERFORMERS)");
    return;
  }

  let specs: TopPerformerTokenSpec[] = [];
  const raw = process.env.MARKET_SYNC_TOP_PERFORMER_TOKENS?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item || typeof item !== "object") continue;
          const o = item as Record<string, unknown>;
          const chain = String(o.chain ?? "eth").trim() || "eth";
          const address = String(o.address ?? "").trim().toLowerCase();
          if (!/^0x[a-f0-9]{40}$/.test(address)) continue;
          const lim = o.limit;
          specs.push({
            chain,
            address,
            label: o.label != null ? String(o.label) : undefined,
            limit: typeof lim === "number" && Number.isFinite(lim) ? lim : undefined,
            days: o.days != null ? String(o.days) : undefined,
          });
        }
      }
    } catch {
      syncLogWarn("MARKET_SYNC_TOP_PERFORMER_TOKENS invalid JSON — using default token set");
    }
  }

  if (specs.length === 0) {
    specs = [
      { chain: "eth", address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", label: "WETH", days: "30" },
      { chain: "eth", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", label: "USDC", days: "30" },
      { chain: "base", address: "0x4200000000000000000000000000000000000006", label: "WETH", days: "30" },
    ];
  }

  const t0 = Date.now();
  const items = await Promise.all(
    specs.map(async (s) => {
      const lim = Math.min(50, Math.max(5, Math.floor(s.limit ?? 20)));
      const days = s.days?.trim() || "30";
      const r = await fetchMoralisErc20TopGainers(s.address, s.chain, lim, { days });
      return {
        chain: s.chain,
        tokenAddress: s.address,
        displayLabel: s.label?.trim() || null,
        timeframeDays: days,
        ...r,
      };
    }),
  );

  await upsertGlobalSnapshot(GLOBAL_TOP_PERFORMERS_BY_TOKEN, {
    syncedAt: nowSec(),
    items,
  });
  syncLogInfo("top performers by token bundle — done", {
    ms: Date.now() - t0,
    assets: items.length,
  });
}

export async function upsertGlobalSnapshot(key: string, payload: unknown): Promise<void> {
  const now = nowSec();
  const text = JSON.stringify(payload);
  await db
    .insert(apiGlobalSnapshots)
    .values({ key, payload: text, updatedAt: now })
    .onConflictDoUpdate({
      target: apiGlobalSnapshots.key,
      set: { payload: text, updatedAt: now },
    });
}

export async function getGlobalSnapshotRecord(
  key: string,
): Promise<{ payload: string; updatedAt: number } | undefined> {
  try {
    return await db.select().from(apiGlobalSnapshots).where(eq(apiGlobalSnapshots.key, key)).get();
  } catch (e) {
    console.error("[getGlobalSnapshotRecord]", key, e);
    return undefined;
  }
}

export async function getGlobalSnapshotJson<T = unknown>(key: string): Promise<T | null> {
  const row = await getGlobalSnapshotRecord(key);
  if (!row?.payload) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export async function upsertWalletSnapshot(address: string, snap: WalletPageSnapshot): Promise<void> {
  const a = normalizeWalletSnapshotAddress(address);
  const now = nowSec();
  const text = JSON.stringify(snap);
  await db
    .insert(apiWalletSnapshots)
    .values({ address: a, payload: text, updatedAt: now })
    .onConflictDoUpdate({
      target: apiWalletSnapshots.address,
      set: { payload: text, updatedAt: now },
    });
}

export async function getWalletSnapshotJson(address: string): Promise<WalletPageSnapshot | null> {
  try {
    const row = await db
      .select()
      .from(apiWalletSnapshots)
      .where(eq(apiWalletSnapshots.address, normalizeWalletSnapshotAddress(address)))
      .get();
    if (!row?.payload) return null;
    try {
      return JSON.parse(row.payload) as WalletPageSnapshot;
    } catch {
      return null;
    }
  } catch (e) {
    console.error("[getWalletSnapshotJson]", address, e);
    return null;
  }
}

/**
 * Nansen Smart Money (6 secciones) + TGM snapshots (PnL leaderboard + God Mode endpoints).
 * Invocado desde `runDailyMarketSync` como fase explícita del sync principal — no solo “auxiliary”.
 */
export async function runNansenSmartMoneyGlobalSnapshotSync(): Promise<void> {
  const nansenConfigured = Boolean(process.env.NANSEN_API_KEY?.trim());
  const nansenSyncEnabled = /^1|true|yes$/i.test(String(process.env.NANSEN_SYNC_SMART_MONEY ?? "1"));
  if (!nansenConfigured || !nansenSyncEnabled) {
    syncLogInfo("daily market sync — Nansen smart-money skipped", {
      nansenConfigured,
      nansenSyncEnabled,
    });
    return;
  }
  const nansenT0 = Date.now();
  syncLogInfo("daily market sync — Nansen smart-money + TGM global snapshots (start)");
  const sections: SmartMoneySection[] = [
    "netflow",
    "holdings",
    "historical-holdings",
    "dex-trades",
    "perp-trades",
    "dcas",
  ];
  let dexTradesPayload: unknown = null;
  let dexTradesSyncedAt: number | null = null;
  for (const section of sections) {
    const out = await fetchNansenSmartMoney(section);
    recordNansenCall(`smart-money:${section}`, out.creditsUsed, "creditsRemaining" in out ? out.creditsRemaining : undefined);
    const key = NANSEN_SMART_MONEY_SNAPSHOT_KEYS[section];
    const syncedAtSection = nowSec();
    if (out.ok) {
      await upsertGlobalSnapshot(key, {
        section,
        data: out.data,
        creditsUsed: out.creditsUsed ?? null,
        creditsRemaining: out.creditsRemaining ?? null,
        syncedAt: syncedAtSection,
      });
      if (section === "dex-trades") {
        dexTradesPayload = out.data;
        dexTradesSyncedAt = syncedAtSection;
      }
    } else {
      await upsertGlobalSnapshot(key, {
        section,
        error: out.error,
        status: out.status,
        syncedAt: syncedAtSection,
      });
    }
  }

  if (dexTradesPayload != null && dexTradesSyncedAt != null) {
    const bundle = buildDexActivityHighlightFromApiData(dexTradesPayload, {
      bundleSyncedAt: nowSec(),
      sourceSyncedAt: dexTradesSyncedAt,
    });
    if (bundle?.wallets.length) {
      await upsertGlobalSnapshot(GLOBAL_DEX_ACTIVITY_HIGHLIGHT, bundle);
      syncLogInfo("dex activity highlight snapshot — ok", { wallets: bundle.wallets.length });
    } else {
      syncLogInfo("dex activity highlight snapshot — skipped (no wallets parsed)");
    }
  }

  const tgmToken = String(process.env.NANSEN_TGM_TOKEN_ADDRESS || "")
    .trim()
    .toLowerCase();
  if (/^0x[a-f0-9]{40}$/.test(tgmToken)) {
    const tgmDaysRaw = Number(process.env.NANSEN_TGM_DAYS ?? "30");
    const tgmDays = Number.isFinite(tgmDaysRaw) ? Math.max(1, Math.min(365, Math.floor(tgmDaysRaw))) : 30;
    const tgm = await fetchNansenTgmPnlLeaderboard({
      chain: "ethereum",
      tokenAddress: tgmToken,
      days: tgmDays,
      perPage: 100,
      page: 1,
      premiumLabels: true,
    });
    recordNansenCall("tgm:pnl-leaderboard", tgm.creditsUsed, "creditsRemaining" in tgm ? tgm.creditsRemaining : undefined);
    if (tgm.ok) {
      await upsertGlobalSnapshot(GLOBAL_NANSEN_TGM_PNL, {
        token: tgmToken,
        days: tgmDays,
        rows: tgm.rows,
        creditsUsed: tgm.creditsUsed ?? null,
        creditsRemaining: tgm.creditsRemaining ?? null,
        syncedAt: nowSec(),
      });
    } else {
      await upsertGlobalSnapshot(GLOBAL_NANSEN_TGM_PNL, {
        token: tgmToken,
        days: tgmDays,
        error: tgm.error,
        status: tgm.status,
        syncedAt: nowSec(),
      });
    }
  }
  if (/^0x[a-f0-9]{40}$/.test(tgmToken)) {
    const tgmChain = String(process.env.NANSEN_TGM_CHAIN || "ethereum").trim().toLowerCase();
    const tgmTimeframe = String(process.env.NANSEN_TGM_TIMEFRAME || "24h").trim();
    const tgmSymbol = String(process.env.NANSEN_TGM_PERP_SYMBOL || "ETH").trim().toUpperCase();
    const endpointToKey = [
      { endpoint: "token-information", key: GLOBAL_NANSEN_TGM_TOKEN_INFORMATION },
      { endpoint: "indicators", key: GLOBAL_NANSEN_TGM_INDICATORS },
      { endpoint: "token-ohlcv", key: GLOBAL_NANSEN_TGM_TOKEN_OHLCV },
      { endpoint: "who-bought-sold", key: GLOBAL_NANSEN_TGM_WHO_BOUGHT_SOLD },
      { endpoint: "transfers", key: GLOBAL_NANSEN_TGM_TRANSFERS },
      { endpoint: "perp-pnl-leaderboard", key: GLOBAL_NANSEN_TGM_PERP_PNL },
      { endpoint: "token-screener", key: GLOBAL_NANSEN_TOKEN_SCREENER },
    ] as const;
    for (const pair of endpointToKey) {
      const payload = getDefaultTgmRequest(pair.endpoint, {
        chain: tgmChain,
        tokenAddress: tgmToken,
        timeframe: tgmTimeframe,
        tokenSymbol: tgmSymbol,
      });
      const out = await fetchNansenTgm(pair.endpoint, payload);
      recordNansenCall(`tgm:${pair.endpoint}`, out.creditsUsed, "creditsRemaining" in out ? out.creditsRemaining : undefined);
      if (out.ok) {
        await upsertGlobalSnapshot(pair.key, {
          endpoint: pair.endpoint,
          chain: tgmChain,
          token: tgmToken,
          symbol: tgmSymbol,
          timeframe: tgmTimeframe,
          data: out.data,
          creditsUsed: out.creditsUsed ?? null,
          creditsRemaining: out.creditsRemaining ?? null,
          syncedAt: nowSec(),
        });
      } else {
        await upsertGlobalSnapshot(pair.key, {
          endpoint: pair.endpoint,
          chain: tgmChain,
          token: tgmToken,
          symbol: tgmSymbol,
          timeframe: tgmTimeframe,
          error: out.error,
          status: out.status,
          syncedAt: nowSec(),
        });
      }
    }
  }
  syncLogInfo("daily market sync — Nansen smart-money + TGM global snapshots (done)", {
    ms: Date.now() - nansenT0,
  });
}

/**
 * Moralis + Icarus — runs once per successful daily market sync.
 * Populates `api_global_snapshots` and `api_wallet_snapshots` so dashboards do not call APIs per request.
 */
async function runWhaleAlertSnapshotSync(): Promise<void> {
  const enabled = /^1|true|yes$/i.test(String(process.env.WHALE_ALERT_SYNC ?? "1"));
  if (!enabled) {
    syncLogInfo("Whale Alert snapshot — skipped (WHALE_ALERT_SYNC unset/false)");
    return;
  }
  const t0 = Date.now();
  try {
    const bundle = await fetchWhaleAlertBundleForSync();
    await upsertGlobalSnapshot(GLOBAL_WHALE_ALERT_BUNDLE, bundle);
    syncLogInfo("Whale Alert snapshot — ok", {
      ms: Date.now() - t0,
      configured: bundle.configured,
      endpoints: bundle.results.length,
    });
  } catch (e: unknown) {
    syncLogWarn("Whale Alert snapshot — failed", {
      ms: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function runAuxiliaryApiSnapshotSync(): Promise<void> {
  const moralisConfigured = Boolean(process.env.MORALIS_API_KEY?.trim());
  const auxStart = Date.now();
  syncLogInfo("auxiliary API snapshot sync — start", { moralisConfigured });

  try {
    syncLogInfo("aux step 1/4: Icarus top users by swaps");
    const icaT0 = Date.now();
    const traders = await fetchIcarusTopUsersBySwaps(36, 0);
    syncLogInfo("aux step 1/4 done — Icarus", {
      ms: Date.now() - icaT0,
      tradersFetched: traders.length,
    });
    await upsertGlobalSnapshot(GLOBAL_ICARUS_TOP_USERS, { traders, syncedAt: nowSec() });
    syncLogInfo("Turso upsert ok", {
      api: "global snapshot",
      key: GLOBAL_ICARUS_TOP_USERS,
      tradersStored: traders.length,
    });

    syncLogInfo("aux: Whale Alert bundle (cached for /whale-alert)");
    await runWhaleAlertSnapshotSync();

    if (!moralisConfigured) {
      syncLogWarn("MORALIS_API_KEY missing — skip Moralis NFT globals + wallet snapshots");
      syncLogInfo("auxiliary API snapshot sync — done (Icarus only; Nansen runs in daily market sync phase)", {
        totalMs: Date.now() - auxStart,
      });
      return;
    }

    syncLogInfo("aux step 2/4: Moralis NFT market-data batch (hottest + top collections)");
    const nftT0 = Date.now();
    const [hot, top] = await Promise.all([
      fetchMoralisNftHottestCollections(),
      fetchMoralisNftTopCollections(),
    ]);
    const nftMs = Date.now() - nftT0;
    syncLogInfo("aux step 2/4 done — Moralis NFT", {
      ms: nftMs,
      hottestOk: hot.ok,
      topOk: top.ok,
      hottestError: hot.ok ? undefined : hot.error,
      topError: top.ok ? undefined : top.error,
    });
    await upsertGlobalSnapshot(GLOBAL_NFT_HOTTEST, hot);
    await upsertGlobalSnapshot(GLOBAL_NFT_TOP, top);
    syncLogInfo("Turso upsert ok", { api: "global snapshots", keys: [GLOBAL_NFT_HOTTEST, GLOBAL_NFT_TOP] });

    const syncGlobalCategories = /^1|true|yes$/i.test(
      String(process.env.MORALIS_SYNC_GLOBAL_TOKEN_CATEGORIES ?? ""),
    );
    const syncGlobalLosers = /^1|true|yes$/i.test(
      String(process.env.MORALIS_SYNC_GLOBAL_DISCOVERY_TOP_LOSERS ?? ""),
    );
    const syncGlobalBlocks = /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_GLOBAL_LATEST_BLOCKS ?? ""));

    const globalExtras: Promise<void>[] = [];
    const globalKeys: string[] = [];
    if (syncGlobalCategories) {
      globalKeys.push(GLOBAL_TOKEN_CATEGORIES);
      globalExtras.push(
        fetchMoralisTokenCategories().then((r) => upsertGlobalSnapshot(GLOBAL_TOKEN_CATEGORIES, r)),
      );
    }
    if (syncGlobalLosers) {
      globalKeys.push(GLOBAL_DISCOVERY_TOP_LOSERS);
      const chain = String(process.env.MORALIS_SYNC_GLOBAL_DISCOVERY_CHAIN ?? "eth").trim() || "eth";
      const limitRaw = Number(process.env.MORALIS_SYNC_GLOBAL_DISCOVERY_TOP_LOSERS_LIMIT ?? "40");
      const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 40;
      globalExtras.push(
        fetchMoralisDiscoveryTopLosers(chain, { limit }).then((r) =>
          upsertGlobalSnapshot(GLOBAL_DISCOVERY_TOP_LOSERS, { chain, limit, ...r }),
        ),
      );
    }
    if (syncGlobalBlocks) {
      globalKeys.push(GLOBAL_LATEST_BLOCKS_EVM);
      globalExtras.push(
        Promise.all([fetchMoralisLatestBlock("base"), fetchMoralisLatestBlock("eth")]).then(([base, eth]) =>
          upsertGlobalSnapshot(GLOBAL_LATEST_BLOCKS_EVM, { base, eth, syncedAt: Math.floor(Date.now() / 1000) }),
        ),
      );
    }

    syncLogInfo("aux step 3/4: Moralis globals (opt-in categories/losers/blocks + extended discovery)", {
      optionalKeys: globalKeys,
    });
    const t0 = Date.now();
    await Promise.all([...globalExtras, runMoralisExtendedDiscoverySnapshots(traders)]);
    syncLogInfo("aux step 3/4 done — Moralis globals", {
      ms: Date.now() - t0,
      optionalKeys: globalKeys,
    });

    syncLogInfo("aux step 3b/4: top performers by token bundle");
    const tp0 = Date.now();
    await runTopPerformersByTokenBundleSync();
    syncLogInfo("aux step 3b/4 done — top performers bundle", { ms: Date.now() - tp0 });

    const fromIcarus = new Set<string>();
    for (const t of traders) {
      const a = String(t.account ?? "").toLowerCase();
      if (/^0x[a-f0-9]{40}$/.test(a)) fromIcarus.add(a);
    }

    const registered = await db
      .select({ w: users.walletAddress })
      .from(users)
      .where(isNotNull(users.walletAddress))
      .limit(400)
      .all();

    const toFetch = new Set<string>([...TRADER_WATCH_WALLETS, ...fromIcarus]);
    for (const r of registered) {
      const w = r.w?.trim();
      if (!w) continue;
      const wl = w.toLowerCase();
      if (/^0x[a-f0-9]{40}$/.test(wl)) toFetch.add(wl);
      else if (isSolanaWalletAddress(w)) toFetch.add(normalizeWalletSnapshotAddress(w));
    }

    const list = [...toFetch];
    const walletPhaseStart = Date.now();
    syncLogInfo("aux step 4/4: wallet snapshots (Moralis parallel per wallet)", {
      walletCount: list.length,
      icarusWallets: fromIcarus.size,
      registeredWallets: registered.length,
      watchlistWallets: TRADER_WATCH_WALLETS.length,
      verbosePerWallet: process.env.MARKET_SYNC_VERBOSE_WALLETS === "1",
    });

    let okW = 0;
    let failW = 0;
    const failSamples: string[] = [];
    const failedApiHits = new Map<string, number>();
    const failedApiErrorSamples = new Map<string, string>();
    const disabledApis = new Set<string>();
    const disableAfter = Math.max(5, Number(process.env.MORALIS_WALLET_API_DISABLE_AFTER ?? 25));
    const maxPerWalletWarn = Math.max(5, Number(process.env.MORALIS_WALLET_LOG_MAX_PARTIAL ?? 25));
    let partialWarns = 0;

    const walletConcurrency = Math.max(1, Math.min(16, Number(process.env.MORALIS_WALLET_SYNC_CONCURRENCY ?? 6)));
    let nextIndex = 0;
    let doneCount = 0;
    const processWallet = async (addr: string) => {
      const w0 = Date.now();
      try {
        const snap = await buildWalletPageSnapshot(addr, { disabledApis });
        await upsertWalletSnapshot(normalizeWalletSnapshotAddress(addr), snap);
        okW++;
        const apis = summarizeWalletSnapshotApiResults(snap);
        const apiErrors = extractSnapshotApiErrors(snap);
        const failed = Object.entries(apis)
          .filter(([, v]) => !v)
          .map(([k]) => k);
        for (const key of failed) {
          const n = (failedApiHits.get(key) ?? 0) + 1;
          failedApiHits.set(key, n);
          const err = apiErrors[key];
          if (err && !failedApiErrorSamples.has(key)) failedApiErrorSamples.set(key, err);
          if (n >= disableAfter) disabledApis.add(key);
        }
        const ms = Date.now() - w0;
        if (process.env.MARKET_SYNC_VERBOSE_WALLETS === "1") {
          syncLogInfo("wallet snapshot", {
            address: `${addr.slice(0, 10)}…`,
            ms,
            allApisOk: failed.length === 0,
            failedApis: failed.length ? failed : undefined,
          });
        } else if (failed.length > 0 && partialWarns < maxPerWalletWarn) {
          syncLogWarn("wallet snapshot partial Moralis failures", {
            address: `${addr.slice(0, 10)}…`,
            ms,
            failedApis: failed,
          });
          partialWarns++;
        }
      } catch (e: unknown) {
        failW++;
        const msg = e instanceof Error ? e.message : String(e);
        if (failSamples.length < 10) failSamples.push(`${addr.slice(0, 12)}…: ${msg}`);
        syncLogWarn("wallet snapshot exception", { address: addr, error: msg });
      }
    };
    const worker = async () => {
      while (true) {
        const i = nextIndex++;
        if (i >= list.length) return;
        await processWallet(list[i]);
        doneCount++;
        if (doneCount % 25 === 0 || doneCount === list.length) {
          syncLogInfo("wallet snapshot progress", {
            done: doneCount,
            total: list.length,
            ok: okW,
            fail: failW,
            elapsedMs: Date.now() - walletPhaseStart,
            disabledApis: disabledApis.size ? [...disabledApis] : undefined,
            concurrency: walletConcurrency,
          });
        }
        if (doneCount % (walletConcurrency * 12) === 0) {
          await new Promise((r) => setTimeout(r, 120));
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(walletConcurrency, Math.max(1, list.length)) }, () => worker()),
    );

    syncLogInfo("aux step 4/4 done — wallet snapshots", {
      walletsOk: okW,
      walletsFail: failW,
      total: list.length,
      ms: Date.now() - walletPhaseStart,
    });

    /**
     * Aux step 5/5: refresh NFT collections + token detail rows that users have
     * opened at least once (`api_resource_snapshots`). This phase NEVER deletes
     * — it only re-fetches existing rows older than `NFT_RESOURCE_REFRESH_AFTER_SEC`.
     * Toggle off with `NFT_RESOURCE_REFRESH=0`.
     */
    const nftRefreshOn = !/^0|false|no$/i.test(String(process.env.NFT_RESOURCE_REFRESH ?? "1"));
    if (nftRefreshOn) {
      const refreshStart = Date.now();
      const olderThanSec = Math.max(
        60,
        Math.floor(Number(process.env.NFT_RESOURCE_REFRESH_AFTER_SEC ?? 6 * 60 * 60)),
      );
      const collectionsLimit = Math.max(
        1,
        Math.min(200, Math.floor(Number(process.env.NFT_RESOURCE_REFRESH_COLLECTIONS ?? 40))),
      );
      const itemsLimit = Math.max(
        1,
        Math.min(500, Math.floor(Number(process.env.NFT_RESOURCE_REFRESH_TOKENS ?? 80))),
      );
      syncLogInfo("aux step 5/5: user-browsed NFT resource refresh (start)", {
        olderThanSec,
        collectionsLimit,
        itemsLimit,
      });
      try {
        const r = await runUserBrowsedNftCollectionsRefresh({
          olderThanSec,
          collectionsLimit,
          itemsLimit,
        });
        syncLogInfo("aux step 5/5 done — user-browsed NFT resource refresh", {
          wallClockMs: Date.now() - refreshStart,
          ...r,
        });
      } catch (e: unknown) {
        syncLogWarn("user-browsed NFT resource refresh failed", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    } else {
      syncLogInfo("aux step 5/5: user-browsed NFT resource refresh skipped (NFT_RESOURCE_REFRESH=0)");
    }

    syncLogInfo("auxiliary API snapshot sync — done", {
      walletsOk: okW,
      walletsFail: failW,
      total: list.length,
      totalMs: Date.now() - auxStart,
      disabledApis: disabledApis.size ? [...disabledApis] : undefined,
      partialApiFailures: failedApiHits.size
        ? Object.fromEntries(
            [...failedApiHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
          )
        : undefined,
      partialApiErrorSamples: failedApiErrorSamples.size
        ? Object.fromEntries([...failedApiErrorSamples.entries()].slice(0, 20))
        : undefined,
      errorSamples: failSamples.length ? failSamples : undefined,
    });
  } catch (e: unknown) {
    syncLogError("auxiliary API snapshot sync fatal", e instanceof Error ? e : { error: String(e) });
  }
}
