import { StyleSheet } from 'react-native';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';

import { makeStyles } from '~/theme';

export const ScreenContent = ({ style, children, ...props }: SafeAreaViewProps) => {
  const styles = useStyles();
  return (
    <SafeAreaView style={[styles.container, style]} {...props}>
      {children}
    </SafeAreaView>
  );
};

const useStyles = makeStyles(() =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
  }),
);
