import type { PropsWithChildren } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { theme } from '~/components/theme';

export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const styles = cardStyles;
  return (
    <View {...props} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function CardHeader({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const styles = cardStyles;
  return (
    <View {...props} style={[styles.header, style]}>
      {children}
    </View>
  );
}

export function CardTitle({ children, style, ...props }: PropsWithChildren<TextProps>) {
  const styles = cardStyles;
  return (
    <Text {...props} style={[styles.title, style]}>
      {children}
    </Text>
  );
}

export function CardDescription({ children, style, ...props }: PropsWithChildren<TextProps>) {
  const styles = cardStyles;
  return (
    <Text {...props} style={[styles.description, style]}>
      {children}
    </Text>
  );
}

export function CardAction({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const styles = cardStyles;
  return (
    <View {...props} style={[styles.action, style]}>
      {children}
    </View>
  );
}

export function CardContent({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  return (
    <View {...props} style={style}>
      {children}
    </View>
  );
}

export function CardFooter({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const styles = cardStyles;
  return (
    <View {...props} style={[styles.footer, style]}>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    gap: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  } satisfies ViewStyle,
  header: { gap: 4 } satisfies ViewStyle,
  title: { color: theme.colors.cardForeground, fontSize: 20 } satisfies TextStyle,
  description: { color: theme.colors.mutedForeground, fontSize: 12 } satisfies TextStyle,
  action: { alignSelf: 'flex-start' } satisfies ViewStyle,
  footer: { flexDirection: 'row', alignItems: 'center' } satisfies ViewStyle,
});

export type CardStyle = StyleProp<ViewStyle>;
