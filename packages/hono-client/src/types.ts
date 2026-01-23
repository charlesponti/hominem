/**
 * Type Inference Utilities for Hono Client
 *
 * Exports type helpers to derive request/response types directly from the
 * hono/client typed API using InferResponseType and InferRequestType.
 *
 * This allows consuming code to get types that stay perfectly in sync with
 * the RPC implementation without manual type definitions.
 *
 * Usage:
 *   import type { AppType } from '@hominem/hono-rpc'
 *   import type { InferApi } from '@hominem/hono-client'
 *   import { hc } from 'hono/client'
 *
 *   type MyResponse = InferApi<AppType, 'api.myroute.$get', 'response'>
 *   type MyRequest = InferApi<AppType, 'api.myroute.$post', 'request'>
 */

import type { AppType } from '@hominem/hono-rpc';
import type { InferResponseType, InferRequestType } from 'hono/client';

import { hc } from 'hono/client';

/**
 * Create a typed API client for type inference
 * Used purely at the type level - never instantiated at runtime
 */
type ApiClient = ReturnType<typeof hc<AppType>>;

/**
 * Generic helper to infer response type from any API endpoint
 *
 * @example
 * type ListsResponse = InferApiResponse<ApiClient['api']['lists']['$get']>
 */
export type InferApiResponse<T> = InferResponseType<T>;

/**
 * Generic helper to infer request type from any API endpoint
 *
 * @example
 * type ListsRequest = InferApiRequest<ApiClient['api']['lists']['$post']>
 */
export type InferApiRequest<T> = InferRequestType<T>;

/**
 * Pre-typed endpoint helpers with full namespace organization
 * All types are automatically inferred from route handlers via Hono
 */

/**
 * Invites API
 */
export namespace ApiTypes {
  export namespace Invites {
    export type GetReceivedInput = InferRequestType<
      ApiClient['api']['invites']['received']['$post']
    >;
    export type GetReceivedOutput = InferResponseType<
      ApiClient['api']['invites']['received']['$post']
    >;

    export type GetSentInput = InferRequestType<ApiClient['api']['invites']['sent']['$post']>;
    export type GetSentOutput = InferResponseType<ApiClient['api']['invites']['sent']['$post']>;

    export type GetByListInput = InferRequestType<ApiClient['api']['invites']['by-list']['$post']>;
    export type GetByListOutput = InferResponseType<
      ApiClient['api']['invites']['by-list']['$post']
    >;

    export type CreateInput = InferRequestType<ApiClient['api']['invites']['$post']>;
    export type CreateOutput = InferResponseType<ApiClient['api']['invites']['$post']>;

    export type AcceptInput = InferRequestType<
      ApiClient['api']['invites'][':id']['accept']['$post']
    >;
    export type AcceptOutput = InferResponseType<
      ApiClient['api']['invites'][':id']['accept']['$post']
    >;

    export type DeclineInput = InferRequestType<
      ApiClient['api']['invites'][':id']['decline']['$post']
    >;
    export type DeclineOutput = InferResponseType<
      ApiClient['api']['invites'][':id']['decline']['$post']
    >;

    export type DeleteInput = InferRequestType<ApiClient['api']['invites'][':id']['$delete']>;
    export type DeleteOutput = InferResponseType<ApiClient['api']['invites'][':id']['$delete']>;
  }

  /**
   * Finance API
   */
  export namespace Finance {
    export type GetAccountsInput = InferRequestType<
      ApiClient['api']['finance']['accounts']['$get']
    >;
    export type GetAccountsOutput = InferResponseType<
      ApiClient['api']['finance']['accounts']['$get']
    >;

    export type CreateAccountInput = InferRequestType<
      ApiClient['api']['finance']['accounts']['$post']
    >;
    export type CreateAccountOutput = InferResponseType<
      ApiClient['api']['finance']['accounts']['$post']
    >;

    export type GetTransactionsInput = InferRequestType<
      ApiClient['api']['finance']['transactions']['$get']
    >;
    export type GetTransactionsOutput = InferResponseType<
      ApiClient['api']['finance']['transactions']['$get']
    >;
  }

  /**
   * Lists API
   */
  export namespace Lists {
    export type GetInput = InferRequestType<ApiClient['api']['lists']['$get']>;
    export type GetOutput = InferResponseType<ApiClient['api']['lists']['$get']>;

    export type CreateInput = InferRequestType<ApiClient['api']['lists']['$post']>;
    export type CreateOutput = InferResponseType<ApiClient['api']['lists']['$post']>;

    export type GetByIdInput = InferRequestType<ApiClient['api']['lists'][':id']['$get']>;
    export type GetByIdOutput = InferResponseType<ApiClient['api']['lists'][':id']['$get']>;

    export type UpdateInput = InferRequestType<ApiClient['api']['lists'][':id']['$patch']>;
    export type UpdateOutput = InferResponseType<ApiClient['api']['lists'][':id']['$patch']>;

