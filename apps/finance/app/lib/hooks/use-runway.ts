import type {
  RunwayCalculateInput,
  RunwayCalculateOutput,
} from '@hominem/hono-rpc/types/finance.types';

import { useHonoMutation } from '~/lib/api';

export const useCalculateRunway = () => {
  return useHonoMutation<RunwayCalculateOutput, RunwayCalculateInput>(
    ({ finance }, variables) => finance.calculateRunway(variables),
  );
};
