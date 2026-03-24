import type { SessionSource } from '@hominem/chat-services/types';
import { StyleSheet, View } from 'react-native';

import { colors, fontFamiliesNative, fontSizes, radiiNative, spacing } from '../../tokens';
import { Text } from '../typography/text.native';
import { Button } from '../ui/button.native';
import type { ChatRenderIcon } from './chat.types';
import { ContextAnchor } from './context-anchor.mobile';

interface ChatHeaderProps {
  topInset: number;
  resolvedSource: SessionSource;
  statusCopy: string;
  onOpenSearch: () => void;
  onOpenMenu: () => void;
  renderIcon: ChatRenderIcon;
}

export function ChatHeader({
  topInset,
  resolvedSource,
  statusCopy,
  onOpenSearch,
  onOpenMenu,
  renderIcon,
}: ChatHeaderProps) {
  return (
    <View style={[styles.header, { paddingTop: Math.max(topInset, 6) }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerCenter}>
          <ContextAnchor showTitle={false} source={resolvedSource} />
          {statusCopy ? (
            <Text color="text-tertiary" style={styles.headerStatus}>
              {statusCopy}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <Button
            accessibilityLabel="Search messages"
            onPress={onOpenSearch}
            size="icon-xs"
            style={styles.headerIconButton}
            testID="chat-search-toggle"
            variant="ghost"
          >
            {renderIcon('magnifying-glass', {
              color: colors.foreground,
              size: 14,
              style: styles.headerIcon,
            })}
          </Button>
          <Button
            accessibilityLabel="Conversation actions"
            onPress={onOpenMenu}
            size="icon-xs"
            style={styles.headerIconButton}
            variant="ghost"
          >
            {renderIcon('plus', { color: colors.foreground, size: 15, style: styles.headerIcon })}
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors['bg-elevated'],
    borderBottomColor: colors['border-default'],
    borderBottomWidth: 1,
    paddingBottom: spacing[1],
    paddingHorizontal: spacing[3],
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1],
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    gap: 1,
    minWidth: 0,
    paddingHorizontal: spacing[2],
  },
  headerIcon: {
    opacity: 0.72,
  },
  headerIconButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: radiiNative.full,
    height: 36,
    width: 36,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 40,
  },
  headerStatus: {
    fontFamily: fontFamiliesNative.mono,
    fontSize: fontSizes.xs,
    opacity: 0.7,
  },
});
