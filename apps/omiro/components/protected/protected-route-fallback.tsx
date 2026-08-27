import { StyleSheet, View } from 'react-native';

import { theme } from '~/components/theme';

export function ProtectedRouteFallback() {
  return <View testID="protected-route-fallback" style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
