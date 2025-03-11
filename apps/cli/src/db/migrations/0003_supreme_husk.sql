CREATE TABLE `markdown_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_path` text NOT NULL,
	`processing_date` integer NOT NULL,
	`text` text NOT NULL,
	`section` text NOT NULL,
	`is_task` integer,
	`is_complete` integer,
	`text_analysis` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`address` text NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_date_name_amount_type_account_unique` ON `transactions` (`date`,`name`,`amount`,`type`,`account`);