import { eq, isNotNull } from "drizzle-orm";
import { db } from "~/lib/turso";
import {
  apiGlobalSnapshots,
  apiWalletSnapshots,
  users,
} from "../../../drizzle/schema";
import { fetchIcarusTopUsersBySwaps } from "~/server/crypto-ghost/icarus-top-users";
import {
  fetchNansenSmartMoney,
  fetchNansenTgm,
  fetchNansenTgmPnlLeaderboard,
  getDefaultTgmRequest,
  type SmartMoneySection,
} from "~/server/crypto-ghost/nansen-smart-money";
import {
  fetchMoralisDiscoveryTopLosers,
  fetchMoralisLatestBlock,
  fetchMoralisNftHottestCollections,
  fetchMoralisNftTopCollections,
  fetchMoralisTokenCategories,
} from "~/server/crypto-ghost/moralis-api";
import { TRADER_WATCH_WALLETS } from "~/server/crypto-ghost/trader-wallets";
import {
  buildWalletPageSnapshot,
  isSolanaWalletAddress,
  normalizeWalletSnapshotAddress,
  summarizeWalletSnapshotApiResults,
  type WalletPageSnapshot,
} from "~/server/crypto-ghost/wallet-snapshot";
import { syncLogError, syncLogInfo, syncLogWarn } from "~/server/crypto-ghost/sync-logger";

export const GLOBAL_NFT_HOTTEST = "moralis_nft_hottest";
export const GLOBAL_NFT_TOP = "moralis_nft_top";
export const GLOBAL_ICARUS_TOP_USERS = "icarus_top_users_swaps";
export const GLOBAL_TOKEN_CATEGORIES = "moralis_token_categories";
export const GLOBAL_DISCOVERY_TOP_LOSERS = "moralis_discovery_top_losers";
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
  for (const [key, value] of Object.entries(snap as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as { ok?: unknown; error?: unknown };
    if (v.ok === false && typeof v.error === "string" && v.error.trim()) {
      out[key] = v.error.trim();
    }
  }
  return out;
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
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
 * Moralis + Icarus — runs once per successful daily market sync.
 * Populates `api_global_snapshots` and `api_wallet_snapshots` so dashboards do not call APIs per request.
 */
export async function runAuxiliaryApiSnapshotSync(): Promise<void> {
  const moralisConfigured = Boolean(process.env.MORALIS_API_KEY?.trim());
  const nansenConfigured = Boolean(process.env.NANSEN_API_KEY?.trim());
  const nansenSyncEnabled = /^1|true|yes$/i.test(String(process.env.NANSEN_SYNC_SMART_MONEY ?? "1"));
  const auxStart = Date.now();
  syncLogInfo("auxiliary API snapshot sync — start", { moralisConfigured, nansenConfigured, nansenSyncEnabled });

  try {
    syncLogInfo("aux step 1/4: Icarus top users by swaps");
    const icaT0 = Date.now();
    const traders = await fetchIcarusTopUsersBySwaps(36, 0);
    syncLogInfo("aux step 1/4 done — Icarus", {
      ms: Date.now() - icaT0,
      tradersFetched: traders.length,
    });
    await upsertGlobalSnapshot(GLOBAL_ICARUS_TOP_USERS, { traders });
    syncLogInfo("Turso upsert ok", {
      api: "global snapshot",
      key: GLOBAL_ICARUS_TOP_USERS,
      tradersStored: traders.length,
    });

    if (nansenConfigured && nansenSyncEnabled) {
      syncLogInfo("aux step 2/5: Nansen smart-money global snapshots");
      const nansenT0 = Date.now();
      const sections: SmartMoneySection[] = [
        "netflow",
        "holdings",
        "historical-holdings",
        "dex-trades",
        "perp-trades",
        "dcas",
      ];
      for (const section of sections) {
        const out = await fetchNansenSmartMoney(section);
        const key = NANSEN_SMART_MONEY_SNAPSHOT_KEYS[section];
        if (out.ok) {
          await upsertGlobalSnapshot(key, {
            section,
            data: out.data,
            creditsUsed: out.creditsUsed ?? null,
            creditsRemaining: out.creditsRemaining ?? null,
            syncedAt: nowSec(),
          });
        } else {
          await upsertGlobalSnapshot(key, {
            section,
            error: out.error,
            status: out.status,
            syncedAt: nowSec(),
          });
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
      syncLogInfo("aux step 2/5 done — Nansen smart-money", { ms: Date.now() - nansenT0 });
    } else {
      syncLogInfo("aux step 2/5 skipped — Nansen not configured or disabled");
    }

    if (!moralisConfigured) {
      syncLogWarn("MORALIS_API_KEY missing — skip Moralis NFT globals + wallet snapshots");
      syncLogInfo("auxiliary API snapshot sync — done (Icarus/Nansen only)", {
        totalMs: Date.now() - auxStart,
      });
      return;
    }

    syncLogInfo("aux step 3/5: Moralis NFT market-data batch (hottest + top collections)");
    const nftT0 = Date.now();
    const [hot, top] = await Promise.all([
      fetchMoralisNftHottestCollections(),
      fetchMoralisNftTopCollections(),
    ]);
    const nftMs = Date.now() - nftT0;
    syncLogInfo("aux step 3/5 done — Moralis NFT", {
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
    if (globalExtras.length > 0) {
      syncLogInfo("aux step 4/5: optional Moralis global snapshots", { keys: globalKeys });
      const t0 = Date.now();
      await Promise.all(globalExtras);
      syncLogInfo("aux step 4/5 done — Moralis optional globals", {
        ms: Date.now() - t0,
        keys: globalKeys,
      });
    } else {
      syncLogInfo("aux step 4/5 skipped — no optional Moralis globals enabled");
    }

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
    syncLogInfo("aux step 5/5: wallet snapshots (Moralis parallel per wallet)", {
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

    for (let i = 0; i < list.length; i++) {
      const addr = list[i];
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
      if ((i + 1) % 25 === 0) {
        syncLogInfo("wallet snapshot progress", {
          done: i + 1,
          total: list.length,
          ok: okW,
          fail: failW,
          elapsedMs: Date.now() - walletPhaseStart,
          disabledApis: disabledApis.size ? [...disabledApis] : undefined,
        });
      }
      if (i % 20 === 19) await new Promise((r) => setTimeout(r, 250));
    }

    syncLogInfo("aux step 5/5 done — wallet snapshots", {
      walletsOk: okW,
      walletsFail: failW,
      total: list.length,
      ms: Date.now() - walletPhaseStart,
    });

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
