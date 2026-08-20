export type ChatGenerationStage = 'preparing' | 'saving' | 'stopping' | 'failed' | 'cancelled';

export interface ChatGenerationState {
  id: string;
  chatId: string;
  stage: ChatGenerationStage;
  targetMessageId?: string;
  userMessageId?: string;
  error?: string;
}
