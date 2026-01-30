// ============================================================================
// Export
// ============================================================================

export type ExportTransactionsInput = {
  format: 'csv' | 'json' | 'pdf';
  year?: number;
  month?: number;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  accounts?: string[];
  categories?: string[];
};

export type ExportTransactionsOutput = {
  url: string;
  filename: string;
  expiresAt: string;
  data?: string;
  fileName?: string;
  createdAt?: string;
};
export type ExportSummaryOutput = {
  url: string;
  filename: string;
  data?: string;
  fileName?: string;
  createdAt?: string;
};

export type ExportSummaryInput = {
  year: number;
  format: 'pdf' | 'html' | 'csv' | 'json';
  startDate?: string;
  endDate?: string;
  accounts?: string[];
  categories?: string[];
};
