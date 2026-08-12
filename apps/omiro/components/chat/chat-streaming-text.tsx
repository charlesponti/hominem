import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from '~/hooks/use-reduced-motion';
import {
  bufferContent,
  flush,
  initialRevealState,
  nextChunk,
  type RevealState,
} from '~/services/chat/streaming-reveal';
import { nativeMotionTiming } from '~/services/motion/native-motion';

// Roughly 1.5 lines of chat text at this font size/width.
const CHUNK_SIZE = 60;
const CHUNK_REVEAL_DELAY_MS = 180;

// Drives the pure reveal state machine on a timer, decoupled from network
// arrival. `content` may grow at any rate (or in bursts) — the returned
// chunks are always released one at a time, paced, regardless. Nothing is
// ever shown ahead of its scheduled reveal, so there is no "live" text that
// later gets re-animated.
function useStreamingChunks(content: string, isStreaming: boolean, onRevealComplete?: () => void) {
  const [revealedChunks, setRevealedChunks] = useState<string[]>([]);
  const reducedMotion = useReducedMotion();

  const stateRef = useRef<RevealState>(initialRevealState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRevealCompleteRef = useRef(onRevealComplete);
  onRevealCompleteRef.current = onRevealComplete;

  useEffect(() => {
    stateRef.current = bufferContent(stateRef.current, content);

    if (reducedMotion) {
      // Reveal everything buffered immediately, no pacing.
      const revealed: string[] = [];
      for (let chunk = nextChunk(stateRef.current, CHUNK_SIZE); chunk; ) {
        revealed.push(chunk.chunk);
        stateRef.current = chunk.state;
        chunk = nextChunk(stateRef.current, CHUNK_SIZE);
      }
      if (!isStreaming) {
        const tail = flush(stateRef.current);
        if (tail) {
          revealed.push(tail.chunk);
          stateRef.current = tail.state;
        }
      }
      if (revealed.length > 0) {
        setRevealedChunks((prev) => [...prev, ...revealed]);
      }
      if (!isStreaming) {
        onRevealCompleteRef.current?.();
      }
      return;
    }

    function drain() {
      const result = nextChunk(stateRef.current, CHUNK_SIZE);
      if (!result) {
        timerRef.current = null;
        return;
      }
      timerRef.current = setTimeout(() => {
        stateRef.current = result.state;
        setRevealedChunks((prev) => [...prev, result.chunk]);
        drain();
      }, CHUNK_REVEAL_DELAY_MS);
    }

    if (!timerRef.current) {
      drain();
    }
  }, [content, isStreaming, reducedMotion]);

  // Once streaming ends, flush whatever's left in the buffer as a final
  // chunk instead of waiting on word-boundary pacing indefinitely.
  useEffect(() => {
    if (isStreaming) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const result = flush(stateRef.current);
    if (result) {
      stateRef.current = result.state;
      setRevealedChunks((prev) => [...prev, result.chunk]);
    }
    onRevealCompleteRef.current?.();
  }, [isStreaming]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    [],
  );

  return revealedChunks;
}

function RevealChunk({ text, reducedMotion }: { text: string; reducedMotion: boolean }) {
  const opacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withTiming(1, nativeMotionTiming.enter);
    }
    // Each chunk fades in exactly once, on its own mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Reanimated.Text style={animatedStyle}>{text}</Reanimated.Text>;
}

export function StreamingRevealText({
  content,
  isStreaming,
  onRevealComplete,
  textStyle,
}: {
  content: string;
  isStreaming: boolean;
  onRevealComplete?: () => void;
  textStyle: object;
}) {
  const revealedChunks = useStreamingChunks(content, isStreaming, onRevealComplete);
  const reducedMotion = useReducedMotion();

  return (
    <Text style={textStyle}>
      {revealedChunks.map((chunk, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: chunks only ever append, never reorder
        <RevealChunk key={index} text={chunk} reducedMotion={reducedMotion} />
      ))}
    </Text>
  );
}
