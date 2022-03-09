export interface MintTransaction {
  Date: string;
  Description: string;
  'Original Description': string;
  Amount: string;
  Transaction: string;
  Type: string;
  Category: string;
  'Account Name': string;
  Labels: string;
  Notes: string;
}

export interface AppleCardTransaction {
  payee: string;
}

export interface SpreadSheetRange {
  range: string;
  collection: string;
}

export interface Spreadsheet {
  sheetId: string;
  name: string;
  sheets: SpreadSheetRange[];
}

export interface SheetAccount {
  name: string;
  type: string;
  creditLimit: string;
  balance: string;
  active: string;
}

export interface SheetExpense {
  category: string;
  account: string;
  billing_day: string;
  billing_period: string;
}

export interface SheetTransaction {
  account: string;
  date: string;
  payee: string;
  amount: string;
  category: string;
  description: string;
  type: string;
  labels: string;
  notes: string;
}

export interface SheetCategory {
  name: string;
}

export interface FinanceSheets {
  accounts: SheetAccount[];
  transactions: SheetTransaction[];
  categories: SheetCategory[];
}