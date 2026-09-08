import { useEffect, useRef, useState } from 'react';

interface EditorSubmissionResult<TRecord> {
  success: boolean;
  error?: string;
  message?: string;
  data?: TRecord;
  operation?: string;
}

interface SubmissionFetcher {
  state: string;
  data: unknown;
}

interface UseCareerEditorSubmissionOptions<TRecord> {
  fetcher: SubmissionFetcher;
  errorMessage: string;
  onSuccess?: (result: EditorSubmissionResult<TRecord>) => void;
}

export function useCareerEditorSubmission<TRecord>({
  fetcher,
  errorMessage,
  onSuccess,
}: UseCareerEditorSubmissionOptions<TRecord>) {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const handledResultRef = useRef<unknown>(null);

  useEffect(() => {
    if (fetcher.state === 'submitting') {
      setSubmissionError(null);
      return;
    }

    if (
      fetcher.state !== 'idle' ||
      !fetcher.data ||
      Object.is(handledResultRef.current, fetcher.data)
    ) {
      return;
    }

    handledResultRef.current = fetcher.data;
    const result = fetcher.data as EditorSubmissionResult<TRecord>;

    if (result.success === false) {
      setSubmissionError(result.error || errorMessage);
      return;
    }

    setSubmissionError(null);
    onSuccess?.(result);
  }, [errorMessage, fetcher.data, fetcher.state, onSuccess]);

  return {
    submissionError,
    clearSubmissionError: () => setSubmissionError(null),
    setSubmissionError,
  };
}
