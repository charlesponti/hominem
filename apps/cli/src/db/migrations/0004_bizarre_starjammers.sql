CREATE TABLE `transaction_accounts` (
	`transaction_id` text NOT NULL,
	`account_name` text NOT NULL,
	`account_mask` text,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_accounts_transaction_id_account_name_unique` ON `transaction_accounts` (`transaction_id`,`account_name`);--> statement-breakpoint
CREATE TABLE `transaction_names` (
	`transaction_id` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_names_transaction_id_name_unique` ON `transaction_names` (`transaction_id`,`name`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`status` text NOT NULL,
	`category` text,
	`parent_category` text,
	`excluded` integer DEFAULT false NOT NULL,
	`tags` text,
	`type` text NOT NULL,
	`account` text NOT NULL,
	`account_mask` text,
	`note` text,
	`recurring` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_transactions`("id", "date", "name", "amount", "status", "category", "parent_category", "excluded", "tags", "type", "account", "account_mask", "note", "recurring", "created_at", "updated_at") SELECT "id", "date", "name", "amount", "status", "category", "parent_category", "excluded", "tags", "type", "account", "account_mask", "note", "recurring", "created_at", "updated_at" FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;