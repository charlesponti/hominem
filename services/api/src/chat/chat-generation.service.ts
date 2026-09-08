import {
  regenerate,
  respondToConfirmation,
  sendMessage,
  startMessage,
} from './chat-generation-commands';
import { send, start } from './chat-generation-execute';
import { cancel, getGeneration, recover, replay } from './chat-generation-lifecycle';
import type { ChatGenerationDependencies } from './chat-generation-types';

export function createChatGenerationService(dependencies: ChatGenerationDependencies = {}) {
  return {
    regenerate: (input: Parameters<typeof regenerate>[1]) => regenerate(dependencies, input),
    startMessage: (input: Parameters<typeof startMessage>[1]) => startMessage(dependencies, input),
    sendMessage: (input: Parameters<typeof sendMessage>[1]) => sendMessage(dependencies, input),
    send: (input: Parameters<typeof send>[1]) => send(dependencies, input),
    start: (input: Parameters<typeof start>[1]) => start(dependencies, input),
    respondToConfirmation: (input: Parameters<typeof respondToConfirmation>[1]) =>
      respondToConfirmation(dependencies, input),
    replay,
    getGeneration,
    recover,
    cancel: (input: Parameters<typeof cancel>[1]) => cancel(dependencies, input),
  };
}

export type ChatGenerationService = ReturnType<typeof createChatGenerationService>;

export const chatGenerationService = createChatGenerationService();

export { ChatGenerationInputError } from './chat-generation-errors';
export { AsyncEventQueue } from './async-event-queue';
export type {
  CancelInput,
  GenerationStartInput,
  ReplayInput,
  SendGenerationInput,
  StartGenerationInput,
} from './chat-generation-types';
