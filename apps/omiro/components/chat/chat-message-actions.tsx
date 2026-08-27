import type { ChatMessageItem } from '@hominem/chat';
import { Text, View } from 'react-native';
import Reanimated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import { makeStyles, useThemeColor } from '~/components/theme';

import { ActionIconButton } from '../ui/action-icon-button';
import { ChatCopyButton } from './chat-copy-button';
import { ChatShareButton } from './chat-share-button';
import { ChatSpeakButton } from './chat-speak-button';

const ACTIONS_ENTERING = FadeInDown.duration(240).springify().damping(20).stiffness(220).mass(0.9);
const ACTIONS_EXITING = FadeOutUp.duration(180).springify().damping(24).stiffness(260).mass(0.8);
const ACTIONS_LAYOUT = LinearTransition.duration(200);

export function ActiveMessageActions({
  isActive,
  isUser,
  timestamp,
  message,
  actions,
  onEdit,
  onRegenerate,
  onDelete,
}: {
  isActive: boolean;
  isUser: boolean;
  timestamp: string;
  message: ChatMessageItem;
  actions: { canDelete: boolean; canEdit: boolean; canRegenerate: boolean };
  onEdit: () => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}) {
  const [tertiary] = useThemeColor(['--color-tertiary']) as string[];

  if (!isActive) {
    return null;
  }

  return (
    <Reanimated.View
      entering={ACTIONS_ENTERING}
      exiting={ACTIONS_EXITING}
      layout={ACTIONS_LAYOUT}
      style={styles.actionContainer}
    >
      <View style={[styles.actions, isUser && styles.actionsEnd]}>
        {timestamp ? <Text style={{ color: tertiary, fontSize: 12 }}>{timestamp}</Text> : null}
        <ChatCopyButton message={message} />
        <ChatSpeakButton message={message} />
        <ChatShareButton message={message} />
        {actions.canEdit ? <ActionIconButton icon="square.and.pencil" onPress={onEdit} /> : null}
        {actions.canRegenerate ? (
          <ActionIconButton icon="arrow.clockwise" onPress={() => onRegenerate?.(message.id)} />
        ) : null}
        {actions.canDelete ? (
          <ActionIconButton icon="trash" isDestructive onPress={() => onDelete?.(message.id)} />
        ) : null}
      </View>
    </Reanimated.View>
  );
}

const styles = makeStyles(() => ({
  actionContainer: { marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionsEnd: { justifyContent: 'flex-end' },
}));
