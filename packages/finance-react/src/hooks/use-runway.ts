import type {
  RunwayCalculateInput,
  RunwayCalculateOutput,
} from '@hominem/rpc/types/finance.types';

import { useRpcMutation } from '@hominem/rpc/react';

export const useCalculateRunway = () => {
  return useRpcMutation<RunwayCalculateOutput, RunwayCalculateInput>(({ finance }, variables) =>
    finance.calculateRunway(variables),
  );
};
