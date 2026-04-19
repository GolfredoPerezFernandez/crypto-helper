CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` integer NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_user_endpoint` ON `push_subscriptions` (`userId`,`endpoint`);--> statement-breakpoint
ALTER TABLE `users` ADD `pushWhaleAlerts` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `users` ADD `pushTraderAlerts` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `users` ADD `pushSmartAlerts` integer DEFAULT 1;