// ============================================================================
// Plaid
// ============================================================================

export type PlaidCreateLinkTokenInput = {
  userId: string;
};
export type PlaidCreateLinkTokenOutput = {
  linkToken: string;
  expiration: string;
  requestId: string;
};
export type PlaidExchangeTokenOutput = {
  accessToken: string;
  itemId: string;
  requestId: string;
};

export type PlaidExchangeTokenInput = {
  publicToken: string;
  institutionId?: string;
  institutionName?: string;
  metaData?: unknown;
};

export type PlaidSyncItemInput = {
  itemId: string;
};
export type PlaidSyncItemOutput = {
  success: boolean;
  added: number;
  modified: number;
  removed: number;
};
export type PlaidRemoveConnectionOutput = {
  success: boolean;
};

export type PlaidRemoveConnectionInput = {
  connectionId: string;
  itemId?: string;
};
