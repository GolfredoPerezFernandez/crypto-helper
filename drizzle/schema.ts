import { sqliteTable as table, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import * as t from "drizzle-orm/sqlite-core";

export const users = table("users", {
  id: t.int({ mode: "number" }).primaryKey({ autoIncrement: true }),
  name: t.text().default("not_provided"),
  email: t.text().notNull().unique(),
  password: t.text(), // Hashed password (null for wallet-only / MetaMask accounts)
  walletAddress: t.text().unique(), // Managed wallet (created on email register) or primary login wallet
  encryptedPrivateKey: t.text(), // Encrypted private key (managed accounts only)
  iv: t.text(), // IV for decryption
  type: t.text().default("normal"), // 'admin', 'coordinator', 'normal'
  /** 1 = paid subscriber (DB insight, live SSE signals, smart alerts). Admins always have access. */
  subscriber: t.integer({ mode: "number" }).default(0),
  /** 'email' = registered with password + managed wallet; 'metamask' = signed in with external wallet */
  authProvider: t.text().default("email"),
  createdAt: t.integer({ mode: "number" }).default(sql`(strftime('%s', 'now'))`),
  /** PWA live-signal push (1 = on). Requires push subscription + VAPID. */
  pushWhaleAlerts: t.integer({ mode: "number" }).default(1),
  pushTraderAlerts: t.integer({ mode: "number" }).default(1),
  pushSmartAlerts: t.integer({ mode: "number" }).default(1),
  /** Pro: custom USD price threshold alerts (1 = on). */
  pushPriceAlerts: t.integer({ mode: "number" }).default(1),
});

/** Pro: notify when cached token price crosses a USD threshold (evaluated after market sync). */
export const userPriceAlerts = table(
  "user_price_alerts",
  {
    id: t.int({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: t.int({ mode: "number" }).notNull(),
    /** `cached_market_tokens.id` (same id as /dashboard/token/[id]/). */
    tokenId: t.int({ mode: "number" }).notNull(),
    /** `above` | `below` */
    direction: t.text().notNull(),
    thresholdUsd: t.text().notNull(),
    enabled: t.int({ mode: "number" }).default(1),
    lastTriggeredAt: t.int({ mode: "number" }),
    createdAt: t.int({ mode: "number" }).default(sql`(strftime('%s', 'now'))`),
  },
  (tbl) => [uniqueIndex("user_price_alerts_user_token_dir").on(tbl.userId, tbl.tokenId, tbl.direction)],
);

/** User favorites/watchlist across app entities (token, wallet, nft_contract, nft_item, tx). */
export const userWatchlistItems = table(
  "user_watchlist_items",
  {
    id: t.int({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: t.int({ mode: "number" }).notNull(),
    itemType: t.text().notNull(),
    itemKey: t.text().notNull(),
    label: t.text().default(""),
    metaJson: t.text(),
    createdAt: t.integer({ mode: "number" }).default(sql`(strftime('%s', 'now'))`),
  },
  (tbl) => [uniqueIndex("user_watchlist_items_unique").on(tbl.userId, tbl.itemType, tbl.itemKey)],
);

export const pushSubscriptions = table(
  "push_subscriptions",
  {
    id: t.text().primaryKey(),
    userId: t.integer({ mode: "number" }).notNull(),
    endpoint: t.text().notNull(),
    p256dh: t.text().notNull(),
    auth: t.text().notNull(),
    createdAt: t.integer({ mode: "number" }).default(sql`(strftime('%s', 'now'))`),
  },
  (tbl) => [uniqueIndex("push_subscriptions_user_endpoint").on(tbl.userId, tbl.endpoint)],
);

/** Cached CMC tokens by vertical (filled by daily sync) */
export const cachedMarketTokens = table(
  "cached_market_tokens",
  {
    id: t.int({ mode: "number" }).primaryKey({ autoIncrement: true }),
    category: t.text().notNull(), // memes | ai-big-data | gaming | mineable
    address: t.text().notNull(),
    name: t.text().notNull(),
    symbol: t.text().notNull(),
    decimals: t.text().default("18"),
    logo: t.text().default(""),
    totalSupply: t.text().default("0"),
    percentChange1h: t.text().default("0"),
    /** CMC quote USD percent_change_24h (bubble “Day” timeframe). */
    percentChange24h: t.text().default("0"),
    percentChange7d: t.text().default("0"),
    percentChange30d: t.text().default("0"),
    /** CMC percent_change_90d when available; else sync falls back to 30d (bubble “Year” view). */
    percentChange90d: t.text().default("0"),
    fullyDilutedValuation: t.text().default("0"),
    price: t.text().default("0"),
    volume: t.text().default("0"),
    network: t.text().default("Unknown"),
    slug: t.text().default(""),
    cmcId: t.int({ mode: "number" }),
    updatedAt: t.integer({ mode: "number" }).default(sql`(strftime('%s', 'now'))`),
    /** Daily sync: JSON with CMC quote/info + Moralis ERC20 payloads (token page reads only DB). */
    apiSnapshot: t.text(),
  },
  (tbl) => [
    uniqueIndex("cached_market_tokens_cat_addr").on(tbl.category, tbl.address),
    uniqueIndex("cached_market_tokens_cat_updated").on(tbl.category, tbl.updatedAt),
  ],
);

export const signalWhales = table("signal_whales", {
  id: t.int({ mode: "number" }).primaryKey({ autoIncrement: true }),
  address: t.text().notNull(),
  alert: t.text().notNull(),
  chain: t.text().notNull(),
  swapped: t.text().notNull(),
  fromTokenSymbol: t.text().default(""),
  fromTokenValue: t.text().default(""),
  toTokenValue: t.text().default(""),
  fromTokenName: t.text().default(""),
  fromAddr: t.text("from_addr").default(""), // column name from_addr (SQL)
  toAddr: t.text("to_addr").default(""),
  toTokenDecimals: t.text().default(""),
  fromTokenDecimals: t.text().default(""),
  fromTokenLogo: t.text().default(""),
  toTokenSlug: t.text().default(""),
  fromTokenSlug: t.text().default(""),
  toTokenLogo: t.text().default(""),
  toTokenSymbol: t.text().default(""),
  toTokenName: t.text().default(""),
  transactionHash: t.text().notNull(),
  netWorthUsd: t.text().default(""),
  time: t.integer({ mode: "number" }).default(sql`(strftime('%s', 'now'))`),
});

export const signalTraders = table("signal_traders", {
  id: t.int({ mode: "number" }).primaryKey({ autoIncrement: true }),
  address: t.text().notNull(),
  alert: t.text().notNull(),
  chain: t.text().notNull(),
  swapped: t.text().notNull(),
  fromTokenSymbol: t.text().default(""),
  fromTokenValue: t.text().default(""),
  toTokenValue: t.text().default(""),
  fromTokenName: t.text().default(""),
  fromAddr: t.text("from_addr").default(""),
  toAddr: t.text("to_addr").default(""),
  toTokenDecimals: t.text().default(""),
  fromTokenDecimals: t.text().default(""),
  fromTokenLogo: t.text().default(""),
  toTokenSlug: t.text().default(""),
  fromTokenSlug: t.text().default(""),
  toTokenLogo: t.text().default(""),
  toTokenSymbol: t.text().default(""),
  toTokenName: t.text().default(""),
  transactionHash: t.text().notNull(),
  netWorthUsd: t.text().default(""),
  time: t.integer({ mode: "number" }).default(sql`(strftime('%s', 'now'))`),
});

export const freshSignals = table("fresh_signals", {
  id: t.int({ mode: "number" }).primaryKey({ autoIncrement: true }),
  balance: t.text().default(""),
  balanceInUsd: t.text().default(""),
  totalBalanceInEth: t.text().default(""),
  summaryMessage: t.text().notNull(),
  totalHttpRequests: t.int({ mode: "number" }).default(0),
  createdAt: t.integer({ mode: "number" }).default(sql`(strftime('%s', 'now'))`),
});

export const analyzedAddresses = table("analyzed_addresses", {
  id: t.int({ mode: "number" }).primaryKey({ autoIncrement: true }),
  freshSignalId: t.int({ mode: "number" }).notNull(),
  address: t.text().notNull(),
  balance: t.text().default(""),
});

export const syncRuns = table("sync_runs", {
  id: t.int({ mode: "number" }).primaryKey({ autoIncrement: true }),
  startedAt: t.integer({ mode: "number" }).notNull(),
  finishedAt: t.integer({ mode: "number" }),
  /** Wall-clock duration of the run in ms (set when finished). */
  durationMs: t.int({ mode: "number" }),
  status: t.text().notNull(), // running | success | error
  source: t.text().default("daily-market-sync"),
  errorMessage: t.text(),
  /** JSON: {@link import("~/server/crypto-helper/sync-usage-context").SyncUsagePayloadV1} */
  // DB column is snake_case (see migration 0016_sync_runs_usage_payload.sql)
  usagePayload: t.text("usage_payload"),
});

/** Single-row lease (id=1) so only one instance runs CMC sync when DB is shared (e.g. remote Turso). */
export const cmcSyncLease = table("cmc_sync_lease", {
  id: t.int().primaryKey(),
  /** Milliseconds since epoch; while greater than `Date.now()`, other instances skip sync. */
  leaseUntil: t.int({ mode: "number" }).notNull().default(0),
});

export const demoWallets = table("demo_wallets", {
  id: t.text().primaryKey(),
  name: t.text().notNull(),
  balance: t.numeric().default(sql`0`),
  tokenBalance: t.numeric().default(sql`0`),
  nonce: t.int({ mode: "number" }).default(sql`0`),
  createdAt: t.integer({ mode: "number" }).default(sql`0`),
});

export const demoNfts = table("demo_nfts", {
  id: t.text().primaryKey(),
  title: t.text().notNull(),
  description: t.text().default(""),
  imageUrl: t.text().default(""),
  metadataUrl: t.text().default(""),
  ownerId: t.text().notNull(),
  price: t.numeric().default(sql`0`),
  isListed: t.integer({ mode: "number" }).default(sql`0`),
  listingType: t.text().default("sale"),
  isPublic: t.integer({ mode: "number" }).default(sql`1`), // 0=private, 1=public
  createdAt: t.integer({ mode: "number" }).default(sql`0`),
});

export const demoListings = table("demo_listings", {
  id: t.int({ mode: "number" }).primaryKey({ autoIncrement: true }),
  nftId: t.text().notNull(),
  sellerId: t.text().notNull(),
  price: t.numeric().default(sql`0`),
  listingType: t.text().default("sale"),
  isActive: t.integer({ mode: "number" }).default(sql`1`),
  expiresAt: t.integer({ mode: "number" }).default(sql`0`),
  duration: t.int({ mode: "number" }).default(0),
  payUpfront: t.integer({ mode: "number" }).default(0),
});

export const demoOffers = table("demo_offers", {
  id: t.int({ mode: "number" }).primaryKey({ autoIncrement: true }),
  nftId: t.text().notNull(),
  market: t.text().notNull(),
  offererId: t.text().notNull(),
  percentage: t.int({ mode: "number" }).notNull(),
  offerTime: t.integer({ mode: "number" }).notNull(),
  amountPaid: t.numeric().default(sql`0`),
  accepted: t.integer({ mode: "number" }).default(sql`0`),
});

export const demoTransactions = table("demo_transactions", {
  id: t.int({ mode: "number" }).primaryKey({ autoIncrement: true }),
  action: t.text().notNull(),
  nftId: t.text().default(""),
  fromWallet: t.text().default(""),
  toWallet: t.text().default(""),
  amount: t.numeric().default(sql`0`),
  signature: t.text().default(""),
  createdAt: t.integer({ mode: "number" }).default(sql`0`),
});

/** Moralis/Icarus blobs refreshed in daily sync (routes read Turso only). */
export const apiGlobalSnapshots = table("api_global_snapshots", {
  key: t.text().primaryKey(),
  payload: t.text().notNull(),
  updatedAt: t.int({ mode: "number" }).notNull(),
});

/** Per-wallet Moralis bundle from daily sync (`WalletPageSnapshot` JSON). */
export const apiWalletSnapshots = table("api_wallet_snapshots", {
  address: t.text().primaryKey(),
  payload: t.text().notNull(),
  updatedAt: t.int({ mode: "number" }).notNull(),
});

/** One row per on-chain USDT payment used to activate Pro (tx hash unique). */
export const proPaymentReceipts = table("pro_payment_receipts", {
  txHash: t.text().primaryKey(),
  userId: t.int({ mode: "number" }).notNull(),
  createdAt: t.int({ mode: "number" }).notNull(),
});

export const schema = {
  users,
  userPriceAlerts,
  userWatchlistItems,
  pushSubscriptions,
  cachedMarketTokens,
  signalWhales,
  signalTraders,
  freshSignals,
  analyzedAddresses,
  syncRuns,
  cmcSyncLease,
  demoWallets,
  demoNfts,
  demoListings,
  demoOffers,
  demoTransactions,
  apiGlobalSnapshots,
  apiWalletSnapshots,
  proPaymentReceipts,
};
