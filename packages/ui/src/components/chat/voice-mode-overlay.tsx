import { Loader2, Mic, MicOff, Volume2, XCircle } from 'lucide-react';

import { Button } from '../ui/button';

export type VoiceModeOverlayState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

interface VoiceModeOverlayProps {
  visible: boolean;
  state: VoiceModeOverlayState;
  errorMessage?: string;
  canStop: boolean;
  onClose: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

function getStateCopy(state: VoiceModeOverlayState): string {
  if (state === 'listening') return 'Listening';
  if (state === 'processing') return 'Thinking';
  if (state === 'speaking') return 'Speaking';
  if (state === 'error') return 'Error';
  return 'Ready';
}

export function VoiceModeOverlay({
  visible,
  state,
  errorMessage,
  canStop,
  onClose,
  onStartRecording,
  onStopRecording,
}: VoiceModeOverlayProps) {
  if (!visible) return null;

  const isBusy = state === 'processing' || state === 'speaking';
  const stateCopy = getStateCopy(state);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/72 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-elevated p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Voice mode</p>
            <p className="text-sm font-medium text-foreground">{stateCopy}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Exit voice mode"
            onClick={onClose}
          >
            <XCircle className="size-4" />
          </Button>
        </div>

        <div className="mb-4 flex items-center justify-center">
          <div
            className={[
              'flex size-28 items-center justify-center rounded-full border transition-all',
              state === 'listening' ? 'border-primary/70 bg-primary/10' : '',
              state === 'processing' ? 'border-foreground/30 bg-surface animate-pulse' : '',
              state === 'speaking' ? 'border-success/60 bg-success/10' : '',
              state === 'error' ? 'border-destructive/70 bg-destructive/10' : '',
              state === 'idle' ? 'border-border bg-surface' : '',
            ].join(' ')}
            role="status"
            aria-live="polite"
            aria-label={`Voice mode state: ${stateCopy}`}
          >
            {state === 'processing' ? (
              <Loader2 className="size-8 animate-spin text-text-secondary" />
            ) : state === 'speaking' ? (
              <Volume2 className="size-8 text-success" />
            ) : canStop ? (
              <MicOff className="size-8 text-destructive" />
            ) : (
              <Mic className="size-8 text-text-secondary" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {canStop ? (
            <Button
              type="button"
              onClick={onStopRecording}
              variant="destructive"
              size="sm"
              disabled={isBusy}
            >
              Stop and send
            </Button>
          ) : (
            <Button type="button" onClick={onStartRecording} size="sm" disabled={isBusy}>
              Start listening
            </Button>
          )}
        </div>

        {errorMessage ? (
          <p className="mt-3 text-center text-xs text-destructive">{errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
