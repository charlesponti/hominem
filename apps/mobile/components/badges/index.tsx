import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';

import { makeStyles, theme } from '~/theme';
import Text from '~/theme/Text';

import { FocusCategory } from '../focus/focus-category';

// Predefined category colors using design system tokens
const CATEGORY_COLORS = [
  { bg: 'bg-surface', fg: 'text-primary' },
  { bg: 'bg-elevated', fg: 'text-secondary' },
  { bg: 'muted', fg: 'foreground' },
] as const;

function getCategoryColor(category: string): { bg: string; fg: string } {
  // Use hash of category name to pick consistent color
  const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % CATEGORY_COLORS.length;
  const colors = CATEGORY_COLORS[index];
  return {
    bg: theme.colors[colors.bg as keyof typeof theme.colors] as string,
    fg: theme.colors[colors.fg as keyof typeof theme.colors] as string,
  };
}

export const Badge = ({ children, bg, fg }: PropsWithChildren<{ bg: string; fg: string }>) => {
  const styles = useStyles();
  return (
    <Text variant="body" style={[styles.badge, { backgroundColor: bg, color: fg }]}>
      {children}
    </Text>
  );
};

export const CategoryBadge = ({ category }: { category: string }) => {
  const colors = getCategoryColor(category);
  return (
    <Badge bg={colors.bg} fg={colors.fg}>
      <FocusCategory category={category} />
    </Badge>
  );
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    badge: {
      borderRadius: t.borderRadii.xl_20,
      fontSize: 10,
      paddingVertical: t.spacing.xs_4,
      paddingHorizontal: t.spacing.sm_8,
    },
  }),
);
