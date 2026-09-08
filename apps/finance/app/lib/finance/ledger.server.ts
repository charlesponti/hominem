import {
  computeLedgerRunway,
  findTransferPairs,
  getAccountLedgerBreakdown,
  getReconciliationStaleness,
  getValidationGates,
  postReconciliationAdjustment,
} from '@hominem/finance-services';

/**
 * Server-only ledger access for Florin routes. This module (and only this
 * module in the app) imports @hominem/finance-services: route loaders and
 * actions call these wrappers with the session user id instead of going
 * through services/api, so the ledger tools need no new API routes. Never
 * import this file (or the services package) from client components —
 * the `.server.ts` suffix keeps it out of the browser bundle.
 */
export function getLedgerReconcileData(userId: string) {
  return Promise.all([getReconciliationStaleness(userId), getValidationGates(userId)]).then(
    ([staleness, gates]) => ({ staleness, gates }),
  );
}

export function getLedgerBreakdown(userId: string, accountId: string) {
  return getAccountLedgerBreakdown(userId, accountId);
}

export function postLedgerTrueUp(input: {
  userId: string;
  accountId: string;
  targetBalance: number;
  date?: string;
  note?: string;
  force?: boolean;
}) {
  return postReconciliationAdjustment(input);
}

export function getLiveRunway(userId: string) {
  // No per-user budget settings home yet (merge OPEN-002), so the variable
  // allowance is zero until monthlyBudgets are configured somewhere.
  return computeLedgerRunway({ userId, monthlyBudgets: [] });
}

export function getLedgerTransferPairs(
  userId: string,
  filters: { windowDays: number; minAmount: number; limit: number },
) {
  return findTransferPairs({ userId, ...filters });
}
