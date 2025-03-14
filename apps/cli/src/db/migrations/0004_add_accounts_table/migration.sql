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

-- Add new accountId column to transaction_accounts
ALTER TABLE `transaction_accounts` ADD COLUMN `account_id` integer REFERENCES `accounts`(`id`);

-- Create a migration function to populate the accounts table
-- This function will:
-- 1. Identify all unique account names and mask combinations
-- 2. Insert them into the accounts table
-- 3. Update the transaction_accounts table with the appropriate account_id values

-- Step 1: Extract unique account combinations
INSERT INTO `accounts` (`name`, `mask`, `created_at`, `updated_at`)
SELECT DISTINCT
  `account_name` as name,
  `account_mask` as mask,
  datetime('now') as created_at,
  datetime('now') as updated_at
FROM `transaction_accounts`;

-- Step 2: Update transaction_accounts with account_id references
UPDATE `transaction_accounts`
SET `account_id` = (
  SELECT `id` FROM `accounts`
  WHERE `accounts`.`name` = `transaction_accounts`.`account_name`
  AND (
    (`accounts`.`mask` IS NULL AND `transaction_accounts`.`account_mask` IS NULL)
    OR `accounts`.`mask` = `transaction_accounts`.`account_mask`
  )
);

-- Step 3: Make account_id NOT NULL after populating it
PRAGMA foreign_keys=off;

-- Create a temporary table with the new schema
CREATE TABLE `transaction_accounts_new` (
  `transaction_id` integer NOT NULL REFERENCES `transactions`(`id`),
  `account_id` integer NOT NULL REFERENCES `accounts`(`id`),
  `account_name` text NOT NULL,
  `account_mask` text,
  UNIQUE(`transaction_id`, `account_id`)
);

-- Copy data from old table to new table
INSERT INTO `transaction_accounts_new`
SELECT 
  `transaction_id`,
  `account_id`,
  `account_name`,
  `account_mask`
FROM `transaction_accounts`
WHERE `account_id` IS NOT NULL;

-- Drop old table and rename new table
DROP TABLE `transaction_accounts`;
ALTER TABLE `transaction_accounts_new` RENAME TO `transaction_accounts`;

-- Re-enable foreign keys
PRAGMA foreign_keys=on;