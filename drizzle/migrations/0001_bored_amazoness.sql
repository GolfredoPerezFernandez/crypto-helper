CREATE TABLE `demo_listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nftId` integer NOT NULL,
	`sellerId` text NOT NULL,
	`price` numeric DEFAULT 0,
	`listingType` text DEFAULT 'sale',
	`isActive` integer DEFAULT 1,
	`expiresAt` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `demo_nfts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '',
	`imageUrl` text DEFAULT '',
	`metadataUrl` text DEFAULT '',
	`ownerId` text NOT NULL,
	`price` numeric DEFAULT 0,
	`isListed` integer DEFAULT 0,
	`listingType` text DEFAULT 'sale',
	`createdAt` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `demo_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`nftId` integer DEFAULT 0,
	`fromWallet` text DEFAULT '',
	`toWallet` text DEFAULT '',
	`amount` numeric DEFAULT 0,
	`signature` text DEFAULT '',
	`createdAt` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `demo_wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`balance` numeric DEFAULT 0,
	`tokenBalance` numeric DEFAULT 0,
	`nonce` integer DEFAULT 0,
	`createdAt` integer DEFAULT 0
);
