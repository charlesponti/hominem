import { chatTokensNative, fontFamiliesNative, fontSizes } from '@hominem/ui/tokens'
import { Modal, Pressable, StyleSheet, View } from 'react-native'

import { Button } from '~/components/Button'
import TextInputField from '~/components/text-input'
import { Text, makeStyles } from '~/theme'

import AppIcon from '../ui/icon'

interface ChatSearchModalProps {
  visible: boolean
  searchQuery: string
  resultCount: number
  searchInputRef: React.RefObject<React.ElementRef<typeof TextInputField> | null>
  onClose: () => void
  onChangeSearchQuery: (value: string) => void
}

export function ChatSearchModal({
  visible,
  searchQuery,
  resultCount,
  searchInputRef,
  onClose,
  onChangeSearchQuery,
}: ChatSearchModalProps) {
  const styles = useStyles()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.searchBackdrop} onPress={onClose}>
        <View style={styles.searchPanel}>
          <View style={styles.searchPanelHeader}>
            <Text style={styles.searchTitle}>Search messages</Text>
            <Button
              variant="ghost"
              size="icon-xs"
              onPress={onClose}
              style={styles.headerIconButton}
              accessibilityLabel="Close search"
            >
              <AppIcon name="x" size={16} style={styles.headerIcon} />
            </Button>
          </View>

          <TextInputField
            ref={searchInputRef}
            containerStyle={styles.searchInputContainer}
            style={styles.searchInput}
            placeholder="Search messages…"
            value={searchQuery}
            onChangeText={onChangeSearchQuery}
            returnKeyType="search"
            testID="chat-search-input"
          />

          <Text style={styles.searchResultCount}>
            {searchQuery.trim().length > 0
              ? `${resultCount} result${resultCount !== 1 ? 's' : ''}`
              : 'Search the current conversation'}
          </Text>
        </View>
      </Pressable>
    </Modal>
  )
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    searchInputContainer: {
      width: '100%',
    },
    searchInput: {
      color: t.colors.foreground,
      fontSize: fontSizes.sm,
      fontFamily: fontFamiliesNative.mono,
      minHeight: 36,
      paddingVertical: t.spacing.sm_8,
    },
    searchResultCount: {
      color: t.colors['text-tertiary'],
      fontSize: fontSizes.xs,
      fontFamily: fontFamiliesNative.mono,
    },
    searchBackdrop: {
      flex: 1,
      backgroundColor: t.colors['overlay-modal-medium'],
      justifyContent: 'flex-start',
      paddingHorizontal: t.spacing.m_16,
      paddingTop: t.spacing.xl_48,
    },
    searchPanel: {
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      borderRadius: chatTokensNative.radii.composer,
      backgroundColor: t.colors.background,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.m_16,
      gap: t.spacing.sm_12,
    },
    searchPanelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing.sm_8,
    },
    searchTitle: {
      color: t.colors.foreground,
      fontSize: 17,
      lineHeight: 24,
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
  }),
)
