-- percentChange24h / percentChange90d on cached_market_tokens:
-- - Applied automatically on first request via `waitForTursoMigrations()` in src/lib/turso.ts (try/catch, idempotent).
-- - This migration is a journal-only step so `drizzle-kit migrate` succeeds when those columns already exist
--   (e.g. after the app ran first) and avoids SQLITE duplicate column errors.
SELECT 1;
