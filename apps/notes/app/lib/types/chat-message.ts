import type { AppRouterOutputs } from '@hominem/trpc';

// Get the inferred type from the tRPC query using RouterOutput
export type MessageFromQuery = AppRouterOutputs['chats']['getMessages'][0];

// Extend the inferred message type with client-side properties
export type ExtendedMessage = MessageFromQuery & {
  isStreaming?: boolean;
};
