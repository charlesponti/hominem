/**
 * @hominem/chat/types
 *
 * Pure-types barrel for environments that only need contracts.
 */
export * from './chat.types';
export * from './capture-types';
export * from './generation-machine';
export * from './generation-interpreter';
export * from './generation-events';
export * from './generation-projection';
export * from './generation-coordinator';
export type {
  ChatGenerationLifecycle,
  ChatClient,
  ChatModel,
  ChatOptions,
  ChatTools,
  CreateGenerationInput,
  Generation,
} from './chat-sdk';
