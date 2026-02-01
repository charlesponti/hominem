import { z } from 'zod';

// Author schema
const authorSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  name: z.null(),
  metadata: z.record(z.string(), z.any()).default({}),
});

// Content schema
const contentSchema = z.object({
  content_type: z.enum(['text']),
  parts: z.array(z.string()),
});

// Message schema
const messageSchema = z.object({
  id: z.string(),
  author: authorSchema,
  create_time: z.number().nullable(),
  update_time: z.number().nullable(),
  content: contentSchema,
  status: z.enum(['finished_successfully']),
  end_turn: z.boolean().nullable(),
  weight: z.number(),
  metadata: z.record(z.string(), z.any()),
  recipient: z.string(),
  channel: z.null(),
});

// Node schema
export const nodeSchema = z.object({
  id: z.string(),
  message: messageSchema.nullable(),
  parent: z.string().nullable(),
  children: z.array(z.string()),
});

// Conversation schema
export const conversationSchema = z.object({
  title: z.string(),
  create_time: z.number(),
  update_time: z.number(),
  mapping: z.record(z.string(), nodeSchema),
  moderation_results: z.array(z.any()),
  current_node: z.string(),
  plugin_ids: z.null(),
  conversation_id: z.string(),
  conversation_template_id: z.null(),
  gizmo_id: z.null(),
  gizmo_type: z.null(),
  is_archived: z.boolean(),
  is_starred: z.null(),
  safe_urls: z.array(z.string()),
  default_model_slug: z.string(),
  conversation_origin: z.null(),
  voice: z.null(),
  async_status: z.null(),
  disabled_tool_ids: z.array(z.string()),
});

// Type for the conversation
export type Conversation = z.infer<typeof conversationSchema>;
