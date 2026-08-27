import { View } from 'react-native';

import { useStyles } from '~/components/theme';

export function ProtectedRouteFallback() {
  const styles = useStyles((theme) => ({
    container: { flex: 1, backgroundColor: theme.colors.background },
  }));
  return <View testID="protected-route-fallback" style={styles.container} />;
}
