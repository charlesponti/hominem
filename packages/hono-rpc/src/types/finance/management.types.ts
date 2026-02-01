// ============================================================================
// Data Management
// ============================================================================

export type DataDeleteAllInput = {
  confirm: boolean;
};

export type DataDeleteAllOutput = {
  success: boolean;
  deletedCounts?: {
    transactions: number;
    accounts: number;
    budgets: number;
    connections: number;
  };
  message?: string;
};
