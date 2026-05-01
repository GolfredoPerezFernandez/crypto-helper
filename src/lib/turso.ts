import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
// Must use /node for SSR/Node — the default "web" build does not support file: URLs.
// Client bundle replaces `@libsql/client/node` with a stub (vite.config.ts).
// Never call createClient at module load: route modules are imported on the client too.
// @see https://github.com/tursodatabase/libsql-client-ts#supported-urls
import type { Client } from "@libsql/client/node";
import { createClient } from "@libsql/client/node";
import { schema } from "../../drizzle/schema";

let _db: LibSQLDatabase<typeof schema> | null = null;
let _client: Client | null = null;
let _lastUrl: string | undefined;

/** Ensures remote SQLite has columns added after initial deploy (when drizzle migrate was not run). */
let _cachedMarketTokenMigrations: Promise<void> | null = null;
let _usersSubscriberMigration: Promise<void> | null = null;
let _syncRunsDurationMsMigration: Promise<void> | null = null;
let _syncRunsUsagePayloadMigration: Promise<void> | null = null;
let _proPaymentReceiptsMigration: Promise<void> | null = null;
let _userPriceAlertsMigration: Promise<void> | null = null;
let _userWatchlistItemsMigration: Promise<void> | null = null;

function runCachedMarketTokenMigrations(client: Client): Promise<void> {
    if (!_cachedMarketTokenMigrations) {
        _cachedMarketTokenMigrations = (async () => {
            const alters = [
                "ALTER TABLE cached_market_tokens ADD COLUMN percentChange24h text DEFAULT '0'",
                "ALTER TABLE cached_market_tokens ADD COLUMN percentChange90d text DEFAULT '0'",
            ];
            for (const sql of alters) {
                try {
                    await client.execute(sql);
                } catch {
                    /* duplicate column / already applied */
                }
            }
        })();
    }
    return _cachedMarketTokenMigrations;
}

function runUsersSubscriberMigration(client: Client): Promise<void> {
    if (!_usersSubscriberMigration) {
        _usersSubscriberMigration = (async () => {
            try {
                await client.execute(
                    "ALTER TABLE users ADD COLUMN subscriber integer DEFAULT 0 NOT NULL",
                );
            } catch {
                /* duplicate column / already applied */
            }
        })();
    }
    return _usersSubscriberMigration;
}

function runSyncRunsDurationMsMigration(client: Client): Promise<void> {
    if (!_syncRunsDurationMsMigration) {
        _syncRunsDurationMsMigration = (async () => {
            try {
                await client.execute("ALTER TABLE sync_runs ADD COLUMN durationMs integer");
            } catch {
                /* duplicate column / already applied */
            }
        })();
    }
    return _syncRunsDurationMsMigration;
}

function runSyncRunsUsagePayloadMigration(client: Client): Promise<void> {
    if (!_syncRunsUsagePayloadMigration) {
        _syncRunsUsagePayloadMigration = (async () => {
            try {
                await client.execute("ALTER TABLE sync_runs ADD COLUMN usage_payload text");
            } catch {
                /* duplicate column / already applied */
            }
        })();
    }
    return _syncRunsUsagePayloadMigration;
}

function runProPaymentReceiptsMigration(client: Client): Promise<void> {
    if (!_proPaymentReceiptsMigration) {
        _proPaymentReceiptsMigration = (async () => {
            await client.execute(`
                CREATE TABLE IF NOT EXISTS pro_payment_receipts (
                    tx_hash text PRIMARY KEY NOT NULL,
                    user_id integer NOT NULL,
                    created_at integer NOT NULL
                )
            `);
        })();
    }
    return _proPaymentReceiptsMigration;
}

