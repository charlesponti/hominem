import { useApiClient } from '@hominem/rpc/react';
import type { TasksParseInput, TasksParseOutput } from '@hominem/rpc/types';
import { useMutation } from '@tanstack/react-query';

function localISOString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const oh = pad(Math.floor(Math.abs(offset) / 60));
  const om = pad(Math.abs(offset) % 60);
  return `${y}-${mo}-${d}T${h}:${mi}:${s}${sign}${oh}:${om}`;
}

export function useTimeBlockParse() {
  const client = useApiClient();

  return useMutation<
    TasksParseOutput,
    Error,
    Pick<TasksParseInput, 'transcript' | 'conversationContext' | 'calendarContext'>
  >({
    mutationFn: async ({ transcript, conversationContext, calendarContext }) => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await client.api.tasks.parse.$post({
        json: {
          transcript,
          conversationContext,
          calendarContext,
          referenceDate: localISOString(new Date()),
          timezone: timeZone,
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
