import { useRpcQuery } from '@hominem/rpc/react';

export const useAllInstitutions = () =>
  useRpcQuery(({ finance }) => finance.listInstitutions(), {
    queryKey: ['finance', 'institutions', 'list'],
  });
