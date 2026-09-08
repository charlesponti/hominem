export class ChatGenerationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatGenerationInputError';
  }
}

export function toGenerationFailureMessage(error: unknown): string {
  return error instanceof ChatGenerationInputError ? error.message : 'Generation failed';
}
