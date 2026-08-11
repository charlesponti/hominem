import type { CareerEngagementRecord } from '@hominem/db';
import { useFetcher } from 'react-router';

import { useCareerEditorSubmission } from './useCareerEditorSubmission';

export function useWorkExperienceSection({
  errorMessage,
  onSuccess,
}: {
  errorMessage: string;
  onSuccess?: () => void;
}) {
  const fetcher = useFetcher();
  const { submissionError, clearSubmissionError } = useCareerEditorSubmission({
    fetcher,
    errorMessage,
    onSuccess: (result) => {
      if (result.operation === 'update') {
        onSuccess?.();
      }
    },
  });

  return {
    fetcher,
    isSubmitting: fetcher.state !== 'idle',
    submissionError,
    clearSubmissionError,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submitUpdates: (updates: Record<string, any>) =>
      submitPositionUpdates(fetcher, clearSubmissionError, updates),
  };
}

export function submitDelete(
  fetcher: ReturnType<typeof useFetcher>,
  clearSubmissionError: () => void,
  position: CareerEngagementRecord,
) {
  const formData = new FormData();
  formData.append('operation', 'delete');
  formData.append('positionId', position.id);
  clearSubmissionError();
  fetcher.submit(formData, { method: 'POST' });
}

function submitPositionUpdates(
  fetcher: ReturnType<typeof useFetcher>,
  clearSubmissionError: () => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates: Record<string, any>,
) {
  const formData = new FormData();
  formData.append('operation', 'update');
  formData.append('updates', JSON.stringify(updates));
  clearSubmissionError();
  fetcher.submit(formData, { method: 'POST' });
}
