import type { HonoClient } from '@hominem/hono-client';
import type {
  GoalListOutput,
  GoalCreateInput,
  GoalCreateOutput,
  GoalUpdateInput,
  GoalUpdateOutput,
  GoalArchiveOutput,
  GoalDeleteOutput,
  GoalListQuery,
} from '@hominem/hono-rpc/types';
import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

/**
 * Get all goals
 */
export const useGoals = (query: GoalListQuery) =>
  useHonoQuery<GoalListOutput>(['goals', 'list', query], async (client: HonoClient) => {
    const res = await client.api.goals.$get({ query });
    return res.json();
  });

/**
 * Create a new goal
 */
export const useCreateGoal = (query: GoalListQuery) => {
  const utils = useHonoUtils();
  return useHonoMutation<GoalCreateOutput, GoalCreateInput>(
    async (client: HonoClient, variables: GoalCreateInput) => {
      const res = await client.api.goals.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['goals', 'list', query]);
      },
    },
  );
};

/**
 * Update an existing goal
 */
export const useUpdateGoal = (query: GoalListQuery) => {
  const utils = useHonoUtils();
  return useHonoMutation<GoalUpdateOutput, { id: string; json: GoalUpdateInput }>(
    async (client: HonoClient, variables: { id: string; json: GoalUpdateInput }) => {
      const { id, json } = variables;
      const res = await client.api.goals[':id'].$patch({
        param: { id },
        json,
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['goals', 'list', query]);
      },
    },
  );
};

/**
 * Archive a goal
 */
export const useArchiveGoal = (query: GoalListQuery) => {
  const utils = useHonoUtils();
  return useHonoMutation<GoalArchiveOutput, { id: string }>(
    async (client: HonoClient, variables: { id: string }) => {
      const { id } = variables;
      const res = await client.api.goals[':id'].archive.$post({
        param: { id },
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['goals', 'list', query]);
      },
    },
  );
};

/**
 * Delete a goal
 */
export const useDeleteGoal = (query: GoalListQuery) => {
  const utils = useHonoUtils();
  return useHonoMutation<GoalDeleteOutput, { id: string }>(
    async (client: HonoClient, variables: { id: string }) => {
      const { id } = variables;
      const res = await client.api.goals[':id'].$delete({
        param: { id },
      });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['goals', 'list', query]);
      },
    },
  );
};
