CREATE TABLE `cmc_sync_lease` (
	`id` integer PRIMARY KEY NOT NULL,
	`leaseUntil` integer DEFAULT 0 NOT NULL
);
