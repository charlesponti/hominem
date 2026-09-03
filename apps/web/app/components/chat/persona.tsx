'use client';

import { useRive, useStateMachineInput, type RiveParameters } from '@rive-app/react-webgl2';
import RiveWebGL2 from '@rive-app/webgl2';
import { useEffect, useState } from 'react';

import { cn } from '~/lib/utils';

export type PersonaState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'asleep';

const source = '/rive/mana-2.0.riv';
const wasmSource = '/rive/rive-webgl2-2.40.1.wasm';
const stateMachine = 'default';
const { RuntimeLoader } = RiveWebGL2;
let preloadPromise: Promise<void> | undefined;

export function preloadPersona(): Promise<void> | undefined {
  if (typeof window === 'undefined') return undefined;
  preloadPromise ??= (() => {
    RuntimeLoader.setWasmUrl(wasmSource);
    RuntimeLoader.setWasmFallbackUrl(null);
    return Promise.all([
      RuntimeLoader.awaitInstance(),
      fetch(source, { cache: 'force-cache' }).then((response) => {
        if (!response.ok) throw new Error(`Persona asset failed: ${response.status}`);
      }),
    ])
      .then(() => undefined)
      .catch(() => undefined);
  })();
  return preloadPromise;
}

function useStrictModeSafeInit() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => {
      window.clearTimeout(timer);
      setReady(false);
    };
  }, []);

  return ready;
}

export function Persona({
  className,
  onLoad,
  onLoadError,
  onPause,
  onPlay,
  onReady,
  onStop,
  state = 'idle',
  variant = 'mana',
}: {
  className?: string;
  onLoad?: RiveParameters['onLoad'];
  onLoadError?: RiveParameters['onLoadError'];
  onPause?: RiveParameters['onPause'];
  onPlay?: RiveParameters['onPlay'];
  onReady?: () => void;
  onStop?: RiveParameters['onStop'];
  state?: PersonaState;
  variant?: 'mana';
}) {
  void variant;
  const ready = useStrictModeSafeInit();
  const { rive, RiveComponent } = useRive(
    ready
      ? {
          autoplay: true,
          onLoad,
          onLoadError,
          onPause,
          onPlay,
          onRiveReady: onReady,
          onStop,
          src: source,
          stateMachines: stateMachine,
        }
      : null,
    { useOffscreenRenderer: true },
  );
  const listeningInput = useStateMachineInput(rive, stateMachine, 'listening');
  const thinkingInput = useStateMachineInput(rive, stateMachine, 'thinking');
  const speakingInput = useStateMachineInput(rive, stateMachine, 'speaking');
  const asleepInput = useStateMachineInput(rive, stateMachine, 'asleep');

  useEffect(() => {
    if (listeningInput) listeningInput.value = state === 'listening';
    if (thinkingInput) thinkingInput.value = state === 'thinking';
    if (speakingInput) speakingInput.value = state === 'speaking';
    if (asleepInput) asleepInput.value = state === 'asleep';
  }, [asleepInput, listeningInput, speakingInput, state, thinkingInput]);

  return <RiveComponent aria-hidden="true" className={cn('size-8 shrink-0', className)} />;
}
