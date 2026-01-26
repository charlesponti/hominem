import { vi } from 'vitest';

import type { List, Place } from '~/lib/types';
import {
  useLists,
  useListById,
  useNearbyPlaces,
  usePlacesAutocomplete,
  usePlaceById,
  useDeleteAccount,
  useUpdateList,
} from '~/lib/hono';

import { type MockMutationResult, type MockQueryResult } from '~/test/utils';

export class RoccoMocker {
  mockListsGetAll(data: List[] | undefined, isLoading = false, error: Error | null = null) {
    vi.mocked(useLists).mockReturnValue({
      data: data ? { success: true, data } : undefined,
      isLoading,
      error,
    } as any);
  }

  mockListsGetById(data: List | undefined, isLoading = false, error: Error | null = null) {
    vi.mocked(useListById).mockReturnValue({
      data: data ? { success: true, data } : undefined,
      isLoading,
      error,
    } as any);
  }

  mockPlacesGetNearbyFromLists(
    data: Place[] | undefined,
    isLoading = false,
    error: Error | null = null,
  ) {
    vi.mocked(useNearbyPlaces).mockReturnValue({
      data: data ? { success: true, data } : undefined,
      isLoading,
      error,
    } as any);
  }

  mockPlacesAutocomplete(
    data: Array<unknown> | undefined,
    isLoading = false,
    error: Error | null = null,
  ) {
    vi.mocked(usePlacesAutocomplete).mockReturnValue({
      data: data ? { success: true, data } : undefined,
      isLoading,
      error,
    } as any);
  }

  mockPlacesGetById(data: Place | undefined, isLoading = false, error: Error | null = null) {
    vi.mocked(usePlaceById).mockReturnValue({
      data: data ? { success: true, data } : undefined,
      isLoading,
      error,
    } as any);
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
    vi.mocked(useDeleteAccount).mockReturnValue(mockDeleteMutation as any);
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
    vi.mocked(useUpdateList).mockReturnValue(result as any);
  }
}

export const roccoMocker = new RoccoMocker();
