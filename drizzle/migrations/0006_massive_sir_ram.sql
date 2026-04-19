CREATE TABLE `analyzed_addresses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`freshSignalId` integer NOT NULL,
	`address` text NOT NULL,
	`balance` text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `cached_market_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`address` text NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL,
	`decimals` text DEFAULT '18',
	`logo` text DEFAULT '',
	`totalSupply` text DEFAULT '0',
	`percentChange1h` text DEFAULT '0',
	`percentChange7d` text DEFAULT '0',
	`percentChange30d` text DEFAULT '0',
	`fullyDilutedValuation` text DEFAULT '0',
	`price` text DEFAULT '0',
	`volume` text DEFAULT '0',
	`network` text DEFAULT 'Unknown',
	`slug` text DEFAULT '',
	`cmcId` integer,
	`updatedAt` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cached_market_tokens_cat_addr` ON `cached_market_tokens` (`category`,`address`);--> statement-breakpoint
CREATE TABLE `fresh_signals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`balance` text DEFAULT '',
	`balanceInUsd` text DEFAULT '',
	`totalBalanceInEth` text DEFAULT '',
	`summaryMessage` text NOT NULL,
	`totalHttpRequests` integer DEFAULT 0,
	`createdAt` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `signal_traders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`address` text NOT NULL,
	`alert` text NOT NULL,
	`chain` text NOT NULL,
	`swapped` text NOT NULL,
	`fromTokenSymbol` text DEFAULT '',
	`fromTokenValue` text DEFAULT '',
	`toTokenValue` text DEFAULT '',
	`fromTokenName` text DEFAULT '',
	`from_addr` text DEFAULT '',
	`to_addr` text DEFAULT '',
	`toTokenDecimals` text DEFAULT '',
	`fromTokenDecimals` text DEFAULT '',
	`fromTokenLogo` text DEFAULT '',
	`toTokenSlug` text DEFAULT '',
	`fromTokenSlug` text DEFAULT '',
	`toTokenLogo` text DEFAULT '',
	`toTokenSymbol` text DEFAULT '',
	`toTokenName` text DEFAULT '',
	`transactionHash` text NOT NULL,
	`netWorthUsd` text DEFAULT '',
	`time` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `signal_whales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`address` text NOT NULL,
	`alert` text NOT NULL,
	`chain` text NOT NULL,
	`swapped` text NOT NULL,
	`fromTokenSymbol` text DEFAULT '',
	`fromTokenValue` text DEFAULT '',
	`toTokenValue` text DEFAULT '',
	`fromTokenName` text DEFAULT '',
	`from_addr` text DEFAULT '',
	`to_addr` text DEFAULT '',
	`toTokenDecimals` text DEFAULT '',
	`fromTokenDecimals` text DEFAULT '',
	`fromTokenLogo` text DEFAULT '',
	`toTokenSlug` text DEFAULT '',
	`fromTokenSlug` text DEFAULT '',
	`toTokenLogo` text DEFAULT '',
	`toTokenSymbol` text DEFAULT '',
	`toTokenName` text DEFAULT '',
	`transactionHash` text NOT NULL,
	`netWorthUsd` text DEFAULT '',
	`time` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`startedAt` integer NOT NULL,
	`finishedAt` integer,
	`status` text NOT NULL,
	`source` text DEFAULT 'daily-market-sync',
	`errorMessage` text
);
--> statement-breakpoint
ALTER TABLE `users` ADD `authProvider` text DEFAULT 'email';