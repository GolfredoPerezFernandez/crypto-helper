import { and, asc, eq, lt } from "drizzle-orm";
import { db } from "~/lib/turso";
import { apiResourceSnapshots } from "../../../drizzle/schema";
import {
  fetchMoralisNftCollectionMetadata,
  fetchMoralisNftCollectionStats,
  fetchMoralisNftCollectionSalePrices,
  fetchMoralisNftMetadata,
  fetchMoralisNftTraitsPaginate,
  fetchMoralisNftsByContract,
} from "~/server/crypto-helper/moralis-api";
import { syncLogInfo, syncLogWarn } from "~/server/crypto-helper/sync-logger";

/**
 * Generic per-resource cache mirrored in Turso (`api_resource_snapshots`).
 *
 * Goal: any token / NFT collection / NFT item that a user opens — even when it
 * isn't in the daily Moralis sync — is persisted and can later be refreshed by
 * the daily sync job. Sync NEVER deletes here; it only inserts new rows or
 * updates `payload` + `updatedAt` on existing ones.
 */

export type ApiResourceKind =
  | "nft_collection"
  | "nft_collection_stats"
  | "nft_collection_traits"
  | "nft_collection_sales"
  | "nft_collection_list"
  | "nft_token"
  | "market_token";

export type ApiResourceSnapshotRow = {
  kind: string;
  key: string;
  payload: string;
  updatedAt: number;
  firstSeenAt: number;
};

const nowSec = (): number => Math.floor(Date.now() / 1000);

/** Stable cache key for an NFT collection (contract + chain). */
export function nftCollectionResourceKey(contract: string, chain: string): string {
  return `${chain.trim().toLowerCase()}:${contract.trim().toLowerCase()}`;
}

/** Stable cache key for an NFT collection sub-resource (stats, traits, sales). */
export function nftCollectionSubKey(
  contract: string,
  chain: string,
  scope: string,
): string {
  return `${chain.trim().toLowerCase()}:${contract.trim().toLowerCase()}:${scope}`;
}

/** Stable cache key for an NFT token detail (contract + tokenId + chain). */
export function nftTokenResourceKey(contract: string, tokenId: string, chain: string): string {
  return `${chain.trim().toLowerCase()}:${contract.trim().toLowerCase()}:${String(tokenId)}`;
}

/** Stable cache key for a market token (chain + address). */
export function marketTokenResourceKey(chain: string, address: string): string {
  return `${chain.trim().toLowerCase()}:${address.trim().toLowerCase()}`;
}

/** Read raw row from `api_resource_snapshots`. */
export async function getResourceSnapshotRow(
  kind: ApiResourceKind,
  key: string,
): Promise<ApiResourceSnapshotRow | undefined> {
  try {
    return await db
      .select()
      .from(apiResourceSnapshots)
      .where(and(eq(apiResourceSnapshots.kind, kind), eq(apiResourceSnapshots.key, key)))
      .get();
  } catch (e) {
    console.error("[api-resource-cache] getResourceSnapshotRow", kind, key, e);
    return undefined;
  }
}

/** Decode JSON payload of a snapshot row, returning `null` when absent or unparseable. */
export async function getResourceSnapshotJson<T = unknown>(
  kind: ApiResourceKind,
  key: string,
): Promise<{ data: T; updatedAt: number; firstSeenAt: number } | null> {
  const row = await getResourceSnapshotRow(kind, key);
  if (!row?.payload) return null;
  try {
    const data = JSON.parse(row.payload) as T;
    return { data, updatedAt: row.updatedAt, firstSeenAt: row.firstSeenAt };
  } catch {
    return null;
  }
}

/**
 * Insert or update a resource snapshot. Sync-safe: never deletes.
 *
 * Returns previous timestamps for callers that want to show "stale since…" UI.
 */
export async function upsertResourceSnapshot<T>(
  kind: ApiResourceKind,
  key: string,
  payload: T,
): Promise<{ updatedAt: number; firstSeenAt: number }> {
  const text = JSON.stringify(payload);
  const now = nowSec();
  const existing = await getResourceSnapshotRow(kind, key);
  const firstSeenAt = existing?.firstSeenAt ?? now;
  await db
    .insert(apiResourceSnapshots)
    .values({ kind, key, payload: text, updatedAt: now, firstSeenAt })
    .onConflictDoUpdate({
      target: [apiResourceSnapshots.kind, apiResourceSnapshots.key],
      set: { payload: text, updatedAt: now },
    });
  return { updatedAt: now, firstSeenAt };
}

