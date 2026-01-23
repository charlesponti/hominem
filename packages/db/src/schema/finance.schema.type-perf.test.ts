import { attest } from '@ark/attest';

import type {
  FinanceAccount,
  FinanceAccountInsert,
  FinanceAccountSelect,
  FinanceTransaction,
  FinanceTransactionInsert,
  FinanceTransactionSelect,
  BudgetCategory,
  BudgetCategoryInsert,
  BudgetGoal,
  PlaidItem,
  FinancialInstitution,
} from './finance.schema';

/**
 * Type Performance Tests for Finance Schema
 *
 * These tests measure TypeScript's type-checking performance for complex
 * database schema types. They track:
 * - Type instantiations: How many times TS needs to instantiate generic types
 * - Type completions: How many completion suggestions are generated
 *
 * Lower numbers generally indicate better performance.
 */

describe('Finance Schema Type Performance', () => {
  it('should efficiently infer FinanceAccount type', () => {
    attest(() => {
      type Test = FinanceAccount;
    }).type.instantiations.lessThan(100);
  });

  it('should efficiently infer FinanceAccountInsert type', () => {
    attest(() => {
      type Test = FinanceAccountInsert;
    }).type.instantiations.lessThan(100);
  });

  it('should efficiently infer FinanceAccountSelect type', () => {
    attest(() => {
      type Test = FinanceAccountSelect;
    }).type.instantiations.lessThan(100);
  });

  it('should efficiently infer FinanceTransaction type', () => {
    attest(() => {
      type Test = FinanceTransaction;
    }).type.instantiations.lessThan(150);
  });

  it('should efficiently infer FinanceTransactionInsert type', () => {
    attest(() => {
      type Test = FinanceTransactionInsert;
    }).type.instantiations.lessThan(150);
  });

  it('should efficiently infer FinanceTransactionSelect type', () => {
    attest(() => {
      type Test = FinanceTransactionSelect;
    }).type.instantiations.lessThan(150);
  });

  it('should efficiently infer complex query result types', () => {
    attest(() => {
      // Simulate a complex query result with relations
      type ComplexQueryResult = FinanceTransaction & {
        account: FinanceAccount & {
          institution: FinancialInstitution | null;
          plaidItem: PlaidItem | null;
        };
        fromAccount: FinanceAccount | null;
        toAccount: FinanceAccount | null;
        category: BudgetCategory | null;
      };
      type Test = ComplexQueryResult;
    }).type.instantiations.lessThan(300);
  });

  it('should efficiently handle array types', () => {
    attest(() => {
      type TransactionList = FinanceTransaction[];
      type Test = TransactionList;
    }).type.instantiations.lessThan(200);
  });

  it('should efficiently handle partial types for updates', () => {
    attest(() => {
      type TransactionUpdate = Partial<FinanceTransaction>;
      type Test = TransactionUpdate;
    }).type.instantiations.lessThan(200);
  });

  it('should efficiently handle deeply nested relation types', () => {
    attest(() => {
      type AccountWithEverything = FinanceAccount & {
        fromTransactions: (FinanceTransaction & {
          category: BudgetCategory | null;
        })[];
        toTransactions: (FinanceTransaction & {
          category: BudgetCategory | null;
        })[];
        institution: FinancialInstitution | null;
        plaidItem:
          | (PlaidItem & {
              institution: FinancialInstitution | null;
            })
          | null;
      };
      type Test = AccountWithEverything;
    }).type.instantiations.lessThan(500);
  });
});
