import { AccountTypeEnum } from '@hominem/db/schema';
import { logger } from '@hominem/utils/logger';
import { z } from 'zod';

import type { CreateAccountInput, FinanceAccount } from './accounts.domain';

import { AccountsRepository } from './accounts.repository';

/**
 * Service for Accounts
 * Orchestrates business logic and repository calls.
 */
export const AccountsService = {
  async createAccount(input: CreateAccountInput): Promise<FinanceAccount> {
    return AccountsRepository.create(input);
  },

  async createManyAccounts(inputs: CreateAccountInput[]): Promise<FinanceAccount[]> {
    return AccountsRepository.createMany(inputs);
  },

  async listAccounts(userId: string): Promise<FinanceAccount[]> {
    return AccountsRepository.list(userId);
  },

  async getAccountById(id: string, userId: string): Promise<FinanceAccount | null> {
    return AccountsRepository.getById(id, userId);
  },

  async updateAccount(
    id: string,
    userId: string,
    updates: Partial<CreateAccountInput>,
  ): Promise<FinanceAccount> {
    logger.debug(`[AccountsService.updateAccount]: Updating account ${id}`);
    return AccountsRepository.update(id, userId, updates);
  },

  async deleteAccount(id: string, userId: string): Promise<void> {
    logger.debug(`[AccountsService.deleteAccount]: Deleting account ${id}`);
    return AccountsRepository.delete(id, userId);
  },

  /**
   * Complex logic: finds existing accounts by name and creates missing ones
   */
  async getAndCreateAccountsInBulk(
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
  },

  async getBalanceSummary(userId: string) {
    return AccountsRepository.getBalanceSummary(userId);
  },

  async listAccountsWithRecentTransactions(userId: string, limit = 5) {
    return AccountsRepository.listWithRecentTransactions(userId, limit);
  },

  async getAccountWithPlaidInfo(accountId: string, userId: string) {
    return AccountsRepository.getWithPlaidInfo(accountId, userId);
  },

  async listAccountsWithPlaidInfo(userId: string) {
    return AccountsRepository.listWithPlaidInfo(userId);
  },
};
