import type { ChatMessageItem } from '@hominem/chat';
import { Text, View } from 'react-native';
import Reanimated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { ActionIconButton } from './chat-action-icon-button';
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
  canEdit,
  canRegenerate,
  canDelete,
  onEdit,
  onRegenerate,
  onDelete,
}: {
  isActive: boolean;
  isUser: boolean;
  timestamp: string;
  message: ChatMessageItem;
  canEdit: boolean;
  canRegenerate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}) {
  if (!isActive) {
    return null;
  }

  const [tertiary] = useCSSVariable(['--color-tertiary']) as string[];

  return (
    <Reanimated.View
      entering={ACTIONS_ENTERING}
      exiting={ACTIONS_EXITING}
      layout={ACTIONS_LAYOUT}
      className="mt-1"
    >
      <View className={`items-center flex-row gap-2 ${isUser ? 'justify-end' : ''}`}>
        {timestamp ? <Text style={{ color: tertiary, fontSize: 12 }}>{timestamp}</Text> : null}
        <ChatCopyButton message={message} />
        <ChatSpeakButton message={message} />
        <ChatShareButton message={message} />
        {canEdit ? <ActionIconButton icon="square.and.pencil" onPress={onEdit} /> : null}
        {canRegenerate ? (
          <ActionIconButton icon="arrow.clockwise" onPress={() => onRegenerate?.(message.id)} />
        ) : null}
        {canDelete ? (
          <ActionIconButton icon="trash" isDestructive onPress={() => onDelete?.(message.id)} />
        ) : null}
      </View>
    </Reanimated.View>
  );
}
