CREATE TABLE IF NOT EXISTS "users" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT DEFAULT 'not_provided',
  "email" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "demo_wallets" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "balance" NUMERIC DEFAULT 0,
  "tokenBalance" NUMERIC DEFAULT 0,
  "nonce" INTEGER DEFAULT 0,
  "createdAt" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "demo_nfts" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "title" TEXT NOT NULL,
  "description" TEXT DEFAULT '',
  "imageUrl" TEXT DEFAULT '',
  "metadataUrl" TEXT DEFAULT '',
  "ownerId" TEXT NOT NULL,
  "price" NUMERIC DEFAULT 0,
  "isListed" INTEGER DEFAULT 0,
  "listingType" TEXT DEFAULT 'sale',
  "createdAt" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "demo_listings" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "nftId" INTEGER NOT NULL,
  "sellerId" TEXT NOT NULL,
  "price" NUMERIC DEFAULT 0,
  "listingType" TEXT DEFAULT 'sale',
  "isActive" INTEGER DEFAULT 1,
  "expiresAt" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "demo_transactions" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "action" TEXT NOT NULL,
  "nftId" INTEGER DEFAULT 0,
  "fromWallet" TEXT DEFAULT '',
  "toWallet" TEXT DEFAULT '',
  "amount" NUMERIC DEFAULT 0,
  "signature" TEXT DEFAULT '',
  "createdAt" INTEGER DEFAULT 0
);
