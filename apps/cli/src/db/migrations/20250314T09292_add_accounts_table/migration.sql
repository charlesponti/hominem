-- Migration: add_accounts_table
-- Created at: 2025-03-14T09:29:20.525Z

-- Create accounts table
CREATE TABLE `accounts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `mask` text,
  `type` text,
  `institution` text,
  `is_active` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL,
  UNIQUE(`name`, `mask`)
);

-- Add account_id column to transaction_accounts
ALTER TABLE `transaction_accounts` ADD COLUMN `account_id` integer REFERENCES `accounts`(`id`);

-- Populate accounts table from existing transaction_accounts
INSERT INTO `accounts` (`name`, `mask`, `created_at`, `updated_at`)
SELECT DISTINCT
  `account_name` as name,
  `account_mask` as mask,
  datetime('now') as created_at,
  datetime('now') as updated_at
FROM `transaction_accounts`;

-- Update transaction_accounts with account_id references
UPDATE `transaction_accounts`
SET `account_id` = (
  SELECT `id` FROM `accounts`
  WHERE `accounts`.`name` = `transaction_accounts`.`account_name`
  AND (
    (`accounts`.`mask` IS NULL AND `transaction_accounts`.`account_mask` IS NULL)
    OR `accounts`.`mask` = `transaction_accounts`.`account_mask`
  )
);

-- Create index on account_id
CREATE INDEX IF NOT EXISTS `idx_transaction_accounts_account_id` ON `transaction_accounts` (`account_id`);
