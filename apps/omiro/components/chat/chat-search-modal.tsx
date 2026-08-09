import { nativeShadows } from '@ponti-studios/ui/native';
import { TextField } from '@ponti-studios/ui/native';
import type React from 'react';
import { Pressable, View, type TextInput } from 'react-native';
import { Text } from 'react-native';
import { useCSSVariable } from 'uniwind';

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
  const [card, textPrimary, textSecondary] = useCSSVariable([
    '--color-card',
    '--color-foreground',
    '--color-muted-foreground',
  ]) as string[];

  return (
    <ModalOverlay visible={visible} onClose={onClose} position="top">
      <View className="px-4 pt-7">
        <View
          className="bg-card border border-border rounded-3xl px-1 py-4"
          style={{ borderCurve: 'continuous', boxShadow: nativeShadows.md }}
        >
          <View className="gap-3 px-4 py-1">
            <View className="items-center flex-row gap-2 justify-between">
              <Text className="text-foreground flex-1 text-headline">{t.chat.search.title}</Text>
              <Pressable
                hitSlop={8}
                onPress={onClose}
                className="items-center justify-center h-8 w-8"
              >
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

            <Text className="text-muted-foreground text-caption1">
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
