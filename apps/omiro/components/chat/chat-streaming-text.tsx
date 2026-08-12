import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';

import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { nativeMotionContracts } from '~/services/motion/native-motion';

const LINE_REVEAL_DELAY_MS = 180;

function useStreamingLines(content: string) {
  const [revealedLines, setRevealedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState('');
  const reducedMotion = useReducedMotion();

  const queueRef = useRef<string[]>([]);
  const accountedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousContentRef = useRef('');

  useEffect(() => {
    const isReset =
      previousContentRef.current !== '' && !content.startsWith(previousContentRef.current);
    previousContentRef.current = content;

    if (isReset) {
      accountedRef.current = 0;
      queueRef.current = [];
      setRevealedLines([]);
    }

    const parts = content.split('\n');
    const completed = parts.slice(0, -1);
    const tail = parts[parts.length - 1] ?? '';
    setCurrentLine(tail);

    if (completed.length > accountedRef.current) {
      queueRef.current.push(...completed.slice(accountedRef.current));
      accountedRef.current = completed.length;
    }

    if (reducedMotion) {
      if (queueRef.current.length > 0) {
        setRevealedLines((prev) => [...prev, ...queueRef.current]);
        queueRef.current = [];
      }
      return;
    }

    function drain() {
      if (queueRef.current.length === 0) {
        timerRef.current = null;
        return;
      }
      timerRef.current = setTimeout(() => {
        const next = queueRef.current.shift();
        if (next !== undefined) {
          setRevealedLines((prev) => [...prev, next]);
        }
        drain();
      }, LINE_REVEAL_DELAY_MS);
    }

    if (!timerRef.current) {
      drain();
    }
  }, [content, reducedMotion]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    [],
  );

  return { revealedLines, currentLine };
}

export function StreamingRevealText({
  content,
  textStyle,
}: {
  content: string;
  textStyle: object;
}) {
  const { revealedLines, currentLine } = useStreamingLines(content);
  const reducedMotion = useReducedMotion();

  return (
    <View>
      {revealedLines.map((line, index) => (
        <Reanimated.Text
          // biome-ignore lint/suspicious/noArrayIndexKey: lines only ever append, never reorder
          key={index}
          entering={
            reducedMotion ? undefined : FadeIn.duration(nativeMotionContracts.duration.standard)
          }
          style={textStyle}
        >
          {line.length > 0 ? line : ' '}
        </Reanimated.Text>
      ))}
      <Text style={textStyle}>{currentLine}</Text>
    </View>
  );
}
