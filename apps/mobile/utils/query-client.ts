import NetInfo from '@react-native-community/netinfo';
import { QueryClient, onlineManager } from '@tanstack/react-query';

import { mobileQueryDefaultOptions } from './query-client-config';

// Configure React Query to use NetInfo for online status
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

const queryClient = new QueryClient({
  defaultOptions: mobileQueryDefaultOptions,
});

export default queryClient;
