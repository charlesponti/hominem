import type React from 'react';
import { Pressable, View, type TextInput } from 'react-native';

import { Text, makeStyles, spacing } from '~/components/theme';
import AppIcon from '~/components/ui/icon';
import { Input } from '~/components/ui/input';
import { ModalOverlay } from '~/components/ui/modal-overlay';
import t from '~/translations';

interface ChatSearchModalProps {
  visible: boolean;
  searchQuery: string;
  resultCount: number;
  searchInputRef: React.RefObject<TextInput | null>;
  onClose: () => void;
  onChangeSearchQuery: (value: string) => void;
}

export function ChatSearchModal({
  visible,
  searchQuery,
  resultCount,
  searchInputRef,
  onClose,
  onChangeSearchQuery,
}: ChatSearchModalProps) {
  const styles = useChatSearchStyles();

  return (
    <ModalOverlay visible={visible} onClose={onClose} position="top">
      <View style={styles.searchInset}>
        <View style={styles.searchPanel}>
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{t.chat.search.title}</Text>
              <Pressable hitSlop={8} onPress={onClose} style={styles.closeButton}>
                <AppIcon name="xmark" size={16} tintColor={styles.closeIcon.color} />
              </Pressable>
            </View>

            <Input
              key={visible ? 'visible' : 'hidden'}
              ref={searchInputRef}
              autoFocus
              value={searchQuery}
              placeholder={t.chat.search.placeholder}
              placeholderTextColor={styles.inputPlaceholder.color}
              returnKeyType="search"
              selectionColor={styles.input.color}
              cursorColor={styles.input.color}
              style={[styles.input, { borderWidth: 0 }]}
              onChangeText={onChangeSearchQuery}
            />

            <Text style={styles.caption}>
              {searchQuery.trim().length > 0
                ? t.chat.search.results(resultCount)
                : t.chat.search.emptyCaption}
            </Text>
          </View>
        </View>
      </View>
    </ModalOverlay>
  );
}

const SEARCH_PANEL_RADIUS = 24;

const useChatSearchStyles = makeStyles((theme) => ({
  caption: {
    color: theme.colors['text-secondary'],
    fontSize: 12,
  },
  closeButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  closeIcon: {
    color: theme.colors['text-secondary'],
  },
  content: {
    gap: 12,
    paddingHorizontal: spacing[4],
    paddingVertical: 4,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'space-between',
  },
  input: {
    backgroundColor: theme.colors['card'],
    borderColor: theme.colors['border-default'],
    borderRadius: 12,
    borderWidth: 1,
    color: theme.colors['text-primary'],
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  inputPlaceholder: {
    color: theme.colors['tertiary'],
  },
  title: {
    color: theme.colors['text-primary'],
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  searchInset: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[7],
  },
  searchPanel: {
    backgroundColor: theme.colors['background'],
    borderColor: theme.colors['border-default'],
    borderRadius: SEARCH_PANEL_RADIUS,
    borderWidth: 1,
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[4],
  },
}));
