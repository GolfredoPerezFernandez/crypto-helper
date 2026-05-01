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

export function ownersLimitForTokenSync(): number {
  const ownersLimitRaw = Number(process.env.MORALIS_SYNC_TOKEN_OWNERS_LIMIT ?? "25");
  return Number.isFinite(ownersLimitRaw)
    ? Math.min(100, Math.max(5, Math.floor(ownersLimitRaw)))
    : 25;
}
