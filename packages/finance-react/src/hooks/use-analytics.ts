import { format } from 'date-fns';

import { useHonoQuery } from '@hominem/hono-client/react';

import type { CategoriesListOutput, TagBreakdownOutput } from '@hominem/hono-rpc/types/finance.types';


interface TagBreakdownParams {
  from?: Date | undefined;
  to?: Date | undefined;
  account?: string | undefined;
  tag?: string | undefined;
  limit?: number | undefined;
}

/**
 * Hook for fetching tag breakdown analytics
 */
export function useTagBreakdown({ from, to, account, tag, limit = 5 }: TagBreakdownParams) {
  return useHonoQuery<TagBreakdownOutput>(
    [
      'finance',
      'analyze',
      'tag-breakdown',
      {
        from: from?.toISOString(),
        to: to?.toISOString(),
        account,
        tag,
        limit,
      },
    ],
    ({ finance }) =>
      finance.getTagBreakdown({
        ...(from ? { from: format(from, 'yyyy-MM-dd') } : {}),
        ...(to ? { to: format(to, 'yyyy-MM-dd') } : {}),
        ...(tag ? { tag } : {}),
        limit,
      }),
    {
      staleTime: 5 * 60 * 1000,
    },
  );
}

/**
 * Hook for fetching list of finance tags
 */
export function useFinanceTags() {
  return useHonoQuery<CategoriesListOutput>(
    ['finance', 'tags', 'list'],
    ({ finance }) => finance.listTags(),
    {
      staleTime: 10 * 60 * 1000,
    },
  );
}
