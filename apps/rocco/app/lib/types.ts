import type { inferRouterOutputs } from '@trpc/server';

import type { AppRouter } from './trpc/router';

export * from './shared-types';

type RouterOutputs = inferRouterOutputs<AppRouter>;

// Extract types from tRPC router outputs
export type List = RouterOutputs['lists']['getAll'][number];
export type SentInvite = RouterOutputs['invites']['getByList'][number];
export type Place = RouterOutputs['places']['getDetailsById'];
export type PlaceWithLists = RouterOutputs['places']['getDetailsById'];
export type Item = RouterOutputs['items']['getByListId'][number];
export type ReceivedInvite = RouterOutputs['invites']['getReceived'][number];
