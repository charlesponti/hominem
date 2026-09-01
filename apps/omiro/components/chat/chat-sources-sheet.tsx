import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme, useStyles } from '~/components/theme';
import { IconButton, ListRow } from '~/components/ui';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import {
  useAddChatSource,
  useChatSources,
  useRemoveChatSource,
} from '~/services/chat/use-chat-sources';
import { useInboxStreamItems } from '~/services/inbox/use-inbox-stream-items';
import t from '~/translations';

interface ChatSourcesSheetProps {
  chatId: string;
  visible: boolean;
  onClose: () => void;
}

export function ChatSourcesSheet({ chatId, visible, onClose }: ChatSourcesSheetProps) {
  const insets = useSafeAreaInsets();
  const {
    border: borderDefault,
    background,
    foreground: textPrimary,
    mutedForeground: textSecondary,
    destructive,
  } = useAppTheme().colors;
  const styles = useStyles((theme) => ({
    sheetContent: { gap: 16, paddingHorizontal: 24 },
    sheetTitle: { ...theme.textVariants.title2, fontWeight: '700' },
    sheetDescription: { ...theme.textVariants.footnote },
    section: { gap: 4 },
    sectionLabel: {
      ...theme.textVariants.caption1,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    empty: { ...theme.textVariants.footnote, paddingVertical: 8 },
  }));
  const modalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['70%'], []);

  const { data: sources = [] } = useChatSources(chatId);
  const { mutate: addSource } = useAddChatSource();
  const { mutate: removeSource, isPending: isRemoving } = useRemoveChatSource(chatId);
  const inbox = useInboxStreamItems({ enabled: visible });

  const attachedNoteIds = useMemo(() => new Set(sources.map((source) => source.noteId)), [sources]);
  const availableNotes = useMemo(
    () => inbox.items.filter((item) => item.kind === 'note' && !attachedNoteIds.has(item.entityId)),
    [attachedNoteIds, inbox.items],
  );

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      // Same UIMenu-dismiss race as ChatSettingsSheet -- wait for the
      // triggering Stack.Toolbar.Menu action's close animation first.
      const timeout = setTimeout(() => {
        modalRef.current?.present();
      }, 100);
      return () => clearTimeout(timeout);
    }

    modalRef.current?.dismiss();
  }, [visible]);

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: borderDefault, width: 40, height: 4 }}
      backgroundStyle={{ backgroundColor: background }}
      onDismiss={handleDismiss}
    >
      <BottomSheetView style={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.sheetTitle, { color: textPrimary }]}>{t.chat.sources.title}</Text>
        <Text style={[styles.sheetDescription, { color: textSecondary }]}>
          {t.chat.sources.description}
        </Text>

        <View style={styles.section}>
          {sources.length === 0 ? (
            <Text style={[styles.empty, { color: textSecondary }]}>{t.chat.sources.empty}</Text>
          ) : (
            sources.map((source) => (
              <ListRow
                accessibilityLabel={source.title ?? t.notes.editor.titleFallback}
                key={source.id}
                leading={<AppIcon name="doc.text" size={18} tintColor={textSecondary} />}
                onPress={() => {}}
                title={source.title ?? t.notes.editor.titleFallback}
                trailing={
                  <IconButton
                    accessibilityLabel={t.chat.sources.removeA11y}
                    disabled={isRemoving}
                    onPress={() => removeSource(source.noteId)}
                    variant="plain"
                  >
                    <AppIcon name="xmark.circle.fill" size={18} tintColor={destructive} />
                  </IconButton>
                }
              />
            ))
          )}
        </View>

        {availableNotes.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>
              {t.chat.sources.addNote}
            </Text>
            {availableNotes.slice(0, 10).map((note) => (
              <ListRow
                accessibilityLabel={note.title ?? t.notes.editor.titleFallback}
                key={note.entityId}
                leading={<AppIcon name="plus.circle" size={18} tintColor={textSecondary} />}
                onPress={() => addSource({ chatId, noteId: note.entityId })}
                title={note.title ?? t.notes.editor.titleFallback}
              />
            ))}
          </View>
        ) : null}

        <Button label={t.chat.sources.done} onPress={handleDismiss} variant="secondary" />
      </BottomSheetView>
    </BottomSheetModal>
  );
}
