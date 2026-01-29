import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

import { db } from '../index';
import { financeAccounts, financialInstitutions, plaidItems, transactions } from '../schema/finance.schema';
import { users } from '../schema/users.schema';
import { createTestUser } from './fixtures';

export async function seedFinanceTestData({
  userId,
  accountId,
  institutionId,
  plaid = false,
}: {
  userId: string;
  accountId: string;
  institutionId: string;
  plaid?: boolean;
}) {
  // Use a more robust approach for parallel test execution
  // First, try to clean up any existing data to avoid conflicts
  try {
    await cleanupFinanceTestData({ userId, accountId, institutionId });
  } catch (_error) {
    // Ignore cleanup errors - data might not exist
  }

  // Create test user - ensure this succeeds before proceeding
  try {
    await createTestUser({
      id: userId,
      email: `test-${userId.slice(0, 8)}@example.com`,
      supabaseId: `supabase-${userId}`,
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }

  // Create test financial institution
  try {
    await db
      .insert(financialInstitutions)
      .values({
        id: institutionId,
        name: `Test Bank ${institutionId.slice(0, 8)}`, // Make name unique per test
        url: 'https://testbank.com',
        logo: 'test-bank-logo.png',
        primaryColor: '#0066cc',
        country: 'US',
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error('Failed to create institution:', error);
    throw error;
  }

  // Create test finance account
  try {
    await db
      .insert(financeAccounts)
      .values({
        id: accountId,
        userId,
        institutionId,
        name: `Test Checking Account ${accountId.slice(0, 8)}`, // Make name unique per test
        type: 'depository' as const,
        balance: '5000.00',
        interestRate: null,
        minimumPayment: null,
        meta: null,
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error('Failed to create account:', error);
    throw error;
  }

  // Create test transactions
  const testTransactions = [
    // January 2023 - Income
    {
      userId,
      accountId,
      amount: '1000.00',
      date: new Date('2023-01-15'),
      description: 'Salary',
      type: 'income' as const,
      category: 'Salary',
      parentCategory: 'Income',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    // January 2023 - Expenses
    {
      userId,
      accountId,
      amount: '-300.00',
      date: new Date('2023-01-20'),
      description: 'Rent',
      type: 'expense' as const,
      category: 'Housing',
      parentCategory: 'Expenses',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    {
      userId,
      accountId,
      amount: '-100.00',
      date: new Date('2023-01-25'),
      description: 'Groceries',
      type: 'expense' as const,
      category: 'Food',
      parentCategory: 'Expenses',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    // February 2023 - Income
    {
      userId,
      accountId,
      amount: '1200.00',
      date: new Date('2023-02-15'),
      description: 'Salary',
      type: 'income' as const,
      category: 'Salary',
      parentCategory: 'Income',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    // February 2023 - Expenses
    {
      userId,
      accountId,
      amount: '-350.00',
      date: new Date('2023-02-20'),
      description: 'Rent',
      type: 'expense' as const,
      category: 'Housing',
      parentCategory: 'Expenses',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    {
      userId,
      accountId,
      amount: '-150.00',
      date: new Date('2023-02-25'),
      description: 'Groceries',
      type: 'expense' as const,
      category: 'Food',
      parentCategory: 'Expenses',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    // March 2023 - Income
    {
      userId,
      accountId,
      amount: '1100.00',
      date: new Date('2023-03-15'),
      description: 'Salary',
      type: 'income' as const,
      category: 'Salary',
      parentCategory: 'Income',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    // March 2023 - Expenses
    {
      userId,
      accountId,
      amount: '-400.00',
      date: new Date('2023-03-20'),
      description: 'Rent',
      type: 'expense' as const,
      category: 'Housing',
      parentCategory: 'Expenses',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    {
      userId,
      accountId,
      amount: '-200.00',
      date: new Date('2023-03-25'),
      description: 'Groceries',
      type: 'expense' as const,
      category: 'Food',
      parentCategory: 'Expenses',
      excluded: false,
      pending: false,
      status: 'posted',
    },
  ];

  await db.insert(transactions).values(testTransactions);

  // If plaid is requested, create plaid items and related accounts
  if (plaid) {
    const testPlaidItemId = crypto.randomUUID();
    const testPlaidAccountId = crypto.randomUUID();
    await db
      .insert(plaidItems)
      .values({
        id: testPlaidItemId,
        itemId: `item_test_${userId.slice(0, 8)}_123`,
        accessToken: `access-test-token-${userId.slice(0, 8)}-123`,
        institutionId,
        status: 'active',
        consentExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        transactionsCursor: null,
        error: null,
        lastSyncedAt: null,
        userId,
      })
      .onConflictDoNothing();

    // Create test finance accounts for Plaid
    const testPlaidAccounts = [
      {
        id: testPlaidAccountId,
        userId,
        plaidItemId: testPlaidItemId,
        institutionId,
        name: 'Test Checking Account',
        officialName: 'Test Bank Checking Account',
        type: 'depository' as const,
        subtype: 'checking' as const,
        mask: '1234',
        balance: '2500.00',
        interestRate: null,
        minimumPayment: null,
        isoCurrencyCode: 'USD',
        plaidAccountId: `plaid-acc-checking-${userId.slice(0, 8)}-123`,
        limit: null,
        meta: null,
        lastUpdated: new Date(),
      },
      {
        id: crypto.randomUUID(),
        userId,
        plaidItemId: testPlaidItemId,
        institutionId,
        name: 'Test Savings Account',
        officialName: 'Test Bank Savings Account',
        type: 'depository' as const,
        subtype: 'savings' as const,
        mask: '5678',
        balance: '10000.00',
        interestRate: '0.05',
        minimumPayment: null,
        isoCurrencyCode: 'USD',
        plaidAccountId: `plaid-acc-savings-${userId.slice(0, 8)}-456`,
        limit: null,
        meta: null,
        lastUpdated: new Date(),
      },
    ];
    await db.insert(financeAccounts).values(testPlaidAccounts);
  }
}

export async function cleanupFinanceTestData({
  userId,
  accountId: _accountId,
  institutionId,
}: {
  userId: string;
  accountId: string;
  institutionId: string;
}) {
  // Delete in order of dependencies (child records first, then parent records)
  // Based on foreign key constraints:
  // - transactions -> finance_accounts (via account_id, from_account_id, to_account_id)
  // - finance_accounts -> plaid_items (via plaid_item_id)
  // - finance_accounts -> users (via user_id)
  // - finance_accounts -> financial_institutions (via institution_id)
  // - plaid_items -> users (via user_id)
  // - plaid_items -> financial_institutions (via institution_id)

  try {
    // 1. Delete transactions first (depends on finance_accounts)
    await db.delete(transactions).where(eq(transactions.userId, userId));
  } catch (_error) {
    // No transactions to delete
  }

  try {
    // 2. Delete finance accounts (depends on users, plaid_items, and institutions)
    await db.delete(financeAccounts).where(eq(financeAccounts.userId, userId));
  } catch (_error) {
    // No finance accounts to delete
  }

  try {
    // 3. Delete plaid items (depends on users and institutions)
    await db.delete(plaidItems).where(eq(plaidItems.userId, userId));
  } catch (_error) {
    // No plaid items to delete
  }

  try {
    // 4. Delete financial institutions (parent table)
    await db.delete(financialInstitutions).where(eq(financialInstitutions.id, institutionId));
  } catch (_error) {
    // No financial institution to delete
  }

  try {
    // 5. Delete users (parent table) - must be last since other tables reference it
    await db.delete(users).where(eq(users.id, userId));
  } catch (_error) {
    // No user to delete
  }
}
