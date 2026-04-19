CREATE TABLE `api_global_snapshots` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `api_wallet_snapshots` (
	`address` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updatedAt` integer NOT NULL
);
