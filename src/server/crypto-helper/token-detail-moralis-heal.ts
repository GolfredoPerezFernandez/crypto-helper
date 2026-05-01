/**
 * Token detail page: refresh stale Moralis payloads stored in `api_snapshot`.
 * Old sync runs cached `"order must be a valid enum value"` until Turso is rewritten.
 */

export function isStaleMoralisOrderCacheError(err: unknown): boolean {
  const s = String(err ?? "").toLowerCase();
  if (!s) return false;
  if (s.includes("order must be a valid enum")) return true;
  if (s.includes("block_timestamp")) return true;
  return false;
}

export function tokenSnapshotNeverHadSwaps(snap: { moralisSwaps?: unknown } | null): boolean {
  return snap == null || snap.moralisSwaps == null;
}

/** Live-fetch when swaps were never stored or the last snapshot attempt failed (retry cached errors). */
export function tokenSnapshotNeedsLiveSwaps(snap: { moralisSwaps?: { ok?: boolean } } | null): boolean {
  if (snap == null || snap.moralisSwaps == null) return true;
  return snap.moralisSwaps.ok !== true;
}

/** Same for top gainers / PnL — sync may persist `{ ok: false }` and block refetch unless we retry. */
export function tokenSnapshotNeedsLiveTopGainers(snap: { topGainers?: { ok?: boolean } } | null): boolean {
  if (snap == null || snap.topGainers == null) return true;
  return snap.topGainers.ok !== true;
}

export function ownersLimitForTokenSync(): number {
  const ownersLimitRaw = Number(process.env.MORALIS_SYNC_TOKEN_OWNERS_LIMIT ?? "25");
  return Number.isFinite(ownersLimitRaw)
    ? Math.min(100, Math.max(5, Math.floor(ownersLimitRaw)))
    : 25;
}
