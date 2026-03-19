import { useApiClient } from '@hominem/hono-client/react';
import { useQuery } from '@tanstack/react-query';

import { validateNotesResponse } from '~/utils/validation/schemas';

import { noteToFocusItem } from './local-focus';
import { focusKeys } from './query-keys';
import type { FocusItems, FocusResponse } from './types';

export const useFocusQuery = ({
  onError,
  onSuccess,
}: {
  onError?: (error: Error) => void;
  onSuccess?: (data: FocusResponse) => void;
}) => {
  const client = useApiClient();

  return useQuery<FocusItems | null>({
    queryKey: focusKeys.all,
    queryFn: async () => {
      try {
        const payload = validateNotesResponse(await client.notes.listFocusItems());
        const mapped = payload.notes.map(noteToFocusItem);

        onSuccess?.({ items: mapped });
        return mapped;
      } catch (error) {
        onError?.(error as Error);
        return null;
      }
    },
  });
};
