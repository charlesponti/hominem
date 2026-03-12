import * as React from 'react';
import { Text, View, type TextProps, type ViewProps } from 'react-native';

import { colors, fontFamiliesNative, fontSizes, fontWeights, spacing } from '../../tokens';

function Card({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

function CardHeader({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.header, style]} {...props}>
      {children}
    </View>
  );
}

function CardContent({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.content, style]} {...props}>
      {children}
    </View>
  );
}

function CardFooter({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.footer, style]} {...props}>
      {children}
    </View>
  );
}

function CardTitle({ children, style, ...props }: TextProps) {
  return (
    <Text style={[styles.title, style]} {...props}>
      {children}
    </Text>
  );
}

function CardDescription({ children, style, ...props }: TextProps) {
  return (
    <Text style={[styles.description, style]} {...props}>
      {children}
    </Text>
  );
}

function CardAction({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.action, style]} {...props}>
      {children}
    </View>
  );
}

const styles = {
  action: {
    alignSelf: 'flex-end',
  },
  card: {
    backgroundColor: colors['bg-surface'],
    borderColor: colors['border-default'],
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing[5],
    paddingVertical: spacing[5],
  },
  content: {
    paddingHorizontal: spacing[5],
  },
  description: {
    color: colors['text-tertiary'],
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: Math.round(fontSizes.sm * 1.4),
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: spacing[5],
  },
  header: {
    gap: spacing[2],
    paddingHorizontal: spacing[5],
  },
  title: {
    color: colors['text-primary'],
    fontFamily: fontFamiliesNative.primary,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: Math.round(fontSizes.lg * 1.2),
  },
} as const;

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
