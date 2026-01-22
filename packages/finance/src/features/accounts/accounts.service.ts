import { AccountTypeEnum } from '@hominem/db/schema';
import { logger } from '@hominem/utils/logger';
import { z } from 'zod';

import type { CreateAccountInput, FinanceAccount } from './accounts.domain';

import { AccountsRepository } from './accounts.repository';

/**
 * Service for Accounts
 * Orchestrates business logic and repository calls.
 */
export async function createAccount(input: CreateAccountInput): Promise<FinanceAccount> {
  return AccountsRepository.create(input);
}

export async function createManyAccounts(inputs: CreateAccountInput[]): Promise<FinanceAccount[]> {
  return AccountsRepository.createMany(inputs);
}

export async function listAccounts(userId: string): Promise<FinanceAccount[]> {
  return AccountsRepository.list(userId);
}

export async function getAccountById(id: string, userId: string): Promise<FinanceAccount | null> {
  return AccountsRepository.getById(id, userId);
}

export async function findAccountByNameForUser(
  userId: string,
  name: string,
): Promise<FinanceAccount | null> {
  return AccountsRepository.findByNameForUser(userId, name);
}

export async function updateAccount(
  id: string,
  userId: string,
  updates: Partial<CreateAccountInput>,
): Promise<FinanceAccount> {
  logger.debug(`[AccountsService.updateAccount]: Updating account ${id}`);
  return AccountsRepository.update(id, userId, updates);
}

export async function deleteAccount(id: string, userId: string): Promise<void> {
  logger.debug(`[AccountsService.deleteAccount]: Deleting account ${id}`);
  return AccountsRepository.delete(id, userId);
}

/**
 * Complex logic: finds existing accounts by name and creates missing ones
 */
export async function getAndCreateAccountsInBulk(
  accountNames: string[],
  userId: string,
): Promise<Map<string, FinanceAccount>> {
  const existingAccounts = await AccountsRepository.list(userId);
  const accountsMap = new Map(existingAccounts.map((acc) => [acc.name, acc]));

  const missingNames = accountNames.filter((name) => !accountsMap.has(name));

  if (missingNames.length > 0) {
    logger.info(
      `[AccountsService.getAndCreateAccountsInBulk]: Creating ${missingNames.length} missing accounts`,
    );

    const newAccounts = await AccountsRepository.createMany(
      missingNames.map((name) => ({
        name,
        type: 'checking' as z.infer<typeof AccountTypeEnum>, // Default type
        balance: '0',
        isoCurrencyCode: 'USD',
        userId,
      })),
    );

    for (const newAccount of newAccounts) {
      accountsMap.set(newAccount.name, newAccount);
    }
  }

  return accountsMap;
}

export async function getBalanceSummary(userId: string) {
  return AccountsRepository.getBalanceSummary(userId);
}

export async function listAccountsWithRecentTransactions(userId: string, limit = 5) {
  return AccountsRepository.listWithRecentTransactions(userId, limit);
}

export async function getAccountWithPlaidInfo(accountId: string, userId: string) {
  return AccountsRepository.getWithPlaidInfo(accountId, userId);
}

export async function listAccountsWithPlaidInfo(userId: string) {
  return AccountsRepository.listWithPlaidInfo(userId);
}

export async function listPlaidConnectionsForUser(userId: string) {
  return AccountsRepository.listPlaidConnections(userId);
}

/**
 * Service for Accounts
 * Orchestrates business logic and repository calls.
 */
export const AccountsService = {
  createAccount,
  createManyAccounts,
  listAccounts,
  getAccountById,
  findAccountByNameForUser,
  updateAccount,
  deleteAccount,
  getAndCreateAccountsInBulk,
  getBalanceSummary,
  listAccountsWithRecentTransactions,
  getAccountWithPlaidInfo,
  listAccountsWithPlaidInfo,
  listPlaidConnectionsForUser,
};
