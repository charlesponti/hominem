import { useMutation } from '@tanstack/react-query';
import type { VoiceErrorCode } from '@hominem/services/voice-transcription';

// Shape returned by /api/voice/transcribe on success
interface TranscribeSuccessResponse {
  text: string;
  language?: string;
  duration?: number;
}

interface TranscribeErrorResponse {
  error: string;
  code?: string;
}

export interface TranscribeVariables {
  audioBlob: Blob;
  language?: string;
}

export interface TranscribeResult {
  text: string;
}

export function useTranscribe() {
  return useMutation<TranscribeResult, Error, TranscribeVariables>({
    mutationFn: async ({ audioBlob, language }) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      if (language) {
        formData.append('language', language);
      }

      const apiBase = import.meta.env.VITE_PUBLIC_API_URL as string;
      const response = await fetch(`${apiBase}/api/voice/transcribe`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as TranscribeErrorResponse;
        const error = new Error(err.error ?? 'Transcription failed');
        if (err.code) {
          (error as Error & { code?: VoiceErrorCode | string }).code = err.code;
        }
        throw error;
      }

      const payload = (await response.json()) as TranscribeSuccessResponse;
      return { text: payload.text };
    },
  });
}
