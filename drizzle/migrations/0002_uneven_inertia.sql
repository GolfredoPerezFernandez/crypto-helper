PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_demo_listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nftId` text NOT NULL,
	`sellerId` text NOT NULL,
	`price` numeric DEFAULT 0,
	`listingType` text DEFAULT 'sale',
	`isActive` integer DEFAULT 1,
	`expiresAt` integer DEFAULT 0
);
--> statement-breakpoint
INSERT INTO `__new_demo_listings`("id", "nftId", "sellerId", "price", "listingType", "isActive", "expiresAt") SELECT "id", "nftId", "sellerId", "price", "listingType", "isActive", "expiresAt" FROM `demo_listings`;--> statement-breakpoint
DROP TABLE `demo_listings`;--> statement-breakpoint
ALTER TABLE `__new_demo_listings` RENAME TO `demo_listings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_demo_nfts` (
	`id` text PRIMARY KEY NOT NULL,
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
INSERT INTO `__new_demo_nfts`("id", "title", "description", "imageUrl", "metadataUrl", "ownerId", "price", "isListed", "listingType", "createdAt") SELECT "id", "title", "description", "imageUrl", "metadataUrl", "ownerId", "price", "isListed", "listingType", "createdAt" FROM `demo_nfts`;--> statement-breakpoint
DROP TABLE `demo_nfts`;--> statement-breakpoint
ALTER TABLE `__new_demo_nfts` RENAME TO `demo_nfts`;--> statement-breakpoint
CREATE TABLE `__new_demo_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`nftId` text DEFAULT '',
	`fromWallet` text DEFAULT '',
	`toWallet` text DEFAULT '',
	`amount` numeric DEFAULT 0,
	`signature` text DEFAULT '',
	`createdAt` integer DEFAULT 0
);
--> statement-breakpoint
INSERT INTO `__new_demo_transactions`("id", "action", "nftId", "fromWallet", "toWallet", "amount", "signature", "createdAt") SELECT "id", "action", "nftId", "fromWallet", "toWallet", "amount", "signature", "createdAt" FROM `demo_transactions`;--> statement-breakpoint
DROP TABLE `demo_transactions`;--> statement-breakpoint
ALTER TABLE `__new_demo_transactions` RENAME TO `demo_transactions`;