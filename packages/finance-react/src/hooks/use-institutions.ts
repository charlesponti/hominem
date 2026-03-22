import type { InstitutionsListOutput } from '@hominem/rpc/types/finance.types';

import { useRpcQuery } from '@hominem/rpc/react';

export const useAllInstitutions = () =>
  useRpcQuery<InstitutionsListOutput>(['finance', 'institutions', 'list'], ({ finance }) =>
    finance.listInstitutions(),
  );
