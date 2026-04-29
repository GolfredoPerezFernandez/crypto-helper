import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "~/lib/turso";
import {
  analyzedAddresses,
  cachedMarketTokens,
  freshSignals,
  signalTraders,
  signalWhales,
  syncRuns,
} from "../../../drizzle/schema";
import { MARKET_CATEGORIES, type MarketCategory, isMarketCategory } from "./market-category-constants";

export {
  CATEGORY_DASHBOARD_PATH,
  MARKET_CATEGORIES,
  type MarketCategory,
  isMarketCategory,
} from "./market-category-constants";

/** Turso/libsql uses HTTP; failures surface as undici `fetch failed` — avoid crashing Qwik SSR. */
async function tursoSafe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[market-queries:${label}]`, e);
    return fallback;
  }
}

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;
export type MarketTokenLightRow = Omit<typeof cachedMarketTokens.$inferSelect, "apiSnapshot">;
export const MARKET_TOKEN_LIGHT_SELECT = {
  id: cachedMarketTokens.id,
  category: cachedMarketTokens.category,
  address: cachedMarketTokens.address,
  name: cachedMarketTokens.name,
  symbol: cachedMarketTokens.symbol,
  decimals: cachedMarketTokens.decimals,
  logo: cachedMarketTokens.logo,
  totalSupply: cachedMarketTokens.totalSupply,
  percentChange1h: cachedMarketTokens.percentChange1h,
  percentChange24h: cachedMarketTokens.percentChange24h,
  percentChange7d: cachedMarketTokens.percentChange7d,
  percentChange30d: cachedMarketTokens.percentChange30d,
  percentChange90d: cachedMarketTokens.percentChange90d,
  fullyDilutedValuation: cachedMarketTokens.fullyDilutedValuation,
  price: cachedMarketTokens.price,
  volume: cachedMarketTokens.volume,
  network: cachedMarketTokens.network,
  slug: cachedMarketTokens.slug,
  cmcId: cachedMarketTokens.cmcId,
  updatedAt: cachedMarketTokens.updatedAt,
} as const;

function dedupeMarketRows<T extends { cmcId?: number | null; slug?: string | null; symbol?: string | null }>(
  rows: T[],
): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const cmc = row.cmcId;
    const key =
      cmc != null && Number.isFinite(cmc)
        ? `cmc:${cmc}`
        : `slug:${String(row.slug ?? "").toLowerCase()}|sym:${String(row.symbol ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function clampLimit(n: number | undefined, def: number = DEFAULT_LIMIT): number {
  if (n == null || !Number.isFinite(n)) return def;
  return Math.min(Math.max(1, Math.floor(n)), MAX_LIMIT);
}

export function clampOffset(n: number | undefined): number {
  if (n == null || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export async function queryMarketTokens(opts: {
  category?: MarketCategory | null;
  limit: number;
  offset: number;
}): Promise<MarketTokenLightRow[]> {
  return tursoSafe("queryMarketTokens", async () => {
    const { category, limit, offset } = opts;
    if (category) {
      const rows = await db
        .select(MARKET_TOKEN_LIGHT_SELECT)
        .from(cachedMarketTokens)
        .where(eq(cachedMarketTokens.category, category))
        .orderBy(desc(cachedMarketTokens.updatedAt))
        .limit(limit)
        .offset(offset)
        .all();
      return dedupeMarketRows(rows);
    }
    const rows = await db
      .select(MARKET_TOKEN_LIGHT_SELECT)
      .from(cachedMarketTokens)
      .orderBy(desc(cachedMarketTokens.updatedAt))
      .limit(limit)
      .offset(offset)
      .all();
    return dedupeMarketRows(rows);
  }, []);
}

/**
 * CMC “trending/gainers-losers” is not on Basic/free — category `trending` may be empty.
 * Fallback: top weekly movers from the `volume` board (same sync, no extra API).
 */
export async function queryTrendingOrFallback(limit: number = 300): Promise<{
  rows: MarketTokenLightRow[];
  usedFallback: boolean;
}> {
  return tursoSafe("queryTrendingOrFallback", async () => {
    const direct = await db
      .select(MARKET_TOKEN_LIGHT_SELECT)
      .from(cachedMarketTokens)
      .where(eq(cachedMarketTokens.category, "trending"))
      .orderBy(desc(cachedMarketTokens.updatedAt))
      .limit(limit)
      .all();
    if (direct.length > 0) {
      return { rows: dedupeMarketRows(direct), usedFallback: false };
    }
    const rows = await db
      .select(MARKET_TOKEN_LIGHT_SELECT)
      .from(cachedMarketTokens)
      .where(eq(cachedMarketTokens.category, "volume"))
      .orderBy(desc(sql`cast(${cachedMarketTokens.percentChange7d} as real)`))
      .limit(limit)
      .all();
    return { rows: dedupeMarketRows(rows), usedFallback: true };
  }, { rows: [], usedFallback: true });
}

/**
 * CMC “trending/most-visited” may be unavailable on free tier. Fallback: highest 24h volume rows.
 */
export async function queryMostVisitedOrFallback(limit: number = 300): Promise<{
  rows: MarketTokenLightRow[];
  usedFallback: boolean;
}> {
  return tursoSafe("queryMostVisitedOrFallback", async () => {
    const direct = await db
      .select(MARKET_TOKEN_LIGHT_SELECT)
      .from(cachedMarketTokens)
      .where(eq(cachedMarketTokens.category, "most-visited"))
      .orderBy(desc(cachedMarketTokens.updatedAt))
      .limit(limit)
      .all();
    if (direct.length > 0) {
      return { rows: dedupeMarketRows(direct), usedFallback: false };
    }
    const rows = await db
      .select(MARKET_TOKEN_LIGHT_SELECT)
      .from(cachedMarketTokens)
      .where(eq(cachedMarketTokens.category, "volume"))
      .orderBy(desc(sql`cast(${cachedMarketTokens.volume} as real)`))
      .limit(limit)
      .all();
    return { rows: dedupeMarketRows(rows), usedFallback: true };
  }, { rows: [], usedFallback: true });
}

export async function getMarketTokenById(id: number) {
  return tursoSafe("getMarketTokenById", () => db.select().from(cachedMarketTokens).where(eq(cachedMarketTokens.id, id)).get(), undefined);
}

export async function getMarketTokenBySlug(category: MarketCategory, slug: string) {
  return tursoSafe(
    "getMarketTokenBySlug",
    () =>
      db
        .select()
        .from(cachedMarketTokens)
        .where(and(eq(cachedMarketTokens.category, category), eq(cachedMarketTokens.slug, slug)))
        .get(),
    undefined,
  );
}

/** First row matching slug (any board), freshest first. */
export async function getMarketTokenBySlugLoose(slug: string) {
  return tursoSafe(
    "getMarketTokenBySlugLoose",
    () =>
      db
        .select()
        .from(cachedMarketTokens)
        .where(eq(cachedMarketTokens.slug, slug))
        .orderBy(desc(cachedMarketTokens.updatedAt))
        .limit(1)
        .get(),
    undefined,
  );
}

/** Lookup by token contract address (any board), freshest first. */
export async function getMarketTokenByAddressLoose(address: string) {
  const a = String(address || "").trim().toLowerCase();
  if (!a.startsWith("0x")) return undefined;
  return tursoSafe(
    "getMarketTokenByAddressLoose",
    () =>
      db
        .select()
        .from(cachedMarketTokens)
        .where(eq(cachedMarketTokens.address, a))
        .orderBy(desc(cachedMarketTokens.updatedAt))
        .limit(1)
        .get(),
    undefined,
  );
}

/** Best row for “última actualización”: última corrida con `finishedAt` (más reciente primero). */
export async function getLatestSyncRun() {
  return tursoSafe("getLatestSyncRun", async () => {
    const completed = await db
      .select()
      .from(syncRuns)
      .where(isNotNull(syncRuns.finishedAt))
      .orderBy(desc(syncRuns.finishedAt))
      .limit(1)
      .get();
    if (completed) return completed;
    return db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(1).get();
  }, undefined);
}

export async function queryRecentSyncRuns(limit: number) {
  return tursoSafe(
    "queryRecentSyncRuns",
    () =>
      db
        .select()
        .from(syncRuns)
        .orderBy(desc(sql`coalesce(${syncRuns.finishedAt}, ${syncRuns.startedAt})`))
        .limit(limit)
        .all(),
    [],
  );
}

export async function queryWhaleSignals(limit: number) {
  return tursoSafe("queryWhaleSignals", () => db.select().from(signalWhales).orderBy(desc(signalWhales.time)).limit(limit).all(), []);
}

export async function queryTraderSignals(limit: number) {
  return tursoSafe("queryTraderSignals", () => db.select().from(signalTraders).orderBy(desc(signalTraders.time)).limit(limit).all(), []);
}

export async function querySmartSignalsWithAddresses(limit: number) {
  return tursoSafe("querySmartSignalsWithAddresses", async () => {
    const signals = await db
      .select()
      .from(freshSignals)
      .orderBy(desc(freshSignals.createdAt))
      .limit(limit)
      .all();
    if (signals.length === 0) return [];
    const ids = signals.map((s) => s.id);
    const rows = await db
      .select()
      .from(analyzedAddresses)
      .where(inArray(analyzedAddresses.freshSignalId, ids))
      .all();
    const byId = new Map<number, typeof rows>();
    for (const r of rows) {
      const arr = byId.get(r.freshSignalId) ?? [];
      arr.push(r);
      byId.set(r.freshSignalId, arr);
    }
    return signals.map((s) => ({ ...s, analyzedAddresses: byId.get(s.id) ?? [] }));
  }, []);
}

export function isEvmAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(String(s || "").trim());
}
