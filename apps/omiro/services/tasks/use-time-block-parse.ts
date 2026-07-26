import { useApiClient } from '@hominem/rpc/react';
import type { TasksParseInput, TasksParseOutput } from '@hominem/rpc/types';
import { useMutation } from '@tanstack/react-query';

export function useTimeBlockParse() {
  const client = useApiClient();

  return useMutation<
    TasksParseOutput,
    Error,
    Pick<TasksParseInput, 'transcript' | 'conversationContext' | 'calendarContext'>
  >({
    mutationFn: async ({ transcript, conversationContext, calendarContext }) => {
      const res = await client.api.tasks.parse.$post({
        json: {
          transcript,
          conversationContext,
          calendarContext,
          referenceDate: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(
          typeof body.error === 'string' ? body.error : `Time block parsing failed (${res.status})`,
        );
      }
      return res.json();
    },
  });
}
