/**
 * use-widget-action-handler.ts
 *
 * Listens for AppState transitions to 'active' and checks the shared
 * App Group storage for a pending action written by a WidgetKit widget.
 * If a fresh action is found it is consumed (cleared) and the user is
 * navigated to the appropriate screen.
 *
 * Call this hook once from the root authenticated layout so it is active
 * for the entire session.
 */
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { consumePendingWidgetAction } from './widget-storage';

export function useWidgetActionHandler() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    function handleAction() {
      const action = consumePendingWidgetAction();
      if (!action) return;

      if (action === 'add-note') {
        router.push('/(protected)/(tabs)/focus?action=new' as never);
      } else if (action === 'open-sherpa') {
        router.push('/(protected)/(tabs)/sherpa' as never);
      }
    }

    // Check on mount in case the app cold-started via a widget tap
    handleAction();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') handleAction();
    });

    return () => sub.remove();
  }, [router]);
}
