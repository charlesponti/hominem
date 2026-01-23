/**
 * Centralized Type Exports
 *
 * All types are organized by domain and re-exported here for convenience.
 *
 * Input types are derived from Zod schemas (ensuring sync with validation).
 * Output types are inferred from route handlers (ensuring sync with API).
 */

// ============================================================================
// Utilities
// ============================================================================

export type { JsonSerialized, EmptyInput } from './utils';

// ============================================================================
// Admin
// ============================================================================

export type { AdminRefreshGooglePlacesInput, AdminRefreshGooglePlacesOutput } from './admin.types';

// ============================================================================
// Finance
// ============================================================================

export type {
  // Transactions
  TransactionListInput,
  TransactionListOutput,
  TransactionCreateInput,
  TransactionCreateOutput,
  TransactionUpdateInput,
  TransactionUpdateOutput,
  TransactionDeleteInput,
  TransactionDeleteOutput,
  // Accounts
  AccountListInput,
  AccountListOutput,
  AccountGetInput,
  AccountGetOutput,
  AccountCreateInput,
  AccountCreateOutput,
  AccountUpdateInput,
  AccountUpdateOutput,
  AccountDeleteInput,
  AccountDeleteOutput,
  AccountAllOutput,
  AccountsWithPlaidOutput,
  AccountConnectionsOutput,
  AccountInstitutionAccountsInput,
  AccountInstitutionAccountsOutput,
  // Analyze
  SpendingTimeSeriesInput,
  TopMerchantsInput,
  CategoryBreakdownInput,
  CalculateTransactionsInput,
  MonthlyStatsInput,
  // Categories
  CategoriesListInput,
  // Plaid
  PlaidCreateLinkTokenInput,
  PlaidExchangeTokenInput,
  PlaidSyncItemInput,
  PlaidRemoveConnectionInput,
  // Budget
  BudgetCategoriesListInput,
  BudgetCategoriesListWithSpendingInput,
  BudgetCategoryGetInput,
  BudgetCategoryCreateInput,
  BudgetCategoryUpdateInput,
  BudgetCategoryDeleteInput,
  BudgetTrackingInput,
  BudgetHistoryInput,
  BudgetCalculateInput,
  BudgetBulkCreateInput,
  // Institutions
  InstitutionsListInput,
  InstitutionCreateInput,
  // Runway
  RunwayCalculateInput,
  // Export
  ExportTransactionsInput,
  ExportSummaryInput,
  // Data
  DataDeleteAllInput,
} from './finance.types';

// ============================================================================
// Invites
// ============================================================================

export type {
  InvitesGetReceivedInput,
  InvitesGetReceivedOutput,
  InvitesGetSentInput,
  InvitesGetSentOutput,
  InvitesGetByListInput,
  InvitesGetByListOutput,
  InvitesCreateInput,
  InvitesCreateOutput,
  InvitesAcceptInput,
  InvitesAcceptOutput,
  InvitesDeclineInput,
  InvitesDeclineOutput,
  InvitesDeleteInput,
  InvitesDeleteOutput,
} from './invites.types';

// ============================================================================
// Items
// ============================================================================

export type {
  ItemsAddToListInput,
  ItemsAddToListOutput,
  ItemsRemoveFromListInput,
  ItemsRemoveFromListOutput,
  ItemsGetByListIdInput,
  ItemsGetByListIdOutput,
} from './items.types';

// ============================================================================
// Lists
// ============================================================================

export type {
  ListGetAllInput,
  ListGetAllOutput,
  ListGetByIdInput,
  ListGetByIdOutput,
  ListCreateInput,
  ListCreateOutput,
  ListUpdateInput,
  ListUpdateOutput,
  ListDeleteInput,
  ListDeleteOutput,
  ListDeleteItemInput,
  ListDeleteItemOutput,
  ListGetContainingPlaceInput,
  ListGetContainingPlaceOutput,
  ListRemoveCollaboratorInput,
  ListRemoveCollaboratorOutput,
} from './lists.types';

// ============================================================================
// People
// ============================================================================

export type {
  PeopleListInput,
  PeopleListOutput,
  PeopleCreateInput,
  PeopleCreateOutput,
} from './people.types';

// ============================================================================
// Places
// ============================================================================

export type {
  PlaceCreateInput,
  PlaceCreateOutput,
  PlaceUpdateInput,
  PlaceUpdateOutput,
  PlaceDeleteInput,
  PlaceDeleteOutput,
  PlaceAutocompleteInput,
  PlaceAutocompleteOutput,
  PlaceGetDetailsByIdInput,
  PlaceGetDetailsByIdOutput,
  PlaceGetDetailsByGoogleIdInput,
  PlaceGetDetailsByGoogleIdOutput,
  PlaceAddToListsInput,
  PlaceAddToListsOutput,
  PlaceRemoveFromListInput,
  PlaceRemoveFromListOutput,
  PlaceGetNearbyFromListsInput,
  PlaceGetNearbyFromListsOutput,
  PlaceLogVisitInput,
  PlaceLogVisitOutput,
  PlaceGetMyVisitsInput,
  PlaceGetMyVisitsOutput,
  PlaceGetPlaceVisitsInput,
  PlaceGetPlaceVisitsOutput,
  PlaceUpdateVisitInput,
  PlaceUpdateVisitOutput,
  PlaceDeleteVisitInput,
  PlaceDeleteVisitOutput,
  PlaceGetVisitStatsInput,
  PlaceGetVisitStatsOutput,
} from './places.types';

// ============================================================================
// Trips
// ============================================================================

export type {
  TripsGetAllInput,
  TripsGetAllOutput,
  TripsGetByIdInput,
  TripsGetByIdOutput,
  TripsCreateInput,
  TripsCreateOutput,
  TripsAddItemInput,
  TripsAddItemOutput,
} from './trips.types';

// ============================================================================
// User
// ============================================================================

export type { UserDeleteAccountInput, UserDeleteAccountOutput } from './user.types';
