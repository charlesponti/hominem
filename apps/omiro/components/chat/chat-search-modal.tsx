import type React from 'react';
import { Pressable, Text, View, type TextInput } from 'react-native';

import { makeStyles, useThemeColor } from '~/components/theme';
import { nativeShadows, TextField } from '~/components/ui';
import AppIcon from '~/components/ui/icon';
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
  const [card, textPrimary, textSecondary] = useThemeColor([
    '--color-card',
    '--color-foreground',
    '--color-muted-foreground',
  ]) as string[];

  return (
    <ModalOverlay visible={visible} onClose={onClose} position="top">
      <View style={styles.modalContent}>
        <View
          style={[styles.searchCard, { borderCurve: 'continuous', boxShadow: nativeShadows.md }]}
        >
          <View style={styles.searchBody}>
            <View style={styles.header}>
              <Text style={styles.titleText}>{t.chat.search.title}</Text>
              <Pressable hitSlop={8} onPress={onClose} style={styles.closeButton}>
                <AppIcon name="xmark" size={16} tintColor={textSecondary} />
              </Pressable>
            </View>

            <TextField
              key={visible ? 'visible' : 'hidden'}
              ref={searchInputRef}
              autoFocus
              value={searchQuery}
              placeholder={t.chat.search.placeholder}
              returnKeyType="search"
              selectionColor={textPrimary}
              cursorColor={textPrimary}
              style={{
                backgroundColor: card,
                borderRadius: 12,
                borderWidth: 0,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
              onChangeText={onChangeSearchQuery}
            />

            <Text style={styles.captionText}>
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

const styles = makeStyles((theme) => ({
  modalContent: { paddingHorizontal: 16, paddingTop: 28 },
  searchCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 16,
  },
  searchBody: { gap: 12, paddingHorizontal: 16, paddingVertical: 4 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  titleText: { ...theme.typography.headline, color: theme.colors.foreground, flex: 1 },
  closeButton: { alignItems: 'center', justifyContent: 'center', height: 32, width: 32 },
  captionText: { ...theme.typography.caption1, color: theme.colors.mutedForeground },
}));
