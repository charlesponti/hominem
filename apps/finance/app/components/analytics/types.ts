// Analytics types - Define explicitly since we don't have RouterOutput inference anymore
// These match the output from the analyze endpoints

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface TopMerchantItem {
  merchantName: string;
  amount: number;
  transactionCount: number;
  category: string | null;
}
