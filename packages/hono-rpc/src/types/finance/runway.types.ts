// ============================================================================
// Runway
// ============================================================================

export type RunwayCalculateInput = {
  balance: number;
  monthlyExpenses: number;
  plannedPurchases?: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
  projectionMonths?: number;
};

export type RunwayCalculateOutput = {
  runwayMonths: number;
  runwayEndDate: string;
  isRunwayDangerous: boolean;
  totalPlannedExpenses: number;
  projectionData: Array<{
    month: string;
    balance: number;
  }>;
  months: number;
  years: number;
};
