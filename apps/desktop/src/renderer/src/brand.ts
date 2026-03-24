import { BRAND } from '@hominem/env/brand';

/** Single source of truth for desktop app brand strings. */
export const DESKTOP_BRAND = {
  appName: BRAND.appName,
  displayName: `${BRAND.appName} desktop`,
} as const;
