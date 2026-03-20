import { MaterialIcons } from '@expo/vector-icons';
import type { PressableProps } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { makeStyles, theme } from '~/theme';

export const UploadFileButton = ({ style, ...props }: PressableProps) => {
  const styles = useStyles();
  return (
    <Pressable
      style={(state) => [
        styles.button,
        typeof style === 'function' ? style(state) : style,
        state.pressed ? styles.pressed : null,
      ]}
      {...props}
    >
      <MaterialIcons name="add" size={20} color={theme.colors.foreground} />
    </Pressable>
  );
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    button: {
      backgroundColor: t.colors.muted,
      padding: t.spacing.sm_8,
      borderRadius: t.borderRadii.full,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
    },
    pressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
  }),
);
