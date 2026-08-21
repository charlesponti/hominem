import { useApiClient } from '@hominem/rpc/react';
import type { GenerateNoteInput, GenerateNoteOutput } from '@hominem/rpc/types';
import { useCallback, useState } from 'react';

import { parseApiError } from '~/services/api/parse-api-error';

export function useGenerateNote() {
  const client = useApiClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    async ({ transcript, instruction }: GenerateNoteInput): Promise<string> => {
      setIsGenerating(true);
      try {
        const response = await client.api.notes.generate.$post({
          json: instruction ? { transcript, instruction } : { transcript },
        });
        if (!response.ok) {
          const error = await parseApiError(response);
          throw new Error(
            typeof error.message === 'string'
              ? error.message
              : `Note generation failed (${response.status})`,
          );
        }

        const data = (await response.json()) as GenerateNoteOutput;
        return data.text;
      } finally {
        setIsGenerating(false);
      }
    },
    [client],
  );

  return { generate, isGenerating };
}
