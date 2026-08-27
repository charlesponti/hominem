import type { ChatMessageItem } from '@hominem/chat';
import { useTheme } from '@shopify/restyle';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { theme } from '~/components/theme';

import AppIcon from '../ui/icon';

type ToolCall = NonNullable<ChatMessageItem['toolCalls']>[number];
type ToolCallStatus = NonNullable<ToolCall['status']>;

const statusLabel: Record<ToolCallStatus, string> = {
  pending: 'Awaiting approval',
  requested: 'Requested',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  rejected: 'Rejected',
};

function ToolCallStatusIcon({ status, colors }: { status: ToolCallStatus; colors: string[] }) {
  const [mutedForeground, warning, success, destructive] = colors;

  switch (status) {
    case 'completed':
      return <AppIcon name="checkmark.circle.fill" size={14} tintColor={success} />;
    case 'failed':
      return <AppIcon name="xmark.circle.fill" size={14} tintColor={destructive} />;
    case 'rejected':
      return <AppIcon name="xmark.circle.fill" size={14} tintColor={warning} />;
    case 'pending':
      return <AppIcon name="clock.fill" size={14} tintColor={warning} />;
    case 'requested':
    case 'running':
      return <AppIcon name="clock.fill" size={14} tintColor={mutedForeground} />;
    default:
      return <AppIcon name="circle.fill" size={14} tintColor={mutedForeground} />;
  }
}

function ToolCallAccordion({ toolCall }: { toolCall: ToolCall }) {
  const status = toolCall.status ?? 'completed';
  const [isOpen, setIsOpen] = useState(status === 'pending');
  const { mutedForeground, warning, success, destructive } = useTheme().colors;

  return (
    <View style={styles.toolCall}>
      <Pressable
        accessibilityLabel={`${toolCall.toolName}, ${statusLabel[status]}`}
        accessibilityRole="button"
        onPress={() => setIsOpen((value) => !value)}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <AppIcon name="wrench.and.screwdriver.fill" size={14} tintColor={mutedForeground} />
          <ToolCallStatusIcon
            colors={[mutedForeground, warning, success, destructive]}
            status={status}
          />
          <Text style={styles.toolName}>{toolCall.toolName}</Text>
        </View>
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
          style={styles.body}
        >
          <Text style={styles.paramsLabel}>Parameters</Text>
          <Text style={styles.toolCallArgs}>
            {toolCall.args ? JSON.stringify(toolCall.args, null, 2) : '—'}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

export function MessageToolCalls({ toolCalls }: { toolCalls: ToolCall[] }) {
  if (toolCalls.length === 0) {
    return null;
  }

  return (
    <View style={styles.toolCalls}>
      {toolCalls.map((toolCall: ToolCall) => (
        <ToolCallAccordion
          key={toolCall.toolCallId || `${toolCall.toolName}:${JSON.stringify(toolCall.args)}`}
          toolCall={toolCall}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  toolCalls: { width: '100%', gap: 8, marginBottom: 12 },
  toolCall: {
    backgroundColor: theme.colors.muted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  toolName: {
    ...theme.typography.footnote,
    color: theme.colors.foreground,
    fontWeight: '600',
    flexShrink: 1,
  },
  body: {
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    paddingTop: 10,
  },
  paramsLabel: {
    ...theme.typography.caption1,
    color: theme.colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  toolCallArgs: {
    backgroundColor: theme.colors.popover,
    ...theme.typography.mono,
    color: theme.colors.foreground,
    borderRadius: theme.radius.sm,
    padding: 8,
  },
});
