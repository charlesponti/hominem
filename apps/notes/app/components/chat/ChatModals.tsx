import type { VoiceErrorCode } from '@hominem/services';

import { Button } from '@hominem/ui/button';
import { Loader2, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import type { UploadedFile } from '~/lib/types/upload.js';

import { emitVoiceEvent } from '~/lib/voice-events';

import { SpeechInput } from '../ai-elements/speech-input.js';
import { FileUploader } from './FileUploader.js';

interface ChatModalsProps {
  showFileUploader: boolean;
  showAudioRecorder: boolean;
  onCloseFileUploader: () => void;
  onCloseAudioRecorder: () => void;
  onFilesUploaded: (files: UploadedFile[]) => void;
  onAudioTranscribed: (transcript: string) => Promise<void>;
}

type TranscribeApiResponse =
  | {
      success: true;
      transcription: { text: string };
    }
  | {
      success: false;
      error: string;
      code?: string;
    };

export function ChatModals({
  showFileUploader,
  showAudioRecorder,
  onCloseFileUploader,
  onCloseAudioRecorder,
  onFilesUploaded,
  onAudioTranscribed,
}: ChatModalsProps) {
  const [isSubmittingTranscript, setIsSubmittingTranscript] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const transcribeAudioBlob = useCallback(async (audioBlob: Blob) => {
    emitVoiceEvent('voice_transcribe_requested', {
      platform: 'web',
      mimeType: audioBlob.type,
      sizeBytes: audioBlob.size,
    });

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });
    const payload = (await response.json()) as TranscribeApiResponse;

    if (!response.ok || !payload.success) {
      const code: VoiceErrorCode | undefined = payload.success
        ? undefined
        : isVoiceErrorCode(payload.code)
          ? payload.code
          : undefined;
      emitVoiceEvent('voice_transcribe_failed', {
        platform: 'web',
        mimeType: audioBlob.type,
        sizeBytes: audioBlob.size,
        ...(code ? { errorCode: code } : {}),
      });
      throw new Error(payload.success ? 'Transcription failed' : payload.error);
    }

    emitVoiceEvent('voice_transcribe_succeeded', {
      platform: 'web',
      mimeType: audioBlob.type,
      sizeBytes: audioBlob.size,
    });
    return payload.transcription.text;
  }, []);

  const handleVoiceTranscription = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) {
        return;
      }
      setIsSubmittingTranscript(true);
      setVoiceError(null);
      try {
        await onAudioTranscribed(transcript.trim());
        onCloseAudioRecorder();
      } catch (error) {
        setVoiceError(error instanceof Error ? error.message : 'Failed to send transcript');
      } finally {
        setIsSubmittingTranscript(false);
      }
    },
    [onAudioTranscribed, onCloseAudioRecorder],
  );

  return (
    <>
      {showFileUploader ? (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="border p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Upload Files</h3>
              <Button variant="ghost" size="sm" onClick={onCloseFileUploader}>
                <X className="size-4" />
              </Button>
            </div>
            <FileUploader onFilesUploaded={onFilesUploaded} maxFiles={5} />
          </div>
        </div>
      ) : null}

      {showAudioRecorder ? (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="border p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Record Audio</h3>
              <Button variant="ghost" size="sm" onClick={onCloseAudioRecorder}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <SpeechInput
                aria-label="Record audio message"
                onAudioRecorded={transcribeAudioBlob}
                onTranscriptionChange={(text) => {
                  void handleVoiceTranscription(text);
                }}
              />
              {isSubmittingTranscript ? <Loader2 className="size-4 animate-spin" /> : null}
              <span className="text-sm text-muted-foreground">
                Tap to record, tap again to stop
              </span>
            </div>
            {voiceError ? <p className="text-sm text-destructive">{voiceError}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function isVoiceErrorCode(code: string | undefined): code is VoiceErrorCode {
  return (
    code === 'INVALID_FORMAT' ||
    code === 'TOO_LARGE' ||
    code === 'AUTH' ||
    code === 'QUOTA' ||
    code === 'TRANSCRIBE_FAILED'
  );
}
