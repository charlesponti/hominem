import { MenuView } from '@expo/ui/community/menu';
import { GlassView } from 'expo-glass-effect';
import { Link, useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SharedValue } from 'react-native-reanimated';

import {
  Text,
  fontFamiliesNative,
  fontSizes,
  lineHeights,
  themeSpacing,
  makeStyles,
  useThemeColors,
} from '~/components/theme';
import { IconButton, SwipeAction } from '~/components/ui';
import { useChatArchive } from '~/services/chat/use-chat-archive';
import { useNoteDelete } from '~/services/notes/use-note-delete';
import t from '~/translations';

import type { InboxStreamItemData as InboxStreamItemModel } from './InboxStreamItem.types';

interface InboxStreamItemProps {
  item: InboxStreamItemModel;
  swipeEnabled?: boolean;
}

export const InboxStreamItem = memo(({ item, swipeEnabled = true }: InboxStreamItemProps) => {
  const styles = useStyles();
  const themeColors = useThemeColors();
  const router = useRouter();
  const swipeableRef = useRef<SwipeableMethods>(null);
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
  const [isRowPressed, setIsRowPressed] = useState(false);
  // Link.Trigger/asChild merges style via `{...slotStyle, ...childStyle}` (@radix-ui/react-slot),
  // which silently drops a function-style Pressable (spreading a function yields {}).
  // Keep this as a single flattened plain object so the merge preserves `contentButton`.
  const contentButtonStyle = useMemo(
    () => StyleSheet.flatten([styles.contentButton, isRowPressed && styles.rowPressed]),
    [styles, isRowPressed],
  );

  const handleDelete = useCallback(() => {
    swipeableRef.current?.close();
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
    swipeableRef.current?.close();
    archiveChat();
  }, [archiveChat]);

  const handleMenuAction = useCallback(
    (event: { nativeEvent: { event: string } }) => {
      if (event.nativeEvent.event === 'open-item') {
        router.push(item.route);
        return;
      }

      if (event.nativeEvent.event === 'delete-note') {
        handleDelete();
        return;
      }

      if (event.nativeEvent.event === 'archive-chat') {
        handleArchive();
      }
    },
    [handleArchive, handleDelete, item.route, router],
  );

  const renderSwipeAction = useCallback(
    (progress: SharedValue<number>) => {
      return (
        <SwipeAction
          progress={progress}
          iconName={isChat ? 'archivebox' : 'trash'}
          onPress={isChat ? handleArchive : handleDelete}
          accessibilityLabel={isChat ? t.inbox.item.archive : t.inbox.item.deleteNote.confirm}
          backgroundColor={isChat ? themeColors.primary : themeColors.destructive}
          style={styles.swipeAction}
        />
      );
    },
    [isChat, handleArchive, handleDelete, styles, themeColors],
  );

  const row = (
    <GlassView glassEffectStyle="regular" style={styles.glassRow}>
      <View style={styles.row}>
        <Link href={item.route} disabled={isPending} asChild>
          <Link.Trigger withAppleZoom={isChat}>
            <Pressable
              accessibilityLabel={`${primaryText}, ${isChat ? 'Chat' : 'Note'}`}
              accessibilityRole="button"
              disabled={isPending}
              onPressIn={() => setIsRowPressed(true)}
              onPressOut={() => setIsRowPressed(false)}
              style={contentButtonStyle}
              testID={`inbox-item-${item.kind}-open`}
            >
              <View style={styles.titleRow}>
                <View style={styles.copyColumn}>
                  <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                    {primaryText}
                  </Text>
                </View>
              </View>
            </Pressable>
          </Link.Trigger>
        </Link>

        <MenuView
          actions={[
            {
              id: 'open-item',
              title: t.inbox.item.open,
              image: isChat ? 'bubble.left' : 'doc.text',
            },
            {
              id: isChat ? 'archive-chat' : 'delete-note',
              title: isChat ? t.inbox.item.archive : t.inbox.item.deleteNote.menu,
              image: isChat ? 'archivebox' : 'trash',
              attributes: isChat ? undefined : { destructive: true },
            },
          ]}
          onPressAction={handleMenuAction}
          style={styles.menuHost}
        >
          <IconButton
            accessibilityLabel={t.inbox.item.actionsLabel}
            icon="ellipsis"
            iconSize={18}
            style={styles.menuButton}
            testID={`inbox-item-${item.kind}-actions`}
            tintColor={themeColors['text-secondary']}
          />
        </MenuView>
      </View>
    </GlassView>
  );

  return (
    <View style={[styles.outer, isPending && styles.rowPending]} testID={`inbox-item-${item.kind}`}>
      {swipeEnabled ? (
        <ReanimatedSwipeable
          ref={swipeableRef}
          containerStyle={styles.swipeableContainer}
          childrenContainerStyle={styles.swipeableChildrenContainer}
          renderRightActions={renderSwipeAction}
          rightThreshold={60}
          friction={2}
          overshootRight={false}
          enableTrackpadTwoFingerGesture
        >
          {row}
        </ReanimatedSwipeable>
      ) : (
        row
      )}
    </View>
  );
});

InboxStreamItem.displayName = 'InboxStreamItem';

function cleanText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

const useStyles = makeStyles((theme) => ({
  outer: {
    marginBottom: themeSpacing.md,
    paddingHorizontal: themeSpacing.sm,
  },
  glassRow: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  swipeableContainer: {
    overflow: 'visible',
  },
  swipeableChildrenContainer: {
    overflow: 'visible',
  },
  row: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingLeft: themeSpacing.sm,
    paddingRight: themeSpacing.sm,
  },
  contentButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingRight: 64,
  },
  rowPressed: {
    backgroundColor: theme.colors['card'],
  },
  rowPending: {
    opacity: 0.45,
  },
  titleRow: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    minWidth: 0,
    minHeight: 44,
    paddingVertical: 14,
  },
  copyColumn: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingRight: 56,
  },
  menuButton: {
    alignSelf: 'center',
    opacity: 0.48,
  },
  menuHost: {
    position: 'absolute',
    top: 0,
    right: themeSpacing.sm,
    bottom: 0,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors['text-primary'],
    fontSize: fontSizes.lg,
    fontFamily: fontFamiliesNative.primary,
    fontWeight: '400',
    lineHeight: lineHeights.body,
    letterSpacing: -0.25,
    flexShrink: 1,
    maxWidth: '100%',
  },
  swipeAction: {
    height: '100%',
  },
}));
