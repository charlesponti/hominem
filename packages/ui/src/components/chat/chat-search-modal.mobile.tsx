import type React from 'react';
import { Modal, Pressable, StyleSheet, View, type TextInput } from 'react-native';

import {
  chatTokensNative,
  colors,
  fontFamiliesNative,
  fontSizes,
  radiiNative,
  spacing,
} from '../../tokens';
import { Text } from '../typography/text.native';
import { Button } from '../ui/button.native';
import { TextField } from '../ui/text-field.native';
import type { ChatRenderIcon } from './chat.types';

interface ChatSearchModalProps {
  visible: boolean;
  searchQuery: string;
  resultCount: number;
  searchInputRef: React.RefObject<TextInput | null>;
  onClose: () => void;
  onChangeSearchQuery: (value: string) => void;
  renderIcon: ChatRenderIcon;
}

export function ChatSearchModal({
  visible,
  searchQuery,
  resultCount,
  searchInputRef,
  onClose,
  onChangeSearchQuery,
  renderIcon,
}: ChatSearchModalProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.searchBackdrop}>
        <View style={styles.searchPanel}>
          <View style={styles.searchPanelHeader}>
            <Text style={styles.searchTitle}>Search messages</Text>
            <Button
              accessibilityLabel="Close search"
              onPress={onClose}
              size="icon-xs"
              style={styles.headerIconButton}
              variant="ghost"
            >
              {renderIcon('x', { color: colors['text-tertiary'], size: 16 })}
            </Button>
          </View>

          <TextField
            containerStyle={styles.searchInputContainer}
            placeholder="Search messages..."
            ref={searchInputRef}
            returnKeyType="search"
            style={styles.searchInput}
            testID="chat-search-input"
            value={searchQuery}
            onChangeText={onChangeSearchQuery}
          />

          <Text color="text-tertiary" style={styles.searchResultCount}>
            {searchQuery.trim().length > 0
              ? `${resultCount} result${resultCount !== 1 ? 's' : ''}`
              : 'Search the current conversation'}
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerIconButton: {
    backgroundColor: colors['bg-surface'],
    borderColor: colors['border-default'],
    borderRadius: radiiNative.md,
    height: 36,
    width: 36,
  },
  searchBackdrop: {
    backgroundColor: colors['overlay-modal-medium'],
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[7],
  },
  searchInput: {
    color: colors.foreground,
    fontFamily: fontFamiliesNative.mono,
    fontSize: fontSizes.sm,
    minHeight: 36,
    paddingVertical: spacing[2],
  },
  searchInputContainer: {
    width: '100%',
  },
  searchPanel: {
    backgroundColor: colors.background,
    borderColor: colors['border-default'],
    borderRadius: chatTokensNative.radii.composer,
    borderWidth: 1,
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  searchPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'space-between',
  },
  searchResultCount: {
    fontFamily: fontFamiliesNative.mono,
    fontSize: fontSizes.xs,
  },
  searchTitle: {
    fontSize: 17,
    lineHeight: 24,
  },
});
