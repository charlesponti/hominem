import type { ChatMessageItem } from '@hominem/chat';

import { useAudioPlayback } from '~/components/media/useAudioPlayback';

import { ActionIconButton } from './chat-action-icon-button';

export function ChatSpeakButton({ message }: { message: ChatMessageItem }) {
  const audioUrl = message.audio?.url ?? null;
  const playback = useAudioPlayback(message.id, audioUrl);
  const isUser = message.role.toLowerCase() === 'user';
  const canSpeak =
    !isUser && !message.isStreaming && Boolean(audioUrl) && Boolean(message.message?.trim());

  if (!canSpeak) {
    return null;
  }

  return (
    <ActionIconButton
      icon={playback.isSpeaking ? 'stop.fill' : 'speaker.wave.2'}
      onPress={() => playback.toggle()}
    />
  );
}
