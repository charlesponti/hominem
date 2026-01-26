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
    // Cast client to any to avoid "Property 'runway' does not exist" error
    // which seems to be a TypeScript inference issue with the generated client types
    const res = await (client as any).api.finance.runway.$post({
      json: variables,
    });
    return res.json();
  });
};
