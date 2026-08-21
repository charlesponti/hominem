import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef } from 'react';
import { Alert, Text, View } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useThemeColor } from '~/components/theme';
import { ListRow } from '~/components/ui';
import AppIcon from '~/components/ui/icon';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { useChatArchive } from '~/services/chat/use-chat-archive';
import { nativeMotionTiming } from '~/services/motion/native-motion';
import { useNoteDelete } from '~/services/notes/use-note-delete';
import t from '~/translations';

import { formatInboxTimestamp } from './format-inbox-date';
import type { InboxStreamItemData } from './InboxStreamItem.types';
import { stripPreviewMarkdown } from './strip-preview-markdown';

const BADGE_TINT_ALPHA = '26';

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
    const previewText = cleanText(item.preview ? stripPreviewMarkdown(item.preview) : item.preview);
    const primaryText = titleText ?? previewText ?? t.inbox.item.untitled;
    const timestamp = formatInboxTimestamp(item.updatedAt);
    const isChat = item.kind === 'chat';
    const primaryColor = useThemeColor('--color-primary') as string;
    const chart2Color = useThemeColor('--color-chart-2') as string;
    const tertiaryColor = useThemeColor('--color-tertiary') as string;
    const mutedForegroundColor = useThemeColor('--color-muted-foreground') as string;
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
              size={14}
              tintColor={mutedForegroundColor}
            />
          }
          onLongPress={handleLongPress}
          onPress={onOpen}
          subtitle={titleText && previewText && previewText !== titleText ? previewText : null}
          title={primaryText}
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

const styles = makeStyles((theme) => ({
  s0: { alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  s1: { alignItems: 'flex-end', gap: 4 },
  s2: { ...theme.typography.caption2, color: theme.colors.tertiary },
}));
