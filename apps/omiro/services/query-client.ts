import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

import { mobileQueryDefaultOptions } from './query-client-config';

// React Native has no browser window focus events -- bridge AppState instead.
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });
  return () => subscription.remove();
});

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false);
  });
});

const queryClient = new QueryClient({
  defaultOptions: mobileQueryDefaultOptions,
});

export default queryClient;