/** True when the row exists and was refreshed within the freshness window (seconds). */
export function snapshotIsFresh(
  row: { updatedAt: number } | null | undefined,
  maxAgeSec: number,
): boolean {
  if (!row) return false;
  if (!Number.isFinite(maxAgeSec) || maxAgeSec <= 0) return false;
  return nowSec() - row.updatedAt < maxAgeSec;
}

/**
 * List keys that are older than `olderThanSec` and need refresh during sync.
 * Limited so a single run never explodes Moralis quotas.
 */
export async function listStaleResourceKeys(
  kind: ApiResourceKind,
  olderThanSec: number,
  limit = 50,
): Promise<{ key: string; updatedAt: number }[]> {
  const cutoff = nowSec() - Math.max(0, Math.floor(olderThanSec));
  try {
    const rows = await db
      .select({ key: apiResourceSnapshots.key, updatedAt: apiResourceSnapshots.updatedAt })
      .from(apiResourceSnapshots)
      .where(
        and(eq(apiResourceSnapshots.kind, kind), lt(apiResourceSnapshots.updatedAt, cutoff)),
      )
      .orderBy(asc(apiResourceSnapshots.updatedAt))
      .limit(Math.max(1, Math.min(500, Math.floor(limit))))
      .all();
    return rows;
  } catch (e) {
    console.error("[api-resource-cache] listStaleResourceKeys", kind, e);
    return [];
  }
}

/**
 * High-level helper used by route loaders: try DB first, fall back to a fetch
 * function. Always persists fresh fetches. If both fail, returns the stale row
 * (if any) so the UI never sees "nothing".
 */
export async function getOrFetchResource<T>(args: {
  kind: ApiResourceKind;
  key: string;
  /** Used as "fresh enough, skip Moralis" threshold. Default: 6h. */
  freshForSec?: number;
  /** Live Moralis fetcher; should return `{ ok: true, data }` on success. */
  fetcher: () => Promise<{ ok: true; data: T } | { ok: false; error: unknown }>;
}): Promise<{
  ok: boolean;
  data: T | null;
  error?: unknown;
  source: "fresh-db" | "live" | "stale-db" | "miss";
  updatedAt: number | null;
}> {
  const fresh = Math.max(60, Math.floor(args.freshForSec ?? 6 * 60 * 60));
  const cached = await getResourceSnapshotJson<T>(args.kind, args.key);
  if (cached && snapshotIsFresh(cached, fresh)) {
    return { ok: true, data: cached.data, source: "fresh-db", updatedAt: cached.updatedAt };
  }
  try {
    const live = await args.fetcher();
    if (live.ok) {
      await upsertResourceSnapshot(args.kind, args.key, live.data);
      return { ok: true, data: live.data, source: "live", updatedAt: nowSec() };
    }
    if (cached) {
      return {
        ok: true,
        data: cached.data,
        source: "stale-db",
        updatedAt: cached.updatedAt,
        error: live.error,
      };
    }
    return { ok: false, data: null, error: live.error, source: "miss", updatedAt: null };
  } catch (e) {
    if (cached) {
      return {
        ok: true,
        data: cached.data,
        source: "stale-db",
        updatedAt: cached.updatedAt,
        error: e,
      };
    }
    return { ok: false, data: null, error: e, source: "miss", updatedAt: null };
  }
}

/**
 * Decode an `nft_collection*` resource key into `{ chain, contract, scope? }`.
 * Returns `null` when malformed (defensive — some legacy keys could exist).
 */
function parseNftKey(
  key: string,
): { chain: string; contract: string; scope?: string } | null {
  const parts = key.split(":");
  if (parts.length < 2) return null;
  const chain = parts[0]?.trim().toLowerCase();
  const contract = parts[1]?.trim().toLowerCase();
  if (!chain || !/^0x[a-f0-9]{40}$/.test(contract)) return null;
  const scope = parts.slice(2).join(":") || undefined;
  return { chain, contract, scope };
}

/**
 * Daily-sync phase: refresh NFT resources users have browsed at least once.
 *
 * Sync NEVER deletes rows in `api_resource_snapshots`; this only updates the
 * payload + `updatedAt` of rows older than `olderThanSec`. Useful so the next
 * page load is instant — and so cached collections stay in step with Moralis.
 */
