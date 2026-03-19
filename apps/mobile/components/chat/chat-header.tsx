import { fontFamiliesNative, fontSizes } from '@hominem/ui/tokens'
import { StyleSheet, View } from 'react-native'

import { Button } from '~/components/Button'
import { Text, makeStyles } from '~/theme'

import AppIcon from '../ui/icon'
import { ContextAnchor, type SessionSource } from './context-anchor'

interface ChatHeaderProps {
  topInset: number
  resolvedSource: SessionSource
  statusCopy: string
  onArchiveChatPress: () => void
  onOpenSearch: () => void
  onOpenMenu: () => void
}

export function ChatHeader({
  topInset,
  resolvedSource,
  statusCopy,
  onArchiveChatPress,
  onOpenSearch,
  onOpenMenu,
}: ChatHeaderProps) {
  const styles = useStyles()

  return (
    <View style={[styles.header, { paddingTop: Math.max(topInset, 16) }]}>
      <Button
        variant="ghost"
        size="icon-xs"
        onPress={onArchiveChatPress}
        style={styles.headerBack}
        accessibilityLabel="Back"
      >
        <AppIcon name="arrow-left" size={20} style={styles.headerBackIcon} />
      </Button>
      <View style={styles.headerCenter}>
        <ContextAnchor source={resolvedSource} />
        {statusCopy ? <Text style={styles.headerStatus}>{statusCopy}</Text> : null}
      </View>
      <Button
        variant="ghost"
        size="icon-xs"
        onPress={onOpenSearch}
        style={styles.headerIconButton}
        accessibilityLabel="Search messages"
        testID="chat-search-toggle"
      >
        <AppIcon name="magnifying-glass" size={16} style={styles.headerIcon} />
      </Button>
      <Button
        variant="primary"
        size="icon-xs"
        onPress={onOpenMenu}
        style={styles.headerNewButton}
        accessibilityLabel="Conversation actions"
      >
        <AppIcon name="plus" size={18} style={styles.headerNewIcon} />
      </Button>
    </View>
  )
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.spacing.sm_12,
      paddingBottom: t.spacing.sm_12,
      borderBottomWidth: 1,
      borderBottomColor: t.colors['border-default'],
      gap: t.spacing.sm_8,
    },
    headerBack: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    headerBackIcon: {
      color: t.colors.foreground,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      gap: t.spacing.xs_4,
    },
    headerStatus: {
      color: t.colors['text-tertiary'],
      fontSize: fontSizes.xs,
      fontFamily: fontFamiliesNative.mono,
    },
    headerIconButton: {
      backgroundColor: t.colors['bg-surface'],
      borderColor: t.colors['border-default'],
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    headerIcon: {
      color: t.colors['text-tertiary'],
    },
    headerNewButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    headerNewIcon: {
      color: t.colors.white,
    },
  }),
)
