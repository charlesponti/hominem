export type ChatGenerationStage =
  | 'preparing'
  | 'running'
  | 'awaiting_confirmation'
  | 'saving'
  | 'stopping'
  | 'failed'
  | 'cancelled'
  | 'committed';

export interface ChatGenerationState {
  id: string;
  chatId: string;
  stage: ChatGenerationStage;
  lastDurableSequence: number;
  targetMessageId?: string;
  userMessageId?: string;
  error?: string;
}
