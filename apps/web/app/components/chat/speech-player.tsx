import { Headphones, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { MessageAction } from '~/components/ai-elements/message';
import { Persona } from '~/components/ai-elements/persona';
import {
  endSpeechPlaybackTelemetry,
  startSpeechPlaybackTelemetry,
  type SpeechPlaybackTelemetry,
} from '~/lib/telemetry/speech';
import { cn } from '~/lib/utils';

type SpeechState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopping' | 'error';
const personaTransitionMs = 200;

export interface SpeechPlayerProps {
  isActive: boolean;
  messageId: string;
  onActivate: (messageId: string) => void;
  onDeactivate: (messageId: string) => void;
  src: string;
}

export function SpeechPlayer({
  isActive,
  messageId,
  onActivate,
  onDeactivate,
  src,
}: SpeechPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playRequestRef = useRef(0);
  const deactivateTimerRef = useRef<number | null>(null);
  const suppressPauseRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const telemetryRef = useRef<SpeechPlaybackTelemetry | null>(null);
  const [state, setState] = useState<SpeechState>('idle');
  const [personaMounted, setPersonaMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const showBrowserControls = isActive && (state === 'loading' || state === 'playing');
  const showPersona = isActive && personaMounted;

  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reducedMotionRef.current = mediaQuery.matches;
      setReducedMotion(mediaQuery.matches);
    };
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setState('idle');
    const handleLoadStart = () => setState('loading');
    const handlePlay = () => {
      setState('playing');
      setPersonaMounted(true);
    };
    const handlePlaying = () => telemetryRef.current?.firstPlayable();
    const handlePause = () => {
      if (suppressPauseRef.current) {
        suppressPauseRef.current = false;
        return;
      }
      if (audio.ended) {
        setState('idle');
        onDeactivate(messageId);
        return;
      }
      setState('paused');
      telemetryRef.current?.paused();
      scheduleDeactivation();
    };
    const handleEnded = () => {
      setState('idle');
      telemetryRef.current?.completed();
      scheduleDeactivation();
    };
    const handleError = () => {
      setState('error');
      telemetryRef.current?.failed('Audio playback failed');
      scheduleDeactivation();
    };
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    return () => {
      playRequestRef.current += 1;
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.currentTime = 0;
      endSpeechPlaybackTelemetry(telemetryRef.current);
      telemetryRef.current = null;
    };
  }, [messageId, onDeactivate, src]);

  useEffect(() => {
    if (isActive) return;
    if (deactivateTimerRef.current !== null) {
      window.clearTimeout(deactivateTimerRef.current);
      deactivateTimerRef.current = null;
    }
    playRequestRef.current += 1;
    suppressPauseRef.current = true;
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setPersonaMounted(false);
    setState('idle');
    endSpeechPlaybackTelemetry(telemetryRef.current);
    telemetryRef.current = null;
  }, [isActive]);

  useEffect(
    () => () => {
      if (deactivateTimerRef.current !== null) {
        window.clearTimeout(deactivateTimerRef.current);
      }
    },
    [],
  );

  function scheduleDeactivation() {
    if (deactivateTimerRef.current !== null) {
      window.clearTimeout(deactivateTimerRef.current);
    }
    deactivateTimerRef.current = window.setTimeout(
      () => {
        deactivateTimerRef.current = null;
        setPersonaMounted(false);
        onDeactivate(messageId);
      },
      reducedMotionRef.current ? 0 : personaTransitionMs,
    );
  }

  const controlTransition = cn(
    'absolute inset-0  duration-200',
    'transition-[opacity,transform] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
    'motion-reduce:transition-none motion-reduce:transform-none',
  );

  function handleStop() {
    const audio = audioRef.current;
    if (!audio) return;
    playRequestRef.current += 1;
    suppressPauseRef.current = true;
    audio.pause();
    audio.currentTime = 0;
    setState('stopping');
    telemetryRef.current?.stopped();
    telemetryRef.current = null;
    scheduleDeactivation();
  }

  async function handleListen() {
    const audio = audioRef.current;
    if (!audio) return;

    if (deactivateTimerRef.current !== null) {
      window.clearTimeout(deactivateTimerRef.current);
      deactivateTimerRef.current = null;
    }
    const request = ++playRequestRef.current;
    onActivate(messageId);
    endSpeechPlaybackTelemetry(telemetryRef.current);
    telemetryRef.current = startSpeechPlaybackTelemetry();
    telemetryRef.current.requested();
    setState('loading');
    if (audio.ended) audio.currentTime = 0;
    try {
      await audio.play();
      if (request !== playRequestRef.current) return;
    } catch {
      if (request !== playRequestRef.current) return;
      setState('error');
      telemetryRef.current?.failed('Audio play request was rejected');
      telemetryRef.current = null;
      scheduleDeactivation();
    }
  }

  return (
    <div
      className="inline-flex min-w-0 items-center gap-2 text-muted-foreground"
      data-speech-control-state={showBrowserControls ? 'active' : 'idle'}
      data-speech-player
    >
      <div className="relative flex size-7 shrink-0 items-center justify-center" data-speech-action>
        <MessageAction
          aria-hidden={showBrowserControls}
          aria-label={state === 'error' ? 'Retry response audio' : 'Listen to response'}
          className={cn(
            controlTransition,
            showBrowserControls
              ? 'pointer-events-none scale-90 opacity-0'
              : 'pointer-events-auto scale-100 opacity-100',
          )}
          onClick={() => void handleListen()}
          tabIndex={showBrowserControls ? -1 : 0}
          tooltip={state === 'error' ? 'Retry response audio' : 'Listen to response'}
        >
          <Headphones aria-hidden="true" />
        </MessageAction>

        {personaMounted ? (
          <MessageAction
            aria-hidden={!showPersona || state !== 'playing'}
            aria-label="Stop listening"
            className={cn(
              controlTransition,
              showPersona && state === 'playing'
                ? 'pointer-events-auto scale-100 opacity-100'
                : 'pointer-events-none scale-90 opacity-0',
            )}
            onClick={handleStop}
            tabIndex={showPersona && state === 'playing' ? 0 : -1}
            tooltip="Stop listening"
          >
            <Persona state={reducedMotion ? 'idle' : 'speaking'} variant="mana" />
          </MessageAction>
        ) : null}
      </div>

      <AudioPlayer
        src={src}
        state={state}
        isActive={state === 'playing'}
        audioRef={audioRef}
        showBrowserControls={showBrowserControls}
      />

      <ChatMessageStatus state={state} />
    </div>
  );
}

function ChatMessageStatus({ state }: { state: SpeechState }) {
  const status =
    state === 'loading'
      ? 'Loading response audio'
      : state === 'playing'
        ? 'AI is speaking'
        : state === 'paused'
          ? 'Response audio paused'
          : state === 'error'
            ? 'Unable to play response audio'
            : 'Listen to response';

  return (
    <span aria-live="polite" className="sr-only select-none">
      {status}
    </span>
  );
}

function AudioPlayer({
  src,
  state,
  isActive,
  audioRef,
  showBrowserControls,
}: {
  src: string;
  state: SpeechState;
  isActive: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  showBrowserControls: boolean;
}) {
  if (state === 'loading' && isActive) {
    return <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />;
  }

  return (
    <audio
      ref={audioRef}
      className={showBrowserControls ? 'h-8 max-w-full' : 'sr-only'}
      controls={showBrowserControls}
      crossOrigin="use-credentials"
      preload="none"
      src={src}
      title="Listen to response"
    />
  );
}
