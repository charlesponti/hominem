import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(
    () => NetInfo.addEventListener((state) => setIsOnline(state.isConnected !== false)),
    [],
  );

  return { isOnline };
}
