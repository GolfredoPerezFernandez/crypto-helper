/** Sync row from Turso (shape used by dashboard / history tables). */
export type SyncRunDurationInput = {
  finishedAt?: number | null;
  startedAt?: number;
  durationMs?: number | null;
};

/**
 * Prefer `durationMs` from DB; else estimate from `finishedAt` / `startedAt` (seconds).
 * Safe for client bundles — no DB imports.
 */
export function effectiveSyncDurationMs(row: SyncRunDurationInput | undefined | null): number | null {
  if (!row?.finishedAt) return null;
  if (row.durationMs != null && Number.isFinite(row.durationMs)) return row.durationMs;
  if (row.startedAt == null) return null;
  return Math.max(0, (row.finishedAt - row.startedAt) * 1000);
}

/** Human-readable duration from milliseconds (sync run times). */
export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return s >= 10 ? `${Math.round(s)} s` : `${s.toFixed(1)} s`;
  const sec = Math.floor(s);
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${r}s`;
}