function runUserPriceAlertsMigration(client: Client): Promise<void> {
    if (!_userPriceAlertsMigration) {
        _userPriceAlertsMigration = (async () => {
            try {
                await client.execute(
                    "ALTER TABLE users ADD COLUMN pushPriceAlerts integer DEFAULT 1 NOT NULL",
                );
            } catch {
                /* duplicate column */
            }
            await client.execute(`
                CREATE TABLE IF NOT EXISTS user_price_alerts (
                    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                    userId integer NOT NULL,
                    tokenId integer NOT NULL,
                    direction text NOT NULL,
                    thresholdUsd text NOT NULL,
                    enabled integer DEFAULT 1,
                    lastTriggeredAt integer,
                    createdAt integer DEFAULT (strftime('%s', 'now'))
                )
            `);
            try {
                await client.execute(
                    "CREATE UNIQUE INDEX IF NOT EXISTS user_price_alerts_user_token_dir ON user_price_alerts (userId, tokenId, direction)",
                );
            } catch {
                /* index exists or legacy */
            }
        })();
    }
    return _userPriceAlertsMigration;
}

function runUserWatchlistItemsMigration(client: Client): Promise<void> {
    if (!_userWatchlistItemsMigration) {
        _userWatchlistItemsMigration = (async () => {
            await client.execute(`
                CREATE TABLE IF NOT EXISTS user_watchlist_items (
                    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                    userId integer NOT NULL,
                    itemType text NOT NULL,
                    itemKey text NOT NULL,
                    label text DEFAULT '',
                    metaJson text,
                    createdAt integer DEFAULT (strftime('%s', 'now'))
                )
            `);
            try {
                await client.execute(
                    "CREATE UNIQUE INDEX IF NOT EXISTS user_watchlist_items_unique ON user_watchlist_items (userId, itemType, itemKey)",
                );
            } catch {
                /* index exists */
            }
        })();
    }
    return _userWatchlistItemsMigration;
}

/**
 * Await before any Drizzle query that touches `cached_market_tokens` new columns.
 * Called from root `onRequest`; `getTurso()` also schedules the same promise.
 */
export async function waitForTursoMigrations(): Promise<void> {
    getTurso();
    await runCachedMarketTokenMigrations(_client!);
    await runUsersSubscriberMigration(_client!);
    await runSyncRunsDurationMsMigration(_client!);
    await runSyncRunsUsagePayloadMigration(_client!);
    await runProPaymentReceiptsMigration(_client!);
    await runUserPriceAlertsMigration(_client!);
    await runUserWatchlistItemsMigration(_client!);
}

function resolveTursoUrl(explicitUrl?: string): string {
    const raw = (explicitUrl || process.env.PRIVATE_TURSO_DATABASE_URL || "").trim();
    if (!raw) {
        throw new Error(
            "PRIVATE_TURSO_DATABASE_URL is required (libsql://… or https://….turso.io). " +
                "Production and dev should use remote Turso.",
        );
    }
    const allowLocal = process.env.ALLOW_LOCAL_TURSO_FILE === "1";
    if (raw.startsWith("file:") && !allowLocal) {
        throw new Error(
            "Local file: Turso URLs are disabled. Set PRIVATE_TURSO_DATABASE_URL to a remote URL, " +
                "or set ALLOW_LOCAL_TURSO_FILE=1 only for intentional local SQLite.",
        );
    }
    return raw;
}

export function getTurso(url?: string, authToken?: string) {
    if (_db && !url) return _db;
    if (_db && url && _lastUrl === url) return _db;

    const dbUrl = resolveTursoUrl(url);
    const token = authToken || process.env.PRIVATE_TURSO_AUTH_TOKEN;

    _client = createClient({
        url: dbUrl,
        authToken: token,
    });
    _lastUrl = dbUrl;

    void runCachedMarketTokenMigrations(_client);
    void runUsersSubscriberMigration(_client);
    void runSyncRunsDurationMsMigration(_client);
    void runSyncRunsUsagePayloadMigration(_client);
    void runProPaymentReceiptsMigration(_client);
    void runUserPriceAlertsMigration(_client);
    void runUserWatchlistItemsMigration(_client);

    _db = drizzle(_client, { schema });
    return _db;
}

function getLazyDb(): LibSQLDatabase<typeof schema> {
    if (!_db) return getTurso();
    return _db;
}

/** Drizzle DB — lazy; safe to import from route files (no connect until first use on server). */
export const db: LibSQLDatabase<typeof schema> = new Proxy({} as LibSQLDatabase<typeof schema>, {
    get(_target, prop, receiver) {
        const real = getLazyDb();
        const value = Reflect.get(real, prop, receiver);
        if (typeof value === "function") {
            return value.bind(real);
        }
        return value;
    },
});
