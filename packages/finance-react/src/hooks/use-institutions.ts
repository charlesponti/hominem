import type { InstitutionsListOutput } from '@hominem/hono-rpc/types/finance.types';

import { useHonoQuery } from '@hominem/hono-client/react';

export const useAllInstitutions = () =>
  useHonoQuery<InstitutionsListOutput>(['finance', 'institutions', 'list'], ({ finance }) =>
    finance.listInstitutions(),
  );
