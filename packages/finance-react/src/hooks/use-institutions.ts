import type { InstitutionsListOutput } from '@hominem/rpc/types/finance.types';

import { useHonoQuery } from '@hominem/rpc/react';

export const useAllInstitutions = () =>
  useHonoQuery<InstitutionsListOutput>(['finance', 'institutions', 'list'], ({ finance }) =>
    finance.listInstitutions(),
  );
