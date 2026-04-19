-- Pro / paid features: `subscriber` on `users`.
-- Many Turso DBs already have this column; duplicate ALTER breaks `drizzle-kit migrate`.
-- The column is applied idempotently at runtime in `src/lib/turso.ts` (`runUsersSubscriberMigration`).
SELECT 1;
