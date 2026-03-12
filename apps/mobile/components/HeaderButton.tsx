import FontAwesome from '@expo/vector-icons/FontAwesome';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, type View } from 'react-native';

import { makeStyles, theme } from '~/theme';

export const HeaderButton = forwardRef<View, { onPress?: () => void }>(({ onPress }, ref) => {
  const styles = useStyles();
  return (
    <Pressable ref={ref} onPress={onPress}>
      {({ pressed }) => (
        <FontAwesome
          name="info-circle"
          size={25}
          color={theme.colors.foreground}
          style={[
            styles.headerRight,
            {
              opacity: pressed ? 0.5 : 1,
            },
          ]}
        />
      )}
    </Pressable>
  );
});

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    headerRight: {
      marginRight: t.spacing.sm_12,
    },
  }),
);
