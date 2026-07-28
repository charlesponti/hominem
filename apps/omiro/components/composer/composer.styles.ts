import { componentSizes, makeStyles } from '~/components/theme';

export const useComposerSurfaceStyles = makeStyles((theme) => ({
  surface: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors['border-default'],
    borderWidth: 1,
    borderRadius: theme.borderRadii.lg,
    width: '100%',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  input: {
    borderRadius: 0,
    borderWidth: 0,
    minHeight: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  iconPlaceholder: {
    alignItems: 'center',
    height: componentSizes.lg,
    justifyContent: 'center',
    width: componentSizes.lg,
  },
}));

export const useComposerRootStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
}));
