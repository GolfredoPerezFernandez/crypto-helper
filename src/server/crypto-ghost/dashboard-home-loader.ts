/**
 * Solo servidor — importado con `await import(...)` desde el `routeLoader$` del dashboard home
 * para no arrastrar `~/lib/turso` al bundle del cliente.
 */
import type { RequestEventBase } from "@builder.io/qwik-city";
import { count, desc, eq, gt } from "drizzle-orm";
import { db } from "~/lib/turso";
import {
  getGlobalSnapshotJson,
  getWalletSnapshotJson,
  GLOBAL_NFT_HOTTEST,
} from "~/server/crypto-ghost/api-snapshot-sync";
import type { MoralisWalletTokensResult } from "~/server/crypto-ghost/moralis-api";
import {
  getLatestSyncRun,
  queryMarketTokens,
  queryRecentSyncRuns,
  queryTrendingOrFallback,
} from "~/server/crypto-ghost/market-queries";
import { getUserProAccess } from "~/server/crypto-ghost/user-access";
import {
  erc20LogoUrl,
  isSolanaWalletAddress,
  normalizeWalletSnapshotAddress,
} from "~/server/crypto-ghost/wallet-snapshot";
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

export async function loadDashboardHome(ev: RequestEventBase) {
  try {
  const since24h = Math.floor(Date.now() / 1000) - 86_400;

  const [meme, ai, totalRow, lastSync, topVolume, trendingPack, whale24, trader24, smart24, syncHistory] =
    await Promise.all([
      db
        .select()
        .from(cachedMarketTokens)
        .where(eq(cachedMarketTokens.category, "memes"))
        .orderBy(desc(cachedMarketTokens.updatedAt))
        .limit(12)
        .all(),
      db
        .select()
        .from(cachedMarketTokens)
        .where(eq(cachedMarketTokens.category, "ai-big-data"))
        .orderBy(desc(cachedMarketTokens.updatedAt))
        .limit(8)
        .all(),
      db.select({ n: count() }).from(cachedMarketTokens).get(),
      getLatestSyncRun(),
      queryMarketTokens({ category: "volume", limit: 6, offset: 0 }),
      queryTrendingOrFallback(6),
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
    ]);

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
    meme,
    ai,
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
    topVolume,
    trending: trendingPack,
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
  };
  } catch (e) {
    console.error("[loadDashboardHome]", e);
    const pro = await getUserProAccess(ev);
    return {
      meme: [],
      ai: [],
      wallet: { address: null, authProvider: null, tokens: [] },
      stats: {
        totalTokens: 0,
        lastSync: undefined,
        syncHistory: [],
        signals24h: { whales: 0, traders: 0, smart: 0 },
      },
      topVolume: [],
      trending: { rows: [], usedFallback: true },
      access: pro,
      nftGlobal: {
        hottestCount: 0,
        ok: false,
        error: "Base de datos no disponible temporalmente.",
      },
    };
  }
}
