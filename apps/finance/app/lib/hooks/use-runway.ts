import type {
  RunwayCalculateInput,
  RunwayCalculateOutput,
} from '@hominem/hono-rpc/types/finance.types';

import { useHonoMutation } from '../hono';

interface PlannedPurchase {
  description: string;
  amount: number;
  date: string;
}

interface RunwayInput {
  balance: number;
  monthlyExpenses: number;
  plannedPurchases: PlannedPurchase[];
}

export const useCalculateRunway = () => {
  return useHonoMutation<RunwayCalculateOutput, RunwayCalculateInput>(async (client, variables) => {
    const res = await client.api.finance.runway.$post({
      json: variables,
    });
    return res.json();
  });
};
