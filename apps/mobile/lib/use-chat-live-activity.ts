import * as LiveActivity from 'expo-live-activity';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * Manages a Live Activity for an ongoing chat session.
 * Starts when a chatId is provided, updates on new messages, ends when the
 * session is archived or the component unmounts.
 */
export function useChatLiveActivity(
  chatId: string | null | undefined,
  chatTitle: string | undefined,
) {
  const activityId = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const start = useCallback((title: string) => {
    if (Platform.OS !== 'ios' || activityId.current) return;

    const id = LiveActivity.startActivity(
      {
        title: title || 'Chat Session',
        subtitle: 'Tap to return to your conversation',
      },
      {
        deepLinkUrl: `hakumi://chat`,
      },
    );

    if (id) {
      activityId.current = id;
    }
  }, []);

  const update = useCallback(
    (lastMessage: string) => {
      if (Platform.OS !== 'ios' || !activityId.current) return;

      LiveActivity.updateActivity(activityId.current, {
        title: chatTitle || 'Chat Session',
        subtitle: lastMessage.slice(0, 80),
      });
    },
    [chatTitle],
  );

  const stop = useCallback(() => {
    if (Platform.OS !== 'ios' || !activityId.current) return;

    LiveActivity.stopActivity(activityId.current, {
      title: chatTitle || 'Chat Session',
      subtitle: 'Conversation ended',
    });
    activityId.current = null;
  }, [chatTitle]);

  // Start/stop when chatId changes
  useEffect(() => {
    if (!chatId) {
      stop();
      return;
    }

    start(chatTitle || 'Chat Session');

    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Update title if chat gets named
  useEffect(() => {
    if (!chatTitle || !activityId.current || Platform.OS !== 'ios') return;

    LiveActivity.updateActivity(activityId.current, {
      title: chatTitle,
      subtitle: 'Tap to return to your conversation',
    });
  }, [chatTitle]);

  // When app moves to background with an active session, update the subtitle
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      const nowBackground = nextState === 'background' || nextState === 'inactive';

      if (wasActive && nowBackground && activityId.current && Platform.OS === 'ios') {
        LiveActivity.updateActivity(activityId.current, {
          title: chatTitle || 'Chat Session',
          subtitle: 'Tap to return to your conversation',
        });
      }

      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, [chatTitle]);

  return { update, stop };
}
