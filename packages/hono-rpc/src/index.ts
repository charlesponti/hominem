import type { AppContext } from './middleware/auth';

import { app } from './app';

/**
 * Export app for server setup
 */
export { app };

/**
 * App Type - use this for type-safe client instantiation
 *
 * Example usage in type inference:
 *   import type { AppType } from '@hominem/hono-rpc'
 *   import { hc } from 'hono/client'
 *
 *   type ApiClient = ReturnType<typeof hc<AppType>>
 *
 * NOTE: Re-exported from app.type.ts to defer expensive type computation
 */
export type { AppType } from './app.type';

/**
 * Routes - re-exported for convenience
 */
import { adminRoutes } from './routes/admin';
import { financeRoutes } from './routes/finance';
// Finance Sub-routers for granular type inference
import { accountsRoutes } from './routes/finance.accounts';
import { analyzeRoutes } from './routes/finance.analyze';
import { budgetRoutes } from './routes/finance.budget';
import { categoriesRoutes } from './routes/finance.categories';
import { transactionsRoutes } from './routes/finance.transactions';
import { invitesRoutes } from './routes/invites';
import { itemsRoutes } from './routes/items';
import { listsRoutes } from './routes/lists';
import { peopleRoutes } from './routes/people';
import { placesRoutes } from './routes/places';
import { tripsRoutes } from './routes/trips';
import { userRoutes } from './routes/user';
import { goalsRoutes } from './routes/goals';
import { goalsUnifiedRoutes } from './routes/goals-unified';
import { habitsRoutes } from './routes/habits';
import { healthRoutes } from './routes/health';
import { chatsRoutes } from './routes/chats';
import { messagesRoutes } from './routes/messages';

export {
  adminRoutes,
  financeRoutes,
  invitesRoutes,
  itemsRoutes,
  listsRoutes,
  peopleRoutes,
  placesRoutes,
  tripsRoutes,
  userRoutes,
  goalsRoutes,
  goalsUnifiedRoutes,
  habitsRoutes,
  healthRoutes,
  chatsRoutes,
  messagesRoutes,
};

/**
 * 🚀 PERFORMANCE OPTIMIZED: Granular Route Types
 *
 * Use these instead of AppType when inferring types for specific domains.
 * This prevents TypeScript from checking the entire massive API tree.
 */
export type AdminType = typeof adminRoutes;
export type FinanceType = typeof financeRoutes;
export type InvitesType = typeof invitesRoutes;
export type ItemsType = typeof itemsRoutes;
export type ListsType = typeof listsRoutes;
export type PeopleType = typeof peopleRoutes;
export type PlacesType = typeof placesRoutes;
export type TripsType = typeof tripsRoutes;
export type UserType = typeof userRoutes;
export type GoalsType = typeof goalsRoutes;
export type GoalsUnifiedType = typeof goalsUnifiedRoutes;
export type HabitsType = typeof habitsRoutes;
export type HealthType = typeof healthRoutes;
export type ChatsType = typeof chatsRoutes;
export type MessagesType = typeof messagesRoutes;

/**
 * 🎯 Finance Sub-Router Types
 *
 * Using these for inference in finance-heavy views dramatically reduces
 * type instantiation depth and avoids "Type instantiation is excessively deep" errors.
 */
export type FinanceAccountsType = typeof accountsRoutes;
export type FinanceAnalyzeType = typeof analyzeRoutes;
export type FinanceBudgetType = typeof budgetRoutes;
export type FinanceCategoriesType = typeof categoriesRoutes;
export type FinanceTransactionsType = typeof transactionsRoutes;

/**
 * Types - re-exported for convenience
 */
export type { AppContext };
export * from './types';
