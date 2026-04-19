CREATE TABLE `pro_payment_receipts` (
	`tx_hash` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` integer NOT NULL
);
