import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { makeStyles, useThemeColor } from '~/components/theme';
import t from '~/translations';

import AppIcon from '../ui/icon';

const AUTO_CLOSE_DELAY_MS = 1000;
const MS_IN_S = 1000;

export function MessageReasoning({
  reasoning,
  isStreaming,
}: {
  reasoning: string;
  isStreaming: boolean;
}) {
  const [mutedForeground] = useThemeColor(['--color-muted-foreground']) as string[];
  const [isOpen, setIsOpen] = useState(isStreaming);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const hasEverStreamedRef = useRef(isStreaming);
  const hasAutoClosedRef = useRef(false);
  const startTimeRef = useRef<number | null>(isStreaming ? Date.now() : null);

  useEffect(() => {
    if (isStreaming) {
      hasEverStreamedRef.current = true;
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
      return;
    }
    if (startTimeRef.current !== null) {
      setDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S));
      startTimeRef.current = null;
    }
  }, [isStreaming]);

  useEffect(() => {
    if (isStreaming && !isOpen) {
      setIsOpen(true);
    }
  }, [isStreaming, isOpen]);

  useEffect(() => {
    if (!hasEverStreamedRef.current || isStreaming || !isOpen || hasAutoClosedRef.current) {
      return;
    }
    const timer = setTimeout(() => {
      hasAutoClosedRef.current = true;
      setIsOpen(false);
    }, AUTO_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isStreaming, isOpen]);

  const label = isStreaming
    ? t.chat.reasoning.thinking
    : duration === undefined
      ? t.chat.reasoning.thought
      : t.chat.reasoning.thoughtFor(duration);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={t.chat.reasoning.toggleA11y}
        accessibilityRole="button"
        onPress={() => setIsOpen((value) => !value)}
        style={styles.trigger}
      >
        <AppIcon name="brain" size={14} tintColor={mutedForeground} />
        <Text style={styles.label}>{label}</Text>
        <AppIcon
          name="chevron.right"
          size={12}
          style={isOpen ? styles.chevronOpen : undefined}
          tintColor={mutedForeground}
        />
      </Pressable>
      {isOpen ? (
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(80)}
          layout={LinearTransition}
          style={styles.content}
        >
          <Text style={styles.reasoningText}>{reasoning}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = makeStyles((theme) => ({
  container: { width: '100%', marginBottom: 4 },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  label: { ...theme.typography.footnote, color: theme.colors.mutedForeground, flexShrink: 1 },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  content: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    width: '100%',
  },
  reasoningText: { ...theme.typography.mono, color: theme.colors.foreground, opacity: 0.8 },
}));
