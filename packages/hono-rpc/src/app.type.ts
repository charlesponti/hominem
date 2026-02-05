/**
 * app.type.ts
 *
 * Separated type file for AppType inference.
 * This file is only loaded when explicitly imported, preventing
 * the expensive type computation from blocking other type checks.
 *
 * Import this only where AppType is needed (clients, typed routes).
 */

import type { app } from './app';
import type { vitalRoutes } from './routes/vital';
import type { knowledgeRoutes } from './routes/knowledge';
import type { socialRoutes } from './routes/social';
import type { economyRoutes } from './routes/economy';
import type { worldRoutes } from './routes/world';
import type { systemRoutes } from './routes/system';

/**
 * Domain-specific router types
 *
 * Breaking the AppType into smaller domain types reduces TypeScript's
 * type depth computation and makes type checking faster.
 */
export type VitalAppType = typeof vitalRoutes;
export type KnowledgeAppType = typeof knowledgeRoutes;
export type SocialAppType = typeof socialRoutes;
export type EconomyAppType = typeof economyRoutes;
export type WorldAppType = typeof worldRoutes;
export type SystemAppType = typeof systemRoutes;

/**
 * AppType - Type representing the entire API structure
 *
 * Used for type-safe client instantiation and response type inference.
 * This type captures the complete API shape including all routes and methods.
 *
 * NOTE: This type is expensive to compute; import sparingly.
 * For better performance, consider using domain-specific types above.
 */
export type AppType = typeof app;
