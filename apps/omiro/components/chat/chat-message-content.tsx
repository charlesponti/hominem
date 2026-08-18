import type { MarkdownComponent } from '@hominem/chat';
import type React from 'react';
import { memo, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { nativeMotionTiming } from '~/services/motion/native-motion';

async function loadMarkdown() {
  const mod = await import('react-native-markdown-display');
  return mod.default as MarkdownComponent;
}

let markdownPromise: Promise<MarkdownComponent | null> | null = null;

function getMarkdownComponent(): Promise<MarkdownComponent | null> {
  if (!markdownPromise) {
    markdownPromise = loadMarkdown().catch(() => null);
  }
  return markdownPromise;
}

function useMarkdownComponent(): MarkdownComponent | null {
  const [Markdown, setMarkdown] = useState<MarkdownComponent | null>(null);

  useEffect(() => {
    let active = true;
    void getMarkdownComponent().then((component) => {
      if (active) setMarkdown(component);
    });
    return () => {
      active = false;
    };
  }, []);

  return Markdown;
}

const StreamingWord = memo(function StreamingWord({
  text,
  reducedMotion,
}: {
  text: string;
  reducedMotion: boolean;
}) {
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const translateY = useSharedValue(reducedMotion ? 0 : 4);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = withTiming(1, nativeMotionTiming.quick);
    translateY.value = withTiming(0, nativeMotionTiming.quick);
    // Animate only this word's mount; it must not replay once settled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.Text style={style}>{text}</Animated.Text>;
});

function StreamingText({ content, textStyle }: { content: string; textStyle: object }) {
  const reducedMotion = useReducedMotion();
  const words = useMemo(() => content.split(/(\s+)/), [content]);

  return (
    <Text style={textStyle}>
      {words.map((word, index) => (
        // Index is stable: streamed content only ever appends, so earlier
        // words never remount and never replay their entrance.
        // biome-ignore lint/suspicious/noArrayIndexKey: append-only stream
        <StreamingWord key={index} reducedMotion={reducedMotion} text={word} />
      ))}
    </Text>
  );
}

export function MessageContent({
  content,
  enableMarkdown,
  textStyle,
  children,
}: {
  content: string;
  enableMarkdown: boolean;
  textStyle: object;
  children?: React.ReactNode;
}) {
  const Markdown = useMarkdownComponent();
  const isStreaming = !enableMarkdown;
  const [textPrimary, popover] = useCSSVariable([
    '--color-foreground',
    '--color-popover',
  ]) as string[];

  const markdownStyle = useMemo(
    () => ({
      body: textStyle,
      code_block: {
        backgroundColor: popover,
        borderRadius: 8,
        color: textPrimary,
        fontFamily: 'Menlo',
        padding: 12,
      },
      code_inline: {
        backgroundColor: popover,
        borderRadius: 4,
        color: textPrimary,
        fontFamily: 'Menlo',
        paddingHorizontal: 4,
      },
      fence: {
        backgroundColor: popover,
        borderRadius: 8,
        color: textPrimary,
        fontFamily: 'Menlo',
        padding: 12,
      },
    }),
    [textPrimary, popover, textStyle],
  );

  return (
    <View className="gap-2 w-full">
      {isStreaming || !Markdown ? (
        isStreaming ? (
          <StreamingText content={content} textStyle={textStyle} />
        ) : (
          <Text style={textStyle}>{content}</Text>
        )
      ) : (
        <Markdown style={markdownStyle}>{content}</Markdown>
      )}
      {children}
    </View>
  );
}
