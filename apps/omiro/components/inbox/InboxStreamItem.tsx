import { ListRow } from '@ponti-studios/ui/native';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import AppIcon from '~/components/ui/icon';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { useChatArchive } from '~/services/chat/use-chat-archive';
import { nativeMotionTiming } from '~/services/motion/native-motion';
import { useNoteDelete } from '~/services/notes/use-note-delete';
import t from '~/translations';

import type { InboxStreamItemData } from './InboxStreamItem.types';

interface InboxStreamItemProps {
  animateOnMount?: boolean;
  index?: number;
  isNew?: boolean;
  item: InboxStreamItemData;
}

export const InboxStreamItem = memo(
  ({ animateOnMount = false, index = 0, isNew = false, item }: InboxStreamItemProps) => {
    const router = useRouter();
    const reducedMotion = useReducedMotion();
    const titleText = cleanText(item.title);
    const previewText = cleanText(item.preview);
    const primaryText = titleText ?? previewText ?? t.inbox.item.untitled;
    const isChat = item.kind === 'chat';
    const primaryColor = useCSSVariable('--color-primary') as string;
    const chart2Color = useCSSVariable('--color-chart-2') as string;
    const tertiaryColor = useCSSVariable('--color-tertiary') as string;
    const accent = isChat ? primaryColor : chart2Color;
    const shouldAnimateIn = animateOnMount || isNew;
    const entranceOffset = reducedMotion || !shouldAnimateIn ? 0 : animateOnMount ? 8 : -8;
    const entrance = useSharedValue(entranceOffset === 0 ? 1 : 0);
    const entranceRunRef = useRef(false);

    const { mutate: deleteNote, isPending: isDeletingNote } = useNoteDelete({
      noteId: item.entityId,
    });
    const { mutate: archiveChat, isPending: isArchivingChat } = useChatArchive({
      chatId: item.entityId,
    });
    const isPending = isDeletingNote || isArchivingChat;

    useEffect(() => {
      if (entranceRunRef.current) {
        return;
      }
      entranceRunRef.current = true;
      if (!shouldAnimateIn) {
        entrance.value = 1;
        return;
      }
      if (reducedMotion) {
        entrance.value = withTiming(1, nativeMotionTiming.exit);
        return;
      }
      const delay = animateOnMount ? index * 40 : 0;
      entrance.value = withDelay(delay, withTiming(1, nativeMotionTiming.enter));
    }, [animateOnMount, entrance, index, isNew, reducedMotion, shouldAnimateIn]);

    const entranceStyle = useAnimatedStyle(() => ({
      opacity: entrance.value,
      transform: [{ translateY: (1 - entrance.value) * entranceOffset }],
    }));

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

    const onOpen = useCallback(() => router.push(item.route), [router, item.route]);

    const handleLongPress = useCallback(() => {
      if (isPending) return;
      Alert.alert(primaryText, undefined, [
        { text: t.inbox.item.open, onPress: onOpen },
        isChat
          ? { text: t.inbox.item.archiveChat, onPress: handleArchive }
          : { text: t.inbox.item.deleteNote.menu, style: 'destructive', onPress: handleDelete },
        { text: t.inbox.item.deleteNote.cancel, style: 'cancel' },
      ]);
    }, [isPending, primaryText, isChat, onOpen, handleArchive, handleDelete]);

    return (
      <Reanimated.View style={entranceStyle} testID={`inbox-item-${item.kind}`}>
        <ListRow
          accessibilityLabel={primaryText}
          actionTestID={`inbox-item-${isChat ? 'chat' : 'note'}-open`}
          leading={
            <AppIcon
              name={isChat ? 'bubble.left.and.bubble.right.fill' : 'note.text'}
              size={20}
              tintColor={accent}
            />
          }
          onLongPress={handleLongPress}
          onPress={onOpen}
          subtitle={!isChat && titleText ? previewText : null}
          title={primaryText}
          trailing={<AppIcon name="chevron.right" size={14} tintColor={tertiaryColor} />}
        />
      </Reanimated.View>
    );
  },
);

InboxStreamItem.displayName = 'InboxStreamItem';

function cleanText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}