    export type DeleteInput = InferRequestType<ApiClient['api']['lists'][':id']['$delete']>;
    export type DeleteOutput = InferResponseType<ApiClient['api']['lists'][':id']['$delete']>;
  }

  /**
   * Items API
   */
  export namespace Items {
    export type GetInput = InferRequestType<ApiClient['api']['items']['$get']>;
    export type GetOutput = InferResponseType<ApiClient['api']['items']['$get']>;

    export type CreateInput = InferRequestType<ApiClient['api']['items']['$post']>;
    export type CreateOutput = InferResponseType<ApiClient['api']['items']['$post']>;

    export type GetByIdInput = InferRequestType<ApiClient['api']['items'][':id']['$get']>;
    export type GetByIdOutput = InferResponseType<ApiClient['api']['items'][':id']['$get']>;

    export type UpdateInput = InferRequestType<ApiClient['api']['items'][':id']['$patch']>;
    export type UpdateOutput = InferResponseType<ApiClient['api']['items'][':id']['$patch']>;

    export type DeleteInput = InferRequestType<ApiClient['api']['items'][':id']['$delete']>;
    export type DeleteOutput = InferResponseType<ApiClient['api']['items'][':id']['$delete']>;
  }

  /**
   * Places API
   */
  export namespace Places {
    export type GetInput = InferRequestType<ApiClient['api']['places']['$get']>;
    export type GetOutput = InferResponseType<ApiClient['api']['places']['$get']>;

    export type CreateInput = InferRequestType<ApiClient['api']['places']['$post']>;
    export type CreateOutput = InferResponseType<ApiClient['api']['places']['$post']>;

    export type GetByIdInput = InferRequestType<ApiClient['api']['places'][':id']['$get']>;
    export type GetByIdOutput = InferResponseType<ApiClient['api']['places'][':id']['$get']>;

    export type UpdateInput = InferRequestType<ApiClient['api']['places'][':id']['$patch']>;
    export type UpdateOutput = InferResponseType<ApiClient['api']['places'][':id']['$patch']>;

    export type DeleteInput = InferRequestType<ApiClient['api']['places'][':id']['$delete']>;
    export type DeleteOutput = InferResponseType<ApiClient['api']['places'][':id']['$delete']>;
  }

  /**
   * Trips API
   */
  export namespace Trips {
    export type GetInput = InferRequestType<ApiClient['api']['trips']['$get']>;
    export type GetOutput = InferResponseType<ApiClient['api']['trips']['$get']>;

    export type CreateInput = InferRequestType<ApiClient['api']['trips']['$post']>;
    export type CreateOutput = InferResponseType<ApiClient['api']['trips']['$post']>;

    export type GetByIdInput = InferRequestType<ApiClient['api']['trips'][':id']['$get']>;
    export type GetByIdOutput = InferResponseType<ApiClient['api']['trips'][':id']['$get']>;

    export type UpdateInput = InferRequestType<ApiClient['api']['trips'][':id']['$patch']>;
    export type UpdateOutput = InferResponseType<ApiClient['api']['trips'][':id']['$patch']>;

    export type DeleteInput = InferRequestType<ApiClient['api']['trips'][':id']['$delete']>;
    export type DeleteOutput = InferResponseType<ApiClient['api']['trips'][':id']['$delete']>;
  }

  /**
   * People API
   */
  export namespace People {
    export type GetInput = InferRequestType<ApiClient['api']['people']['$get']>;
    export type GetOutput = InferResponseType<ApiClient['api']['people']['$get']>;

    export type CreateInput = InferRequestType<ApiClient['api']['people']['$post']>;
    export type CreateOutput = InferResponseType<ApiClient['api']['people']['$post']>;

    export type GetByIdInput = InferRequestType<ApiClient['api']['people'][':id']['$get']>;
    export type GetByIdOutput = InferResponseType<ApiClient['api']['people'][':id']['$get']>;

    export type UpdateInput = InferRequestType<ApiClient['api']['people'][':id']['$patch']>;
    export type UpdateOutput = InferResponseType<ApiClient['api']['people'][':id']['$patch']>;

    export type DeleteInput = InferRequestType<ApiClient['api']['people'][':id']['$delete']>;
    export type DeleteOutput = InferResponseType<ApiClient['api']['people'][':id']['$delete']>;
  }

  /**
   * User API
   */
  export namespace User {
    export type GetInput = InferRequestType<ApiClient['api']['user']['$get']>;
    export type GetOutput = InferResponseType<ApiClient['api']['user']['$get']>;

    export type UpdateInput = InferRequestType<ApiClient['api']['user']['$patch']>;
    export type UpdateOutput = InferResponseType<ApiClient['api']['user']['$patch']>;
  }

  /**
   * Admin API
   */
  export namespace Admin {
    export type GetStatsInput = InferRequestType<ApiClient['api']['admin']['stats']['$get']>;
    export type GetStatsOutput = InferResponseType<ApiClient['api']['admin']['stats']['$get']>;
  }
}
