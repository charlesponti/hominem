import { View } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';

export function ProtectedRouteFallback() {
  return <View testID="protected-route-fallback" style={styles.s0} />;
}

const styles = makeStyles((theme) => ({
  s0: { flex: 1, backgroundColor: theme.colors.background },
}));
