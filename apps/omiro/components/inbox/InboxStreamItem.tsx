import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { fontWeights, makeStyles, Text, useThemeColors } from '~/components/theme';
import AppIcon from '~/components/ui/icon';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { useChatArchive } from '~/services/chat/use-chat-archive';
import { useNoteDelete } from '~/services/notes/use-note-delete';
import t from '~/translations';

import type { InboxStreamItemData } from './InboxStreamItem.types';

const CARD_TINT_ALPHA = 0.1;
const BADGE_TINT_ALPHA = 0.16;

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

interface InboxStreamItemProps {
  animateOnMount?: boolean;
  index?: number;
  isNew?: boolean;
  item: InboxStreamItemData;
}

export const InboxStreamItem = memo(
  ({ animateOnMount = false, index = 0, isNew = false, item }: InboxStreamItemProps) => {
    const router = useRouter();
    const styles = useStyles();
    const themeColors = useThemeColors();
    const reducedMotion = useReducedMotion();
    const titleText = cleanText(item.title);
    const previewText = cleanText(item.preview);
    const primaryText = titleText ?? previewText ?? t.inbox.item.untitled;
    const isChat = item.kind === 'chat';
    const accent = isChat ? themeColors.primary : themeColors['chart-2'];
    const cardTint = blend(accent, CARD_TINT_ALPHA, themeColors.card);
    const badgeTint = withAlpha(accent, BADGE_TINT_ALPHA);
    const shouldAnimateIn = animateOnMount || isNew;
    const entranceOffset = reducedMotion || !shouldAnimateIn ? 0 : animateOnMount ? 8 : -8;
    const entrance = useSharedValue(entranceOffset === 0 ? 1 : 0);
    const pressed = useSharedValue(0);
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
        entrance.value = withTiming(1, { duration: 150 });
        return;
      }
      const delay = animateOnMount ? index * 40 : 0;
      entrance.value = withDelay(
        delay,
        withTiming(1, { duration: animateOnMount ? 240 : 220, easing: Easing.out(Easing.quad) }),
      );
    }, [animateOnMount, entrance, index, isNew, reducedMotion, shouldAnimateIn]);

    const entranceStyle = useAnimatedStyle(() => ({
      opacity: entrance.value,
      transform: [{ translateY: (1 - entrance.value) * entranceOffset }],
    }));

    const pressStyle = useAnimatedStyle(() => ({
      opacity: 1 - 0.1 * pressed.value,
      transform: [{ scale: reducedMotion ? 1 : 1 - 0.02 * pressed.value }],
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

    const onPressIn = useCallback(() => {
      pressed.value = withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) });
    }, [pressed]);

    const onPressOut = useCallback(() => {
      pressed.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) });
    }, [pressed]);

    return (
      <Reanimated.View style={[styles.shell, entranceStyle]} testID={`inbox-item-${item.kind}`}>
        <AnimatedPressable
          accessibilityLabel={primaryText}
          accessibilityRole="button"
          onLongPress={handleLongPress}
          onPress={onOpen}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[styles.card, { backgroundColor: cardTint }, pressStyle]}
          testID={`inbox-item-${isChat ? 'chat' : 'note'}-open`}
        >
          <View style={[styles.badge, { backgroundColor: badgeTint }]}>
            <AppIcon
              name={isChat ? 'bubble.left.and.bubble.right.fill' : 'note.text'}
              size={20}
              tintColor={accent}
            />
          </View>
          <View style={styles.copy}>
            <Text numberOfLines={2} variant="body" color="text-primary" style={styles.title}>
              {primaryText}
            </Text>
            {isChat || !titleText ? null : (
              <Text
                ellipsizeMode="tail"
                numberOfLines={1}
                variant="caption1"
                color="text-secondary"
              >
                {previewText}
              </Text>
            )}
          </View>
          <AppIcon name="chevron.right" size={14} tintColor={themeColors.tertiary} />
        </AnimatedPressable>
      </Reanimated.View>
    );
  },
);

InboxStreamItem.displayName = 'InboxStreamItem';

function cleanText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function blend(foreground: string, alpha: number, background: string): string {
  const [fr, fg, fb] = parseHex(foreground);
  const [br, bg, bb] = parseHex(background);
  const r = Math.round(fr * alpha + br * (1 - alpha));
  const g = Math.round(fg * alpha + bg * (1 - alpha));
  const b = Math.round(fb * alpha + bb * (1 - alpha));
  return `rgb(${r}, ${g}, ${b})`;
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const useStyles = makeStyles((theme) => ({
  shell: {
    marginBottom: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
  },
  card: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 64,
    paddingHorizontal: theme.spacing.md + 2,
    paddingVertical: theme.spacing.md,
  },
  badge: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontWeight: fontWeights.semibold,
  },
}));
