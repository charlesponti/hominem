import { vi } from 'vitest';

import type { List, Place } from '~/lib/types';

import { type MockMutationResult, type MockQueryResult, mockTrpcClient } from '~/test/utils';

export class RoccoMocker {
  mockListsGetAll(data: List[] | undefined, isLoading = false, error: Error | null = null) {
    mockTrpcClient.lists.getAll.useQuery.mockReturnValue({
      data,
      isLoading,
      error,
    } as MockQueryResult<List[]>);
  }

  mockListsGetById(data: List | undefined, isLoading = false, error: Error | null = null) {
    mockTrpcClient.lists.getById.useQuery.mockReturnValue({
      data,
      isLoading,
      error,
    } as MockQueryResult<List>);
  }

  mockPlacesGetNearbyFromLists(
    data: Place[] | undefined,
    isLoading = false,
    error: Error | null = null,
  ) {
    mockTrpcClient.places.getNearbyFromLists.useQuery.mockReturnValue({
      data,
      isLoading,
      error,
    } as MockQueryResult<Place[]>);
  }

  mockPlacesAutocomplete(
    data: Array<unknown> | undefined,
    isLoading = false,
    error: Error | null = null,
  ) {
    mockTrpcClient.places.autocomplete.useQuery.mockReturnValue({
      data,
      isLoading,
      error,
    } as MockQueryResult<Array<unknown>>);
  }

  mockPlacesGetById(data: Place | undefined, isLoading = false, error: Error | null = null) {
    mockTrpcClient.places.getById.useQuery.mockReturnValue({
      data,
      isLoading,
      error,
    } as MockQueryResult<Place>);
  }

  mockUserDeleteAccountMutation(overrides?: Partial<Record<string, unknown>>) {
    const mockDeleteMutation = {
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isLoading: false,
      isError: false,
      error: null,
      ...overrides,
    };
    mockTrpcClient.user.deleteAccount.useMutation.mockReturnValue(
      mockDeleteMutation as unknown as ReturnType<
        typeof mockTrpcClient.user.deleteAccount.useMutation
      >,
    );
  }

  mockListsUpdateMutation(overrides?: Partial<MockMutationResult>) {
    const result: MockMutationResult = {
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      data: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      isPending: false,
      reset: vi.fn(),
      ...overrides,
    };
    (
      mockTrpcClient.lists.update.useMutation as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(result);
  }
}

export const roccoMocker = new RoccoMocker();
