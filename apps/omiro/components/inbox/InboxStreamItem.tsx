import { Host } from '@expo/ui';
import { Button, ContextMenu } from '@expo/ui/swift-ui';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { Alert, View } from 'react-native';

import { StreamItem } from '~/components/stream/StreamItem';
import { makeStyles } from '~/components/theme';
import { useChatArchive } from '~/services/chat/use-chat-archive';
import { useNoteDelete } from '~/services/notes/use-note-delete';
import t from '~/translations';

import type { InboxStreamItemData } from './InboxStreamItem.types';

interface InboxStreamItemProps {
  item: InboxStreamItemData;
}

export const InboxStreamItem = memo(({ item }: InboxStreamItemProps) => {
  const router = useRouter();
  const titleText = cleanText(item.title);
  const previewText = cleanText(item.preview);
  const primaryText = titleText ?? previewText ?? t.inbox.item.untitled;
  const isChat = item.kind === 'chat';

  const { mutate: deleteNote, isPending: isDeletingNote } = useNoteDelete({
    noteId: item.entityId,
  });
  const { mutate: archiveChat, isPending: isArchivingChat } = useChatArchive({
    chatId: item.entityId,
  });
  const isPending = isDeletingNote || isArchivingChat;

  const handleDelete = useCallback(() => {
    Alert.alert(t.inbox.item.deleteNote.title, t.inbox.item.deleteNote.message, [
      { text: t.inbox.item.deleteNote.cancel, style: 'cancel' },
      {
        text: t.inbox.item.deleteNote.confirm,
        style: 'destructive',
        onPress: () => deleteNote(),
      },
    ]);
  }, [deleteNote]);

  const handleArchive = useCallback(() => {
    archiveChat();
  }, [archiveChat]);

  return (
    <View testID={`inbox-item-${item.kind}`}>
      <InboxItemRow
        disabled={isPending}
        isChat={isChat}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onOpen={() => router.push(item.route)}
        preview={isChat || !titleText ? null : previewText}
        title={primaryText}
      />
    </View>
  );
});

InboxStreamItem.displayName = 'InboxStreamItem';

function cleanText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

interface InboxItemRowProps {
  disabled: boolean;
  isChat: boolean;
  onArchive: () => void;
  onDelete: () => void;
  onOpen: () => void;
  preview: string | null;
  title: string;
}

function InboxItemRow({
  disabled,
  isChat,
  onArchive,
  onDelete,
  onOpen,
  preview,
  title,
}: InboxItemRowProps) {
  const styles = useStyles();

  return (
    <Host style={styles.host}>
      <ContextMenu>
        <ContextMenu.Trigger>
          <View pointerEvents={disabled ? 'none' : 'auto'}>
            <StreamItem
              accessibilityLabel={title}
              onPress={onOpen}
              supportingText={preview}
              testID={`inbox-item-${isChat ? 'chat' : 'note'}-open`}
              title={title}
            />
          </View>
        </ContextMenu.Trigger>
        <ContextMenu.Items>
          <Button label="Open" onPress={onOpen} />
          {isChat ? (
            <Button label="Archive" onPress={onArchive} />
          ) : (
            <Button label="Delete" onPress={onDelete} role="destructive" />
          )}
        </ContextMenu.Items>
      </ContextMenu>
    </Host>
  );
}

const useStyles = makeStyles(() => ({
  host: {
    minHeight: 50,
    width: '100%',
  },
}));
