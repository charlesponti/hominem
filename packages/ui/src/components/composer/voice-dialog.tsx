/**
 * VoiceDialog
 *
 * Native <dialog> for voice recording/transcription. No useState for open/close —
 * the caller opens it with voiceDialogRef.current.showModal() and the dialog's
 * own close button calls ref.current.close(). The native onClose event restores
 * focus to the composer textarea.
 *
 * RecordingClock runs entirely outside React (no useEffect, no setInterval in
 * component code). The elapsed time is subscribed via useSyncExternalStore.
 */

import type { UseMutationResult } from '@tanstack/react-query';
import { Loader2, Mic, X } from 'lucide-react';
import { forwardRef, memo, useMemo, useState, useSyncExternalStore } from 'react';

import { SpeechInput } from '../ai-elements';
import type { ComposerStore } from './composer-store';
import { RecordingClock } from './recording-clock';

interface TranscribeResult {
  text: string;
}

interface TranscribeVariables {
  audioBlob: Blob;
  language?: string;
}

interface VoiceDialogProps {
  store: ComposerStore;
  transcribeMutation: UseMutationResult<TranscribeResult, Error, TranscribeVariables>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const VoiceDialog = memo(
  forwardRef<HTMLDialogElement, VoiceDialogProps>(function VoiceDialog(
    { store, transcribeMutation, inputRef },
    ref,
  ) {
    // RecordingClock lives entirely outside React — useMemo creates it once
    const clock = useMemo(() => new RecordingClock(), []);
    const elapsed = useSyncExternalStore(
      clock.subscribe,
      clock.getSnapshot,
      clock.getServerSnapshot,
    );

    // These are genuinely local UI states — not global composer state
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);

    function close() {
      if (ref && 'current' in ref) ref.current?.close();
    }

    function handleRecordingStateChange(recording: boolean) {
      setIsRecording(recording);
      if (recording) {
        clock.start();
      } else {
        clock.stop();
      }
    }

    function handleTranscript(text: string) {
      if (!text.trim()) return;
      store.dispatch({ type: 'SET_DRAFT', text });
      close();
    }

    async function handleAudioRecorded(audioBlob: Blob) {
      setError(null);
      try {
        const preferredLanguage = navigator.language ?? 'en-US';
        const result = await transcribeMutation.mutateAsync({
          audioBlob,
          language: preferredLanguage,
        });
        handleTranscript(result.text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Transcription failed');
      }
    }

    // Waveform bars — derived from audioLevel, no state needed
    const waveformBars = Array.from({ length: 12 }, (_, i) => {
      const offset = ((i % 4) + 1) / 4;
      return Math.min(1, Math.max(0.12, audioLevel * offset));
    });

    return (
      <dialog
        ref={ref}
        aria-label="Voice input"
        // Native close event fires on Escape or button click — restore focus
        onClose={() => {
          clock.stop();
          setIsRecording(false);
          setIsProcessing(false);
          setAudioLevel(0);
          setError(null);
          inputRef.current?.focus();
        }}
        className="m-auto w-full max-w-sm rounded-3xl border border-border bg-background p-6 backdrop:bg-black/30 backdrop:backdrop-blur-sm open:flex open:flex-col open:gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Voice input</h2>
          <button
            type="button"
            aria-label="Close voice input"
            onClick={close}
            className="flex size-8 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-surface hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <SpeechInput
            aria-label="Record audio message"
            className="h-10 w-10"
            onAudioRecorded={handleAudioRecorded}
            onRecordingStateChange={handleRecordingStateChange}
            onProcessingStateChange={setIsProcessing}
            onAudioLevelChange={(level) => {
              setAudioLevel(level);
            }}
            onTranscriptionChange={handleTranscript}
            onPermissionDenied={() => {
              setError('Microphone access blocked. Please allow microphone access and try again.');
            }}
          />

          <div className="flex flex-1 items-center gap-2 text-sm text-text-secondary">
            {isProcessing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Mic className="size-3.5" />
            )}
            <span>
              {isRecording
                ? `Recording ${RecordingClock.format(elapsed)}`
                : isProcessing
                  ? 'Transcribing…'
                  : 'Ready'}
            </span>
          </div>

          {/* Waveform — decorative, hidden from a11y tree */}
          <div className="flex items-end gap-0.5" aria-hidden="true">
            {waveformBars.map((h, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-text-tertiary/70 transition-all duration-100"
                style={{
                  height: `${Math.round(6 + h * 14)}px`,
                  opacity: isRecording ? 1 : 0.35,
                }}
              />
            ))}
          </div>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {/* Live region — announces recording state to screen readers */}
        <span className="sr-only" aria-live="polite" role="status">
          {isRecording ? 'Recording started' : isProcessing ? 'Transcribing audio' : ''}
        </span>
      </dialog>
    );
  }),
);
