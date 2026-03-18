import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { makeStyles } from '~/theme';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
  }),
);

const BlurredGradientBackground = ({
  children,
  testID,
}: {
  children: ReactNode;
  testID?: string;
}) => {
  const styles = useStyles();
  return (
    <View testID={testID} style={styles.container}>
      {children}
    </View>
  );
};

export default BlurredGradientBackground;
