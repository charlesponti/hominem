import {
  getFinanceNetWorth,
  getFinanceRecentTransactions,
  getFinanceSpendingByCategory,
} from '../../application/finance-mcp.service';
import { MCP_SCOPES } from '../../auth/better-auth';
import {
  financeNetWorthInputSchema,
  financeNetWorthOutputSchema,
  financeRecentTransactionsInputSchema,
  financeRecentTransactionsOutputSchema,
  financeSpendingByCategoryInputSchema,
  financeSpendingByCategoryOutputSchema,
} from '../../schemas/finance.schema';
import { registerTool } from '../tools';

// ── finance_net_worth ───────────────────────────────────────────────

registerTool(
  {
    name: 'finance_net_worth',
    title: 'Finance Net Worth',
    description:
      'Compute current net worth from finance accounts included in net-worth totals, using the latest certified statement balance plus posted transaction activity since. Returns per-account balances grouped by currency.',
    inputSchema: financeNetWorthInputSchema,
    outputSchema: financeNetWorthOutputSchema,
    readOnly: true,
    scopes: MCP_SCOPES,
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => getFinanceNetWorth(ownerUserId, input.includeClosed),
);

// ── finance_recent_transactions ─────────────────────────────────────

registerTool(
  {
    name: 'finance_recent_transactions',
    title: 'Finance Recent Transactions',
    description:
      'List posted finance transactions in a bounded window, optionally scoped to one account, with category annotations where available.',
    inputSchema: financeRecentTransactionsInputSchema,
    outputSchema: financeRecentTransactionsOutputSchema,
    readOnly: true,
    scopes: MCP_SCOPES,
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => getFinanceRecentTransactions(ownerUserId, input),
);

// ── finance_spending_by_category ────────────────────────────────────

registerTool(
  {
    name: 'finance_spending_by_category',
    title: 'Finance Spending by Category',
    description:
      'Sum posted, non-excluded, non-transfer spending grouped by category over a date range. Returns spend totals in cents.',
    inputSchema: financeSpendingByCategoryInputSchema,
    outputSchema: financeSpendingByCategoryOutputSchema,
    readOnly: true,
    scopes: MCP_SCOPES,
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => getFinanceSpendingByCategory(ownerUserId, input),
);
