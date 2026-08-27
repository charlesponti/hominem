import { View } from 'react-native';

import { makeStyles } from '~/components/theme';

export function ProtectedRouteFallback() {
  return <View testID="protected-route-fallback" style={styles.container} />;
}

const styles = makeStyles((theme) => ({
  container: { flex: 1 },
}));
