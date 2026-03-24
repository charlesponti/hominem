import { useMutation } from '@tanstack/react-query';
import type { VoiceErrorCode } from '@hominem/services/voice-transcription';

interface TranscribeResponse {
  success: true;
  transcription: { text: string };
}

interface TranscribeErrorResponse {
  success: false;
  error: string;
  code?: string;
}

type TranscribeApiResponse = TranscribeResponse | TranscribeErrorResponse;

export interface TranscribeVariables {
  audioBlob: Blob;
}

export interface TranscribeResult {
  text: string;
}

export function useTranscribe() {
  return useMutation<TranscribeResult, Error, TranscribeVariables>({
    mutationFn: async ({ audioBlob }) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const apiBase = import.meta.env.VITE_PUBLIC_API_URL as string;
      const response = await fetch(`${apiBase}/api/mobile/voice/transcribe`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = (await response.json()) as TranscribeApiResponse;

      if (!response.ok || !payload.success) {
        const errorCode = !payload.success ? payload.code : undefined;
        const errorMessage = !payload.success ? payload.error : 'Transcription failed';
        const error = new Error(errorMessage);
        if (errorCode) {
          (error as Error & { code?: VoiceErrorCode | string }).code = errorCode;
        }
        throw error;
      }

      return { text: payload.transcription.text };
    },
  });
}
