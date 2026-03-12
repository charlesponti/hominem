import { StyleSheet, View } from 'react-native';

import { makeStyles } from '~/theme';

export const PulsingCircle = () => {
  const styles = useStyles();
  return <View style={styles.circle} />;
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    circle: {
      width: 42,
      height: 42,
      borderRadius: 42,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      backgroundColor: t.colors.muted,
    },
  }),
);
