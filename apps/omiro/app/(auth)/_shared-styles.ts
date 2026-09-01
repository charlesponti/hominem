import type { Theme } from '~/components/theme';

// Styles shared by the email-entry and OTP-verify screens.
export function authSharedStyles(theme: Theme) {
  return {
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { width: '100%', alignItems: 'center' },
    form: { width: '100%', maxWidth: 420, gap: 18 },
    header: { gap: 8 },
    title: { ...theme.textVariants.title1, color: theme.colors.foreground },
    progressHelper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 16,
    },
    progressArrow: { ...theme.textVariants.footnote, color: theme.colors.mutedForeground },
    progressMessage: {
      ...theme.textVariants.footnote,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
    },
  } as const;
}
