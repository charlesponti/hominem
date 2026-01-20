/**
 * Available Tools with Server Implementations
 * Uses TanStack AI tool definitions exclusively
 */

// import {
//   calculateBudgetBreakdownDef,
//   calculateRunwayDef,
//   calculateSavingsGoalDef,
//   createFinanceAccountDef,
//   createTransactionDef,
//   deleteFinanceAccountDef,
//   deleteTransactionDef,
//   getCategoryBreakdownDef,
//   getFinanceAccountsDef,
//   getSpendingCategoriesDef,
//   getSpendingTimeSeriesDef,
//   getTopMerchantsDef,
//   getTransactionsDef,
//   updateFinanceAccountDef,
//   updateTransactionDef,
//   createFinanceAccountServer,
//   getFinanceAccountsServer,
//   updateFinanceAccountServer,
//   deleteFinanceAccountServer,
//   createTransactionServer,
//   getTransactionsServer,
//   updateTransactionServer,
//   deleteTransactionServer,
//   getSpendingCategoriesServer,
//   getCategoryBreakdownServer,
//   getSpendingTimeSeriesServer,
//   getTopMerchantsServer,
//   calculateBudgetBreakdownServer,
//   calculateRunwayServer,
//   calculateSavingsGoalServer,
//   calculateLoanDetailsServer,
// } from '@hominem/finance-services/tools';
import {
  recommendWorkoutDef,
  assessMentalWellnessDef,
  recommendWorkoutServer,
  assessMentalWellnessServer,
} from '@hominem/health-services/tools';
import {
  createNoteDef,
  listNotesDef,
  createNoteServerForUser,
  listNotesServerForUser,
} from '@hominem/notes-services';

/**
 * Export TanStack AI tools with server implementations
 * Each tool is set up with its `.server()` implementation for execution
 */
export const getAvailableTools = (userId: string) => [
  // Notes
  createNoteDef.server(createNoteServerForUser(userId)),
  listNotesDef.server(listNotesServerForUser(userId)),

  // Finance Accounts
  // createFinanceAccountDef.server(createFinanceAccountServer(userId)),
  // getFinanceAccountsDef.server(getFinanceAccountsServer(userId)),
  // updateFinanceAccountDef.server(updateFinanceAccountServer(userId)),
  // deleteFinanceAccountDef.server(deleteFinanceAccountServer(userId)),

  // Finance Transactions
  // createTransactionDef.server(createTransactionServer(userId)),
  // getTransactionsDef.server(getTransactionsServer(userId)),
  // updateTransactionDef.server(updateTransactionServer(userId)),
  // deleteTransactionDef.server(deleteTransactionServer(userId)),

  // Finance Analytics
  // getSpendingCategoriesDef.server(getSpendingCategoriesServer(userId)),
  // getCategoryBreakdownDef.server(getCategoryBreakdownServer(userId)),
  // getSpendingTimeSeriesDef.server(getSpendingTimeSeriesServer(userId)),
  // getTopMerchantsDef.server(getTopMerchantsServer(userId)),

  // Finance Calculators
  // calculateBudgetBreakdownDef.server(calculateBudgetBreakdownServer(userId)),
  // calculateRunwayDef.server(calculateRunwayServer(userId)),
  // calculateSavingsGoalDef.server(calculateSavingsGoalServer(userId)),
  // calculateLoanDetailsDef.server(calculateLoanDetailsServer(userId)),
  // Wellness
  recommendWorkoutDef.server(recommendWorkoutServer),
  assessMentalWellnessDef.server(assessMentalWellnessServer),
];
