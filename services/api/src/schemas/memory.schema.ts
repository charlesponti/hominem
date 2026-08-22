import * as z from 'zod';

// ── remember ─────────────────────────────────────────────────────────

export const rememberInputSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  title: z.string().trim().min(1).max(200).optional(),
});

export const rememberOutputSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  excerpt: z.string().nullable(),
  createdAt: z.string(),
});

const memorySummarySchema = rememberOutputSchema;

// ── list_memories ────────────────────────────────────────────────────

export const listMemoriesInputSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});

export const listMemoriesOutputSchema = z.object({
  memories: z.array(memorySummarySchema),
});

// ── search_memories ──────────────────────────────────────────────────

export const searchMemoriesInputSchema = z.object({
  query: z.string().trim().min(1),
  limit: z.number().int().min(1).max(50).optional(),
});

export const searchMemoriesOutputSchema = listMemoriesOutputSchema;

// ── forget_memory ────────────────────────────────────────────────────

export const forgetMemoryInputSchema = z.object({
  id: z.string().uuid(),
});

export const forgetMemoryOutputSchema = z.object({
  removed: z.boolean(),
});

// ── RPC-only (web) ──────────────────────────────────────────────────

export const MemoryParamSchema = z.object({ id: z.uuid() });

export const UpdateMemoryInputSchema = z.object({
  title: z.string().trim().min(1).max(200).nullish(),
  content: z.string().trim().min(1).max(4000).optional(),
});
