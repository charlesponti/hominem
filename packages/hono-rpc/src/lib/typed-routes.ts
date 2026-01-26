/**
 * Typed Routes - Output Type Inference from Hono Routes
 *
 * This file provides type-safe inference of API response types directly from
 * the Hono route handlers. It is optimized to prevent TypeScript recursion
 * explosion (TS2589) by performing direct schema-based inference instead of
 * generating expensive Hono client (hc) proxies.
 *
 * Key Design Principles:
 * - NO runtime code, only types.
 * - Direct access to Hono router schemas for minimal compiler overhead.
 * - Domain-isolated inference to keep type checking fast.
 */

import type { Hono } from 'hono';
import type { InferResponseType } from 'hono/client';

import type {
  AdminType,
  FinanceAccountsType,
  FinanceAnalyzeType,
  FinanceBudgetType,
  FinanceCategoriesType,
  FinanceTransactionsType,
  FinanceType,
  InvitesType,
  ItemsType,
  ListsType,
  PeopleType,
  PlacesType,
  TripsType,
  UserType,
} from '../index';

/**
 * Extracts the response type from a Hono router's internal schema.
 * This bypasses the complex proxy generation in Hono's 'hc' client,
 * which is the primary cause of "Type instantiation is excessively deep" errors.
 */
type FromSchema<
  T extends Hono<any, any, any>,
  Path extends string,
  Method extends string = '$post',
> =
  T extends Hono<any, infer S, any>
    ? Path extends keyof S
      ? Method extends keyof S[Path]
        ? InferResponseType<S[Path][Method]>
        : never
      : never
    : never;

// ============================================================================
// Admin Output Types
// ============================================================================

export type AdminRefreshGooglePlacesOutput = FromSchema<AdminType, '/refresh-google-places'>;

// ============================================================================
// Finance Output Types
// ============================================================================

// Transactions
export type TransactionListOutput = FromSchema<FinanceTransactionsType, '/list'>;
export type TransactionCreateOutput = FromSchema<FinanceTransactionsType, '/create'>;
export type TransactionUpdateOutput = FromSchema<FinanceTransactionsType, '/update'>;
export type TransactionDeleteOutput = FromSchema<FinanceTransactionsType, '/delete'>;

// Accounts
export type AccountListOutput = FromSchema<FinanceAccountsType, '/list'>;
export type AccountGetOutput = FromSchema<FinanceAccountsType, '/get'>;
export type AccountCreateOutput = FromSchema<FinanceAccountsType, '/create'>;
export type AccountUpdateOutput = FromSchema<FinanceAccountsType, '/update'>;
export type AccountDeleteOutput = FromSchema<FinanceAccountsType, '/delete'>;
export type AccountAllOutput = FromSchema<FinanceAccountsType, '/all'>;
export type AccountsWithPlaidOutput = FromSchema<FinanceAccountsType, '/with-plaid'>;
export type AccountConnectionsOutput = FromSchema<FinanceAccountsType, '/connections'>;
export type AccountInstitutionAccountsOutput = FromSchema<
  FinanceAccountsType,
  '/institution-accounts'
>;

// Plaid
export type PlaidCreateLinkTokenOutput = FromSchema<FinanceType, '/plaid/create-link-token'>;
export type PlaidExchangeTokenOutput = FromSchema<FinanceType, '/plaid/exchange-token'>;
export type PlaidSyncItemOutput = FromSchema<FinanceType, '/plaid/sync-item'>;
export type PlaidRemoveConnectionOutput = FromSchema<FinanceType, '/plaid/remove-connection'>;

// ============================================================================
// Invites Output Types
// ============================================================================

export type InvitesGetReceivedOutput = FromSchema<InvitesType, '/received'>;
export type InvitesGetSentOutput = FromSchema<InvitesType, '/sent'>;
export type InvitesGetByListOutput = FromSchema<InvitesType, '/by-list'>;
export type InvitesCreateOutput = FromSchema<InvitesType, '/create'>;
export type InvitesAcceptOutput = FromSchema<InvitesType, '/accept'>;
export type InvitesDeclineOutput = FromSchema<InvitesType, '/decline'>;
export type InvitesDeleteOutput = FromSchema<InvitesType, '/delete'>;

// ============================================================================
// Items Output Types
// ============================================================================

export type ItemsAddToListOutput = FromSchema<ItemsType, '/add'>;
export type ItemsRemoveFromListOutput = FromSchema<ItemsType, '/remove'>;
export type ItemsGetByListIdOutput = FromSchema<ItemsType, '/by-list'>;

// ============================================================================
// Lists Output Types
// ============================================================================

export type ListGetAllOutput = FromSchema<ListsType, '/list'>;
export type ListGetByIdOutput = FromSchema<ListsType, '/get'>;
export type ListCreateOutput = FromSchema<ListsType, '/create'>;
export type ListUpdateOutput = FromSchema<ListsType, '/update'>;
export type ListDeleteOutput = FromSchema<ListsType, '/delete'>;
export type ListDeleteItemOutput = FromSchema<ListsType, '/delete-item'>;
export type ListGetContainingPlaceOutput = FromSchema<ListsType, '/containing-place'>;
export type ListRemoveCollaboratorOutput = FromSchema<ListsType, '/remove-collaborator'>;

// ============================================================================
// People Output Types
// ============================================================================

export type PeopleListOutput = FromSchema<PeopleType, '/list'>;
export type PeopleCreateOutput = FromSchema<PeopleType, '/create'>;

// ============================================================================
// Places Output Types
// ============================================================================

export type PlaceCreateOutput = FromSchema<PlacesType, '/create'>;
export type PlaceUpdateOutput = FromSchema<PlacesType, '/update'>;
export type PlaceDeleteOutput = FromSchema<PlacesType, '/delete'>;
export type PlaceAutocompleteOutput = FromSchema<PlacesType, '/autocomplete'>;
export type PlaceGetDetailsByIdOutput = FromSchema<PlacesType, '/get'>;
export type PlaceGetDetailsByGoogleIdOutput = FromSchema<PlacesType, '/get-by-google-id'>;
export type PlaceAddToListsOutput = FromSchema<PlacesType, '/add-to-lists'>;
export type PlaceRemoveFromListOutput = FromSchema<PlacesType, '/remove-from-list'>;
export type PlaceGetNearbyFromListsOutput = FromSchema<PlacesType, '/nearby'>;
export type PlaceLogVisitOutput = FromSchema<PlacesType, '/log-visit'>;
export type PlaceGetMyVisitsOutput = FromSchema<PlacesType, '/my-visits'>;
export type PlaceGetPlaceVisitsOutput = FromSchema<PlacesType, '/place-visits'>;
export type PlaceUpdateVisitOutput = FromSchema<PlacesType, '/update-visit'>;
export type PlaceDeleteVisitOutput = FromSchema<PlacesType, '/delete-visit'>;
export type PlaceGetVisitStatsOutput = FromSchema<PlacesType, '/visit-stats'>;

// ============================================================================
// Trips Output Types
// ============================================================================

export type TripsGetAllOutput = FromSchema<TripsType, '/list'>;
export type TripsGetByIdOutput = FromSchema<TripsType, '/get'>;
export type TripsCreateOutput = FromSchema<TripsType, '/create'>;
export type TripsAddItemOutput = FromSchema<TripsType, '/add-item'>;

// ============================================================================
// User Output Types
// ============================================================================

export type UserDeleteAccountOutput = FromSchema<UserType, '/delete-account'>;
