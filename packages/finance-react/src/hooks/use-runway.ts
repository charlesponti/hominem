import { useRpcMutation } from '@hominem/rpc/react';
import type { RunwayCalculateInput, RunwayCalculateOutput } from '@hominem/rpc/types/finance.types';

export const useCalculateRunway = () => {
  return useRpcMutation<RunwayCalculateOutput, RunwayCalculateInput>(({ finance }, variables) =>
    finance.calculateRunway(variables),
  );
};
