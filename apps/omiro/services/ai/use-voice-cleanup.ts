import { useApiClient } from '@hominem/rpc/react';
import type { VoiceCleanupInput, VoiceCleanupOutput } from '@hominem/rpc/types';
import { emitVoiceEvent } from '@hominem/rpc/voice-events';
import { useCallback, useState } from 'react';

import { parseApiError } from '~/services/api/parse-api-error';

export function useVoiceCleanup() {
  const client = useApiClient();
  const [isCleaningVoice, setIsCleaningVoice] = useState(false);

  const cleanup = useCallback(
    async ({ rawText, locale, source }: VoiceCleanupInput): Promise<VoiceCleanupOutput> => {
      setIsCleaningVoice(true);
      emitVoiceEvent('voice_transcribe_requested', {
        platform: 'mobile-ios',
        provider: 'openrouter',
        transport: 'hono-rpc',
        streamMode: 'request-response',
      });

      try {
        const response = await client.api.voice.cleanup.$post({
          json: locale ? { rawText, locale, source } : { rawText, source },
        });
        if (!response.ok) {
          const error = await parseApiError(response);
          throw new Error(
            typeof error.message === 'string'
              ? error.message
              : `Voice cleanup failed (${response.status})`,
          );
        }

        const data = (await response.json()) as VoiceCleanupOutput;
        emitVoiceEvent('voice_transcribe_succeeded', {
          platform: 'mobile-ios',
          provider: 'openrouter',
          transport: 'hono-rpc',
          streamMode: 'request-response',
          stage: 'complete',
        });
        return data;
      } catch (error) {
        emitVoiceEvent('voice_transcribe_failed', {
          platform: 'mobile-ios',
          provider: 'openrouter',
          transport: 'hono-rpc',
          streamMode: 'request-response',
        });
        throw error;
      } finally {
        setIsCleaningVoice(false);
      }
    },
    [client],
  );

  return { cleanup, isCleaningVoice };
}
