import type { MarkdownComponent } from '@hominem/chat';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { StreamingRevealText } from './chat-streaming-text';

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
  const [revealing, setRevealing] = useState(isStreaming);
  const [textPrimary, popover] = useCSSVariable([
    '--color-foreground',
    '--color-popover',
  ]) as string[];

  useEffect(() => {
    if (isStreaming) setRevealing(true);
  }, [isStreaming]);

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
      {revealing ? (
        <StreamingRevealText
          content={content}
          isStreaming={isStreaming}
          onRevealComplete={() => setRevealing(false)}
          textStyle={textStyle}
        />
      ) : Markdown ? (
        <Markdown style={markdownStyle}>{content}</Markdown>
      ) : (
        <Text style={textStyle}>{content}</Text>
      )}
      {children}
    </View>
  );
}
