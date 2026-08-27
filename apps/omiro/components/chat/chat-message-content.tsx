import type { MarkdownComponent } from '@hominem/chat';
import { logger } from '@hominem/telemetry';
import { useTheme } from '@shopify/restyle';
import { createElement, type ReactNode, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '~/components/theme';

async function loadMarkdown() {
  const mod = await import('react-native-markdown-display');
  return mod.default as MarkdownComponent;
}

let markdownPromise: Promise<MarkdownComponent | null> | null = null;

function getMarkdownComponent(): Promise<MarkdownComponent | null> {
  if (!markdownPromise) {
    markdownPromise = loadMarkdown().catch((error) => {
      markdownPromise = null;
      logger.warn('[MessageContent] Failed to load react-native-markdown-display', { error });
      return null;
    });
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
  children?: ReactNode;
}) {
  const Markdown = useMarkdownComponent();
  const isStreaming = !enableMarkdown;
  const { foreground: textPrimary, popover } = useTheme().colors;

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
  const markdownChildren = { children: content };

  return (
    <View style={styles.content}>
      {isStreaming || !Markdown ? (
        <Text style={textStyle}>{content}</Text>
      ) : (
        createElement(Markdown, { style: markdownStyle, ...markdownChildren })
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8, width: '100%' },
});
