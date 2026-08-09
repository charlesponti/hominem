import { View } from 'react-native';

export function ProtectedRouteFallback() {
  return <View testID="protected-route-fallback" className="flex-1 bg-background" />;
}
