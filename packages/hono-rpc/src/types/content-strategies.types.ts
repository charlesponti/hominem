/**
 * Content Strategies Domain Types
 *
 * Single source of truth for all content-strategy-related API contracts.
 * These types are:
 * - Explicit (not inferred from code)
 * - Computed once, referenced everywhere
 * - Safe to import directly by apps and clients
 *
 * Import directly from specific type paths to avoid barrel imports.
 */

import type { ContentStrategy, ContentStrategiesOutput } from '@hominem/db/types/content';

import { z } from 'zod';

// ============================================================================
// LIST CONTENT STRATEGIES
// ============================================================================

export type ContentStrategiesListOutput = ContentStrategiesOutput[];

// ============================================================================
// GET CONTENT STRATEGY
// ============================================================================

export type ContentStrategiesGetOutput = ContentStrategiesOutput;

// ============================================================================
// CREATE CONTENT STRATEGY
// ============================================================================

export const contentStrategiesCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  strategy: z.any().optional(),
});

export type ContentStrategiesCreateInput = z.infer<typeof contentStrategiesCreateSchema>;
export type ContentStrategiesCreateOutput = ContentStrategiesOutput;

// ============================================================================
// UPDATE CONTENT STRATEGY
// ============================================================================

export const contentStrategiesUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  strategy: z.any().optional(),
});

export type ContentStrategiesUpdateInput = z.infer<typeof contentStrategiesUpdateSchema>;
export type ContentStrategiesUpdateOutput = ContentStrategiesOutput;

// ============================================================================
// DELETE CONTENT STRATEGY
// ============================================================================

export type ContentStrategiesDeleteOutput = null;

// ============================================================================
// GENERATE CONTENT STRATEGY
// ============================================================================

export const contentStrategiesGenerateSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  audience: z.string().min(1, 'Audience is required'),
  platforms: z.array(z.string()).min(1, 'At least one platform is required'),
});

export type ContentStrategiesGenerateInput = z.infer<typeof contentStrategiesGenerateSchema>;
export type ContentStrategiesGenerateOutput = ContentStrategy;
