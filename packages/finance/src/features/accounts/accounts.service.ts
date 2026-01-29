import { AccountTypeEnum, type FinanceTransactionOutput } from '@hominem/db/schema';
import { logger } from '@hominem/utils/logger';
import { z } from 'zod';

import type {
  AccountWithPlaidInfo,
  BalanceSummary,
  CreateAccountInput,
  FinanceAccountOutput,
  InstitutionConnection,
  PlaidConnection,
} from './accounts.domain';

import { InstitutionService } from '../../core/institution.service';
import { AccountsRepository } from './accounts.repository';

/**
 * Service for Accounts
 * Orchestrates business logic and repository calls.
 */
export async function createAccount(input: CreateAccountInput): Promise<FinanceAccountOutput> {
  return AccountsRepository.create(input);
}

export async function createManyAccounts(
  inputs: CreateAccountInput[],
): Promise<FinanceAccountOutput[]> {
  return AccountsRepository.createMany(inputs);
}

export async function listAccounts(userId: string): Promise<FinanceAccountOutput[]> {
  return AccountsRepository.list(userId);
}

export async function getAccountById(
  id: string,
  userId: string,
): Promise<FinanceAccountOutput | null> {
  return AccountsRepository.getById(id, userId);
}

export async function findAccountByNameForUser(
  userId: string,
  name: string,
): Promise<FinanceAccountOutput | null> {
  return AccountsRepository.findByNameForUser(userId, name);
}

export async function updateAccount(
  id: string,
  userId: string,
  updates: Partial<CreateAccountInput>,
): Promise<FinanceAccountOutput> {
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
): Promise<Map<string, FinanceAccountOutput>> {
  const existingAccounts = await AccountsRepository.list(userId);
  const accountsMap = new Map(existingAccounts.map((acc) => [acc.name, acc]));

  const missingNames = accountNames.filter((name) => !accountsMap.has(name));

  if (missingNames.length > 0) {
    logger.info(
      `[AccountsService.getAndCreateAccountsInBulk]: Creating ${missingNames.length} missing accounts`,
    );

    const newAccounts = await AccountsRepository.createMany(
      missingNames.map(
        (name) =>
          ({
            name,
            type: 'checking' as const, // Default type
            balance: '0',
            isoCurrencyCode: 'USD',
            userId,
            meta: null,
          }) as CreateAccountInput,
      ),
    );

    for (const newAccount of newAccounts) {
      accountsMap.set(newAccount.name, newAccount);
    }
  }

  return accountsMap;
}

export async function getBalanceSummary(userId: string): Promise<BalanceSummary> {
  return AccountsRepository.getBalanceSummary(userId);
}

export async function listAccountsWithRecentTransactions(
  userId: string,
  limit = 5,
): Promise<Array<FinanceAccountOutput & { transactions: FinanceTransactionOutput[] }>> {
  return AccountsRepository.listWithRecentTransactions(userId, limit);
}

export async function getAccountWithPlaidInfo(
  accountId: string,
  userId: string,
): Promise<AccountWithPlaidInfo | null> {
  return AccountsRepository.getWithPlaidInfo(accountId, userId);
}

export async function listAccountsWithPlaidInfo(userId: string): Promise<AccountWithPlaidInfo[]> {
  return AccountsRepository.listWithPlaidInfo(userId);
}

export async function listPlaidConnectionsForUser(userId: string): Promise<PlaidConnection[]> {
  return AccountsRepository.listPlaidConnections(userId);
}

export async function listInstitutionConnections(userId: string): Promise<InstitutionConnection[]> {
  return AccountsRepository.listInstitutionConnections(userId);
}

export async function getAccountsForInstitution(
  userId: string,
  institutionId: string,
): Promise<AccountWithPlaidInfo[]> {
  return AccountsRepository.getAccountsForInstitution(userId, institutionId);
}

/**
 * Validates that an account name is unique for the user
 * @param userId User ID
 * @param name Account name to validate
 * @param excludeId Optional account ID to exclude from check (for updates)
 * @throws Error if account name is not unique
 */
export async function validateAccountNameUnique(
  userId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const existing = await findAccountByNameForUser(userId, name);

  if (existing && (!excludeId || existing.id !== excludeId)) {
    throw new Error('Account with this name already exists');
  }
}

/**
 * Validates that an account exists and belongs to the user
 * @param accountId Account ID
 * @param userId User ID
 * @throws Error if account does not exist
 * @returns The account if it exists
 */
export async function validateAccountExists(
  accountId: string,
  userId: string,
): Promise<FinanceAccountOutput> {
  const account = await getAccountById(accountId, userId);

  if (!account) {
    throw new Error('Account not found');
  }

  return account;
}

/**
 * Links an account to an institution and optionally a Plaid item
 * Validates that the account, institution, and plaid item (if provided) all exist and belong to user
 * @param accountId Account ID to link
 * @param userId User ID
 * @param institutionId Institution ID to link to
 * @param plaidItemId Optional Plaid item ID to link
 * @returns Updated account
 */
export async function linkAccountToInstitution(
  accountId: string,
  userId: string,
  institutionId: string,
  plaidItemId?: string,
): Promise<FinanceAccountOutput> {
  // Validate account exists and belongs to user
  await validateAccountExists(accountId, userId);

  // Validate institution exists
  const institution = await InstitutionService.getInstitutionById(institutionId);
  if (!institution) {
    throw new Error('Institution not found');
  }

  // Validate Plaid item if provided
  if (plaidItemId) {
    const plaidItem = await InstitutionService.getUserPlaidItemForInstitution(
      plaidItemId,
      institutionId,
      userId,
    );

    if (!plaidItem) {
      throw new Error('Plaid item not found or does not belong to specified institution');
    }
  }

  // Update account with institution link
  return updateAccount(accountId, userId, {
    institutionId,
    plaidItemId: plaidItemId || null,
  });
}

/**
 * Unlinks an account from an institution and any associated Plaid item
 * @param accountId Account ID to unlink
 * @param userId User ID
 * @returns Updated account
 */
export async function unlinkAccountFromInstitution(
  accountId: string,
  userId: string,
): Promise<FinanceAccountOutput> {
  // Validate account exists and belongs to user
  await validateAccountExists(accountId, userId);

  // Update account to remove institution link
  return updateAccount(accountId, userId, {
    institutionId: null,
    plaidItemId: null,
  });
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
  listInstitutionConnections,
  getAccountsForInstitution,
  validateAccountNameUnique,
  validateAccountExists,
  linkAccountToInstitution,
  unlinkAccountFromInstitution,
};
