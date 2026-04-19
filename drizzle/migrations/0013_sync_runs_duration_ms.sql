-- `durationMs` on `sync_runs` (sync history / dashboard).
-- Applied idempotently at runtime in `src/lib/turso.ts` so Turso never hits "no such column"
-- when `drizzle-kit migrate` was skipped or out of order with `drizzle-kit push`.
SELECT 1;
