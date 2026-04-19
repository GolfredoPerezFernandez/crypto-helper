CREATE TABLE `demo_offers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nftId` text NOT NULL,
	`market` text NOT NULL,
	`offererId` text NOT NULL,
	`percentage` integer NOT NULL,
	`offerTime` integer NOT NULL,
	`amountPaid` numeric DEFAULT 0,
	`accepted` integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE `demo_listings` ADD `duration` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `demo_listings` ADD `payUpfront` integer DEFAULT 0;