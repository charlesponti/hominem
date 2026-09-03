import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import Reanimated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '~/components/theme';
import { ListRow } from '~/components/ui';
import AppIcon from '~/components/ui/icon';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { useChatArchive } from '~/services/chat/use-chat-archive';
import { nativeMotionContracts, nativeMotionTiming } from '~/services/motion/native-motion';
import { useNoteDelete } from '~/services/notes/use-note-delete';
import t from '~/translations';

import type { InboxStreamItemData } from './InboxStreamItem.types';
import { stripPreviewMarkdown } from './strip-preview-markdown';

interface InboxStreamItemProps {
  isNew?: boolean;
  item: InboxStreamItemData;
}

// iOS Mail-style swipe-out distance for the deferred exit. The row fades and
// slides while still mounted, then the already-invisible row is removed from
// the cache so siblings close the gap via layout -- this sidesteps FlashList
// view recycling, which unreliably plays Reanimated `exiting` props.
const EXIT_SLIDE_PX = 24;
const EXIT_COMMIT_DELAY_MS = nativeMotionContracts.duration.quick + 10;

// iOS drops a new Alert.alert presented synchronously from inside another
// alert's button onPress -- the second alert races the first alert's dismiss
// animation and intermittently never appears (observed repeatedly in the
// Maestro delete flow: long-press a row, tap Delete, and the "Delete note"
// confirmation is sometimes missing entirely). Defer the confirmation until
// the dismissal has settled. Long enough to clear the ~300ms dismiss
// animation, short enough to feel immediate.
const ALERT_CONFIRM_DEFER_MS = 350;

export const InboxStreamItem = memo(({ isNew = false, item }: InboxStreamItemProps) => {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const titleText = cleanText(item.title);
  const previewText = cleanText(item.preview ? stripPreviewMarkdown(item.preview) : item.preview);
  const primaryText = titleText ?? previewText ?? t.inbox.item.untitled;
  const isChat = item.kind === 'chat';
  const { mutedForeground: mutedForegroundColor } = useAppTheme().colors;
  const leaving = useSharedValue(1);
  const [isLeaving, setIsLeaving] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutate: deleteNote, isPending: isDeletingNote } = useNoteDelete({
    noteId: item.entityId,
  });
  const { mutate: archiveChat, isPending: isArchivingChat } = useChatArchive({
    chatId: item.entityId,
  });
  const isPending = isDeletingNote || isArchivingChat;

  useEffect(
    () => () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);
      }
    },
    [],
  );

  // Plays the exit while the row is still mounted, then commits the mutation
  // (whose optimistic cache removal unmounts the now-invisible row).
  const beginExit = useCallback(
    (commit: () => void) => {
      setIsLeaving(true);
      leaving.value = withTiming(0, nativeMotionTiming.exit);
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
      exitTimerRef.current = setTimeout(commit, EXIT_COMMIT_DELAY_MS);
    },
    [leaving],
  );

  // Mutation failed and the cache rolled back, so the row is still in the
  // list -- fade it back in instead of leaving it stuck invisible.
  const cancelExit = useCallback(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    leaving.value = withTiming(1, nativeMotionTiming.enter);
    setIsLeaving(false);
  }, [leaving]);

  const leavingStyle = useAnimatedStyle(() => ({
    opacity: leaving.value,
    transform: [{ translateX: (1 - leaving.value) * (reducedMotion ? 0 : EXIT_SLIDE_PX) }],
  }));

  // Only rows that arrived after the first paint slide in; historical rows,
  // pagination appends, and filter switches mount static.
  const entering = isNew
    ? reducedMotion
      ? FadeIn.duration(nativeMotionContracts.duration.quick)
      : FadeInDown.duration(nativeMotionContracts.duration.quick)
    : undefined;
  const layout = reducedMotion
    ? undefined
    : LinearTransition.duration(nativeMotionContracts.duration.quick);

  const handleDelete = useCallback(() => {
    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
    }
    alertTimerRef.current = setTimeout(() => {
      Alert.alert(t.inbox.item.deleteNote.title, t.inbox.item.deleteNote.message, [
        { text: t.inbox.item.deleteNote.cancel, style: 'cancel' },
        {
          text: t.inbox.item.deleteNote.confirm,
          style: 'destructive',
          onPress: () => {
            if (isLeaving) {
              return;
            }
            beginExit(() => deleteNote(undefined, { onError: cancelExit }));
          },
        },
      ]);
    }, ALERT_CONFIRM_DEFER_MS);
  }, [beginExit, cancelExit, deleteNote, isLeaving]);

  const handleArchive = useCallback(() => {
    if (isLeaving || isPending) {
      return;
    }
    beginExit(() => archiveChat(undefined, { onError: cancelExit }));
  }, [archiveChat, beginExit, cancelExit, isLeaving, isPending]);

  const onOpen = useCallback(() => router.push(item.route), [router, item.route]);

  const handleLongPress = useCallback(() => {
    if (isPending || isLeaving) {
      return;
    }
    Alert.alert(primaryText, undefined, [
      { text: t.inbox.item.open, onPress: onOpen },
      isChat
        ? { text: t.inbox.item.archiveChat, onPress: handleArchive }
        : { text: t.inbox.item.deleteNote.menu, style: 'destructive', onPress: handleDelete },
      { text: t.inbox.item.deleteNote.cancel, style: 'cancel' },
    ]);
  }, [handleArchive, handleDelete, isChat, isLeaving, isPending, onOpen, primaryText]);

  return (
    <Reanimated.View
      entering={entering}
      layout={layout}
      style={leavingStyle}
      testID={`inbox-item-${item.kind}`}
    >
      <ListRow
        accessibilityLabel={primaryText}
        actionTestID={`inbox-item-${isChat ? 'chat' : 'note'}-open`}
        leading=<AppIcon
          name={isChat ? 'bubble.left.fill' : 'note.text'}
          size={14}
          tintColor={mutedForegroundColor}
          style={{ opacity: 0.35 }}
        />
        onLongPress={handleLongPress}
        onPress={onOpen}
        subtitle={titleText && previewText && previewText !== titleText ? previewText : null}
        title={primaryText}
      />
    </Reanimated.View>
  );
});
InboxStreamItem.displayName = 'InboxStreamItem';

function cleanText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}
