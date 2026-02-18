/**
 * Type adapters for AI SDK integration
 *
 * The AI SDK uses its own type definitions (CoreMessage, ToolSet) that don't
 * exactly match our internal database types. This module provides type-safe
 * adapters to bridge the gap.
 */

import type { CoreMessage, ToolSet } from 'ai';
import type { ChatMessageRole } from '@hominem/db/types/chats';

/**
 * Convert a history message to CoreMessage format
 *
 * Our ChatMessageRole is compatible with AI SDK roles, but CoreMessage
 * is a discriminated union where the structure depends on the role.
 * We handle the three roles we use: 'user', 'assistant', and 'tool'.
 */
export function toCoreMessage(message: {
  role: ChatMessageRole;
  content: string;
}): CoreMessage {
  // Our ChatMessageRole ('user' | 'assistant' | 'tool') is compatible
  // with the AI SDK's role types. We just need to provide the right
  // structure for each role type.
  if (message.role === 'user') {
    return {
      role: 'user',
      content: message.content,
    };
  } else if (message.role === 'assistant') {
    return {
      role: 'assistant',
      content: message.content,
    };
  } else {
    // role === 'tool'
    // For tool messages, we need toolCallId and toolName, but we're converting
    // from history where we only have content. This is a fallback case.
    return {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'unknown',
          toolName: 'unknown',
          result: message.content,
        },
      ],
    };
  }
}

/**
 * Type the tools array for Vercel AI SDK
 *
 * FRAMEWORK INTEROPERABILITY NOTE:
 * Our tools use TanStack AI's toolDefinition() which returns a different
 * Tool type than Vercel AI SDK's Tool type. However, at runtime they're
 * compatible because both follow similar conventions (description, parameters,
 * execute function).
 *
 * The type assertion here is necessary because we're deliberately bridging
 * two different AI frameworks. The alternative would be to rewrite all tools
 * to use Vercel AI SDK's tool() function instead of TanStack AI's toolDefinition().
 */
export function typeToolsForAI(tools: unknown[]): ToolSet {
  const toolsObject: Record<string, unknown> = {};

  tools.forEach((tool, index) => {
    // TanStack AI tools have a 'name' property we can use as the key
    const toolWithName = tool as { name?: string };
    const key = toolWithName.name || `tool_${index}`;
    toolsObject[key] = tool;
  });

  // Type assertion: TanStack AI Tool -> Vercel AI SDK Tool
  // These are structurally compatible at runtime
  return toolsObject as ToolSet;
}
