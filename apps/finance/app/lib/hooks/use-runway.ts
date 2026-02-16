import type {
  RunwayCalculateInput,
  RunwayCalculateOutput,
} from '@hominem/hono-rpc/types/finance.types';

import { useHonoMutation } from '~/lib/api';

export const useCalculateRunway = () => {
  return useHonoMutation<RunwayCalculateOutput, RunwayCalculateInput>(async (client, variables) => {
    const res = await client.api.finance.runway.calculate.$post({
      json: variables,
    });
    return res.json() as unknown as Promise<RunwayCalculateOutput>;
  });
};
