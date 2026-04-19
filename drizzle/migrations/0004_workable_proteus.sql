ALTER TABLE `users` ADD `password` text;--> statement-breakpoint
ALTER TABLE `users` ADD `walletAddress` text;--> statement-breakpoint
ALTER TABLE `users` ADD `encryptedPrivateKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `iv` text;--> statement-breakpoint
ALTER TABLE `users` ADD `type` text DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE `users` ADD `createdAt` integer DEFAULT (strftime('%s', 'now'));--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_walletAddress_unique` ON `users` (`walletAddress`);