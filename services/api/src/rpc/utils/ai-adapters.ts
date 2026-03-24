/**
 * Type adapters for AI SDK integration
 *
 * The AI SDK uses its own type definitions (CoreMessage, ToolSet) that don't
 * exactly match our internal database types. This module provides type-safe
 * adapters to bridge the gap.
 */

import type { ChatMessageRole } from '@hominem/chat-services';
import type { CoreMessage } from 'ai';

/**
 * Convert a history message to CoreMessage format
 *
 * Our ChatMessageRole is compatible with AI SDK roles, but CoreMessage
 * is a discriminated union where the structure depends on the role.
 * We handle user/system/assistant directly and provide a fallback for tool output.
 */
export function toCoreMessage(message: { role: ChatMessageRole; content: string }): CoreMessage {
  // Our ChatMessageRole ('user' | 'assistant' | 'tool') is compatible
  // with the AI SDK's role types. We just need to provide the right
  // structure for each role type.
  if (message.role === 'user') {
    return {
      role: 'user',
      content: message.content,
    };
  } else if (message.role === 'system') {
    return {
      role: 'system',
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