export async function runUserBrowsedNftCollectionsRefresh(opts?: {
  olderThanSec?: number;
  collectionsLimit?: number;
  itemsLimit?: number;
}): Promise<{
  collections: { attempted: number; ok: number; fail: number };
  stats: { attempted: number; ok: number; fail: number };
  sales: { attempted: number; ok: number; fail: number };
  list: { attempted: number; ok: number; fail: number };
  traits: { attempted: number; ok: number; fail: number };
  tokens: { attempted: number; ok: number; fail: number };
  ms: number;
}> {
  const t0 = Date.now();
  const olderThan = Math.max(60, Math.floor(opts?.olderThanSec ?? 6 * 60 * 60));
  const collectionsLimit = Math.max(1, Math.min(200, Math.floor(opts?.collectionsLimit ?? 40)));
  const itemsLimit = Math.max(1, Math.min(500, Math.floor(opts?.itemsLimit ?? 80)));

  const counters = {
    collections: { attempted: 0, ok: 0, fail: 0 },
    stats: { attempted: 0, ok: 0, fail: 0 },
    sales: { attempted: 0, ok: 0, fail: 0 },
    list: { attempted: 0, ok: 0, fail: 0 },
    traits: { attempted: 0, ok: 0, fail: 0 },
    tokens: { attempted: 0, ok: 0, fail: 0 },
  };

  if (!process.env.MORALIS_API_KEY?.trim()) {
    syncLogWarn("user-browsed NFT refresh skipped (missing MORALIS_API_KEY)");
    return { ...counters, ms: Date.now() - t0 };
  }

  const refreshOne = async (
    bucket: keyof typeof counters,
    kind: ApiResourceKind,
    key: string,
    fetcher: () => Promise<{ ok: true; data: unknown } | { ok: false; error: unknown }>,
  ): Promise<void> => {
    counters[bucket].attempted++;
    try {
      const r = await fetcher();
      if (r.ok) {
        await upsertResourceSnapshot(kind, key, r.data);
        counters[bucket].ok++;
      } else {
        counters[bucket].fail++;
      }
    } catch {
      counters[bucket].fail++;
    }
  };

  /** 1) Collection-level metadata (most stable, cheapest to refresh first). */
  const collKeys = await listStaleResourceKeys("nft_collection", olderThan, collectionsLimit);
  for (const r of collKeys) {
    const p = parseNftKey(r.key);
    if (!p) continue;
    await refreshOne("collections", "nft_collection", r.key, () =>
      fetchMoralisNftCollectionMetadata(p.contract, p.chain, true),
    );
  }

  /** 2) Stats / sales / list / traits — only for collections we already had cached. */
  const statsKeys = await listStaleResourceKeys("nft_collection_stats", olderThan, collectionsLimit);
  for (const r of statsKeys) {
    const p = parseNftKey(r.key);
    if (!p) continue;
    await refreshOne("stats", "nft_collection_stats", r.key, () =>
      fetchMoralisNftCollectionStats(p.contract, p.chain),
    );
  }

  const salesKeys = await listStaleResourceKeys("nft_collection_sales", olderThan, collectionsLimit);
  for (const r of salesKeys) {
    const p = parseNftKey(r.key);
    if (!p?.scope) continue;
    const m = /^sales-(\d+)d$/.exec(p.scope);
    const days = m ? Number(m[1]) : 7;
    await refreshOne("sales", "nft_collection_sales", r.key, () =>
      fetchMoralisNftCollectionSalePrices(p.contract, p.chain, days),
    );
  }

  const listKeys = await listStaleResourceKeys("nft_collection_list", olderThan, collectionsLimit);
  for (const r of listKeys) {
    const p = parseNftKey(r.key);
    if (!p?.scope || p.scope !== "list-page1") continue;
    await refreshOne("list", "nft_collection_list", r.key, () =>
      fetchMoralisNftsByContract(p.contract, p.chain, {
        limit: 40,
        cursor: undefined,
        include_prices: true,
        media_items: true,
      }),
    );
  }

  const traitsKeys = await listStaleResourceKeys("nft_collection_traits", olderThan, collectionsLimit);
  for (const r of traitsKeys) {
    const p = parseNftKey(r.key);
    if (!p?.scope || p.scope !== "traits-page1") continue;
    await refreshOne("traits", "nft_collection_traits", r.key, () =>
      fetchMoralisNftTraitsPaginate(p.contract, p.chain, {
        limit: 50,
        cursor: undefined,
        order: "DESC",
      }),
    );
  }

  /** 3) Individual token detail rows (heaviest, capped tightly). */
  const tokenKeys = await listStaleResourceKeys("nft_token", olderThan, itemsLimit);
  for (const r of tokenKeys) {
    const p = parseNftKey(r.key);
    if (!p?.scope) continue;
    const tokenId = p.scope;
    await refreshOne("tokens", "nft_token", r.key, () =>
      fetchMoralisNftMetadata(p.contract, tokenId, p.chain, {
        include_prices: true,
        media_items: true,
      }),
    );
  }

  const result = { ...counters, ms: Date.now() - t0 };
  syncLogInfo("user-browsed NFT refresh done", result);
  return result;
}
