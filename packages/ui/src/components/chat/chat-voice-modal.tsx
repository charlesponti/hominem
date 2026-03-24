import {
  emitVoiceEvent,
  isVoiceErrorCode,
  type VoiceErrorCode,
} from '@hominem/services/voice-events';
import type { UseMutationResult } from '@tanstack/react-query';
import { X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import { SpeechInput } from '../ai-elements';
import { Inline } from '../layout';
import { Button } from '../ui/button';

interface TranscribeResult {
  text: string;
}

interface TranscribeVariables {
  audioBlob: Blob;
  language?: string;
}

export interface ChatVoiceModalProps {
  show: boolean;
  onClose: () => void;
  onTranscribed: (transcript: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  transcribeMutation: UseMutationResult<TranscribeResult, Error, TranscribeVariables>;
}

export function ChatVoiceModal({
  show,
  onClose,
  onTranscribed,
  onRecordingStateChange,
  transcribeMutation,
}: ChatVoiceModalProps) {
  const { mutateAsync, error } = transcribeMutation;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    closeButtonRef.current?.focus();
  }, [show]);

  useEffect(() => {
    if (!show) return;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [show]);

  const transcribeAudioBlob = useCallback(
    async (audioBlob: Blob) => {
      setPermissionError(null);

      emitVoiceEvent('voice_transcribe_requested', {
        platform: 'web',
        mimeType: audioBlob.type,
        sizeBytes: audioBlob.size,
      });

      try {
        const preferredLanguage = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
        const result = await mutateAsync({ audioBlob, language: preferredLanguage });

        emitVoiceEvent('voice_transcribe_succeeded', {
          platform: 'web',
          mimeType: audioBlob.type,
          sizeBytes: audioBlob.size,
        });

        return result.text;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Transcription failed';
        const errorCode =
          err instanceof Error && 'code' in err
            ? (err as Error & { code?: string }).code
            : undefined;

        // Only emit error code if it's a valid VoiceErrorCode
        if (errorCode && isVoiceErrorCode(errorCode)) {
          emitVoiceEvent('voice_transcribe_failed', {
            platform: 'web',
            mimeType: audioBlob.type,
            sizeBytes: audioBlob.size,
            errorCode: errorCode as VoiceErrorCode,
          });
        } else {
          emitVoiceEvent('voice_transcribe_failed', {
            platform: 'web',
            mimeType: audioBlob.type,
            sizeBytes: audioBlob.size,
          });
        }

        throw new Error(errorMessage);
      }
    },
    [mutateAsync],
  );

  const handleVoiceTranscription = useCallback(
    (transcript: string) => {
      if (!transcript.trim()) return;
      try {
        onTranscribed(transcript.trim());
      } catch {
        // Error handling is done via mutation error state
      }
    },
    [onTranscribed],
  );

  if (!show) return null;

  const errorMessage = error instanceof Error ? error.message : null;
  const mergedErrorMessage = permissionError ?? errorMessage;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div ref={dialogRef} className="w-full max-w-md space-y-4 border bg-background p-6">
        <Inline justify="between">
          <h3 className="text-lg font-semibold" id="voice-dialog-title">
            Record Audio
          </h3>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close voice input"
          >
            <X className="size-4" />
          </Button>
        </Inline>
        <p className="text-sm text-muted-foreground">
          Tap to record, tap again to stop. The transcript will appear in the message input.
        </p>
        <Inline gap="sm">
          <SpeechInput
            aria-label="Record audio message"
            onAudioRecorded={transcribeAudioBlob}
            onTranscriptionChange={handleVoiceTranscription}
            onPermissionDenied={() => {
              setPermissionError(
                'Microphone access blocked. Please allow microphone access and try again.',
              );
            }}
            {...(onRecordingStateChange ? { onRecordingStateChange } : {})}
          />
        </Inline>
        {mergedErrorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {mergedErrorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
