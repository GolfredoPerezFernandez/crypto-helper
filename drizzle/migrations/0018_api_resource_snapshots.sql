CREATE TABLE IF NOT EXISTS `api_resource_snapshots` (
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`payload` text NOT NULL,
	`updatedAt` integer NOT NULL,
	`firstSeenAt` integer NOT NULL,
	PRIMARY KEY (`kind`, `key`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `api_resource_snapshots_kind_updated`
	ON `api_resource_snapshots` (`kind`, `updatedAt`);
