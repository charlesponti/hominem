import { useCallback, useSyncExternalStore } from 'react';

import { getPlaybackSnapshot, playAudioReply, subscribePlayback } from './audio-playback.service';

export function useAudioPlayback(messageId: string, url: string | null | undefined) {
  const snapshot = useSyncExternalStore(subscribePlayback, getPlaybackSnapshot);
  const isSpeaking = snapshot.activeMessageId === messageId && snapshot.playing;

  const toggle = useCallback(() => {
    if (!url) return;
    playAudioReply(messageId, url);
  }, [messageId, url]);

  return { isSpeaking, toggle };
}
