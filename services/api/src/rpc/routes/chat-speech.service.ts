import { synthesizeSpeech } from '@hominem/ai';
import { logger } from '@hominem/telemetry';

// Long assistant replies aren't the walkie-talkie use case (short spoken
// exchanges) — cap what gets synthesized so a verbose reply doesn't blow up
// latency/cost on the speech leg.
const CHAT_SPEECH_MAX_CHARS = 2000;

export type ChatSpeechServiceResult =
  | { kind: 'success'; buffer: Buffer; mimeType: string }
  | { kind: 'error'; message: string };

type ChatSpeechDependencies = {
  synthesize: typeof synthesizeSpeech;
  logError: (message: string, context: Record<string, unknown>) => void;
};

const DEFAULT_DEPS: ChatSpeechDependencies = {
  synthesize: synthesizeSpeech,
  logError: (message, context) => logger.error(message, context),
};

export async function synthesizeChatReplySpeech(
  text: string,
  deps: ChatSpeechDependencies = DEFAULT_DEPS,
): Promise<ChatSpeechServiceResult> {
  const trimmed = text.trim().slice(0, CHAT_SPEECH_MAX_CHARS);

  if (!trimmed) {
    return { kind: 'error', message: 'No text to synthesize' };
  }

  try {
    const { buffer, mimeType } = await deps.synthesize({ text: trimmed });
    return { kind: 'success', buffer, mimeType };
  } catch (error) {
    deps.logError('[chat-speech] synthesis failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      kind: 'error',
      message: error instanceof Error ? error.message : 'Speech synthesis failed',
    };
  }
}
