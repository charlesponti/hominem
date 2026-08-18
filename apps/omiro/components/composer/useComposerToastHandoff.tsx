import { randomUUID } from 'expo-crypto';
import { useCallback } from 'react';
import type { View } from 'react-native';

import { useChatMotionOverlay } from '~/components/chat/chat-motion-overlay';
import { useMeasuredElement } from '~/services/motion/use-measured-element';

import { ComposerToastFlight } from './ComposerToastFlight';

/**
 * Wires the composer shell into the chat motion overlay: attach `ref` to the
 * composer's outer view, then call `beginHandoff(message)` at send time to
 * fly a toast clone from the composer's measured position and get back the
 * id it should be sent under (see `SendInput.messageId`) so the real
 * transcript row shares identity with the flight instead of racing it.
 *
 * Disabled outside chat mode (inbox/notes have no transcript to hand off
 * to) -- `beginHandoff` still returns an id so callers have one uniform
 * shape to pass through, it just never starts a flight.
 */
export function useComposerToastHandoff(enabled: boolean) {
  const { ref, measure } = useMeasuredElement<View>();
  const { reserve, release, present, dismiss, toLocalRect } = useChatMotionOverlay();

  const beginHandoff = useCallback(
    (message: string): string => {
      const messageId = randomUUID();
      if (!enabled) return messageId;

      // Reserve synchronously, before the async measurement below: the
      // optimistic transcript row for this id mounts synchronously right
      // after this function returns (via the mutation's onMutate), and it
      // needs `isInFlight` to already read true on its very first render or
      // it locks in fully visible and the flight becomes invisible/moot.
      reserve(messageId);

      measure((sourceRect) => {
        if (!sourceRect) {
          release(messageId);
          return;
        }
        const local = toLocalRect(sourceRect);
        if (!local) {
          release(messageId);
          return;
        }

        present(
          messageId,
          <ComposerToastFlight onSettled={() => dismiss(messageId)} rect={local} text={message} />,
        );
      });

      return messageId;
    },
    [enabled, measure, reserve, release, present, dismiss, toLocalRect],
  );

  return { beginHandoff, ref };
}
