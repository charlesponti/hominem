/**
 * Typed Routes - Output Type Inference from Hono Routes
 *
 * This file provides type-safe inference of API response types directly from
 * the Hono route handlers. It uses Hono's built-in InferResponseType utility
 * to derive the actual response shapes without creating circular dependencies.
 *
 * Key Design Principles:
 * - NO runtime code, only types
 * - NO circular dependencies with route files
 * - Types are automatically derived from c.json() calls in route handlers
 * - Single source of truth: the route implementation itself
 *
 * Usage:
 *   import type { ListCreateOutput } from '../lib/typed-routes';
 */

import type { InferResponseType } from 'hono/client';

import type { AppType } from '../app';

/**
 * Type helper to navigate nested route structure
 * Recursively traverses the app type to find a specific endpoint
 */
type GetEndpoint<App, Path extends string[]> = Path extends [infer First, ...infer Rest]
  ? First extends keyof App
    ? Rest extends string[]
      ? GetEndpoint<App[First], Rest>
      : App[First]
    : never
  : App;

/**
 * Extracts the response type from a Hono endpoint
 * Handles both $get and $post methods
 */
type ExtractResponse<Endpoint> = Endpoint extends { $post: infer Route }
  ? InferResponseType<Route>
  : Endpoint extends { $get: infer Route }
    ? InferResponseType<Route>
    : never;

// ============================================================================
// Admin Output Types
// ============================================================================

export type AdminRefreshGooglePlacesOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'admin', 'refresh-google-places']>
>;

// ============================================================================
// Finance Output Types
// ============================================================================

// Transactions
export type TransactionListOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'transactions', 'list']>
>;

export type TransactionCreateOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'transactions', 'create']>
>;

export type TransactionUpdateOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'transactions', 'update']>
>;

export type TransactionDeleteOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'transactions', 'delete']>
>;

// Accounts
export type AccountListOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'accounts', 'list']>
>;

export type AccountGetOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'accounts', 'get']>
>;

export type AccountCreateOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'accounts', 'create']>
>;

export type AccountUpdateOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'accounts', 'update']>
>;

export type AccountDeleteOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'accounts', 'delete']>
>;

export type AccountAllOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'accounts', 'all']>
>;

export type AccountsWithPlaidOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'accounts', 'with-plaid']>
>;

export type AccountConnectionsOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'accounts', 'connections']>
>;

export type AccountInstitutionAccountsOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'accounts', 'institution-accounts']>
>;

// Plaid
export type PlaidCreateLinkTokenOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'plaid', 'create-link-token']>
>;

export type PlaidExchangeTokenOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'plaid', 'exchange-token']>
>;

export type PlaidSyncItemOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'plaid', 'sync-item']>
>;

export type PlaidRemoveConnectionOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'finance', 'plaid', 'remove-connection']>
>;

// ============================================================================
// Invites Output Types
// ============================================================================

export type InvitesGetReceivedOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'invites', 'received']>
>;

export type InvitesGetSentOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'invites', 'sent']>
>;

export type InvitesGetByListOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'invites', 'by-list']>
>;

export type InvitesCreateOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'invites', 'create']>
>;

export type InvitesAcceptOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'invites', 'accept']>
>;

export type InvitesDeclineOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'invites', 'decline']>
>;

export type InvitesDeleteOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'invites', 'delete']>
>;

// ============================================================================
// Items Output Types
// ============================================================================

export type ItemsAddToListOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'items', 'add']>>;

export type ItemsRemoveFromListOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'items', 'remove']>
>;

export type ItemsGetByListIdOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'items', 'by-list']>
>;

// ============================================================================
// Lists Output Types
// ============================================================================

export type ListGetAllOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'lists', 'list']>>;

export type ListGetByIdOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'lists', 'get']>>;

export type ListCreateOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'lists', 'create']>>;

export type ListUpdateOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'lists', 'update']>>;

export type ListDeleteOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'lists', 'delete']>>;

export type ListDeleteItemOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'lists', 'delete-item']>
>;

export type ListGetContainingPlaceOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'lists', 'containing-place']>
>;

export type ListRemoveCollaboratorOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'lists', 'remove-collaborator']>
>;

// ============================================================================
// People Output Types
// ============================================================================

export type PeopleListOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'people', 'list']>>;

export type PeopleCreateOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'people', 'create']>>;

// ============================================================================
// Places Output Types
// ============================================================================

export type PlaceCreateOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'places', 'create']>>;

export type PlaceUpdateOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'places', 'update']>>;

export type PlaceDeleteOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'places', 'delete']>>;

export type PlaceAutocompleteOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'places', 'autocomplete']>
>;

export type PlaceGetDetailsByIdOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'places', 'get']>
>;

export type PlaceGetDetailsByGoogleIdOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'places', 'get-by-google-id']>
>;

export type PlaceAddToListsOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'places', 'add-to-lists']>
>;

export type PlaceRemoveFromListOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'places', 'remove-from-list']>
>;

export type PlaceGetNearbyFromListsOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'places', 'nearby']>
>;

export type PlaceLogVisitOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'places', 'log-visit']>
>;

export type PlaceGetMyVisitsOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'places', 'my-visits']>
>;

export type PlaceGetPlaceVisitsOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'places', 'place-visits']>
>;

export type PlaceUpdateVisitOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'places', 'update-visit']>
>;

export type PlaceDeleteVisitOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'places', 'delete-visit']>
>;

export type PlaceGetVisitStatsOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'places', 'visit-stats']>
>;

// ============================================================================
// Trips Output Types
// ============================================================================

export type TripsGetAllOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'trips', 'get-all']>>;

export type TripsGetByIdOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'trips', 'get']>>;

export type TripsCreateOutput = ExtractResponse<GetEndpoint<AppType, ['api', 'trips', 'create']>>;

export type TripsAddItemOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'trips', 'add-item']>
>;

// ============================================================================
// User Output Types
// ============================================================================

export type UserDeleteAccountOutput = ExtractResponse<
  GetEndpoint<AppType, ['api', 'user', 'delete-account']>
>;
