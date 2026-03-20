import type { VoiceErrorCode } from '@hominem/services';
import { Inline } from '@hominem/ui';
import { SpeechInput } from '@hominem/ui/ai-elements';
import { Button } from '@hominem/ui/button';
import { X } from 'lucide-react';
import { useCallback, useState } from 'react';

import { emitVoiceEvent } from '~/lib/voice-events';

interface ChatModalsProps {
  showAudioRecorder: boolean;
  onCloseAudioRecorder: () => void;
  onAudioTranscribed: (transcript: string) => void;
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
  showAudioRecorder,
  onCloseAudioRecorder,
  onAudioTranscribed,
}: ChatModalsProps) {
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
    (transcript: string) => {
      if (!transcript.trim()) return;
      setVoiceError(null);
      try {
        onAudioTranscribed(transcript.trim());
      } catch (error) {
        setVoiceError(error instanceof Error ? error.message : 'Failed to process transcript');
      }
    },
    [onAudioTranscribed],
  );

  return (
    <>
      {showAudioRecorder ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Voice input"
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="border p-6 w-full max-w-md space-y-4">
            <Inline justify="between">
              <h3 className="text-lg font-semibold" id="voice-dialog-title">
                Record Audio
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCloseAudioRecorder}
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
                onTranscriptionChange={(text: string) => {
                  handleVoiceTranscription(text);
                }}
              />
            </Inline>
            {voiceError ? (
              <p className="text-sm text-destructive" role="alert">
                {voiceError}
              </p>
            ) : null}
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
