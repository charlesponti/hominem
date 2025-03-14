CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`mask` text,
	`type` text,
	`institution` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_name_mask_unique` ON `accounts` (`name`,`mask`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transaction_accounts` (
	`transaction_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`account_name` text NOT NULL,
	`account_mask` text,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_transaction_accounts`("transaction_id", "account_id", "account_name", "account_mask") SELECT "transaction_id", "account_id", "account_name", "account_mask" FROM `transaction_accounts`;--> statement-breakpoint
DROP TABLE `transaction_accounts`;--> statement-breakpoint
ALTER TABLE `__new_transaction_accounts` RENAME TO `transaction_accounts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_accounts_transaction_id_account_id_unique` ON `transaction_accounts` (`transaction_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `__new_transaction_names` (
	`transaction_id` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_transaction_names`("transaction_id", "name") SELECT "transaction_id", "name" FROM `transaction_names`;--> statement-breakpoint
DROP TABLE `transaction_names`;--> statement-breakpoint
ALTER TABLE `__new_transaction_names` RENAME TO `transaction_names`;--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_names_transaction_id_name_unique` ON `transaction_names` (`transaction_id`,`name`);--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`status` text NOT NULL,
	`category` text NOT NULL,
	`parent_category` text NOT NULL,
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
ALTER TABLE `__new_transactions` RENAME TO `transactions`;