import { useApiClient } from '@hominem/rpc/react';
import type { EnhanceTextInput, EnhanceTextOutput } from '@hominem/rpc/types';
import { useCallback, useState } from 'react';

import { parseApiError } from '~/services/api/parse-api-error';

export function useTextEnhance() {
  const client = useApiClient();
  const [isEnhancing, setIsEnhancing] = useState(false);

  const enhance = useCallback(
    async ({ text, instruction }: EnhanceTextInput): Promise<string> => {
      setIsEnhancing(true);
      try {
        const response = await client.api.enhance.enhance.$post({
          json: instruction ? { text, instruction } : { text },
        });
        if (!response.ok) {
          const error = await parseApiError(response);
          throw new Error(
            typeof error.message === 'string'
              ? error.message
              : `Text enhance failed (${response.status})`,
          );
        }

        const data = (await response.json()) as EnhanceTextOutput;
        return data.text;
      } finally {
        setIsEnhancing(false);
      }
    },
    [client],
  );

  return { enhance, isEnhancing };
}
