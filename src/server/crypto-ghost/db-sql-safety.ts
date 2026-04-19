/**
 * Read-only SQL gate for AI-generated queries against Turso (SQLite).
 * Blocks auth tables, push credentials, heavy PII columns, and DDL/DML.
 */

const DENY_DML_DDL =
  /\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|REPLACE|TRUNCATE|VACUUM|ANALYZE|REINDEX)\b/i;
const DENY_META = /\b(PRAGMA|ATTACH|DETACH)\b/i;
const DENY_SYSTEM = /\b(sqlite_master|sqlite_temp_master|sqlite_sequence)\b/i;
/** Never expose auth rows, push credentials, or billing linkage (tx → user). */
export const DB_CHAT_RESTRICTED_TABLE_NAMES = ["users", "push_subscriptions", "pro_payment_receipts"] as const;

function denyTablesPattern(names: readonly string[]): RegExp {
  const esc = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`\\b(${esc})\\b`, "i");
}

const DENY_TABLES = denyTablesPattern(DB_CHAT_RESTRICTED_TABLE_NAMES);
/** Large JSON blobs that may embed API payloads; keep analytics on other columns. */
const DENY_COLUMNS = /\bapiSnapshot\b/i;

const LIMIT_TAIL_RE = /\blimit\s+(\d+)(\s+offset\s+\d+)?\s*$/i;

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

export class SqlSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SqlSafetyError";
  }
}

export function sanitizeSqlQuery(raw: string): string {
  let query = String(raw ?? "").trim();
  if (!query) {
    throw new SqlSafetyError("Empty query.");
  }

  const semis = [...query].filter((c) => c === ";").length;
  if (semis > 1 || (query.endsWith(";") && query.slice(0, -1).includes(";"))) {
    throw new SqlSafetyError("Multiple SQL statements are not allowed.");
  }
  query = query.replace(/;+\s*$/g, "").trim();

  const lower = query.toLowerCase();
  if (!lower.startsWith("select")) {
    throw new SqlSafetyError("Only SELECT queries are allowed.");
  }
  if (DENY_DML_DDL.test(query)) {
    throw new SqlSafetyError("DML/DDL keywords are not permitted.");
  }
  if (DENY_META.test(query)) {
    throw new SqlSafetyError("PRAGMA/ATTACH are not permitted.");
  }
  if (DENY_SYSTEM.test(query)) {
    throw new SqlSafetyError("SQLite system tables are not accessible.");
  }
  if (DENY_TABLES.test(query)) {
    throw new SqlSafetyError(
      "This query references a restricted table (users, push_subscriptions, or pro_payment_receipts).",
    );
  }
  if (DENY_COLUMNS.test(query)) {
    throw new SqlSafetyError("Column apiSnapshot is restricted (may contain sensitive API payloads).");
  }

  if (/\blimit\s+\d+\s*,\s*\d+/i.test(query)) {
    throw new SqlSafetyError("Use LIMIT n OFFSET m instead of LIMIT offset,count.");
  }

  const lim = query.match(LIMIT_TAIL_RE);
  if (lim) {
    const n = Math.min(Math.max(1, parseInt(lim[1], 10)), MAX_LIMIT);
    const rest = lim[2] ? lim[2].trimEnd() : "";
    query = query.replace(LIMIT_TAIL_RE, `LIMIT ${n}${rest ? ` ${rest}` : ""}`);
  } else {
    query = `${query} LIMIT ${DEFAULT_LIMIT}`;
  }

  return query;
}

/** Schema text injected into the system prompt (no secrets; documents safe columns only). */
export const DB_CHAT_SCHEMA_DOCS = `
Database: SQLite (Turso / libSQL). Use ONLY SELECT. One statement. Prefer explicit column lists (avoid SELECT *).

### App context (Crypto Helper)
- Stack: Qwik + Qwik City; this DB backs dashboard lists, signals, and API snapshot caches (no live Moralis calls from this chat).
- Routes use a locale prefix, e.g. \`/{locale}/dashboard/...\` (en, es).
- Token boards by vertical (CMC sync → cached_market_tokens): volume → \`/volume-coins\`, trending → \`/trending-coins\`, most-visited → \`/most-visit-coins\`, memes → \`/meme-coins\`, AI → \`/ai-coins\`, gaming → \`/gaming-coins\`, mineable → \`/mineable-coins\`, early listings → \`/earlybird-coins\`.
- Live swap-style feeds: whale rows in signal_whales, trader rows in signal_traders; “smart money” rollups use fresh_signals + analyzed_addresses.
- Global JSON cache: api_global_snapshots (key/value). Per-EVM-wallet Moralis bundles: api_wallet_snapshots (address = lowercased 0x…).
- Pipeline health: sync_runs (startedAt, finishedAt, durationMs, status, source, errorMessage). CMC single-writer lease: cmc_sync_lease.

--- cached_market_tokens ---
id, category, address, name, symbol, decimals, logo, totalSupply, percentChange1h, percentChange24h, percentChange7d, percentChange30d, percentChange90d,
fullyDilutedValuation, price, volume, network, slug, cmcId, updatedAt
(Do NOT use column apiSnapshot — blocked.)
category examples: memes, ai-big-data, gaming, mineable, volume, trending, most-visited, earlybird (and other sync labels present in DB).

--- signal_whales, signal_traders ---
id, address, alert, chain, swapped, fromTokenSymbol, fromTokenValue, toTokenValue, fromTokenName, from_addr, to_addr,
toTokenDecimals, fromTokenDecimals, fromTokenLogo, toTokenSlug, fromTokenSlug, toTokenLogo, toTokenSymbol, toTokenName,
transactionHash, netWorthUsd, time

--- fresh_signals ---
id, balance, balanceInUsd, totalBalanceInEth, summaryMessage, totalHttpRequests, createdAt

--- analyzed_addresses ---
id, freshSignalId, address, balance

--- sync_runs ---
id, startedAt, finishedAt, durationMs, status, source, errorMessage

--- cmc_sync_lease ---
id, leaseUntil

--- api_global_snapshots ---
key, payload (JSON string, can be large), updatedAt

--- api_wallet_snapshots ---
address, payload (JSON string, can be large), updatedAt

--- demo_wallets, demo_nfts, demo_listings, demo_offers, demo_transactions ---
(demo / playground data)

RESTRICTED (never reference in SQL): users, push_subscriptions, pro_payment_receipts, sqlite_* system tables, PRAGMA; column apiSnapshot on cached_market_tokens.
`.trim();
