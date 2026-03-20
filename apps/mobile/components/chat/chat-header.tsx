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
  onOpenSearch: () => void
  onOpenMenu: () => void
}

export function ChatHeader({
  topInset,
  resolvedSource,
  statusCopy,
  onOpenSearch,
  onOpenMenu,
}: ChatHeaderProps) {
  const styles = useStyles()

  return (
    <View style={[styles.header, { paddingTop: Math.max(topInset, 6) }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerCenter}>
          <ContextAnchor source={resolvedSource} showTitle={false} />
          {statusCopy ? <Text style={styles.headerStatus}>{statusCopy}</Text> : null}
        </View>
        <View style={styles.headerActions}>
          <Button
            variant="ghost"
            size="icon-xs"
            onPress={onOpenSearch}
            style={styles.headerIconButton}
            accessibilityLabel="Search messages"
            testID="chat-search-toggle"
          >
            <AppIcon name="magnifying-glass" size={14} style={styles.headerIcon} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onPress={onOpenMenu}
            style={styles.headerIconButton}
            accessibilityLabel="Conversation actions"
          >
            <AppIcon name="plus" size={15} style={styles.headerIcon} />
          </Button>
        </View>
      </View>
    </View>
  )
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: t.spacing.sm_12,
      paddingBottom: t.spacing.xs_4,
      borderBottomWidth: 1,
      borderBottomColor: t.colors['border-default'],
      backgroundColor: t.colors['bg-elevated'],
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 40,
      gap: t.spacing.sm_8,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      gap: 1,
      paddingHorizontal: t.spacing.sm_8,
      minWidth: 0,
    },
    headerStatus: {
      color: t.colors['text-tertiary'],
      fontSize: fontSizes.xs,
      fontFamily: fontFamiliesNative.mono,
      opacity: 0.7,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs_4,
    },
    headerIconButton: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      width: 36,
      height: 36,
      borderRadius: t.borderRadii.full,
    },
    headerIcon: {
      color: t.colors.foreground,
      opacity: 0.72,
    },
  }),
)
